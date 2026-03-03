import React from 'react';
import type { TimeEntry } from '@/lib/types';

type PrintTemplateProps = {
  name: string;
  subtitle: string;
  completedHours: number;
  totalGoal: number;
  remainingHours: number;
  completedDays: number;
  completedWeeks: number;
  logs: TimeEntry[];
};

export default function PrintTemplate({
  name,
  subtitle,
  completedHours,
  totalGoal,
  remainingHours,
  completedDays,
  completedWeeks,
  logs,
}: PrintTemplateProps) {
  return (
    <div className="print-template p-8 text-black bg-white">
      <h1 className="text-3xl font-bold mb-2">Progress Report</h1>
      <h2 className="text-xl font-semibold mb-1">{name}</h2>
      <p className="mb-4 text-gray-700">{subtitle}</p>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <strong>Total Completed:</strong> {completedHours.toFixed(1)} / {totalGoal} hrs
        </div>
        <div>
          <strong>Hours Remaining:</strong> {remainingHours.toFixed(1)} hrs
        </div>
        <div>
          <strong>Days Completed:</strong> {completedDays}
        </div>
        <div>
          <strong>Weeks Completed:</strong> {completedWeeks}
        </div>
      </div>
      <h3 className="text-lg font-bold mb-2">Time Log Entries</h3>
      <table className="w-full border border-gray-300 mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Hours Worked</th>
            <th className="border px-2 py-1">Notes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">{log.date.toDate().toLocaleDateString()}</td>
              <td className="border px-2 py-1">{log.hoursWorked}</td>
              <td className="border px-2 py-1">{log.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
