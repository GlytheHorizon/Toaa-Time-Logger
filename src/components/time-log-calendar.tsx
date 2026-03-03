'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { TimeEntry } from '@/lib/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDate,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { BookCheck, ChevronLeft, ChevronRight, Edit, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { EditTimeEntryDialog } from './edit-time-entry-dialog';
import { useTimeData } from '@/lib/hooks';
import { useUser } from '@/firebase';
import { TOTAL_REQUIRED_HOURS } from '@/lib/constants';
import { LogTimeDialog } from './log-time-dialog';
import LoadingSpinner from './loading-spinner';

interface TimeLogCalendarProps {
  timeEntries: TimeEntry[];
  isReadOnly?: boolean;
}

export function TimeLogCalendar({ timeEntries, isReadOnly = false }: TimeLogCalendarProps) {
  const { user } = useUser();
  const { totalHours, profile } = useTimeData(user?.uid);
  const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);
  const [dateToLog, setDateToLog] = useState<Date | null>(null);

  // Initialize with null to avoid hydration mismatch from new Date()
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);

  useEffect(() => {
    // Determine the initial month once mounted on the client
    if (!currentMonth) {
      if (timeEntries && timeEntries.length > 0) {
        const sortedEntries = [...timeEntries].sort((a, b) => b.date.toMillis() - a.date.toMillis());
        setCurrentMonth(startOfMonth(sortedEntries[0].date.toDate()));
      } else {
        setCurrentMonth(startOfMonth(new Date()));
      }
    }
  }, [timeEntries, currentMonth]);

  const entriesByDate = useMemo(() => {
    return (timeEntries || []).reduce((acc, entry) => {
      const dateKey = format(entry.date.toDate(), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(entry);
      return acc;
    }, {} as { [key: string]: TimeEntry[] });
  }, [timeEntries]);

  const daysInMonth = useMemo(() => {
    if (!currentMonth) return [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const startingDayIndex = daysInMonth.length > 0 ? getDay(daysInMonth[0]) : 0;
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const nextMonth = () => currentMonth && setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => currentMonth && setCurrentMonth(subMonths(currentMonth, 1));

  if (!currentMonth) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <BookCheck className="h-5 w-5 text-primary" />
            Logged Hours Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="flex w-full items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="no-print">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold font-headline">{format(currentMonth, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="no-print">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2 w-full">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-muted-foreground text-sm">{day}</div>
            ))}

            {Array.from({ length: startingDayIndex }).map((_, index) => (
              <div key={`empty-${index}`} className="border rounded-lg bg-muted/20" />
            ))}

            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const entries = entriesByDate[dateKey];
              const totalHoursForDay = entries?.reduce((sum, e) => sum + e.hoursWorked, 0);

              return (
                <div
                  key={day.toString()}
                  onClick={() => !isReadOnly && setDateToLog(day)}
                  className={cn(
                    'border rounded-lg p-2 h-28 flex flex-col justify-start items-start relative group/day',
                    !isReadOnly && 'cursor-pointer transition-colors hover:bg-accent/50',
                    isToday(day) && 'bg-accent/50 border-primary/50',
                    !isSameMonth(day, currentMonth) && 'text-muted-foreground bg-muted/20',
                    totalHoursForDay !== undefined && 'border-primary border-2'
                  )}
                >
                  <div className={cn("font-medium text-sm", isToday(day) && "text-primary font-bold")}>{getDate(day)}</div>
                  {totalHoursForDay !== undefined ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        >
                          <span className="bg-primary text-primary-foreground text-lg font-bold rounded-full w-12 h-12 flex items-center justify-center">
                            {totalHoursForDay}h
                          </span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Entries for {format(day, 'MMMM d, yyyy')}</h4>
                            <p className="text-sm text-muted-foreground">
                              You logged {totalHoursForDay} hours on this day.
                            </p>
                          </div>
                          <Separator />
                          <div className="grid gap-2 max-h-48 overflow-y-auto">
                            {entries.map((entry) => (
                              <div key={entry.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md p-2 hover:bg-accent">
                                <div className='space-y-1'>
                                  <p className="text-sm font-medium leading-none">{entry.hoursWorked} hours</p>
                                  <p className="text-sm text-muted-foreground break-words">{entry.notes || 'No notes'}</p>
                                </div>
                                {!isReadOnly && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 no-print" onClick={() => setEntryToEdit(entry)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                     !isReadOnly && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity">
                      <PlusCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {!isReadOnly && (
        <>
            <LogTimeDialog
                date={dateToLog}
                open={!!dateToLog}
                onOpenChange={(isOpen) => !isOpen && setDateToLog(null)}
                totalHours={totalHours}
                profile={profile}
            />
            <EditTimeEntryDialog
                entry={entryToEdit}
                open={!!entryToEdit}
                onOpenChange={(isOpen) => !isOpen && setEntryToEdit(null)}
                totalHours={totalHours}
                profileTotalHours={profile?.totalRequiredHours || TOTAL_REQUIRED_HOURS}
            />
        </>
      )}
    </>
  );
}
