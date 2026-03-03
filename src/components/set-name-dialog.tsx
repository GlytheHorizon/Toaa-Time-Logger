'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useFirestore, useUser, useAuth as useFirebaseAuth, FirestorePermissionError, errorEmitter } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import LoadingSpinner from './loading-spinner';

const setNameSchema = z.object({
  displayName: z.string().min(1, 'Display name cannot be empty.').max(50, 'Display name is too long.'),
});

interface SetNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
}

export function SetNameDialog({ open, onOpenChange, profile }: SetNameDialogProps) {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof setNameSchema>>({
    resolver: zodResolver(setNameSchema),
    defaultValues: {
      displayName: '',
    },
  });
  
  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
  };

  async function onSubmit(values: z.infer<typeof setNameSchema>) {
    if (!user || !auth.currentUser || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to set your name.' });
      return;
    }

    setIsSubmitting(true);
    
    const updatedData = { displayName: values.displayName };

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
      });

      // Update Firestore profile
      const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', user.uid);
      await updateDoc(userProfileRef, updatedData);
      
      toast({
        title: 'Success!',
        description: 'Your name has been set.',
      });
      onOpenChange(false);
      // Force a reload to ensure the new displayName is reflected everywhere
      window.location.reload();
    } catch (error: any) {
        if (user && profile) {
            const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', user.uid);
            const contextualError = new FirestorePermissionError({
                path: userProfileRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', contextualError);
        }
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'There was a problem setting your name.',
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Welcome! Please set your name.</DialogTitle>
          <DialogDescription>
            It looks like you don't have a display name yet. Please enter one to continue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : 'Save and Continue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
