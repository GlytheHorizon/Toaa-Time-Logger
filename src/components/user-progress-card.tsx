'use client';

import { useMemo } from 'react';
import type { TimeEntry, UserProfile } from '@/lib/types';
import { StatCard } from './stat-card';
import { Clock, Hourglass, CalendarDays, Calendar, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TimeLogCalendar } from './time-log-calendar';
import { differenceInCalendarWeeks, startOfWeek } from 'date-fns';

type UserWithData = {
  profile: UserProfile;
  timeEntries: TimeEntry[];
  totalHours: number;
  completedDays: number;
};

interface UserProgressCardProps {
  userWithData: UserWithData;
}

export default function UserProgressCard({ userWithData }: UserProgressCardProps) {
  const { profile, timeEntries, totalHours, completedDays } = userWithData;

  const totalGoal = profile.totalRequiredHours;
  const remainingHours = Math.max(0, totalGoal - totalHours);
  const progressPercentage = totalGoal > 0 ? (totalHours / totalGoal) * 100 : 0;
  
  const completedWeeks = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) {
      return 0;
    }
    const weekNumbers = new Set(
        timeEntries.map(log => {
            const date = log.date.toDate();
            const firstDayOfYear = startOfWeek(new Date(date.getFullYear(), 0, 1));
            return differenceInCalendarWeeks(date, firstDayOfYear, { weekStartsOn: 0 }); // 0 for Sunday
        })
    );
    return weekNumbers.size;
  }, [timeEntries]);

  return (
    <div className="space-y-6 p-4 bg-muted/20 rounded-lg">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Completed" value={`${totalHours.toFixed(1)} / ${totalGoal} hrs`} icon={Clock} />
        <StatCard title="Remaining" value={`${remainingHours.toFixed(1)} hrs`} icon={Hourglass} />
        <StatCard title="Days Logged" value={completedDays} icon={CalendarDays} />
        <StatCard title="Weeks Logged" value={completedWeeks} icon={Calendar} />
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary"/>
                  Progress Overview
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{progressPercentage.toFixed(1)}% complete</p>
          </CardContent>
      </Card>

      <TimeLogCalendar timeEntries={timeEntries} isReadOnly />
    </div>
  );
}
