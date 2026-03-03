"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import FeedbackForm from '@/components/feedback-form';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserProfile } from '@/lib/types';
import { collection } from 'firebase/firestore';

function ProfessorGuide() {
  return (
    <ol className="list-decimal pl-6 space-y-3 text-lg">
      <li>
        <strong>Log In:</strong> Sign in with your professor account email.
      </li>
      <li>
        <strong>Use Professor Dashboard:</strong> Open your professor dashboard to manage your class tools.
      </li>
      <li>
        <strong>Announce & Chat:</strong> Use the <strong>Announce/Chat</strong> page to post class announcements and reply to students.
      </li>
      <li>
        <strong>Watch Unread Badges:</strong> Keep an eye on unread counts in the navigation to quickly check new student messages.
      </li>
      <li>
        <strong>Review Student Progress:</strong> Use your professor view to monitor submitted logs and progress information.
      </li>
      <li>
        <strong>Maintain Class Communication:</strong> Continue updates in one thread so students see consistent guidance.
      </li>
    </ol>
  );
}

function StudentPersonalGuide({ role }: { role: UserProfile['role'] }) {
  return (
    <ol className="list-decimal pl-6 space-y-3 text-lg">
      <li>
        <strong>Sign Up or Log In:</strong> Create an account or log in using your email.
      </li>
      <li>
        <strong>Set Your Name:</strong> Click your profile icon and set your display name for a personalized experience.
      </li>
      {role === 'student' && (
        <li>
          <strong>Join Your Class:</strong> Enter your class code in <strong>Class ID Verification</strong> on the dashboard to connect with your professor.
        </li>
      )}
      <li>
        <strong>Log Your Time:</strong> Click an empty day in the calendar to add your daily hours and notes.
      </li>
      <li>
        <strong>Edit or Delete Entries:</strong> Open a logged day and use edit when you need to correct hours or notes.
      </li>
      <li>
        <strong>View Progress:</strong> Track completed hours, remaining hours, days/weeks completed, and your calendar history.
      </li>
      <li>
        <strong>Print Your Report:</strong> Use the <strong>Print</strong> button for submission or personal records.
      </li>
      <li>
        <strong>Mailbox Availability:</strong> Class mailbox appears only when your account and class setup supports it.
      </li>
    </ol>
  );
}

export default function HowToUsePage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const myProfileQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, 'users', user.uid, 'userProfile') : null),
    [firestore, user?.uid]
  );
  const { data: myProfileData, isLoading: profileLoading } = useCollection<UserProfile>(myProfileQuery);

  const role = myProfileData?.[0]?.role;
  const effectiveRole = role;

  const backHref = useMemo(() => {
    if (effectiveRole === 'professor') return '/professor';
    return '/dashboard';
  }, [effectiveRole]);

  const pageTitle = effectiveRole === 'professor'
    ? "How to Use Toaa's TimeLogger (Professor)"
    : "How to Use Toaa's TimeLogger";

  if (user && profileLoading && !effectiveRole) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/dashboard">&larr; Back to Dashboard</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-4">How to Use Toaa's TimeLogger</h1>
        <p className="text-muted-foreground">Loading your guide...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href={backHref}>&larr; Back to {effectiveRole === 'professor' ? 'Professor Dashboard' : 'Dashboard'}</Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-4">{pageTitle}</h1>
      {effectiveRole === 'professor' ? <ProfessorGuide /> : <StudentPersonalGuide role={effectiveRole} />}
      <div className="mt-8 text-gray-600">
        <strong>Note:</strong> This project is free to use and open source. No data is shared outside your account. For help, contact the developer or check the documentation.
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Feedback / Suggestion / Report an Issue</h2>
        <FeedbackForm />
      </div>
    </div>
  );
}
