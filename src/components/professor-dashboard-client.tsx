'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collectionGroup,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { ClassRecord, TimeEntry, UserProfile } from '@/lib/types';
import LoadingSpinner from '@/components/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { Users, CalendarDays, Printer, Trash2, Pencil, GraduationCap, Copy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import UserProgressCard from '@/components/user-progress-card';
import ProfessorPrintTemplate from '@/components/professor-print-template';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SetNameDialog } from '@/components/set-name-dialog';
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
import { useToast } from '@/hooks/use-toast';

type StudentWithData = {
  profile: UserProfile;
  timeEntries: TimeEntry[];
  totalHours: number;
  completedDays: number;
};

export default function ProfessorDashboardClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [renameClassName, setRenameClassName] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [isSetNameOpen, setIsSetNameOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const studentPageSize = 10;

  const generateClassId = () => `CLS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const myProfileRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'users', user.uid, 'userProfile', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: myProfile, isLoading: myProfileLoading } = useDoc<UserProfile>(myProfileRef);

  const myClassesQuery = useMemoFirebase(
    () => (user?.uid ? query(collection(firestore, 'classes'), where('ownerId', '==', user.uid)) : null),
    [firestore, user?.uid]
  );
  const { data: myClassesData, isLoading: myClassesLoading } = useCollection<ClassRecord>(myClassesQuery);

  const myClasses = useMemo(
    () =>
      (myClassesData || []).slice().sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.()?.getTime?.() || 0;
        const timeB = b.updatedAt?.toDate?.()?.getTime?.() || 0;
        return timeB - timeA;
      }),
    [myClassesData]
  );

  const selectedClass = useMemo(
    () => myClasses.find((item) => item.classId === selectedClassId) || null,
    [myClasses, selectedClassId]
  );

  useEffect(() => {
    setRenameClassName(selectedClass?.displayName || '');
  }, [selectedClass?.classId, selectedClass?.displayName]);

  useEffect(() => {
    if (editingClassId && !myClasses.some((item) => item.classId === editingClassId)) {
      setEditingClassId(null);
    }
  }, [editingClassId, myClasses]);

  const studentProfilesQuery = useMemoFirebase(
    () => (
      selectedClassId && myProfile?.role === 'professor'
        ? collectionGroup(firestore, 'userProfile')
        : null
    ),
    [firestore, selectedClassId, myProfile?.role]
  );
  const { data: allProfiles, isLoading: studentsLoading } = useCollection<UserProfile>(studentProfilesQuery);

  const entriesQuery = useMemoFirebase(
    () => (selectedClassId && myProfile?.role === 'professor' ? collectionGroup(firestore, 'timeEntries') : null),
    [firestore, selectedClassId, myProfile?.role]
  );
  const { data: allEntries, isLoading: entriesLoading } = useCollection<TimeEntry>(entriesQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!isUserLoading && !myProfileLoading && myProfile && myProfile.role !== 'professor') {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, myProfile, myProfileLoading, router]);

  useEffect(() => {
    if (!myClasses.length) {
      setSelectedClassId(null);
      return;
    }

    if (selectedClassId && myClasses.some((item) => item.classId === selectedClassId)) {
      return;
    }

    const fromProfile = myProfile?.classId && myClasses.some((item) => item.classId === myProfile.classId)
      ? myProfile.classId
      : null;

    setSelectedClassId(fromProfile || myClasses[0].classId);
  }, [myClasses, myProfile?.classId, selectedClassId]);

  const studentsWithData = useMemo(() => {
    if (!selectedClassId || !allProfiles || !allEntries || !myProfile) return [] as StudentWithData[];

    const classStudents = allProfiles.filter(
      (profile) =>
        profile.classId === selectedClassId &&
        profile.id !== myProfile.id &&
        profile.role !== 'professor'
    );

    const classStudentIds = new Set(classStudents.map((item) => item.id));

    const entriesByUserId = allEntries.reduce((acc, entry) => {
      if (!classStudentIds.has(entry.userId)) return acc;
      if (!acc[entry.userId]) acc[entry.userId] = [];
      acc[entry.userId].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    return classStudents.map((profile) => {
      const timeEntries = entriesByUserId[profile.id] || [];
      const totalHours = timeEntries.reduce((sum, item) => sum + item.hoursWorked, 0);
      return {
        profile,
        timeEntries,
        totalHours,
        completedDays: timeEntries.length,
      };
    });
  }, [selectedClassId, allProfiles, allEntries, myProfile]);

  const classIdsOwned = useMemo(() => new Set(myClasses.map((item) => item.classId)), [myClasses]);
  const isClassStudentProfile = (profile: UserProfile) => {
    return (
      !!profile.classId &&
      classIdsOwned.has(profile.classId) &&
      profile.id !== myProfile?.id &&
      profile.role !== 'professor'
    );
  };

  const classById = useMemo(() => {
    return myClasses.reduce((acc, item) => {
      acc[item.classId] = item;
      return acc;
    }, {} as Record<string, ClassRecord>);
  }, [myClasses]);

  const profileById = useMemo(() => {
    return (allProfiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, UserProfile>);
  }, [allProfiles]);

  const studentsAcrossClasses = useMemo(() => {
    if (!allProfiles || !myProfile) return [] as UserProfile[];
    return allProfiles.filter((profile) => isClassStudentProfile(profile));
  }, [allProfiles, classIdsOwned, myProfile]);

  const classActivity = useMemo(() => {
    if (!allProfiles || !allEntries || !myProfile) {
      return {} as Record<string, { studentCount: number; totalDays: number; activeStudents: number; topStudentId: string | null; topStudentHours: number }>;
    }

    const studentsByClass = allProfiles.reduce((acc, profile) => {
      if (!isClassStudentProfile(profile)) {
        return acc;
      }

      const classId = profile.classId as string;

      if (!acc[classId]) {
        acc[classId] = {
          studentIds: new Set<string>(),
          totalDays: 0,
          studentDayCount: {} as Record<string, number>,
          studentHours: {} as Record<string, number>,
        };
      }

      acc[classId].studentIds.add(profile.id);
      return acc;
    }, {} as Record<string, { studentIds: Set<string>; totalDays: number; studentDayCount: Record<string, number>; studentHours: Record<string, number> }>);

    const studentClassMap = new Map<string, string>();
    Object.entries(studentsByClass).forEach(([classId, info]) => {
      info.studentIds.forEach((studentId) => studentClassMap.set(studentId, classId));
    });

    allEntries.forEach((entry) => {
      const classId = studentClassMap.get(entry.userId);
      if (!classId || !studentsByClass[classId]) return;
      studentsByClass[classId].totalDays += 1;
      studentsByClass[classId].studentDayCount[entry.userId] = (studentsByClass[classId].studentDayCount[entry.userId] || 0) + 1;
      studentsByClass[classId].studentHours[entry.userId] = (studentsByClass[classId].studentHours[entry.userId] || 0) + entry.hoursWorked;
    });

    return Object.entries(studentsByClass).reduce((acc, [classId, value]) => {
      const activeStudents = Object.values(value.studentDayCount).filter((days) => days > 0).length;
      const topStudent = Object.entries(value.studentHours).sort((a, b) => b[1] - a[1])[0] || null;
      acc[classId] = {
        studentCount: value.studentIds.size,
        totalDays: value.totalDays,
        activeStudents,
        topStudentId: topStudent?.[0] || null,
        topStudentHours: topStudent?.[1] || 0,
      };
      return acc;
    }, {} as Record<string, { studentCount: number; totalDays: number; activeStudents: number; topStudentId: string | null; topStudentHours: number }>);
  }, [allProfiles, allEntries, classIdsOwned, myProfile]);

  const topActiveClass = useMemo(() => {
    const items = myClasses.map((classItem) => ({
      classId: classItem.classId,
      displayName: classItem.displayName,
      activeStudents: classActivity[classItem.classId]?.activeStudents || 0,
      totalDays: classActivity[classItem.classId]?.totalDays || 0,
      topStudentId: classActivity[classItem.classId]?.topStudentId || null,
      topStudentHours: classActivity[classItem.classId]?.topStudentHours || 0,
    }));

    if (!items.length) return null;
    return items.sort((a, b) => {
      if (b.activeStudents !== a.activeStudents) return b.activeStudents - a.activeStudents;
      return b.totalDays - a.totalDays;
    })[0];
  }, [myClasses, classActivity]);

  const recentUpdatedClass = useMemo(() => {
    if (!allEntries || !allProfiles || !myProfile || !myClasses.length) return null;

    const studentClassById = allProfiles.reduce((acc, profile) => {
      if (isClassStudentProfile(profile) && profile.classId) {
        acc[profile.id] = profile.classId;
      }
      return acc;
    }, {} as Record<string, string>);

    type LatestUpdate = {
      classId: string;
      studentId: string;
      updatedAt: Date;
    };

    let latestUpdate: LatestUpdate | undefined;

    allEntries.forEach((entry) => {
      const classId = studentClassById[entry.userId];
      if (!classId) return;

      const updatedAt = entry.lastUpdatedAt?.toDate?.() || entry.date?.toDate?.() || null;
      if (!updatedAt) return;

      if (!latestUpdate || updatedAt > latestUpdate.updatedAt) {
        latestUpdate = {
          classId,
          studentId: entry.userId,
          updatedAt,
        };
      }
    });

    if (!latestUpdate) return null;

    const classInfo = classById[latestUpdate.classId];
    const studentProfile = profileById[latestUpdate.studentId];
    const studentEmail = studentProfile?.email || 'no-email';
    const fallbackStudentName = studentEmail.includes('@') ? studentEmail.split('@')[0] : studentEmail;
    const studentName = studentProfile?.displayName || fallbackStudentName;

    return {
      classId: latestUpdate.classId,
      classDisplayName: classInfo?.displayName || latestUpdate.classId,
      studentName,
      updatedAt: latestUpdate.updatedAt,
    };
  }, [allEntries, allProfiles, myProfile, myClasses, classIdsOwned, classById, profileById]);

  const filteredStudents = useMemo(() => {
    const needle = studentSearchTerm.trim().toLowerCase();
    if (!needle) return studentsWithData;

    return studentsWithData.filter((student) => {
      const email = (student.profile.email || '').toLowerCase();
      const displayName = (student.profile.displayName || '').toLowerCase();
      const fallbackName = email.includes('@') ? email.split('@')[0] : email;
      return (
        email.includes(needle) ||
        displayName.includes(needle) ||
        fallbackName.includes(needle)
      );
    });
  }, [studentsWithData, studentSearchTerm]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentPageSize));
  const pagedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(start, start + studentPageSize);
  }, [filteredStudents, studentPage]);

  useEffect(() => {
    setStudentPage(1);
  }, [selectedClassId, studentSearchTerm]);

  useEffect(() => {
    if (studentPage > totalStudentPages) {
      setStudentPage(totalStudentPages);
    }
  }, [studentPage, totalStudentPages]);

  const totalStudents = studentsWithData.length;
  const totalStudentsAcrossClasses = studentsAcrossClasses.length;
  const totalClassDays = studentsWithData.reduce((sum, student) => sum + student.completedDays, 0);

  const handleCopyClassId = async (classId: string) => {
    try {
      await navigator.clipboard.writeText(classId);
      toast({ title: 'Class ID copied', description: `${classId} copied to clipboard.` });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Could not copy class ID to clipboard.',
      });
    }
  };

  const handleCreateClass = async () => {
    if (!user || myClasses.length >= 10) return;

    const classId = generateClassId();
    const displayName = newClassName.trim() || `Class ${myClasses.length + 1}`;

    setIsCreatingClass(true);
    try {
      await setDoc(doc(firestore, 'classes', classId), {
        classId,
        displayName,
        ownerId: user.uid,
        ownerEmail: user.email || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (myClasses.length === 0) {
        const profileRef = doc(firestore, 'users', user.uid, 'userProfile', user.uid);
        await updateDoc(profileRef, { classId, classDisplayName: displayName });
      }

      setSelectedClassId(classId);
      setNewClassName('');
      toast({
        title: 'Class created',
        description: `New class ${classId} is ready and can now be shared with students.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Create failed',
        description: error?.message || 'Could not create class.',
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleRenameClass = async () => {
    if (!editingClassId || !renameClassName.trim()) return;

    setIsRenamingClass(true);
    try {
      await updateDoc(doc(firestore, 'classes', editingClassId), {
        displayName: renameClassName.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingClassId(null);
      toast({ title: 'Class renamed', description: 'Class display name updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Rename failed',
        description: error?.message || 'Could not rename class.',
      });
    } finally {
      setIsRenamingClass(false);
    }
  };

  const handleDeleteStudentData = async (studentId: string) => {
    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);

      const timeEntriesRef = collection(firestore, 'users', studentId, 'timeEntries');
      const timeEntriesSnapshot = await getDocs(timeEntriesRef);
      timeEntriesSnapshot.forEach((entryDoc) => batch.delete(entryDoc.ref));

      const userProfileRef = collection(firestore, 'users', studentId, 'userProfile');
      const userProfileSnapshot = await getDocs(userProfileRef);
      userProfileSnapshot.forEach((profileDoc) => batch.delete(profileDoc.ref));

      await batch.commit();
      toast({ title: 'Student deleted', description: 'Student account data was removed.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete student account data.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!user) return;

    setDeletingClassId(classId);
    try {
      const batch = writeBatch(firestore);

      const classMessagesSnapshot = await getDocs(
        query(collection(firestore, 'classMessages'), where('classId', '==', classId))
      );
      classMessagesSnapshot.forEach((messageDoc) => batch.delete(messageDoc.ref));

      batch.delete(doc(firestore, 'classes', classId));
      await batch.commit();

      if (myProfile?.classId === classId) {
        const profileRef = doc(firestore, 'users', user.uid, 'userProfile', user.uid);
        await updateDoc(profileRef, { classId: null, classDisplayName: null });
      }

      if (selectedClassId === classId) {
        setSelectedClassId(null);
      }

      if (editingClassId === classId) {
        setEditingClassId(null);
      }

      toast({
        title: 'Class deleted',
        description: `Class ${classId} and its announcements were removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Could not delete class.',
      });
    } finally {
      setDeletingClassId(null);
    }
  };

  if (isUserLoading || myProfileLoading || myClassesLoading || studentsLoading || entriesLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!myProfile || myProfile.role !== 'professor') {
    return null;
  }

  const professorEmail = myProfile.email || user?.email || '';
  const professorFallbackName = professorEmail.includes('@') ? professorEmail.split('@')[0] : professorEmail || 'Professor';
  const professorName = myProfile.displayName || professorFallbackName;

  return (
    <>
      <div className="container py-8 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Professor Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">Welcome, {professorName}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsSetNameOpen(true)}>
                <Pencil className="mr-1 h-4 w-4" /> Edit Name
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">
              Selected Class:{' '}
              <span className="font-semibold">{selectedClass?.displayName || '-'} {selectedClass?.classId ? `(${selectedClass.classId})` : ''}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()} disabled={!selectedClassId}>
              <Printer className="mr-2 h-4 w-4" /> Print Class Report
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Class Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Create and manage up to 10 class IDs.</p>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                placeholder="New class display name (optional)"
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
                disabled={isCreatingClass || myClasses.length >= 10}
              />
              <Button onClick={handleCreateClass} disabled={isCreatingClass || myClasses.length >= 10}>
                {isCreatingClass ? 'Creating...' : 'Generate Class ID'}
              </Button>
            </div>

            {myClasses.length > 0 ? (
              <div className="space-y-3">
                <Label>Your classes</Label>
                <div className="space-y-2">
                  {myClasses.map((item) => (
                    <div key={item.classId} className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={selectedClassId === item.classId ? 'default' : 'outline'}
                        className="flex-1 justify-between"
                        onClick={() => {
                          setSelectedClassId(item.classId);
                        }}
                      >
                        <span>{item.displayName}</span>
                        <span className="text-xs opacity-80">{item.classId}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingClassId(item.classId);
                          setRenameClassName(item.displayName);
                        }}
                        aria-label={`Edit ${item.displayName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyClassId(item.classId)}
                        aria-label={`Copy ${item.classId}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            disabled={deletingClassId === item.classId}
                            aria-label={`Delete ${item.classId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete class?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <strong>{item.displayName}</strong> ({item.classId}) and all related announcements.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingClassId === item.classId}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteClass(item.classId)}
                              disabled={deletingClassId === item.classId}
                              className={buttonVariants({ variant: 'destructive' })}
                            >
                              {deletingClassId === item.classId ? 'Deleting...' : 'Delete Class'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>

                {editingClassId && (
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <Input
                      placeholder="Rename class"
                      value={renameClassName}
                      onChange={(event) => setRenameClassName(event.target.value)}
                      disabled={isRenamingClass}
                    />
                    <Button onClick={handleRenameClass} disabled={!renameClassName.trim() || isRenamingClass}>
                      {isRenamingClass ? 'Saving...' : 'Save Class Name'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingClassId(null);
                        setRenameClassName(selectedClass?.displayName || '');
                      }}
                      disabled={isRenamingClass}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No classes yet. Generate your first class ID above.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <StatCard title="No. of Classes" value={myClasses.length} icon={GraduationCap} />
          <StatCard title="Total No. of Students" value={totalStudentsAcrossClasses} icon={Users} />
          <StatCard title="Students in Class" value={totalStudents} icon={Users} />
          <StatCard
            title="Top Active Class"
            value={topActiveClass ? `${topActiveClass.displayName}` : '-'}
            icon={CalendarDays}
            description={topActiveClass ? `${topActiveClass.classId} • ${topActiveClass.activeStudents} active students • ${topActiveClass.totalDays} days logged • #1 ${(() => {
              const topProfile = topActiveClass.topStudentId ? profileById[topActiveClass.topStudentId] : null;
              const topEmail = topProfile?.email || 'student';
              const topFallback = topEmail.includes('@') ? topEmail.split('@')[0] : topEmail;
              const topName = topProfile?.displayName || topFallback;
              return `${topName} (${topActiveClass.topStudentHours.toFixed(1)}h)`;
            })()}` : undefined}
          />
          <StatCard
            title="Recent Class Update"
            value={recentUpdatedClass ? recentUpdatedClass.classDisplayName : '-'}
            icon={CalendarDays}
            description={recentUpdatedClass ? `${recentUpdatedClass.classId} • ${recentUpdatedClass.studentName} • ${recentUpdatedClass.updatedAt.toLocaleString()}` : undefined}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search student by name or email"
              value={studentSearchTerm}
              onChange={(event) => setStudentSearchTerm(event.target.value)}
            />

            {studentsWithData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students in this class yet.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students found for your search.</p>
            ) : (
              <>
                <Accordion type="single" collapsible className="w-full">
                  {pagedStudents.map((student) => (
                    <AccordionItem key={student.profile.id} value={student.profile.id}>
                      <AccordionTrigger>
                        <span className="font-bold">
                          {(() => {
                            const email = student.profile.email || 'no-email';
                            const fallbackName = email.includes('@') ? email.split('@')[0] : email;
                            const name = student.profile.displayName || fallbackName;
                            return `${name} - ${email}`;
                          })()}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <UserProgressCard userWithData={student} />
                        <div className="flex justify-end p-4 border-t bg-muted/20 rounded-b-lg">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Student Account
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete student account data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete all stored data for{' '}
                                  <strong>{student.profile.displayName ?? student.profile.email}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteStudentData(student.profile.id)}
                                  className={buttonVariants({ variant: 'destructive' })}
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {studentPage} of {totalStudentPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage((page) => Math.max(1, page - 1))}
                      disabled={studentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage((page) => Math.min(totalStudentPages, page + 1))}
                      disabled={studentPage === totalStudentPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="print-template-only" style={{ display: 'none' }}>
        <ProfessorPrintTemplate classId={selectedClassId || '-'} students={studentsWithData} />
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-template-only { display: block !important; }
        }
      `}</style>

      <SetNameDialog open={isSetNameOpen} onOpenChange={setIsSetNameOpen} profile={myProfile} />
    </>
  );
}
