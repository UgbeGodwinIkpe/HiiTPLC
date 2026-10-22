import fs from 'fs';
import path from 'path';
import {
  User,
  Course,
  Batch,
  StudentProfile,
  Question,
  Exam,
  ExamAttempt,
  ActivityLog,
  SystemSettings,
  SystemStats,
  AttendanceSession,
  EmailRecord
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_COURSES,
  INITIAL_BATCHES,
  INITIAL_STUDENTS,
  INITIAL_QUESTIONS,
  INITIAL_EXAMS,
  INITIAL_ATTEMPTS,
  INITIAL_LOGS,
  INITIAL_SETTINGS,
  INITIAL_ATTENDANCE_SESSIONS
} from './initialData';

// Directory path for persistent JSON files
const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');

export interface DatabaseFileMeta {
  fileName: string;
  collection: string;
  recordCount: number;
  sizeBytes: number;
  lastModified: string;
}

export interface DatabaseStatus {
  status: 'healthy' | 'warning' | 'error';
  storageType: 'Persistent JSON File Database';
  directory: string;
  lastSaved: string;
  totalRecords: number;
  totalSizeBytes: number;
  files: DatabaseFileMeta[];
}

export interface FullDatabaseBackup {
  meta: {
    system: string;
    centre: string;
    version: string;
    exportedAt: string;
    totalRecords: number;
  };
  users: User[];
  courses: Course[];
  batches: Batch[];
  students: StudentProfile[];
  questions: Question[];
  exams: Exam[];
  attempts: ExamAttempt[];
  attendance: AttendanceSession[];
  logs: ActivityLog[];
  settings: SystemSettings;
  emails?: EmailRecord[];
}

class JsonDatabaseManager {
  private dataDir: string;
  private backupsDir: string;
  private lastSavedTimestamp: string;

  // File paths for collections
  private paths = {
    users: '',
    courses: '',
    batches: '',
    students: '',
    questions: '',
    exams: '',
    attempts: '',
    attendance: '',
    logs: '',
    settings: '',
    emails: ''
  };

