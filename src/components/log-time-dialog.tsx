'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
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
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { TOTAL_REQUIRED_HOURS } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';
import { Textarea } from './ui/textarea';

const logTimeSchema = z.object({
  hours: z.coerce.number().min(0, 'Hours must be a non-negative number.').max(24, 'Cannot log more than 24 hours a day.'),
  notes: z.string().max(1000, "Notes can't be longer than 1000 characters.").optional(),
});

interface LogTimeDialogProps {
  date: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalHours: number;
  profile: UserProfile | null;
}

export function LogTimeDialog({ date, open, onOpenChange, totalHours, profile }: LogTimeDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof logTimeSchema>>({
    resolver: zodResolver(logTimeSchema),
    defaultValues: {
      hours: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ hours: 0, notes: '' });
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof logTimeSchema>) {
    if (!user || !date) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and select a date.' });
      return;
    }

    setIsSubmitting(true);
    
    const totalGoal = profile?.totalRequiredHours || TOTAL_REQUIRED_HOURS;
    if (totalHours + values.hours > totalGoal) {
        toast({
          variant: 'destructive',
          title: 'Total Hours Exceeded',
          description: `Logging these hours would exceed the ${totalGoal} hour limit.`,
        });
        setIsSubmitting(false);
        return;
    }

    const timeEntriesCollectionRef = collection(firestore, 'users', user.uid, 'timeEntries');
    const newTimeEntryRef = doc(timeEntriesCollectionRef);
    const newTimeEntry = {
      id: newTimeEntryRef.id,
      userId: user.uid,
      date: Timestamp.fromDate(date),
      hoursWorked: values.hours,
      notes: values.notes || '',
      lastUpdatedAt: serverTimestamp(),
    };

    setDoc(newTimeEntryRef, newTimeEntry)
      .then(() => {
        toast({
          title: 'Success!',
          description: 'Your hours have been logged successfully.',
        });
        form.reset();
        onOpenChange(false);
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
            path: newTimeEntryRef.path,
            operation: 'create',
            requestResourceData: newTimeEntry,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'There was a problem with your request.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const presetHours = [4, 8, 12];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Hours for {date ? format(date, 'MMMM d, yyyy') : ''}</DialogTitle>
          <DialogDescription>Add a new time entry. Click save when you're done.</DialogDescription>
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
                    <Input type="number" step="0.5" placeholder="e.g., 8" {...field} />
                  </FormControl>
                   <div className="flex gap-2 pt-2">
                      {presetHours.map(hour => (
                        <Button
                          key={hour}
                          type="button"
                          variant="outline"
                          onClick={() => form.setValue('hours', hour, { shouldValidate: true })}
                        >
                          {hour} hrs
                        </Button>
                      ))}
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any notes about your work..." className="resize-none" {...field} />
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
