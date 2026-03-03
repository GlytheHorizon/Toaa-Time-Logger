'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, FirestorePermissionError, errorEmitter } from '@/firebase';

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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import type { TimeEntry } from '@/lib/types';
import { TOTAL_REQUIRED_HOURS } from '@/lib/constants';
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

const editTimeEntrySchema = z.object({
  hours: z.coerce.number().min(0, 'Hours must be a non-negative number.').max(24, 'Cannot log more than 24 hours a day.'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters.').optional(),
});

interface EditTimeEntryDialogProps {
  entry: TimeEntry | null;
  totalHours: number;
  profileTotalHours: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTimeEntryDialog({ entry, open, onOpenChange, totalHours, profileTotalHours }: EditTimeEntryDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof editTimeEntrySchema>>({
    resolver: zodResolver(editTimeEntrySchema),
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        hours: entry.hoursWorked,
        notes: entry.notes || '',
      });
    }
  }, [entry, form]);

  async function onSubmit(values: z.infer<typeof editTimeEntrySchema>) {
    if (!user || !entry) return;

    setIsSubmitting(true);

    const otherHours = totalHours - entry.hoursWorked;
    if (otherHours + values.hours > profileTotalHours) {
        toast({
            variant: 'destructive',
            title: 'Total Hours Exceeded',
            description: `Saving these hours would exceed your ${profileTotalHours} hour goal.`
        });
        setIsSubmitting(false);
        return;
    }

    const entryRef = doc(firestore, 'users', user.uid, 'timeEntries', entry.id);
    const updatedData = { 
      hoursWorked: values.hours, 
      notes: values.notes,
      lastUpdatedAt: serverTimestamp(),
    };

    updateDoc(entryRef, updatedData)
      .then(() => {
        toast({ title: 'Success!', description: 'Your time entry has been updated.' });
        onOpenChange(false);
      })
      .catch(() => {
        const contextualError = new FirestorePermissionError({
            path: entryRef.path,
            operation: 'update',
            requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  async function handleDelete() {
    if (!user || !entry) return;

    setIsDeleting(true);
    const entryRef = doc(firestore, 'users', user.uid, 'timeEntries', entry.id);

    deleteDoc(entryRef)
      .then(() => {
        toast({ title: 'Entry Deleted', description: 'Your time entry has been successfully deleted.' });
        onOpenChange(false);
      })
      .catch(() => {
        const contextualError = new FirestorePermissionError({
            path: entryRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
          <DialogDescription>Make changes to your logged hours.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours Worked</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any notes about your work..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="!mt-8 flex-row justify-between w-full">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Entry'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this time entry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
