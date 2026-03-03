'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, collectionGroup, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import type { DocumentData, Query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { ClassMessage, UserProfile, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ClassMailboxProps = {
  classId?: string | null;
  role: UserRole;
  title?: string;
  students?: UserProfile[];
};

export default function ClassMailbox({ classId, role, title = 'Class Mailbox', students: studentsProp }: ClassMailboxProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ClassMessage[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [recipientMode, setRecipientMode] = useState<'all' | 'student'>('all');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [conversationMessage, setConversationMessage] = useState('');
  const [isSendingConversation, setIsSendingConversation] = useState(false);
  const [studentAnnouncementIndex, setStudentAnnouncementIndex] = useState(0);
  const [seenAnnouncementAt, setSeenAnnouncementAt] = useState(0);
  const [seenConversationMap, setSeenConversationMap] = useState<Record<string, number>>({});
  const pageSize = 10;

  const announcementSeenStorageKey = user?.uid && classId ? `mailbox_seen_announcement:${user.uid}:${classId}` : null;
  const conversationSeenStorageKey = user?.uid && classId ? `mailbox_seen_conversation:${user.uid}:${classId}` : null;

  useEffect(() => {
    if (!classId) {
      setMessages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribers: Array<() => void> = [];

    const queryBuckets: Record<string, ClassMessage[]> = {};

    const recomputeMessages = () => {
      const merged = Object.values(queryBuckets).flat();
      const unique = new Map<string, ClassMessage>();
      for (const item of merged) {
        if (!item.id) continue;
        unique.set(item.id, item);
      }
      setMessages([...unique.values()]);
    };

    const attachQuery = (bucketKey: string, q: Query<DocumentData>) => {
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const nextMessages = snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<ClassMessage, 'id'>),
          }));
          queryBuckets[bucketKey] = nextMessages;
          recomputeMessages();
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
          setError('Mailbox is unavailable. Please check class permissions/rules.');
        }
      );
      unsubscribers.push(unsub);
    };

    setMessages([]);

    if (role === 'professor') {
      attachQuery('prof_all', query(collection(firestore, 'classMessages'), where('classId', '==', classId)));

      if (!studentsProp) {
        const studentsQuery = query(
          collectionGroup(firestore, 'userProfile'),
          where('role', '==', 'student'),
          where('classId', '==', classId)
        );

        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
          const mapped = snapshot.docs.map((item) => item.data() as UserProfile);
          setStudents(mapped);
        });
        unsubscribers.push(unsubscribeStudents);
      }
    } else {
      if (!user) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      attachQuery(
        'student_announcements',
        query(
          collection(firestore, 'classMessages'),
          where('classId', '==', classId),
          where('recipientType', '==', 'all')
        )
      );

      attachQuery(
        'student_direct',
        query(
          collection(firestore, 'classMessages'),
          where('classId', '==', classId),
          where('recipientStudentId', '==', user.uid)
        )
      );

      attachQuery(
        'student_sent',
        query(
          collection(firestore, 'classMessages'),
          where('classId', '==', classId),
          where('senderId', '==', user.uid)
        )
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [classId, firestore, role, user, studentsProp]);

  useEffect(() => {
    if (studentsProp) {
      setStudents(studentsProp);
    }
  }, [studentsProp]);

  const orderedMessages = useMemo(() => {
    const unique = new Map<string, ClassMessage>();
    for (const item of messages || []) {
      if (!item.id) continue;
      unique.set(item.id, item);
    }
    return [...unique.values()].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return timeB - timeA;
    });
  }, [messages]);

  const studentById = useMemo(() => {
    return students.reduce((acc, student) => {
      acc[student.id] = student;
      return acc;
    }, {} as Record<string, UserProfile>);
  }, [students]);

  const isAnnouncementMessage = (item: ClassMessage) => {
    return item.senderRole === 'professor' && item.recipientType !== 'student';
  };

  const isDirectMessage = (item: ClassMessage) => {
    return !isAnnouncementMessage(item);
  };

  const announcementMessagesAll = useMemo(
    () => orderedMessages.filter((item) => isAnnouncementMessage(item)),
    [orderedMessages]
  );

  const directMessagesAll = useMemo(
    () => orderedMessages.filter((item) => isDirectMessage(item)),
    [orderedMessages]
  );

  const totalPages = Math.max(
    1,
    Math.ceil((role === 'professor' ? announcementMessagesAll.length : orderedMessages.length) / pageSize)
  );
  const pagedMessages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orderedMessages.slice(start, start + pageSize);
  }, [orderedMessages, currentPage]);

  const announcementMessages = useMemo(
    () => {
      if (role === 'professor') {
        const start = (currentPage - 1) * pageSize;
        return announcementMessagesAll.slice(start, start + pageSize);
      }
      return pagedMessages.filter((item) => isAnnouncementMessage(item));
    },
    [role, announcementMessagesAll, currentPage, pagedMessages]
  );

  const directMessages = useMemo(
    () => {
      if (role === 'professor') return directMessagesAll;
      return pagedMessages.filter((item) => isDirectMessage(item));
    },
    [role, directMessagesAll, pagedMessages]
  );

  const studentCurrentAnnouncement = useMemo(() => {
    if (role !== 'student') return null;
    return announcementMessagesAll[studentAnnouncementIndex] || null;
  }, [role, announcementMessagesAll, studentAnnouncementIndex]);

  const announcementUnreadCount = useMemo(() => {
    if (role !== 'student') return 0;
    return announcementMessagesAll.filter((item) => {
      const timestamp = item.createdAt?.toDate?.()?.getTime?.() || 0;
      return timestamp > seenAnnouncementAt;
    }).length;
  }, [role, announcementMessagesAll, seenAnnouncementAt]);

  const directConversations = useMemo(() => {
    if (role === 'professor') {
      const grouped = new Map<string, ClassMessage[]>();

      for (const item of directMessagesAll) {
        let conversationStudentId: string | null = null;

        if (item.senderRole === 'student') {
          conversationStudentId = item.senderId;
        } else if (item.recipientType === 'student' && item.recipientStudentId) {
          conversationStudentId = item.recipientStudentId;
        }

        const key = conversationStudentId || 'unknown';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      }

      return [...grouped.entries()].map(([studentId, items]) => {
        const profile = studentById[studentId];
        const email = profile?.email || '';
        const fallbackName = email.includes('@') ? email.split('@')[0] : email;
        const name = profile?.displayName || fallbackName || (studentId === 'unknown' ? 'Unknown student' : studentId);

        return {
          key: studentId,
          label: name,
          items,
        };
      });
    }

    if (!directMessagesAll.length) {
      return [] as Array<{ key: string; label: string; items: ClassMessage[] }>;
    }

    const latestProfessorMessage = directMessagesAll.find((item) => item.senderRole === 'professor');
    const professorLabel = latestProfessorMessage?.senderDisplayName || latestProfessorMessage?.senderEmail || 'Professor';

    return [
      {
        key: 'professor',
        label: professorLabel,
        items: directMessagesAll,
      },
    ];
  }, [directMessagesAll, role, studentById]);

  const selectedConversationItems = useMemo(() => {
    if (!selectedConversationKey) return [] as ClassMessage[];
    const found = directConversations.find((conversation) => conversation.key === selectedConversationKey);
    return found?.items || [];
  }, [selectedConversationKey, directConversations]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationKey) return null;
    return directConversations.find((conversation) => conversation.key === selectedConversationKey) || null;
  }, [selectedConversationKey, directConversations]);

  const selectedConversationItemsAsc = useMemo(() => {
    if (!selectedConversation) return [] as ClassMessage[];
    return [...selectedConversation.items].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return timeA - timeB;
    });
  }, [selectedConversation]);

  const conversationUnreadCountMap = useMemo(() => {
    const unread: Record<string, number> = {};

    for (const conversation of directConversations) {
      const seenAt = seenConversationMap[conversation.key] || 0;
      unread[conversation.key] = conversation.items.filter((item) => {
        const timestamp = item.createdAt?.toDate?.()?.getTime?.() || 0;
        const isIncoming = role === 'professor' ? item.senderRole === 'student' : item.senderRole === 'professor';
        return isIncoming && timestamp > seenAt;
      }).length;
    }

    return unread;
  }, [directConversations, role, seenConversationMap]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedMessageIds([]);
    setSelectedConversationKey(null);
    setIsConversationModalOpen(false);
    setStudentAnnouncementIndex(0);
  }, [classId, role]);

  useEffect(() => {
    if (!announcementSeenStorageKey || !conversationSeenStorageKey) {
      setSeenAnnouncementAt(0);
      setSeenConversationMap({});
      return;
    }

    try {
      const storedAnnouncementSeen = Number(window.localStorage.getItem(announcementSeenStorageKey) || '0');
      const storedConversationSeen = JSON.parse(window.localStorage.getItem(conversationSeenStorageKey) || '{}') as Record<string, number>;
      setSeenAnnouncementAt(Number.isFinite(storedAnnouncementSeen) ? storedAnnouncementSeen : 0);
      setSeenConversationMap(storedConversationSeen || {});
    } catch {
      setSeenAnnouncementAt(0);
      setSeenConversationMap({});
    }
  }, [announcementSeenStorageKey, conversationSeenStorageKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (role !== 'professor') return;

    if (!directConversations.length) {
      setSelectedConversationKey(null);
      return;
    }

    if (selectedConversationKey && directConversations.some((conversation) => conversation.key === selectedConversationKey)) {
      return;
    }

    setSelectedConversationKey(directConversations[0].key);
  }, [role, directConversations, selectedConversationKey]);

  useEffect(() => {
    if (role !== 'student') return;
    const latestAnnouncementTime = announcementMessagesAll[0]?.createdAt?.toDate?.()?.getTime?.() || 0;
    if (!latestAnnouncementTime || latestAnnouncementTime <= seenAnnouncementAt) return;

    setSeenAnnouncementAt(latestAnnouncementTime);
    if (announcementSeenStorageKey) {
      window.localStorage.setItem(announcementSeenStorageKey, String(latestAnnouncementTime));
    }
  }, [role, announcementMessagesAll, seenAnnouncementAt, announcementSeenStorageKey]);

  useEffect(() => {
    if (role !== 'professor' || !user || !classId) return;

    const latestStudentMessageTime = orderedMessages.reduce((latest, item) => {
      if (item.senderRole !== 'student') return latest;
      const timestamp = item.createdAt?.toDate?.()?.getTime?.() || 0;
      return Math.max(latest, timestamp);
    }, 0);

    if (!latestStudentMessageTime) return;

    const key = `mailbox_seen_prof_class:${user.uid}:${classId}`;
    const current = Number(window.localStorage.getItem(key) || '0');
    if (latestStudentMessageTime > current) {
      window.localStorage.setItem(key, String(latestStudentMessageTime));
    }
  }, [role, user, classId, orderedMessages]);

  const deletableMessageIds = useMemo(() => {
    if (!user) return [] as string[];
    return orderedMessages
      .filter(
        (item) =>
          item.id &&
          item.senderId === user.uid
      )
      .map((item) => item.id as string);
  }, [orderedMessages, user]);

  const deletableIdsOnPage = useMemo(() => {
    if (!user || role !== 'professor') return [] as string[];
    return announcementMessages
      .filter((item) => item.id && item.senderId === user.uid && item.senderRole === 'professor')
      .map((item) => item.id as string);
  }, [announcementMessages, role, user]);

  useEffect(() => {
    if (!selectedMessageIds.length) return;
    const validIds = new Set(deletableMessageIds);
    setSelectedMessageIds((current) => current.filter((id) => validIds.has(id)));
  }, [deletableMessageIds, selectedMessageIds.length]);

  const toggleSelectMessage = (messageId: string, checked: boolean) => {
    setSelectedMessageIds((current) => {
      if (checked) {
        if (current.includes(messageId)) return current;
        return [...current, messageId];
      }
      return current.filter((id) => id !== messageId);
    });
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    if (!deletableIdsOnPage.length) return;
    setSelectedMessageIds((current) => {
      if (checked) {
        const merged = new Set([...current, ...deletableIdsOnPage]);
        return [...merged];
      }
      return current.filter((id) => !deletableIdsOnPage.includes(id));
    });
  };

  const handleDeleteSelected = async () => {
    if (!classId || !selectedMessageIds.length) return;

    setIsDeletingSelected(true);
    try {
      await Promise.all(selectedMessageIds.map((messageId) => deleteDoc(doc(firestore, 'classMessages', messageId))));
      const deletedCount = selectedMessageIds.length;
      setSelectedMessageIds([]);
      toast({
        title: 'Messages deleted',
        description: `${deletedCount} message${deletedCount > 1 ? 's were' : ' was'} deleted.`,
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete selected messages.',
      });
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const openConversationModal = (conversationKey: string) => {
    setSelectedConversationKey(conversationKey);
    setIsConversationModalOpen(true);

    const conversation = directConversations.find((item) => item.key === conversationKey);
    if (!conversation) return;

    const latestIncomingTime = conversation.items.reduce((latest, item) => {
      const timestamp = item.createdAt?.toDate?.()?.getTime?.() || 0;
      const isIncoming = role === 'professor' ? item.senderRole === 'student' : item.senderRole === 'professor';
      if (!isIncoming) return latest;
      return Math.max(latest, timestamp);
    }, 0);

    if (!latestIncomingTime) return;

    setSeenConversationMap((current) => {
      const next = { ...current, [conversationKey]: latestIncomingTime };
      if (conversationSeenStorageKey) {
        window.localStorage.setItem(conversationSeenStorageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const sendConversationDirectMessage = async () => {
    if (!user || !classId || !selectedConversationKey) return;
    if (!conversationMessage.trim()) return;

    if (role === 'professor' && selectedConversationKey === 'unknown') return;

    setIsSendingConversation(true);
    try {
      await addDoc(collection(firestore, 'classMessages'), {
        classId,
        senderId: user.uid,
        senderEmail: user.email || null,
        senderDisplayName: user.displayName || null,
        senderRole: role,
        recipientType: role === 'professor' ? 'student' : 'all',
        recipientStudentId: role === 'professor' ? selectedConversationKey : null,
        message: conversationMessage.trim(),
        createdAt: serverTimestamp(),
      });

      setConversationMessage('');
      toast({ title: 'Message sent', description: 'Direct message sent successfully.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: error?.message || 'Could not send direct message.',
      });
    } finally {
      setIsSendingConversation(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !message.trim() || !classId) return;
    if (role === 'professor' && recipientMode === 'student' && !targetStudentId) return;

    setIsSending(true);
    try {
      await addDoc(collection(firestore, 'classMessages'), {
        classId,
        senderId: user.uid,
        senderEmail: user.email || null,
        senderDisplayName: user.displayName || null,
        senderRole: role,
        recipientType: role === 'professor' ? recipientMode : 'all',
        recipientStudentId: role === 'professor' && recipientMode === 'student' ? targetStudentId : null,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      setMessage('');
      toast({
        title: 'Message sent',
        description: 'Your class mailbox message was sent successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: error?.message || 'Could not send message.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {!classId && (
            <p className="text-sm text-muted-foreground">Class ID is not set yet. Please refresh in a moment.</p>
          )}

          {role === 'professor' && classId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select value={recipientMode} onValueChange={(value) => setRecipientMode(value as 'all' | 'student')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose message target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Announce to all students</SelectItem>
                  <SelectItem value="student">Message specific student</SelectItem>
                </SelectContent>
              </Select>

              {recipientMode === 'student' && (
                <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.email
                          ? `${student.email}${student.displayName ? ` (${student.displayName})` : ''}`
                          : student.displayName ?? student.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Textarea
            placeholder={role === 'professor' ? 'Send message to your class...' : 'Message your professor...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending || !classId}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button onClick={sendMessage} disabled={isSending || !message.trim() || !classId}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>

        <div className="space-y-3 pr-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : orderedMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No class messages yet.</p>
          ) : role === 'professor' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3 space-y-3 max-h-[320px] overflow-y-auto">
                <p className="text-sm font-semibold">Announcements</p>
                {announcementMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No announcements on this page.</p>
                ) : (
                  announcementMessages.map((item) => {
                    const sender = item.senderDisplayName || item.senderEmail || 'Unknown sender';
                    const sentAt = item.createdAt?.toDate?.()?.toLocaleString?.() || 'Just now';
                    return (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {item.id && item.senderId === user?.uid && item.senderRole === 'professor' && (
                              <Checkbox
                                checked={selectedMessageIds.includes(item.id)}
                                onCheckedChange={(checked) => toggleSelectMessage(item.id as string, !!checked)}
                                aria-label="Select message"
                              />
                            )}
                            <p className="text-sm font-semibold">{sender}</p>
                            <Badge variant={item.senderRole === 'professor' ? 'default' : 'secondary'}>
                              {item.senderRole}
                            </Badge>
                            <Badge variant="outline">announcement</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{sentAt}</p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="rounded-md border p-3 space-y-3 max-h-[320px] overflow-y-auto">
                <p className="text-sm font-semibold">Direct</p>
                {directMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No direct messages on this page.</p>
                ) : role === 'professor' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {directConversations.map((conversation) => (
                        <Button
                          key={conversation.key}
                          type="button"
                          size="sm"
                          variant={selectedConversationKey === conversation.key && isConversationModalOpen ? 'default' : 'outline'}
                          onClick={() => openConversationModal(conversation.key)}
                        >
                          {conversation.label}
                          {(conversationUnreadCountMap[conversation.key] || 0) > 0 && (
                            <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                              {conversationUnreadCountMap[conversation.key] > 99 ? '99+' : conversationUnreadCountMap[conversation.key]}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Click a conversation to open a chat popup.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {directConversations.map((conversation) => (
                      <Button
                        key={conversation.key}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openConversationModal(conversation.key)}
                      >
                        Open conversation with {conversation.label}
                      </Button>
                    ))}
                    <p className="text-xs text-muted-foreground">Open your conversation popup to view only direct chat.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border p-3 space-y-3 max-h-[240px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Announcement Board</p>
                  {announcementUnreadCount > 0 && (
                    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                      {announcementUnreadCount > 99 ? '99+' : announcementUnreadCount}
                    </span>
                  )}
                </div>

                {!studentCurrentAnnouncement ? (
                  <p className="text-xs text-muted-foreground">No announcements yet.</p>
                ) : (
                  (() => {
                    const item = studentCurrentAnnouncement;
                    const sender = item.senderDisplayName || item.senderEmail || 'Unknown sender';
                    const sentAt = item.createdAt?.toDate?.()?.toLocaleString?.() || 'Just now';
                    return (
                      <div className="space-y-3">
                        <div className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{sender}</p>
                              <Badge variant={item.senderRole === 'professor' ? 'default' : 'secondary'}>
                                {item.senderRole}
                              </Badge>
                              <Badge variant="outline">announcement</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{sentAt}</p>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Announcement {studentAnnouncementIndex + 1} of {announcementMessagesAll.length}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setStudentAnnouncementIndex((index) => Math.min(announcementMessagesAll.length - 1, index + 1))}
                              disabled={studentAnnouncementIndex >= announcementMessagesAll.length - 1}
                            >
                              Previous Announcement
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setStudentAnnouncementIndex((index) => Math.max(0, index - 1))}
                              disabled={studentAnnouncementIndex <= 0}
                            >
                              Next Announcement
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-sm font-semibold">Direct Message with Professor</p>
                {directConversations.map((conversation) => (
                  <Button
                    key={conversation.key}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openConversationModal(conversation.key)}
                  >
                    Open conversation with {conversation.label}
                    {(conversationUnreadCountMap[conversation.key] || 0) > 0 && (
                      <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                        {conversationUnreadCountMap[conversation.key] > 99 ? '99+' : conversationUnreadCountMap[conversation.key]}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {role === 'professor' && deletableIdsOnPage.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={deletableIdsOnPage.every((id) => selectedMessageIds.includes(id)) && deletableIdsOnPage.length > 0}
                onCheckedChange={(checked) => toggleSelectAllOnPage(!!checked)}
                aria-label="Select all messages on this page"
              />
              <p className="text-xs text-muted-foreground">Select all messages on this page</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={!selectedMessageIds.length || isDeletingSelected}
            >
              {isDeletingSelected ? 'Deleting...' : `Delete Selected (${selectedMessageIds.length})`}
            </Button>
          </div>
        )}

        {directConversations.length > 0 && (
          <Dialog open={isConversationModalOpen} onOpenChange={setIsConversationModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedConversation ? `Conversation: ${selectedConversation.label}` : 'Conversation'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {selectedConversationItemsAsc.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
                ) : (
                  selectedConversationItemsAsc.map((item) => {
                    const sender = item.senderDisplayName || item.senderEmail || 'Unknown sender';
                    const sentAt = item.createdAt?.toDate?.()?.toLocaleString?.() || 'Just now';
                    const isMine = item.senderId === user?.uid;

                    return (
                      <div key={item.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[85%] rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {item.id && isMine && (
                                <Checkbox
                                  checked={selectedMessageIds.includes(item.id)}
                                  onCheckedChange={(checked) => toggleSelectMessage(item.id as string, !!checked)}
                                  aria-label="Select direct message"
                                />
                              )}
                              <p className="text-sm font-semibold">{sender}</p>
                              <Badge variant={item.senderRole === 'professor' ? 'default' : 'secondary'}>
                                {item.senderRole}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{sentAt}</p>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Type a direct message..."
                  value={conversationMessage}
                  onChange={(event) => setConversationMessage(event.target.value)}
                  disabled={!selectedConversation || isSendingConversation}
                  className="min-h-[90px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={!selectedMessageIds.length || isDeletingSelected}
                  >
                    {isDeletingSelected ? 'Deleting...' : `Delete Selected (${selectedMessageIds.length})`}
                  </Button>
                  <Button
                    type="button"
                    onClick={sendConversationDirectMessage}
                    disabled={!selectedConversation || !conversationMessage.trim() || isSendingConversation}
                  >
                    {isSendingConversation ? 'Sending...' : 'Send Direct Message'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {orderedMessages.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
