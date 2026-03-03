'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ClassRecord, UserProfile } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import Link from 'next/link';
import { Shield, LayoutDashboard, MessageSquare } from 'lucide-react';
import { ADMIN_EMAIL } from '@/lib/constants';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export function NavLinks() {
    const { user } = useUser();
    const firestore = useFirestore();
    const pathname = usePathname();
    const [professorUnreadCount, setProfessorUnreadCount] = useState(0);

    // Hides the link immediately if not admin
    const isAdmin = user?.email === ADMIN_EMAIL;

    const myProfileQuery = useMemoFirebase(
      () => (user?.uid ? collection(firestore, 'users', user.uid, 'userProfile') : null),
      [firestore, user?.uid]
    );
    const { data: myProfileData } = useCollection<UserProfile>(myProfileQuery);
    const myRole = myProfileData?.[0]?.role;

        const myClassesQuery = useMemoFirebase(
            () => (user?.uid && myRole === 'professor' ? query(collection(firestore, 'classes'), where('ownerId', '==', user.uid)) : null),
            [firestore, user?.uid, myRole]
        );
        const { data: myClassesData } = useCollection<ClassRecord>(myClassesQuery);

        const myClassIds = useMemo(() => (myClassesData || []).map((item) => item.classId), [myClassesData]);

        useEffect(() => {
            if (!user || myRole !== 'professor' || myClassIds.length === 0) {
                setProfessorUnreadCount(0);
                return;
            }

            const unreadByClass: Record<string, number> = {};
            const unsubscribers: Array<() => void> = [];

            const recalcTotal = () => {
                const total = Object.values(unreadByClass).reduce((sum, value) => sum + value, 0);
                setProfessorUnreadCount(total);
            };

            myClassIds.forEach((classId) => {
                const classMessagesQuery = query(
                    collection(firestore, 'classMessages'),
                    where('classId', '==', classId),
                    where('senderRole', '==', 'student')
                );

                const unsubscribe = onSnapshot(
                    classMessagesQuery,
                    (snapshot) => {
                        const seenKey = `mailbox_seen_prof_class:${user.uid}:${classId}`;
                        const seenAt = Number(window.localStorage.getItem(seenKey) || '0');

                        unreadByClass[classId] = snapshot.docs.filter((item) => {
                            const data = item.data() as { createdAt?: { toDate?: () => Date } };
                            const timestamp = data.createdAt?.toDate?.()?.getTime?.() || 0;
                            return timestamp > seenAt;
                        }).length;

                        recalcTotal();
                    },
                    () => {
                        unreadByClass[classId] = 0;
                        recalcTotal();
                    }
                );

                unsubscribers.push(unsubscribe);
            });

            return () => {
                unsubscribers.forEach((unsubscribe) => unsubscribe());
            };
        }, [firestore, myClassIds, myRole, user]);

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/how-to-use">
                    How to Use
                </Link>
            </Button>
            {user && myRole === 'professor' && (
                pathname.startsWith('/professor/announce-chat') ? (
                    <Button variant="outline" asChild>
                        <Link href="/professor">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Dashboard
                            {professorUnreadCount > 0 && (
                                <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                                    {professorUnreadCount > 99 ? '99+' : professorUnreadCount}
                                </span>
                            )}
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" asChild>
                        <Link href="/professor/announce-chat">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Announce/Chat
                            {professorUnreadCount > 0 && (
                                <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                                    {professorUnreadCount > 99 ? '99+' : professorUnreadCount}
                                </span>
                            )}
                        </Link>
                    </Button>
                )
            )}
            {user && isAdmin && (
                pathname.startsWith('/ssslogs') ? (
                    <Button variant="outline" asChild>
                        <Link href="/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" asChild>
                        <Link href="/ssslogs">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Link>
                    </Button>
                )
            )}
        </div>
    );
}
