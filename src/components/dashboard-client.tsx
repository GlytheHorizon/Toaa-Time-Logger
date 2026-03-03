'use client';

import { useEffect, useState } from 'react';
import { useTimeData } from '@/lib/hooks';
import { useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './loading-spinner';
import { StatCard } from './stat-card';
import { Clock, Hourglass, CalendarDays, Calendar, Target, Printer } from 'lucide-react';
import { TOTAL_REQUIRED_HOURS } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TimeLogCalendar } from './time-log-calendar';
import { EditGoalDialog } from './edit-goal-dialog';
import { EditSubtitleDialog } from './edit-subtitle-dialog';
import { Button } from './ui/button';
import PrintTemplate from './print-template';
import { SetNameDialog } from './set-name-dialog';
import { Pencil } from 'lucide-react';
import { Input } from './ui/input';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DashboardClient() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { totalHours, loading: dataLoading, remainingHours, completedDays, completedWeeks, profile, logs } = useTimeData(user?.uid);
  const [isSetNameOpen, setIsSetNameOpen] = useState(false);
  const [classIdInput, setClassIdInput] = useState('');
  const [isSavingClassId, setIsSavingClassId] = useState(false);
  const [isLeavingClass, setIsLeavingClass] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setClassIdInput(profile?.classId || '');
  }, [profile?.classId]);

  if (isUserLoading || dataLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  const totalGoal = profile?.totalRequiredHours || TOTAL_REQUIRED_HOURS;
  const completedHours = totalHours || 0;
  const progressPercentage = totalGoal > 0 ? (completedHours / totalGoal) * 100 : 0;
  const subtitle = profile?.dashboardSubtitle || "Here's your internship progress at a glance.";
  
  const welcomeName = profile?.displayName || user.displayName || (user.email?.split('@')[0]) || 'Intern';

  const handleSaveClassId = async () => {
    if (!user || !profile) return;
    if (profile.classId) return;
    const nextClassId = classIdInput.trim().toUpperCase();
    if (!nextClassId) return;

    setIsSavingClassId(true);
    try {
      const classRef = doc(firestore, 'classes', nextClassId);
      const classSnapshot = await getDoc(classRef);
      if (!classSnapshot.exists()) {
        throw new Error('Class ID not found. Ask your professor for the correct class code.');
      }

      const classDisplayName = (classSnapshot.data() as { displayName?: string }).displayName || null;
      const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', profile.id);
      await updateDoc(userProfileRef, {
        classId: nextClassId,
        classDisplayName,
      });
      toast({
        title: 'Class ID updated',
        description: `You joined class ${nextClassId}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error?.message || 'Could not update class ID.',
      });
    } finally {
      setIsSavingClassId(false);
    }
  };

  const handleLeaveClass = async () => {
    if (!user || !profile?.classId) return;

    setIsLeavingClass(true);
    try {
      const userProfileRef = doc(firestore, 'users', user.uid, 'userProfile', profile.id);
      await updateDoc(userProfileRef, {
        classId: null,
        classDisplayName: null,
      });
      setClassIdInput('');
      toast({
        title: 'Left class',
        description: 'You can now enter a new class code.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Leave failed',
        description: error?.message || 'Could not leave class.',
      });
    } finally {
      setIsLeavingClass(false);
    }
  };

  return (
    <>
      {/* Normal dashboard view */}
      <div className="container py-8 print-container no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold font-headline tracking-tight">
                    Welcome, {welcomeName}!
                </h1>
                <Button variant="ghost" size="sm" className="no-print" onClick={() => setIsSetNameOpen(true)}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit Name
                </Button>
              </div>
              <div className="flex items-center">
                <p className="text-muted-foreground">{subtitle}</p>
                <EditSubtitleDialog profile={profile} />
              </div>
          </div>
          <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '100ms'}}>
              <StatCard title="Total Completed" value={`${completedHours.toFixed(1)} / ${totalGoal} hrs`} icon={Clock} />
            </div>
            <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '200ms'}}>
              <StatCard title="Hours Remaining" value={`${remainingHours.toFixed(1)} hrs`} icon={Hourglass} />
            </div>
            <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '300ms'}}>
              <StatCard title="Days Completed" value={completedDays} icon={CalendarDays} />
            </div>
            <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '400ms'}}>
              <StatCard title="Weeks Completed" value={completedWeeks} icon={Calendar} />
            </div>
          </div>
          
          <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '500ms'}}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary"/>
                        Progress Overview
                    </CardTitle>
                    <div>
                      <EditGoalDialog profile={profile} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={progressPercentage} className="w-full print-progress-bar" />
                    <p className="text-sm text-muted-foreground text-center">{progressPercentage.toFixed(1)}% complete</p>
                </CardContent>
            </Card>
          </div>

          <div className="opacity-0 animate-fade-in-up print-card" style={{animationDelay: '600ms'}}>
            <TimeLogCalendar timeEntries={logs} />
          </div>

          {profile?.role !== 'professor' && (
            <div className="opacity-0 animate-fade-in-up no-print" style={{animationDelay: '650ms'}}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Class ID Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Joined class: <span className="font-semibold text-foreground">{profile?.classId || 'Not set'}</span>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Class ID"
                      value={classIdInput}
                      onChange={(e) => setClassIdInput(e.target.value)}
                      disabled={!!profile?.classId || isSavingClassId || isLeavingClass}
                    />
                    {profile?.classId ? (
                      <Button variant="outline" onClick={handleLeaveClass} disabled={isLeavingClass || isSavingClassId}>
                        {isLeavingClass ? 'Leaving...' : 'Leave Class'}
                      </Button>
                    ) : (
                      <Button onClick={handleSaveClassId} disabled={isSavingClassId || !classIdInput.trim()}>
                        {isSavingClassId ? 'Saving...' : 'Join Class'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
      {/* Print-only template */}
      <div className="print-template-only" style={{display: 'none'}}>
        <PrintTemplate
          name={welcomeName}
          subtitle={subtitle}
          completedHours={completedHours}
          totalGoal={totalGoal}
          remainingHours={remainingHours}
          completedDays={completedDays}
          completedWeeks={completedWeeks}
          logs={logs}
        />
      </div>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-template-only { display: block !important; }
        }
      `}</style>

      <SetNameDialog open={isSetNameOpen} onOpenChange={setIsSetNameOpen} profile={profile} />
    </>
  );
}
