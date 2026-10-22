import React, { useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Course,
  Batch,
  StudentProfile,
  Question,
  Exam,
  ExamAttempt,
  ActivityLog,
  SystemSettings,
  SystemStats,
  AttendanceSession
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { CourseManagement } from './components/CourseManagement';
import { InstructorManagement } from './components/InstructorManagement';
import { QuestionApprovalModal } from './components/QuestionApprovalModal';
import { BatchManagement } from './components/BatchManagement';
import { StudentManagement } from './components/StudentManagement';
import { QuestionBank } from './components/QuestionBank';
import { ExamCreator } from './components/ExamCreator';
import { StudentDashboard } from './components/StudentDashboard';
import { CBTExamInterface } from './components/CBTExamInterface';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { ClassAttendance } from './components/ClassAttendance';
import { LoginForm } from './components/LoginForm';
import { DatabaseManagementModal } from './components/DatabaseManagementModal';
import { exportSingleStudentResultPDF } from './utils/exportUtils';
import {
  Clock,
  ShieldCheck,
  Download,
  Award,
  CheckCircle2,
  XCircle,
  Database,
  FileJson,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hiit_theme') === 'dark';
  });

  // Current logged in user state (loaded from localStorage so session survives browser reloads)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('hiit_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data Stores
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    showResultsImmediately: true,
    instituteName: 'HiiT PLC',
    centerLocation: 'Abuja Training Centre',
    allowStudentReviewAnswers: true
  });

  const [stats, setStats] = useState<SystemStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalBatches: 0,
    pendingExams: 0,
    approvedExams: 0,
    completedExams: 0,
    passRatePercent: 0,
    failRatePercent: 0,
    totalQuestions: 0
  });

  // Active CBT Exam Attempt state
  const [activeExamSession, setActiveExamSession] = useState<{
    exam: Exam;
    questions: Question[];
    attempt: ExamAttempt;
  } | null>(null);

  // Result Detail Modal
  const [viewingResult, setViewingResult] = useState<ExamAttempt | null>(null);

  // Dark Mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hiit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hiit_theme', 'light');
    }
  }, [darkMode]);

  // Load Data from Backend API
  const refreshAllData = async () => {
    try {
      const [
        resCourses,
        resInstructors,
        resBatches,
        resStudents,
        resQuestions,
        resExams,
        resAttempts,
        resAttendance,
        resLogs,
        resSettings,
        resStats
      ] = await Promise.all([
        fetch('/api/courses').then((r) => r.json()),
        fetch('/api/instructors').then((r) => r.json()),
        fetch('/api/batches').then((r) => r.json()),
        fetch('/api/students').then((r) => r.json()),
        fetch('/api/questions').then((r) => r.json()),
        fetch('/api/exams').then((r) => r.json()),
        fetch('/api/attempts').then((r) => r.json()),
        fetch('/api/attendance').then((r) => r.json()),
        fetch('/api/logs').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/stats').then((r) => r.json())
      ]);

      if (Array.isArray(resCourses)) setCourses(resCourses);
      if (Array.isArray(resInstructors)) setInstructors(resInstructors);
      if (Array.isArray(resBatches)) setBatches(resBatches);
      if (Array.isArray(resStudents)) setStudents(resStudents);
      if (Array.isArray(resQuestions)) setQuestions(resQuestions);
      if (Array.isArray(resExams)) setExams(resExams);
      if (Array.isArray(resAttempts)) setAttempts(resAttempts);
      if (Array.isArray(resAttendance)) setAttendanceSessions(resAttendance);
      if (Array.isArray(resLogs)) setLogs(resLogs);
      if (resSettings) setSettings(resSettings);
      if (resStats) setStats(resStats);
    } catch (err) {
      console.error('Failed to load API data:', err);
    }
  };

  // Attendance Handlers
  const handleSaveAttendance = async (sessionData: Partial<AttendanceSession>) => {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    refreshAllData();
  };

  const handleUpdateAttendance = async (id: string, sessionData: Partial<AttendanceSession>) => {
    await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    refreshAllData();
  };

  const handleDeleteAttendance = async (id: string) => {
    await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Course Handlers
  const handleAddCourse = async (data: any) => {
    await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleEditCourse = async (id: string, data: any) => {
    await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleDeleteCourse = async (id: string) => {
    await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  const handleToggleCourseStatus = async (id: string) => {
    await fetch(`/api/courses/${id}/status`, { method: 'PATCH' });
    refreshAllData();
  };

  // Instructor Handlers
  const handleAddInstructor = async (data: any) => {
    await fetch('/api/instructors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleEditInstructor = async (id: string, data: any) => {
    await fetch(`/api/instructors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleResetPassword = async (id: string) => {
    const res = await fetch(`/api/instructors/${id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    refreshAllData();
  };

  const handleDeleteInstructor = async (id: string) => {
    await fetch(`/api/instructors/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  // Batch Handlers
  const handleCreateBatch = async (data: any) => {
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleEditBatch = async (id: string, data: any) => {
    await fetch(`/api/batches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleCloseBatch = async (id: string) => {
    await fetch(`/api/batches/${id}/close`, { method: 'PATCH' });
    refreshAllData();
  };

  const handleDeleteBatch = async (id: string) => {
    await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  // Student Handlers
  const handleAddStudent = async (data: any) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    refreshAllData();
    return result;
  };

  const handleImportStudents = async (studentsList: any[], sendEmail: boolean = true) => {
    const res = await fetch('/api/students/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: studentsList, sendEmail })
    });
    const result = await res.json();
    refreshAllData();
    return result;
  };

  const handleRemoveStudent = async (id: string) => {
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  const handleResetStudentPassword = async (id: string, newPassword?: string) => {
    const res = await fetch(`/api/students/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, sendEmail: true })
    });
    const result = await res.json();
    refreshAllData();
    return result;
  };

  const handleSendStudentCredentialsEmail = async (id: string, customPassword?: string) => {
    const res = await fetch(`/api/students/${id}/send-credentials-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customPassword })
    });
    const result = await res.json();
    refreshAllData();
    return result;
  };

  // Question Bank Handlers
  const handleCreateQuestion = async (data: any) => {
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        instructorId: currentUser?.id,
        instructorName: currentUser?.name
      })
    });
    refreshAllData();
  };

  const handleEditQuestion = async (id: string, data: any) => {
    await fetch(`/api/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    refreshAllData();
  };

  const handleDeleteQuestion = async (id: string) => {
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  const handleSubmitQuestionForApproval = async (id: string) => {
    await fetch(`/api/questions/${id}/submit`, { method: 'POST' });
    refreshAllData();
  };

  const handleReviewQuestion = async (id: string, action: 'approve' | 'reject' | 'modification', reason?: string) => {
    await fetch(`/api/questions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason })
    });
    refreshAllData();
  };

  const handleImportQuestions = async (questionsList: any[]) => {
    await fetch('/api/questions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: questionsList })
    });
    refreshAllData();
  };

  // Exam Handlers
  const handleCreateExam = async (data: any) => {
    await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        instructorId: currentUser?.id,
        instructorName: currentUser?.name
      })
    });
    refreshAllData();
  };

  const handleUpdateExamStatus = async (id: string, status: string) => {
    await fetch(`/api/exams/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    refreshAllData();
  };

  const handleDeleteExam = async (id: string) => {
    await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    refreshAllData();
  };

  // Toggle Results Visibility
  const handleToggleShowResults = async (show: boolean) => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showResultsImmediately: show })
    });
    refreshAllData();
  };

  // Reset Seed Data
  const handleResetSeedData = async () => {
    if (confirm('Are you sure you want to reset all data back to the default state?')) {
      await fetch('/api/seed/reset', { method: 'POST' });
      refreshAllData();
    }
  };

  // CBT Exam Engine Execution Flow
  const handleStartExam = async (examId: string) => {
    if (!currentUser) return;

    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;

    // Fetch start attempt
    const res = await fetch('/api/attempts/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId,
        studentId: currentUser.id
      })
    });

    const attemptData: ExamAttempt = await res.json();
    if (!res.ok) {
      alert((attemptData as any).error || 'Could not start exam.');
      return;
    }

    const examQuestions = questions.filter((q) => exam.questionIds.includes(q.id));

    setActiveExamSession({
      exam,
      questions: examQuestions,
      attempt: attemptData
    });
  };

  const handleAutoSaveAnswers = async (
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>,
    timeSpentSeconds: number,
    flaggedQuestions: string[]
  ) => {
    if (!activeExamSession) return;
    await fetch(`/api/attempts/${activeExamSession.attempt.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        timeSpentSeconds,
        flaggedQuestions
      })
    });
  };

  const handleSubmitExam = async (
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>,
    timeSpentSeconds: number
  ) => {
    if (!activeExamSession) return;
    const res = await fetch(`/api/attempts/${activeExamSession.attempt.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        timeSpentSeconds
      })
    });

    const finalAttempt: ExamAttempt = await res.json();
    setActiveExamSession(null);
    refreshAllData();

    // Show completed result modal
    setViewingResult(finalAttempt);
  };

  // If in active CBT Exam Mode, render full screen CBT interface!
  if (activeExamSession) {
    return (
      <CBTExamInterface
        exam={activeExamSession.exam}
        questions={activeExamSession.questions}
        attempt={activeExamSession.attempt}
        onAutoSaveAnswer={handleAutoSaveAnswers}
        onSubmitExam={handleSubmitExam}
        onExitExam={() => setActiveExamSession(null)}
      />
    );
  }

  // If not logged in, render the Login Screen as the Landing Page!
  if (!currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LoginForm
          isLandingPage={true}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setActiveTab('overview');
          }}
          onOpenDatabase={() => setIsDatabaseModalOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
        {/* Persistent JSON Database Manager Modal */}
        <DatabaseManagementModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          onDataChanged={refreshAllData}
        />
      </div>
    );
  }

  const pendingQuestionsCount = questions.filter((q) => q.status === 'pending').length;

  // Derive Instructor specific course and batch scope
  const instructorCourseIds = new Set<string>([
    ...(currentUser?.assignedCourseIds || []),
    ...batches
      .filter((b) => b.instructorId === currentUser?.id || currentUser?.assignedBatchIds?.includes(b.id))
      .map((b) => b.courseId)
  ]);

  const instructorBatchIds = new Set<string>([
    ...(currentUser?.assignedBatchIds || []),
    ...batches.filter((b) => b.instructorId === currentUser?.id).map((b) => b.id)
  ]);

  // Filtered scope lists for instructor role
  const instructorStudents = currentUser?.role === 'instructor'
    ? students.filter(
        (s) => instructorCourseIds.has(s.courseId) || instructorBatchIds.has(s.batchId)
      )
    : students;

  const instructorCourses = currentUser?.role === 'instructor'
    ? courses.filter((c) => instructorCourseIds.has(c.id))
    : courses;

  const instructorBatches = currentUser?.role === 'instructor'
    ? batches.filter((b) => instructorBatchIds.has(b.id) || instructorCourseIds.has(b.courseId))
    : batches;

  const instructorQuestions = currentUser?.role === 'instructor'
    ? questions.filter((q) => q.instructorId === currentUser.id || instructorCourseIds.has(q.courseId))
    : questions;

  const instructorExams = currentUser?.role === 'instructor'
    ? exams.filter((e) => e.instructorId === currentUser.id || instructorCourseIds.has(e.courseId))
    : exams;

  const handleLoginSuccess = (user: User) => {
    try {
      localStorage.setItem('hiit_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth to localStorage:', e);
    }
    setCurrentUser(user);
    setActiveTab('overview');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('hiit_auth_user');
      localStorage.removeItem('hiit_auth_token');
    } catch (e) {
      console.error('Failed to clear auth from localStorage:', e);
    }
    setCurrentUser(null);
    setIsMobileSidebarOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001D32] via-[#002B49] to-slate-900">
        <LoginForm
          isLandingPage={true}
          onLoginSuccess={handleLoginSuccess}
          onOpenDatabase={() => setIsDatabaseModalOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
        {isDatabaseModalOpen && (
          <DatabaseManagementModal
            isOpen={isDatabaseModalOpen}
            onClose={() => setIsDatabaseModalOpen(false)}
            onDataChanged={refreshAllData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
        onOpenLogin={() => {}}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row min-w-0">
        {/* Role-Aware Sidebar */}
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          pendingQuestionsCount={pendingQuestionsCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto w-full min-w-0">
          {/* FACULTY COORDINATOR VIEWS */}
          {currentUser.role === 'coordinator' && (
                <>
                  {activeTab === 'overview' && (
                    <CoordinatorDashboard
                      stats={stats}
                      logs={logs}
                      settings={settings}
                      pendingQuestions={questions.filter((q) => q.status === 'pending')}
                      onToggleShowResults={handleToggleShowResults}
                      onNavigate={setActiveTab}
                      onResetSeedData={handleResetSeedData}
                      onOpenDatabase={() => setIsDatabaseModalOpen(true)}
                    />
                  )}
                  {activeTab === 'courses' && (
                    <CourseManagement
                      courses={courses}
                      onAddCourse={handleAddCourse}
                      onEditCourse={handleEditCourse}
                      onDeleteCourse={handleDeleteCourse}
                      onToggleCourseStatus={handleToggleCourseStatus}
                    />
                  )}
                  {activeTab === 'instructors' && (
                    <InstructorManagement
                      instructors={instructors}
                      courses={courses}
                      batches={batches}
                      onAddInstructor={handleAddInstructor}
                      onEditInstructor={handleEditInstructor}
                      onResetPassword={handleResetPassword}
                      onDeleteInstructor={handleDeleteInstructor}
                    />
                  )}
                  {activeTab === 'question-approval' && (
                    <QuestionApprovalModal
                      questions={questions}
                      onReviewQuestion={handleReviewQuestion}
                    />
                  )}
                  {activeTab === 'batches' && (
                    <BatchManagement
                      batches={batches}
                      courses={courses}
                      instructors={instructors}
                      onCreateBatch={handleCreateBatch}
                      onEditBatch={handleEditBatch}
                      onCloseBatch={handleCloseBatch}
                      onDeleteBatch={handleDeleteBatch}
                    />
                  )}
                  {activeTab === 'students' && (
                    <StudentManagement
                      students={students}
                      courses={courses}
                      batches={batches}
                      onAddStudent={handleAddStudent}
                      onImportStudents={handleImportStudents}
                      onRemoveStudent={handleRemoveStudent}
                      onResetPassword={handleResetStudentPassword}
                      onSendCredentialsEmail={handleSendStudentCredentialsEmail}
                    />
                  )}
                  {activeTab === 'attendance' && (
                    <ClassAttendance
                      currentUser={currentUser}
                      courses={courses}
                      batches={batches}
                      students={students}
                      attendanceSessions={attendanceSessions}
                      onSaveAttendance={handleSaveAttendance}
                      onUpdateAttendance={handleUpdateAttendance}
                      onDeleteAttendance={handleDeleteAttendance}
                    />
                  )}
                  {activeTab === 'questions' && (
                    <QuestionBank
                      questions={questions}
                      courses={courses}
                      onCreateQuestion={handleCreateQuestion}
                      onEditQuestion={handleEditQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                      onSubmitForApproval={handleSubmitQuestionForApproval}
                      onImportQuestions={handleImportQuestions}
                    />
                  )}
                  {activeTab === 'exams' && (
                    <ExamCreator
                      exams={exams}
                      courses={courses}
                      batches={batches}
                      questions={questions}
                      onCreateExam={handleCreateExam}
                      onUpdateExamStatus={handleUpdateExamStatus}
                      onDeleteExam={handleDeleteExam}
                      userRole="coordinator"
                    />
                  )}
                  {activeTab === 'reports' && (
                    <ReportsAnalytics
                      stats={stats}
                      attempts={attempts}
                      courses={courses}
                      batches={batches}
                      students={students}
                    />
                  )}
                  {activeTab === 'database' && (
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h2 className="text-base sm:text-lg font-black text-[#002B49] dark:text-white flex items-center space-x-2">
                              <Database className="w-5 h-5 text-[#C8102E]" />
                              <span>JSON File Database &amp; Records Storage</span>
                            </h2>
                            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Synced to Disk
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            All application records are persisted directly into JSON files in <code className="font-mono text-slate-700 dark:text-slate-300 font-bold">/data/*.json</code>. Zero risk of losing records on restart.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href="/api/database/export"
                            download
                            className="px-3.5 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-[#C8102E]" />
                            <span>Download Full JSON Backup</span>
                          </a>
                          <button
                            onClick={() => setIsDatabaseModalOpen(true)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                            <span>Open DB Manager &amp; Restore</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled Students</span>
                          <span className="text-2xl font-black text-[#002B49] dark:text-white mt-1">{students.length}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-mono">students.json</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Exam Submissions</span>
                          <span className="text-2xl font-black text-emerald-600 mt-1">{attempts.length}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-mono">attempts.json</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Question Bank Items</span>
                          <span className="text-2xl font-black text-indigo-600 mt-1">{questions.length}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-mono">questions.json</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Sessions</span>
                          <span className="text-2xl font-black text-blue-600 mt-1">{attendanceSessions.length}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-mono">attendance.json</span>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          <div>
                            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                              Automated Atomic File Writing &amp; Backup Snapshots
                            </h4>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300">
                              Every change writes immediately to disk with safe temp-swap to prevent corruption. Click below to inspect file sizes or restore from backup.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsDatabaseModalOpen(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
                        >
                          View Storage Details
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'logs' && (
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                      <h2 className="text-base sm:text-lg font-bold text-[#002B49] dark:text-white flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-[#C8102E]" />
                        <span>System Activity Audit Logs</span>
                      </h2>
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                            <div>
                              <strong className="text-slate-900 dark:text-white">{log.userName}</strong> ({log.userRole}): {log.details}
                            </div>
                            <span className="text-slate-400 font-mono text-[10px] self-end sm:self-auto">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === 'settings' && (
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-6 max-w-2xl">
                      <div>
                        <h2 className="text-lg font-bold text-[#002B49] dark:text-white">System Settings &amp; Data Storage</h2>
                        <p className="text-xs text-slate-500 mt-1">Configure assessment policies and inspect persistent database storage</p>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Immediate Result Release</span>
                            <span className="text-[11px] text-slate-400">If disabled, student scores are hidden until coordinator releases them.</span>
                          </div>
                          <button
                            onClick={() => handleToggleShowResults(!settings.showResultsImmediately)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${settings.showResultsImmediately ? 'bg-emerald-600' : 'bg-slate-600'}`}
                          >
                            {settings.showResultsImmediately ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      </div>

                      {/* Persistent JSON Storage Card in Settings */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Persistent JSON File Database
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Active &amp; Persisted
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Data is securely saved to local JSON files in <code className="font-mono text-slate-700 dark:text-slate-300 font-bold">/data/</code> directory. You can download a complete backup or restore files anytime.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <a
                            href="/api/database/export"
                            download
                            className="px-3 py-1.5 bg-[#002B49] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-[#C8102E]" />
                            <span>Download Full Backup (.json)</span>
                          </a>
                          <button
                            onClick={() => setIsDatabaseModalOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs"
                          >
                            <FileJson className="w-3.5 h-3.5" />
                            <span>Manage JSON Files &amp; Restore</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* INSTRUCTOR VIEWS */}
              {currentUser.role === 'instructor' && (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="bg-[#002B49] text-white p-6 rounded-2xl border-b-4 border-[#C8102E]">
                        <h1 className="text-xl font-bold">Instructor Portal — {currentUser.name}</h1>
                        <p className="text-xs text-slate-300 mt-1">Manage batches, build question banks, and create CBT tests.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase">Assigned Batches</p>
                          <p className="text-2xl font-black text-[#002B49] dark:text-white mt-1">{instructorBatches.length}</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase">Students in Taught Courses</p>
                          <p className="text-2xl font-black text-emerald-600 mt-1">{instructorStudents.length}</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase">Questions Authored</p>
                          <p className="text-2xl font-black text-indigo-600 mt-1">{instructorQuestions.length}</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase">Exams Created</p>
                          <p className="text-2xl font-black text-[#C8102E] mt-1">{instructorExams.length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'batches' && (
                    <BatchManagement
                      batches={instructorBatches}
                      courses={instructorCourses.length > 0 ? instructorCourses : courses}
                      instructors={instructors}
                      onCreateBatch={handleCreateBatch}
                      onEditBatch={handleEditBatch}
                      onCloseBatch={handleCloseBatch}
                      onDeleteBatch={handleDeleteBatch}
                    />
                  )}
                  {activeTab === 'students' && (
                    <StudentManagement
                      students={instructorStudents}
                      courses={instructorCourses.length > 0 ? instructorCourses : courses}
                      batches={instructorBatches.length > 0 ? instructorBatches : batches}
                      onAddStudent={handleAddStudent}
                      onImportStudents={handleImportStudents}
                      onRemoveStudent={handleRemoveStudent}
                      onResetPassword={handleResetStudentPassword}
                      onSendCredentialsEmail={handleSendStudentCredentialsEmail}
                      isInstructorView={true}
                    />
                  )}
                  {activeTab === 'attendance' && (
                    <ClassAttendance
                      currentUser={currentUser}
                      courses={instructorCourses.length > 0 ? instructorCourses : courses}
                      batches={instructorBatches.length > 0 ? instructorBatches : batches}
                      students={instructorStudents}
                      attendanceSessions={attendanceSessions}
                      onSaveAttendance={handleSaveAttendance}
                      onUpdateAttendance={handleUpdateAttendance}
                      onDeleteAttendance={handleDeleteAttendance}
                    />
                  )}
                  {activeTab === 'questions' && (
                    <QuestionBank
                      questions={instructorQuestions}
                      courses={instructorCourses.length > 0 ? instructorCourses : courses}
                      onCreateQuestion={handleCreateQuestion}
                      onEditQuestion={handleEditQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                      onSubmitForApproval={handleSubmitQuestionForApproval}
                      onImportQuestions={handleImportQuestions}
                    />
                  )}
                  {activeTab === 'exams' && (
                    <ExamCreator
                      exams={instructorExams}
                      courses={instructorCourses.length > 0 ? instructorCourses : courses}
                      batches={instructorBatches.length > 0 ? instructorBatches : batches}
                      questions={instructorQuestions}
                      onCreateExam={handleCreateExam}
                      onUpdateExamStatus={handleUpdateExamStatus}
                      onDeleteExam={handleDeleteExam}
                      userRole="instructor"
                    />
                  )}
                  {activeTab === 'reports' && (
                    <ReportsAnalytics
                      stats={{
                        ...stats,
                        totalStudents: instructorStudents.length,
                        totalCourses: instructorCourses.length,
                        totalBatches: instructorBatches.length
                      }}
                      attempts={attempts.filter((a) =>
                        instructorStudents.some((s) => s.id === a.studentId || s.regNumber === a.studentRegNumber)
                      )}
                      courses={instructorCourses}
                      batches={instructorBatches}
                      students={instructorStudents}
                    />
                  )}
                </>
              )}

              {/* REGISTRAR READ ONLY VIEWS */}
              {currentUser.role === 'registrar' && (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="bg-[#002B49] text-white p-6 rounded-2xl border-b-4 border-amber-500 flex justify-between items-center">
                        <div>
                          <h1 className="text-xl font-bold">Registrar Official Portal</h1>
                          <p className="text-xs text-slate-300 mt-1">Read-Only access to academic records, student lists, and exam results.</p>
                        </div>
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold rounded-full uppercase">
                          READ ONLY
                        </span>
                      </div>
                    </div>
                  )}
                  {activeTab === 'courses' && <CourseManagement courses={courses} onAddCourse={() => {}} onEditCourse={() => {}} onDeleteCourse={() => {}} onToggleCourseStatus={() => {}} readOnly />}
                  {activeTab === 'batches' && <BatchManagement batches={batches} courses={courses} instructors={instructors} onCreateBatch={() => {}} onEditBatch={() => {}} onCloseBatch={() => {}} onDeleteBatch={() => {}} readOnly />}
                  {activeTab === 'students' && <StudentManagement students={students} courses={courses} batches={batches} onAddStudent={() => {}} onImportStudents={() => {}} onRemoveStudent={() => {}} readOnly />}
                  {activeTab === 'attendance' && (
                    <ClassAttendance
                      currentUser={currentUser}
                      courses={courses}
                      batches={batches}
                      students={students}
                      attendanceSessions={attendanceSessions}
                      onSaveAttendance={() => {}}
                      onUpdateAttendance={() => {}}
                      onDeleteAttendance={() => {}}
                      readOnly={true}
                    />
                  )}
                  {activeTab === 'questions' && <QuestionBank questions={questions} courses={courses} onCreateQuestion={() => {}} onEditQuestion={() => {}} onDeleteQuestion={() => {}} onSubmitForApproval={() => {}} onImportQuestions={() => {}} readOnly />}
                  {activeTab === 'exams' && <ExamCreator exams={exams} courses={courses} batches={batches} questions={questions} onCreateExam={() => {}} onUpdateExamStatus={() => {}} onDeleteExam={() => {}} userRole="registrar" readOnly />}
                  {activeTab === 'reports' && <ReportsAnalytics stats={stats} attempts={attempts} courses={courses} batches={batches} students={students} />}
                </>
              )}

              {/* STUDENT VIEWS */}
              {currentUser.role === 'student' && (
                <>
                  {(activeTab === 'overview' || activeTab === 'cbt-exams' || activeTab === 'my-results') && (
                    <StudentDashboard
                      currentUser={currentUser}
                      availableExams={exams.filter((e) => e.status === 'published')}
                      studentAttempts={attempts.filter((a) => a.studentId === currentUser.id)}
                      settings={settings}
                      onStartExam={handleStartExam}
                      onViewResultDetails={(att) => setViewingResult(att)}
                    />
                  )}
                  {activeTab === 'attendance' && (
                    <ClassAttendance
                      currentUser={currentUser}
                      courses={courses}
                      batches={batches}
                      students={students}
                      attendanceSessions={attendanceSessions}
                      onSaveAttendance={() => {}}
                      onUpdateAttendance={() => {}}
                      onDeleteAttendance={() => {}}
                      readOnly={true}
                    />
                  )}
                </>
              )}
        </main>
      </div>

      {/* Result Breakdown Statement Modal */}
      {viewingResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-[#002B49] dark:text-white">Official Statement of Result</h3>
                <p className="text-xs text-slate-400">HiiT PLC Abuja Training Centre</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${viewingResult.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {viewingResult.isPassed ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-2 text-xs">
              <div>Student: <strong className="text-slate-900 dark:text-white">{viewingResult.studentName}</strong></div>
              <div>Reg Number: <strong className="font-mono text-[#002B49] dark:text-red-400">{viewingResult.studentRegNumber}</strong></div>
              <div>Exam: <strong className="text-slate-900 dark:text-white">{viewingResult.examTitle}</strong></div>
              <div>Score Obtained: <strong>{viewingResult.scoreObtained} / {viewingResult.totalMarksPossible}</strong></div>
              <div>Percentage: <strong className="text-emerald-600 text-sm">{viewingResult.percentage}%</strong></div>
              <div>Grade Assigned: <strong className="text-[#C8102E] text-sm">{viewingResult.grade}</strong></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => exportSingleStudentResultPDF(viewingResult, 'HiiT Academic Assessment', 'Batch 2026')}
                className="px-4 py-2 bg-[#002B49] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs"
              >
                <Download className="w-4 h-4 text-[#C8102E]" />
                <span>Download Official PDF</span>
              </button>

              <button
                onClick={() => setViewingResult(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent JSON Database Manager Modal */}
      <DatabaseManagementModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onDataChanged={refreshAllData}
      />
    </div>
  );
}
