'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { TimeEntry, UserProfile } from './types';
import { TOTAL_REQUIRED_HOURS } from './constants';
import { differenceInCalendarWeeks, startOfWeek } from 'date-fns';

export const useTimeData = (userId?: string) => {
  const firestore = useFirestore();
  const [totalHours, setTotalHours] = useState(0);

  const profileQuery = useMemoFirebase(
    () => (userId ? collection(firestore, 'users', userId, 'userProfile') : null),
    [firestore, userId]
  );
  const { data: profileData, isLoading: profileLoading } =
    useCollection<UserProfile>(profileQuery);
  const profile = profileData?.[0] || null;

  const timeEntriesQuery = useMemoFirebase(
    () => (userId ? collection(firestore, 'users', userId, 'timeEntries') : null),
    [firestore, userId]
  );
  const { data: timeEntries, isLoading: timeEntriesLoading } =
    useCollection<TimeEntry>(timeEntriesQuery);

  useEffect(() => {
    if (timeEntries) {
      const newTotalHours = timeEntries.reduce(
        (acc, entry) => acc + entry.hoursWorked,
        0
      );
      setTotalHours(newTotalHours);
    }
  }, [timeEntries]);

  const totalGoal = profile?.totalRequiredHours || TOTAL_REQUIRED_HOURS;
  const remainingHours = totalGoal - totalHours;
  const completedDays = timeEntries?.length || 0;
  
  const completedWeeks = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) {
      return 0;
    }
    const weekNumbers = new Set(
        timeEntries.map(log => {
            const date = log.date.toDate();
            // Get the week number for the date
            const firstDayOfYear = startOfWeek(new Date(date.getFullYear(), 0, 1));
            return differenceInCalendarWeeks(date, firstDayOfYear, { weekStartsOn: 0 }); // 0 for Sunday
        })
    );
    return weekNumbers.size;
  }, [timeEntries]);


  return {
    profile,
    logs: timeEntries || [],
    loading: profileLoading || timeEntriesLoading,
    totalHours,
    remainingHours: Math.max(0, remainingHours),
    completedDays,
    completedWeeks,
  };
};
