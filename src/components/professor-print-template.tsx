import type { UserProfile } from '@/lib/types';

type ProfessorPrintTemplateProps = {
  classId: string;
  students: Array<{
    profile: UserProfile;
    totalHours: number;
    completedDays: number;
  }>;
};

export default function ProfessorPrintTemplate({ classId, students }: ProfessorPrintTemplateProps) {
  const generatedAt = new Date().toLocaleString();

  return (
    <div className="p-8 text-black bg-white">
      <h1 className="text-3xl font-bold mb-1">Class Progress Report</h1>
      <p className="text-sm mb-4">Class ID: {classId}</p>
      <p className="text-xs text-gray-500 mb-6">Generated: {generatedAt}</p>

      <table className="w-full border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-2 text-left">Student</th>
            <th className="border px-2 py-2 text-left">Email</th>
            <th className="border px-2 py-2 text-right">Total Hours</th>
            <th className="border px-2 py-2 text-right">Days Logged</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.profile.id}>
              <td className="border px-2 py-1">{student.profile.displayName || '-'}</td>
              <td className="border px-2 py-1">{student.profile.email || '-'}</td>
              <td className="border px-2 py-1 text-right">{student.totalHours.toFixed(1)}</td>
              <td className="border px-2 py-1 text-right">{student.completedDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
