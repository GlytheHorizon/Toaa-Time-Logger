'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { ClassRecord, UserProfile } from '@/lib/types';
import LoadingSpinner from '@/components/loading-spinner';
import ClassMailbox from '@/components/class-mailbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfessorAnnounceChatClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const myProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'users', user.uid, 'userProfile', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: myProfile, isLoading: myProfileLoading } = useDoc<UserProfile>(myProfileRef);

  const myClassesQuery = useMemoFirebase(
    () => (user?.uid ? query(collection(firestore, 'classes'), where('ownerId', '==', user.uid)) : null),
    [firestore, user?.uid]
  );
  const { data: myClassesData, isLoading: myClassesLoading } = useCollection<ClassRecord>(myClassesQuery);

  const myClasses = useMemo(
    () =>
      (myClassesData || []).slice().sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.()?.getTime?.() || 0;
        const timeB = b.updatedAt?.toDate?.()?.getTime?.() || 0;
        return timeB - timeA;
      }),
    [myClassesData]
  );

  const studentProfilesQuery = useMemoFirebase(
    () => (selectedClassId ? collectionGroup(firestore, 'userProfile') : null),
    [firestore, selectedClassId]
  );
  const { data: allProfiles, isLoading: studentsLoading } = useCollection<UserProfile>(studentProfilesQuery);

  const classStudentsForMailbox = useMemo(() => {
    if (!selectedClassId || !allProfiles || !myProfile) return [] as UserProfile[];

    return allProfiles.filter(
      (profile) =>
        profile.classId === selectedClassId &&
        profile.id !== myProfile.id &&
        profile.role !== 'professor'
    );
  }, [selectedClassId, allProfiles, myProfile]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!isUserLoading && !myProfileLoading && myProfile && myProfile.role !== 'professor') {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, myProfile, myProfileLoading, router]);

  useEffect(() => {
    if (!myClasses.length) {
      setSelectedClassId(null);
      return;
    }

    if (selectedClassId && myClasses.some((item) => item.classId === selectedClassId)) {
      return;
    }

    const fromProfile = myProfile?.classId && myClasses.some((item) => item.classId === myProfile.classId)
      ? myProfile.classId
      : null;

    setSelectedClassId(fromProfile || myClasses[0].classId);
  }, [myClasses, myProfile?.classId, selectedClassId]);

  if (isUserLoading || myProfileLoading || myClassesLoading || studentsLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!myProfile || myProfile.role !== 'professor') {
    return null;
  }

  const professorEmail = myProfile.email || user?.email || '';
  const professorFallbackName = professorEmail.includes('@') ? professorEmail.split('@')[0] : professorEmail || 'Professor';
  const professorName = myProfile.displayName || professorFallbackName;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Announce / Chat</h1>
        <p className="text-muted-foreground mt-1">Welcome, {professorName}</p>
        <p className="text-muted-foreground mt-1">Send announcements or messages to a selected class.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Class</Label>
          <Select
            value={selectedClassId || undefined}
            onValueChange={(value) => setSelectedClassId(value)}
            disabled={!myClasses.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {myClasses.map((classItem) => (
                <SelectItem key={classItem.classId} value={classItem.classId}>
                  {classItem.displayName} ({classItem.classId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!myClasses.length && (
            <p className="text-sm text-muted-foreground">No classes found. Create a class first in your professor dashboard.</p>
          )}
        </CardContent>
      </Card>

      <ClassMailbox
        classId={selectedClassId}
        role="professor"
        title="Announce / Chat"
        students={classStudentsForMailbox}
      />
    </div>
  );
}
