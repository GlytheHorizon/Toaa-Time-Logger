'use client';

import { useEffect, useMemo, useState } from 'react';
import { ADMIN_EMAIL } from '@/lib/constants';
import { useFirestore, useUser } from '@/firebase';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import type { Feedback } from '../lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Mail, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminMailboxButton() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(firestore, 'feedback'),
      (snapshot) => {
        const items = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Feedback, 'id'>),
        }));
        setFeedbackItems(items);
        setIsLoading(false);
      },
      () => {
        setFeedbackItems([]);
        setIsLoading(false);
        setError('Mailbox is unavailable. Please check Firestore rules.');
      }
    );

    return () => unsubscribe();
  }, [isAdmin, firestore]);

  const sortedItems = useMemo(() => {
    return [...feedbackItems].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return timeB - timeA;
    });
  }, [feedbackItems]);

  const unreadCount = sortedItems.length;

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      setDeletingId(feedbackId);
      await deleteDoc(doc(firestore, 'feedback', feedbackId));
      toast({ title: 'Message deleted', description: 'Feedback was removed from mailbox.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete feedback.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open admin mailbox">
          <Mail className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center" variant="destructive">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Admin Mailbox</DialogTitle>
          <DialogDescription>Feedback, suggestions, and reported issues from users.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading mailbox...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sortedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => {
                const senderName = item.displayName || item.email || 'Anonymous User';
                const sentAt = item.createdAt?.toDate?.()?.toLocaleString?.() || 'Just now';
                return (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold leading-none">{senderName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sentAt}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Delete message">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the selected feedback from the admin mailbox.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === item.id}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deletingId === item.id}
                              onClick={() => handleDeleteFeedback(item.id!)}
                              className={buttonVariants({ variant: 'destructive' })}
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
