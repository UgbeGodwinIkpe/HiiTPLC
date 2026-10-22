export type UserRole = 'coordinator' | 'instructor' | 'registrar' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Optional custom credentials, defaults to hiit123 if not set
  regNumber?: string; // For students
  phone?: string;
  assignedCourseIds?: string[]; // For instructors/students
  assignedBatchIds?: string[]; // For instructors/students
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  durationWeeks: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
  studentCount?: number;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  regNumber: string;
  email: string;
  phone: string;
  password?: string; // Student login password, defaults to student123 if unset
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  status: 'active' | 'inactive';
  registeredAt: string;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'modification_requested';

export interface Question {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  difficulty: QuestionDifficulty;
  topic: string;
  status: QuestionStatus;
  rejectionReason?: string;
  createdAt: string;
}

export type ExamStatus = 'draft' | 'pending' | 'approved' | 'published' | 'completed';

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  instructorId: string;
  instructorName: string;
  durationMinutes: number;
  passingScorePercent: number;
  instructions: string;
  questionIds: string[];
  totalMarks: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: ExamStatus;
  createdAt: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isFlagged?: boolean;
  savedAt: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'timed_out';

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentRegNumber: string;
  studentName: string;
  batchId: string;
  startTime: string;
  endTime?: string;
  timeSpentSeconds: number;
  status: AttemptStatus;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>; // questionId -> option
  flaggedQuestions: string[];
  // Result details calculated upon submission:
  scoreObtained?: number;
  totalMarksPossible?: number;
  percentage?: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  isPassed?: boolean;
  gradedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  showResultsImmediately: boolean; // Faculty Coordinator toggle
  instituteName: string;
  centerLocation: string;
  allowStudentReviewAnswers: boolean;
}

export interface SystemStats {
  totalCourses: number;
  totalStudents: number;
  totalInstructors: number;
  totalBatches: number;
  pendingExams: number;
  approvedExams: number;
  completedExams: number;
  passRatePercent: number;
  failRatePercent: number;
  totalQuestions: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface StudentAttendanceRecord {
  studentId: string;
  studentRegNumber: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  batchId: string;
  batchName: string;
  instructorId: string;
  instructorName: string;
  date: string; // YYYY-MM-DD
  topic: string; // e.g. "Lecture 1: Introduction"
  records: StudentAttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecord {
  id: string;
  to: string;
  studentId?: string;
  studentName: string;
  regNumber: string;
  subject: string;
  preview: string;
  passwordSent?: string;
  courseTitle?: string;
  batchName?: string;
  htmlContent: string;
  textContent: string;
  sentAt: string;
  status: 'sent' | 'simulated' | 'failed';
  deliveryDetails?: string;
  trigger: 'student_added' | 'bulk_imported' | 'manual_resend' | 'password_reset';
}
