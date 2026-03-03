import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import FeedbackForm from '@/components/feedback-form';

export default function HowToUsePage() {
  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard">&larr; Back to Dashboard</Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-4">How to Use Toaa's TimeLogger</h1>
      <ol className="list-decimal pl-6 space-y-3 text-lg">
        <li>
          <strong>Sign Up or Log In:</strong> Create an account or log in using your email.
        </li>
        <li>
          <strong>Set Your Name:</strong> Click your profile icon and set your display name for a personalized experience.
        </li>
        <li>
          <strong>Log Your Time:</strong> Click on any day in the calendar to add or edit your daily hours. Fill in the date, hours worked, and any notes in the dialog that appears.
        </li>
        <li>
          <strong>View Progress:</strong> The dashboard shows your total completed hours, hours remaining, days and weeks completed, and a calendar of your entries.
        </li>
        <li>
          <strong>Edit or Delete Entries:</strong> Click on any entry in the calendar to edit or delete it if needed.
        </li>
        <li>
          <strong>Print Your Report:</strong> Use the "Print" button to generate a progress report for submission or personal records.
        </li>
      </ol>
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
