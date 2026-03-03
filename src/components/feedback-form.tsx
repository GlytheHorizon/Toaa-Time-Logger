"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(firestore, 'feedback'), {
        userId: user?.uid || null,
        email: user?.email || null,
        displayName: user?.displayName || null,
        message,
        createdAt: serverTimestamp(),
      });
      setMessage('');
      toast({
        title: 'Report sent',
        description: 'Your feedback was sent successfully.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: err?.message || 'Could not send your feedback. Please try again.',
      });
    }
    setSending(false);
  };

  return (
    <form className="mt-4 flex flex-col gap-2" onSubmit={handleSubmit}>
      <textarea
        className="border rounded p-2 min-h-[60px] bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors"
        placeholder="Your feedback, suggestion, or issue..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={sending}
        required
      />
      <Button type="submit" disabled={sending}>
        {sending ? 'Sending...' : 'Send Feedback'}
      </Button>
    </form>
  );
}
