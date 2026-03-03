'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Pencil } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

const editSubtitleSchema = z.object({
  dashboardSubtitle: z.string().min(1, 'Subtitle cannot be empty.').max(100, 'Subtitle is too long.'),
});

export function EditSubtitleDialog({ profile }: { profile: UserProfile | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editSubtitleSchema>>({
    resolver: zodResolver(editSubtitleSchema),
    defaultValues: {
      dashboardSubtitle: profile?.dashboardSubtitle || "Here's your internship progress at a glance.",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ dashboardSubtitle: profile.dashboardSubtitle || "Here's your internship progress at a glance." });
    }
  }, [profile, form]);

  async function onSubmit(values: z.infer<typeof editSubtitleSchema>) {
    if (!user || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and have a profile.' });
      return;
    }

    setIsSubmitting(true);
    
    const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', user.uid);
    const updatedData = { dashboardSubtitle: values.dashboardSubtitle };

    updateDoc(userProfileRef, updatedData)
      .then(() => {
        toast({
          title: 'Success!',
          description: 'Your subtitle has been updated.',
        });
        setOpen(false);
      })
      .catch(() => {
        const contextualError = new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'update',
            requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'There was a problem updating your subtitle.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 no-print">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Subtitle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Dashboard Subtitle</DialogTitle>
          <DialogDescription>Update the subtitle displayed on your dashboard.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="dashboardSubtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtitle</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Awesome Project Tracker" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
