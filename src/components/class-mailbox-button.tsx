'use client';

import { Mail } from 'lucide-react';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ClassMessage, UserProfile, UserRole } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ClassMailbox from '@/components/class-mailbox';
import { useEffect, useMemo, useState } from 'react';

export function ClassMailboxButton() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [seenAnnouncementAt, setSeenAnnouncementAt] = useState(0);
  const [seenConversationAt, setSeenConversationAt] = useState(0);

  const myProfileQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, 'users', user.uid, 'userProfile') : null),
    [firestore, user?.uid]
  );
  const { data: myProfileData } = useCollection<UserProfile>(myProfileQuery);
  const myProfile = myProfileData?.[0] || null;

  const role = (myProfile?.role || 'student') as UserRole;
  const hasClassMailbox = !!myProfile?.classId && role !== 'professor';

  const announcementsQuery = useMemoFirebase(
    () => (myProfile?.classId ? query(collection(firestore, 'classMessages'), where('classId', '==', myProfile.classId), where('recipientType', '==', 'all')) : null),
    [firestore, myProfile?.classId]
  );
  const { data: announcementMessages } = useCollection<ClassMessage>(announcementsQuery);

  const directQuery = useMemoFirebase(
    () => (myProfile?.classId && user?.uid ? query(collection(firestore, 'classMessages'), where('classId', '==', myProfile.classId), where('recipientStudentId', '==', user.uid)) : null),
    [firestore, myProfile?.classId, user?.uid]
  );
  const { data: directMessages } = useCollection<ClassMessage>(directQuery);

  const sentQuery = useMemoFirebase(
    () => (myProfile?.classId && user?.uid ? query(collection(firestore, 'classMessages'), where('classId', '==', myProfile.classId), where('senderId', '==', user.uid)) : null),
    [firestore, myProfile?.classId, user?.uid]
  );
  const { data: sentMessages } = useCollection<ClassMessage>(sentQuery);

  const announcementSeenStorageKey = user?.uid && myProfile?.classId ? `mailbox_seen_announcement:${user.uid}:${myProfile.classId}` : null;
  const conversationSeenStorageKey = user?.uid && myProfile?.classId ? `mailbox_seen_conversation:${user.uid}:${myProfile.classId}` : null;

  useEffect(() => {
    if (!announcementSeenStorageKey || !conversationSeenStorageKey) {
      setSeenAnnouncementAt(0);
      setSeenConversationAt(0);
      return;
    }

    const announcementSeen = Number(window.localStorage.getItem(announcementSeenStorageKey) || '0');
    const conversationSeenMap = JSON.parse(window.localStorage.getItem(conversationSeenStorageKey) || '{}') as Record<string, number>;
    setSeenAnnouncementAt(Number.isFinite(announcementSeen) ? announcementSeen : 0);
    setSeenConversationAt(conversationSeenMap.professor || 0);
  }, [announcementSeenStorageKey, conversationSeenStorageKey, isOpen]);

  const unreadCount = useMemo(() => {
    const merged = [...(announcementMessages || []), ...(directMessages || []), ...(sentMessages || [])];
    if (!user || !merged.length) return 0;

    let unreadAnnouncements = 0;
    let unreadDirect = 0;

    merged.forEach((item) => {
      const timestamp = item.createdAt?.toDate?.()?.getTime?.() || 0;
      const isFromProfessor = item.senderRole === 'professor';

      if (!isFromProfessor) return;

      if (item.recipientType === 'student' && item.recipientStudentId === user.uid) {
        if (timestamp > seenConversationAt) unreadDirect += 1;
      } else if (item.recipientType !== 'student') {
        if (timestamp > seenAnnouncementAt) unreadAnnouncements += 1;
      }
    });

    return unreadAnnouncements + unreadDirect;
  }, [user, announcementMessages, directMessages, sentMessages, seenAnnouncementAt, seenConversationAt]);

  if (!user || !hasClassMailbox) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open class mailbox" className="relative">
          <Mail className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mailbox</DialogTitle>
          <DialogDescription>Send a message to your professor or check class announcements.</DialogDescription>
        </DialogHeader>
        <ClassMailbox classId={myProfile.classId} role="student" title="Student Mailbox" />
      </DialogContent>
    </Dialog>
  );
}
