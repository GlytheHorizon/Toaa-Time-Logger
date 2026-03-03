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

const editGoalSchema = z.object({
  totalRequiredHours: z.coerce.number().min(1, 'Goal must be at least 1 hour.'),
});

export function EditGoalDialog({ profile }: { profile: UserProfile | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editGoalSchema>>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      totalRequiredHours: profile?.totalRequiredHours || 400,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ totalRequiredHours: profile.totalRequiredHours });
    }
  }, [profile, form]);

  async function onSubmit(values: z.infer<typeof editGoalSchema>) {
    if (!user || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and have a profile.' });
      return;
    }

    setIsSubmitting(true);
    
    const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', profile.id);
    const updatedData = { totalRequiredHours: values.totalRequiredHours };

    updateDoc(userProfileRef, updatedData)
      .then(() => {
        toast({
          title: 'Success!',
          description: 'Your hour goal has been updated.',
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
            description: 'There was a problem updating your goal.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Hour Goal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Hour Goal</DialogTitle>
          <DialogDescription>Set your new total required internship hours.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="totalRequiredHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Required Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="e.g., 400" {...field} />
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
