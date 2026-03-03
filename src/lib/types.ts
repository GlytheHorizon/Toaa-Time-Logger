import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'personal' | 'student' | 'professor';

export interface Feedback {
  id?: string;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  message: string;
  createdAt?: Timestamp | null;
}

export interface UserProfile {
  id: string;
  email: string | null;
  displayName?: string | null;
  role?: UserRole;
  classId?: string | null;
  classDisplayName?: string | null;
  totalRequiredHours: number;
  internshipStartDate: string;
  dashboardSubtitle?: string;
}

export interface ClassRecord {
  classId: string;
  displayName: string;
  ownerId: string;
  ownerEmail?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: Timestamp;
  hoursWorked: number;
  notes?: string;
  lastUpdatedAt?: Timestamp;
}

export interface ClassMessage {
  id?: string;
  classId: string;
  senderId: string;
  senderEmail?: string | null;
  senderDisplayName?: string | null;
  senderRole: UserRole;
  recipientType?: 'all' | 'student';
  recipientStudentId?: string | null;
  message: string;
  createdAt?: Timestamp | null;
}