  constructor() {
    this.dataDir = DATA_DIR;
    this.backupsDir = BACKUPS_DIR;
    this.lastSavedTimestamp = new Date().toISOString();

    this.ensureDirectories();

    this.paths = {
      users: path.join(this.dataDir, 'users.json'),
      courses: path.join(this.dataDir, 'courses.json'),
      batches: path.join(this.dataDir, 'batches.json'),
      students: path.join(this.dataDir, 'students.json'),
      questions: path.join(this.dataDir, 'questions.json'),
      exams: path.join(this.dataDir, 'exams.json'),
      attempts: path.join(this.dataDir, 'attempts.json'),
      attendance: path.join(this.dataDir, 'attendance.json'),
      logs: path.join(this.dataDir, 'logs.json'),
      settings: path.join(this.dataDir, 'settings.json'),
      emails: path.join(this.dataDir, 'emails.json')
    };

    this.initializeFiles();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  /**
   * Atomic file writing with safe temp-file swap to eliminate risk of corrupting records on crash/reboot
   */
  private atomicWriteJson<T>(filePath: string, data: T): void {
    try {
      this.ensureDirectories();
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      fs.renameSync(tempPath, filePath);
      this.lastSavedTimestamp = new Date().toISOString();
    } catch (err) {
      console.error(`[JsonDB] Failed to atomic-write file ${filePath}:`, err);
      // Fallback direct write
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (innerErr) {
        console.error(`[JsonDB] Fallback direct write also failed for ${filePath}:`, innerErr);
      }
    }
  }

  /**
   * Safely read JSON from disk, auto-seeding with fallback default if missing or invalid
   */
  private safeReadJson<T>(filePath: string, fallbackDefault: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        this.atomicWriteJson(filePath, fallbackDefault);
        return fallbackDefault;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw || !raw.trim()) {
        this.atomicWriteJson(filePath, fallbackDefault);
        return fallbackDefault;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[JsonDB] Error reading ${filePath}, restoring fallback default:`, err);
      this.atomicWriteJson(filePath, fallbackDefault);
      return fallbackDefault;
    }
  }

  private initializeFiles() {
    // Ensure all 10 JSON collections exist on disk
    this.safeReadJson(this.paths.users, INITIAL_USERS);
    this.safeReadJson(this.paths.courses, INITIAL_COURSES);
    this.safeReadJson(this.paths.batches, INITIAL_BATCHES);
    this.safeReadJson(this.paths.students, INITIAL_STUDENTS);
    this.safeReadJson(this.paths.questions, INITIAL_QUESTIONS);
    this.safeReadJson(this.paths.exams, INITIAL_EXAMS);
    this.safeReadJson(this.paths.attempts, INITIAL_ATTEMPTS);
    this.safeReadJson(this.paths.attendance, INITIAL_ATTENDANCE_SESSIONS);
    this.safeReadJson(this.paths.logs, INITIAL_LOGS);
    this.safeReadJson(this.paths.settings, INITIAL_SETTINGS);
    this.safeReadJson(this.paths.emails, []);
    console.log(`[JsonDB] File Database successfully initialized in ${this.dataDir}`);
  }

  // --- USERS ---
  public getUsers(): User[] {
    return this.safeReadJson<User[]>(this.paths.users, INITIAL_USERS);
  }
  public saveUsers(users: User[]): void {
    this.atomicWriteJson(this.paths.users, users);
  }

  // --- COURSES ---
  public getCourses(): Course[] {
    return this.safeReadJson<Course[]>(this.paths.courses, INITIAL_COURSES);
  }
  public saveCourses(courses: Course[]): void {
    this.atomicWriteJson(this.paths.courses, courses);
  }

  // --- BATCHES ---
  public getBatches(): Batch[] {
    return this.safeReadJson<Batch[]>(this.paths.batches, INITIAL_BATCHES);
  }
  public saveBatches(batches: Batch[]): void {
    this.atomicWriteJson(this.paths.batches, batches);
  }

  // --- STUDENTS ---
  public getStudents(): StudentProfile[] {
    return this.safeReadJson<StudentProfile[]>(this.paths.students, INITIAL_STUDENTS);
  }
  public saveStudents(students: StudentProfile[]): void {
    this.atomicWriteJson(this.paths.students, students);
  }

  // --- QUESTIONS ---
  public getQuestions(): Question[] {
    return this.safeReadJson<Question[]>(this.paths.questions, INITIAL_QUESTIONS);
  }
  public saveQuestions(questions: Question[]): void {
    this.atomicWriteJson(this.paths.questions, questions);
  }

  // --- EXAMS ---
  public getExams(): Exam[] {
    return this.safeReadJson<Exam[]>(this.paths.exams, INITIAL_EXAMS);
  }
  public saveExams(exams: Exam[]): void {
    this.atomicWriteJson(this.paths.exams, exams);
  }

  // --- ATTEMPTS ---
  public getAttempts(): ExamAttempt[] {
    return this.safeReadJson<ExamAttempt[]>(this.paths.attempts, INITIAL_ATTEMPTS);
  }
  public saveAttempts(attempts: ExamAttempt[]): void {
    this.atomicWriteJson(this.paths.attempts, attempts);
  }

  // --- ATTENDANCE ---
  public getAttendance(): AttendanceSession[] {
    return this.safeReadJson<AttendanceSession[]>(this.paths.attendance, INITIAL_ATTENDANCE_SESSIONS);
  }
  public saveAttendance(attendance: AttendanceSession[]): void {
    this.atomicWriteJson(this.paths.attendance, attendance);
  }

  // --- LOGS ---
  public getLogs(): ActivityLog[] {
    return this.safeReadJson<ActivityLog[]>(this.paths.logs, INITIAL_LOGS);
  }
  public saveLogs(logs: ActivityLog[]): void {
    this.atomicWriteJson(this.paths.logs, logs);
  }
  public addLog(userId: string, userName: string, userRole: any, action: string, details: string): ActivityLog {
    const logs = this.getLogs();
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName,
      userRole,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep max 200 logs to prevent file bloating
    if (logs.length > 200) {
      logs.length = 200;
    }
    this.saveLogs(logs);
    return newLog;
  }

  // --- EMAILS OUTBOX & NOTIFICATIONS ---
  public getEmails(): EmailRecord[] {
    return this.safeReadJson<EmailRecord[]>(this.paths.emails, []);
  }
  public saveEmails(emails: EmailRecord[]): void {
    this.atomicWriteJson(this.paths.emails, emails);
  }
  public addEmail(emailData: Omit<EmailRecord, 'id' | 'sentAt'>): EmailRecord {
    const emails = this.getEmails();
    const newEmail: EmailRecord = {
      ...emailData,
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sentAt: new Date().toISOString()
    };
    emails.unshift(newEmail);
    // Keep max 500 emails to prevent unbounded file growth
    if (emails.length > 500) {
      emails.length = 500;
    }
    this.saveEmails(emails);
    return newEmail;
  }

  // --- SETTINGS ---
  public getSettings(): SystemSettings {
    return this.safeReadJson<SystemSettings>(this.paths.settings, INITIAL_SETTINGS);
  }
  public saveSettings(settings: SystemSettings): void {
    this.atomicWriteJson(this.paths.settings, settings);
  }

  // --- SYSTEM STATS ---
  public getStats(): SystemStats {
    const courses = this.getCourses();
    const students = this.getStudents();
    const users = this.getUsers();
    const batches = this.getBatches();
    const exams = this.getExams();
    const questions = this.getQuestions();
    const attempts = this.getAttempts();

    const submitted = attempts.filter((a) => a.status === 'submitted');
    const passedCount = submitted.filter((a) => a.isPassed).length;
    const failedCount = submitted.filter((a) => !a.isPassed).length;
    const totalSubmitted = submitted.length;

    const passRatePercent = totalSubmitted > 0 ? Math.round((passedCount / totalSubmitted) * 100) : 0;
    const failRatePercent = totalSubmitted > 0 ? Math.round((failedCount / totalSubmitted) * 100) : 0;

    return {
      totalCourses: courses.filter((c) => c.status === 'active').length,
      totalStudents: students.length,
      totalInstructors: users.filter((u) => u.role === 'instructor' && u.status === 'active').length,
      totalBatches: batches.length,
      pendingExams: exams.filter((e) => e.status === 'pending').length,
      approvedExams: exams.filter((e) => e.status === 'approved').length,
      completedExams: exams.filter((e) => e.status === 'published' || e.status === 'completed').length,
      passRatePercent,
      failRatePercent,
      totalQuestions: questions.length
    };
  }

  // --- METADATA & HEALTH STATUS ---
  public getStatus(): DatabaseStatus {
    const fileEntries: { collection: string; path: string; count: number }[] = [
      { collection: 'Students', path: this.paths.students, count: this.getStudents().length },
      { collection: 'Exam Attempts & Results', path: this.paths.attempts, count: this.getAttempts().length },
      { collection: 'Courses', path: this.paths.courses, count: this.getCourses().length },
      { collection: 'Batches', path: this.paths.batches, count: this.getBatches().length },
      { collection: 'Question Bank', path: this.paths.questions, count: this.getQuestions().length },
      { collection: 'CBT Exams', path: this.paths.exams, count: this.getExams().length },
      { collection: 'Class Attendance Sessions', path: this.paths.attendance, count: this.getAttendance().length },
      { collection: 'System Users', path: this.paths.users, count: this.getUsers().length },
      { collection: 'Audit Activity Logs', path: this.paths.logs, count: this.getLogs().length },
      { collection: 'Email Notifications & Credentials Log', path: this.paths.emails, count: this.getEmails().length },
      { collection: 'System Settings', path: this.paths.settings, count: 1 }
    ];

    let totalSizeBytes = 0;
    let totalRecords = 0;

    const files: DatabaseFileMeta[] = fileEntries.map((entry) => {
      let sizeBytes = 0;
      let lastModified = this.lastSavedTimestamp;

      try {
        if (fs.existsSync(entry.path)) {
          const stat = fs.statSync(entry.path);
          sizeBytes = stat.size;
          lastModified = stat.mtime.toISOString();
        }
      } catch (err) {
        console.error(`Failed to stat ${entry.path}:`, err);
      }

      totalSizeBytes += sizeBytes;
      totalRecords += entry.count;

      return {
        fileName: path.basename(entry.path),
        collection: entry.collection,
        recordCount: entry.count,
        sizeBytes,
        lastModified
      };
    });

    return {
      status: 'healthy',
      storageType: 'Persistent JSON File Database',
      directory: this.dataDir,
      lastSaved: this.lastSavedTimestamp,
      totalRecords,
      totalSizeBytes,
      files
    };
  }

  // --- FULL DATABASE BACKUP EXPORT ---
  public exportFullDatabase(): FullDatabaseBackup {
    const users = this.getUsers();
    const courses = this.getCourses();
    const batches = this.getBatches();
    const students = this.getStudents();
    const questions = this.getQuestions();
    const exams = this.getExams();
    const attempts = this.getAttempts();
    const attendance = this.getAttendance();
    const logs = this.getLogs();
    const settings = this.getSettings();
    const emails = this.getEmails();

    const totalRecords =
      users.length +
      courses.length +
      batches.length +
      students.length +
      questions.length +
      exams.length +
      attempts.length +
      attendance.length +
      logs.length +
      emails.length;

    return {
      meta: {
        system: 'HiiT CBT Assessment & Management System',
        centre: 'Abuja Training Centre',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        totalRecords
      },
      users,
      courses,
      batches,
      students,
      questions,
      exams,
      attempts,
      attendance,
      logs,
      settings,
      emails
    };
  }

  // --- FULL DATABASE IMPORT / RESTORE ---
  public importFullDatabase(backup: any): { success: boolean; message: string; count: number } {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file format.');
    }

    // Auto-create snapshot of current state before overwriting
    this.createBackupSnapshot('auto_snapshot_before_restore');

    let totalRestored = 0;

    if (Array.isArray(backup.users)) {
      this.saveUsers(backup.users);
      totalRestored += backup.users.length;
    }
    if (Array.isArray(backup.courses)) {
      this.saveCourses(backup.courses);
      totalRestored += backup.courses.length;
    }
    if (Array.isArray(backup.batches)) {
      this.saveBatches(backup.batches);
      totalRestored += backup.batches.length;
    }
    if (Array.isArray(backup.students)) {
      this.saveStudents(backup.students);
      totalRestored += backup.students.length;
    }
    if (Array.isArray(backup.questions)) {
      this.saveQuestions(backup.questions);
      totalRestored += backup.questions.length;
    }
    if (Array.isArray(backup.exams)) {
      this.saveExams(backup.exams);
      totalRestored += backup.exams.length;
    }
    if (Array.isArray(backup.attempts)) {
      this.saveAttempts(backup.attempts);
      totalRestored += backup.attempts.length;
    }
    if (Array.isArray(backup.attendance)) {
      this.saveAttendance(backup.attendance);
      totalRestored += backup.attendance.length;
    }
    if (Array.isArray(backup.logs)) {
      this.saveLogs(backup.logs);
      totalRestored += backup.logs.length;
    }
    if (Array.isArray(backup.emails)) {
      this.saveEmails(backup.emails);
      totalRestored += backup.emails.length;
    }
    if (backup.settings && typeof backup.settings === 'object') {
      this.saveSettings(backup.settings);
    }

    this.addLog(
      'system',
      'System Database Manager',
      'coordinator',
      'DATABASE_RESTORED',
      `Restored ${totalRestored} database records from JSON backup.`
    );

    return {
      success: true,
      message: `Successfully restored ${totalRestored} records across all collections from JSON backup.`,
      count: totalRestored
    };
  }

  // --- CREATE TIMESTAMPED SNAPSHOT ---
  public createBackupSnapshot(prefix = 'hiit_backup'): string {
    const backup = this.exportFullDatabase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${prefix}_${timestamp}.json`;
    const destPath = path.join(this.backupsDir, fileName);

    fs.writeFileSync(destPath, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`[JsonDB] Created snapshot backup: ${destPath}`);
    return destPath;
  }

  // --- RESET TO FACTORY DEMO STATE ---
  public resetToFactorySeed(): void {
    // Take backup before reset
    this.createBackupSnapshot('pre_reset_snapshot');

    this.saveUsers([...INITIAL_USERS]);
    this.saveCourses([...INITIAL_COURSES]);
    this.saveBatches([...INITIAL_BATCHES]);
    this.saveStudents([...INITIAL_STUDENTS]);
    this.saveQuestions([...INITIAL_QUESTIONS]);
    this.saveExams([...INITIAL_EXAMS]);
    this.saveAttempts([...INITIAL_ATTEMPTS]);
    this.saveAttendance([...INITIAL_ATTENDANCE_SESSIONS]);
    this.saveLogs([...INITIAL_LOGS]);
    this.saveSettings({ ...INITIAL_SETTINGS });

    this.addLog(
      'system',
      'System Database Manager',
      'coordinator',
      'DATABASE_RESET',
      'Database files reset to factory initial demonstration state.'
    );
  }
}

// Export singleton database manager
export const jsonDb = new JsonDatabaseManager();
