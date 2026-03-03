'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collectionGroup, writeBatch, collection, getDocs } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { TimeEntry, UserProfile } from '@/lib/types';
import { ADMIN_EMAIL } from '@/lib/constants';

import LoadingSpinner from '@/components/loading-spinner';
import { StatCard } from './stat-card';
import { Users, UserCheck, UserX, Clock, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import UserProgressCard from './user-progress-card';
import { Button, buttonVariants } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserWithData = {
  profile: UserProfile;
  timeEntries: TimeEntry[];
  totalHours: number;
  completedDays: number;
  latestEntryDate: Date;
};

export default function AdminDashboardClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortMethod, setSortMethod] = useState<'email-asc' | 'hours-desc' | 'latest-entry-desc'>('email-asc');

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isUserLoading) {
      if (!user || !isAdmin) {
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, isAdmin, router]);

  const profilesQuery = useMemoFirebase(() => isAdmin ? collectionGroup(firestore, 'userProfile') : null, [isAdmin, firestore]);
  const entriesQuery = useMemoFirebase(() => isAdmin ? collectionGroup(firestore, 'timeEntries') : null, [isAdmin, firestore]);

  const { data: allProfiles, isLoading: profilesLoading } = useCollection<UserProfile>(profilesQuery);
  const { data: allEntries, isLoading: entriesLoading } = useCollection<TimeEntry>(entriesQuery);

  const { usersWithData, totalStudents, mostActive, leastActive, lastEdited } = useMemo(() => {
    if (!allProfiles || !allEntries || !isAdmin) {
      return { usersWithData: [], totalStudents: 0, mostActive: null, leastActive: null, lastEdited: null };
    }

    const entriesByUserId = allEntries.reduce((acc, entry) => {
      if (!acc[entry.userId]) {
        acc[entry.userId] = [];
      }
      acc[entry.userId].push(entry);
      return acc;
    }, {} as { [key: string]: TimeEntry[] });

    const usersWithData: UserWithData[] = allProfiles
      .map(profile => {
        const userEntries = entriesByUserId[profile.id] || [];
        const totalHours = userEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
        const latestEntryDate = userEntries.reduce((latest, entry) => {
            if (!entry.lastUpdatedAt) return latest;
            const entryDate = entry.lastUpdatedAt.toDate();
            return entryDate > latest ? entryDate : latest;
        }, new Date(0));

        return {
          profile,
          timeEntries: userEntries,
          totalHours,
          completedDays: userEntries.length,
          latestEntryDate,
        };
      })
    
    switch (sortMethod) {
        case 'hours-desc':
            usersWithData.sort((a, b) => b.totalHours - a.totalHours);
            break;
        case 'latest-entry-desc':
            usersWithData.sort((a, b) => b.latestEntryDate.getTime() - a.latestEntryDate.getTime());
            break;
        case 'email-asc':
        default:
            usersWithData.sort((a, b) => {
                const emailA = a.profile?.email || '';
                const emailB = b.profile?.email || '';
                return emailA.localeCompare(emailB);
            });
            break;
    }

    const totalStudents = usersWithData.length;

    let mostActive: UserWithData | null = null;
    let leastActive: UserWithData | null = null;
    if (totalStudents > 0) {
      const sortedByHours = [...usersWithData].sort((a, b) => b.totalHours - a.totalHours);
      mostActive = sortedByHours[0];
      leastActive = sortedByHours[sortedByHours.length - 1];
    }
    
    let lastEdited: UserWithData | null = null;
    let latestTimestamp: Date | null = null;

    allEntries.forEach(entry => {
        if (entry.lastUpdatedAt) {
            const entryDate = entry.lastUpdatedAt.toDate();
            if (!latestTimestamp || entryDate > latestTimestamp) {
                latestTimestamp = entryDate;
                const userForEntry = usersWithData.find(u => u.profile.id === entry.userId);
                if(userForEntry) {
                  lastEdited = userForEntry;
                }
            }
        }
    });

    return { usersWithData, totalStudents, mostActive, leastActive, lastEdited };
  }, [allProfiles, allEntries, sortMethod, isAdmin]);

  const handleDeleteUserAccount = async (userIdToDelete: string) => {
      if (!firestore || !isAdmin) return;
      setIsDeleting(true);

      try {
          const batch = writeBatch(firestore);

          const timeEntriesRef = collection(firestore, 'users', userIdToDelete, 'timeEntries');
          const timeEntriesSnapshot = await getDocs(timeEntriesRef);
          timeEntriesSnapshot.forEach(doc => batch.delete(doc.ref));

          const userProfileRef = collection(firestore, 'users', userIdToDelete, 'userProfile');
          const userProfileSnapshot = await getDocs(userProfileRef);
          userProfileSnapshot.forEach(doc => batch.delete(doc.ref));

          await batch.commit();

          toast({
              title: "User Account Deleted",
              description: "User account data has been permanently deleted.",
          });

      } catch (error: any) {
          console.error("Error deleting user data: ", error);
          toast({
              variant: 'destructive',
              title: 'Deletion Failed',
              description: error.message || 'Could not delete user account data.',
          });
      } finally {
          setIsDeleting(false);
      }
  };

  if (isUserLoading || profilesLoading || entriesLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm font-medium">Sort by:</label>
            <Select value={sortMethod} onValueChange={(value) => setSortMethod(value as any)}>
                <SelectTrigger id="sort-select" className="w-[220px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                    <SelectItem value="hours-desc">Most Active (Hours)</SelectItem>
                    <SelectItem value="latest-entry-desc">Most Recently Active</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Students" value={totalStudents} icon={Users} />
        <StatCard title="Most Active" value={mostActive?.profile.displayName ?? mostActive?.profile.email ?? 'N/A'} icon={UserCheck} description={`${mostActive?.totalHours.toFixed(1) ?? 0} hrs logged`}/>
        <StatCard title="Least Active" value={leastActive?.profile.displayName ?? leastActive?.profile.email ?? 'N/A'} icon={UserX} description={`${leastActive?.totalHours.toFixed(1) ?? 0} hrs logged`} />
        <StatCard title="Last Edited By" value={lastEdited?.profile.displayName ?? lastEdited?.profile.email ?? 'N/A'} icon={Clock} />
      </div>

      <h2 className="text-2xl font-bold font-headline tracking-tight mb-4 mt-8">
        All Student Progress
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {usersWithData.map(userData => (
            <AccordionItem value={userData.profile.id} key={userData.profile.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <span className="font-bold">
                    {(() => {
                      const email = userData.profile.email || 'no-email';
                      const fallbackName = email.includes('@') ? email.split('@')[0] : email;
                      const name = userData.profile.displayName || fallbackName;
                      return `${name} - ${email}`;
                    })()}
                  </span>
                </div>
              </AccordionTrigger>
                <AccordionContent>
                    <UserProgressCard userWithData={userData} />
                    <div className="flex justify-end p-4 border-t bg-muted/20 rounded-b-lg">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete user account data for <strong>{userData.profile.displayName ?? userData.profile.email}</strong>.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isDeleting}
                                      onClick={() => handleDeleteUserAccount(userData.profile.id)}
                                        className={buttonVariants({ variant: "destructive" })}
                                    >
                                      {isDeleting ? 'Deleting...' : 'Confirm Delete Account'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AccordionContent>
            </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
