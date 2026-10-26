import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  UserCheck,
  BookOpen,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import {
  User,
  Course,
  Batch,
  StudentProfile,
  AttendanceSession,
  AttendanceStatus,
  StudentAttendanceRecord
} from '../types';
import {
  exportToExcel,
  exportToCSV,
  exportAttendancePDF,
  exportSingleSessionAttendancePDF,
  exportSingleSessionAttendanceExcel,
  exportSingleSessionAttendanceCSV,
  exportWeeklyAttendancePDF,
  exportWeeklyAttendanceExcel,
  exportWeeklyAttendanceCSV,
  formatRegisterDate,
  getWeekRange
} from '../utils/exportUtils';

interface ClassAttendanceProps {
  currentUser: User;
  courses: Course[];
  batches: Batch[];
  students: StudentProfile[];
  attendanceSessions: AttendanceSession[];
  onSaveAttendance: (sessionData: Partial<AttendanceSession>) => Promise<void>;
  onUpdateAttendance: (id: string, sessionData: Partial<AttendanceSession>) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  readOnly?: boolean;
}

export const ClassAttendance: React.FC<ClassAttendanceProps> = ({
  currentUser,
  courses,
  batches,
  students,
  attendanceSessions,
  onSaveAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  readOnly = false
}) => {
  const isInstructor = currentUser.role === 'instructor';
  const isStudent = currentUser.role === 'student';
  const isCoordinator = currentUser.role === 'coordinator';
  const isRegistrar = currentUser.role === 'registrar';

  // Active View Tab for Coordinator/Registrar: 'sessions' | 'students'
  const [viewTab, setViewTab] = useState<'sessions' | 'students'>('sessions');

  // Filters
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Instructor Marking Attendance or Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Modal Form State
  const [formData, setFormData] = useState<{
    courseId: string;
    batchId: string;
    date: string;
    topic: string;
    records: StudentAttendanceRecord[];
  }>({
    courseId: courses[0]?.id || '',
    batchId: batches[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    topic: '',
    records: []
  });

  // Modal Detail View State
  const [selectedSessionView, setSelectedSessionView] = useState<AttendanceSession | null>(null);

  // Modal State for Weekly and Session Exports
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'weekly' | 'single'>('weekly');
  const [weeklyCourseId, setWeeklyCourseId] = useState<string>('');
  const [weeklyBatchId, setWeeklyBatchId] = useState<string>('all');
  const [weeklySelectedWeekKey, setWeeklySelectedWeekKey] = useState<string>('');
  const [customWeekDate, setCustomWeekDate] = useState<string>('');
  const [exportSessionId, setExportSessionId] = useState<string>('');

  // Calculate available weeks for the selected course
  const availableWeeks = useMemo(() => {
    const courseSessions = attendanceSessions.filter(
      (s) => !weeklyCourseId || s.courseId === weeklyCourseId
    );
    const weekMap = new Map<
      string,
      {
        key: string;
        startDate: string;
        endDate: string;
        label: string;
        sessionDates: string[];
        sessions: AttendanceSession[];
      }
    >();

    courseSessions.forEach((sess) => {
      const range = getWeekRange(sess.date);
      const key = `${range.startDate}_${range.endDate}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          key,
          startDate: range.startDate,
          endDate: range.endDate,
          label: range.label,
          sessionDates: [sess.date],
          sessions: [sess]
        });
      } else {
        const item = weekMap.get(key)!;
        if (!item.sessionDates.includes(sess.date)) {
          item.sessionDates.push(sess.date);
        }
        item.sessions.push(sess);
      }
    });

    // Also include current calendar week if not already present
    const currentWeekRange = getWeekRange(new Date().toISOString().slice(0, 10));
    const currentWeekKey = `${currentWeekRange.startDate}_${currentWeekRange.endDate}`;
    if (!weekMap.has(currentWeekKey)) {
      weekMap.set(currentWeekKey, {
        key: currentWeekKey,
        startDate: currentWeekRange.startDate,
        endDate: currentWeekRange.endDate,
        label: `${currentWeekRange.label} (Current Week)`,
        sessionDates: [],
        sessions: []
      });
    }

    return Array.from(weekMap.values()).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [attendanceSessions, weeklyCourseId]);

  // Active week data computed for weekly export
  const activeWeekData = useMemo(() => {
    const foundWeek =
      availableWeeks.find((w) => w.key === weeklySelectedWeekKey) || availableWeeks[0];
    if (!foundWeek) return null;

    const weekSessions = attendanceSessions.filter((s) => {
      const matchCourse = !weeklyCourseId || s.courseId === weeklyCourseId;
      const matchBatch = weeklyBatchId === 'all' || s.batchId === weeklyBatchId;
      const inDateRange = s.date >= foundWeek.startDate && s.date <= foundWeek.endDate;
      return matchCourse && matchBatch && inDateRange;
    });

    let dates: string[] = Array.from(new Set<string>(weekSessions.map((s) => s.date))).sort();
    if (dates.length === 0) {
      const startD = new Date(foundWeek.startDate + 'T00:00:00');
      const d1 = new Date(startD);
      const d2 = new Date(startD);
      d2.setDate(startD.getDate() + 2);
      const d3 = new Date(startD);
      d3.setDate(startD.getDate() + 4);
      dates = [
        d1.toISOString().slice(0, 10),
        d2.toISOString().slice(0, 10),
        d3.toISOString().slice(0, 10)
      ];
    }

    const sessionColumns = dates.map((d) => ({
      date: d,
      displayDate: formatRegisterDate(d)
    }));

    const targetStudents = students.filter((s) => {
      const matchCourse = !weeklyCourseId || s.courseId === weeklyCourseId;
      const matchBatch = weeklyBatchId === 'all' || s.batchId === weeklyBatchId;
      return matchCourse && matchBatch && s.status === 'active';
    });

    const selectedCourse = courses.find((c) => c.id === weeklyCourseId) || courses[0];
    const selectedBatch = batches.find((b) => b.id === weeklyBatchId);

    return {
      week: foundWeek,
      sessions: weekSessions,
      sessionColumns,
      students: targetStudents,
      course: selectedCourse,
      batch: selectedBatch
    };
  }, [
    availableWeeks,
    weeklySelectedWeekKey,
    attendanceSessions,
    weeklyCourseId,
    weeklyBatchId,
    students,
    courses,
    batches
  ]);

  const handleOpenExportModal = (sessionId?: string) => {
    if (sessionId) {
      setExportSessionId(sessionId);
      setExportMode('single');
    } else {
      setExportMode('weekly');
      const initialCourse = courses[0]?.id || '';
      setWeeklyCourseId(initialCourse);
      setWeeklyBatchId('all');
      if (availableWeeks.length > 0) {
        setWeeklySelectedWeekKey(availableWeeks[0].key);
      }
    }
    setIsExportModalOpen(true);
  };

  const handleSetCustomWeekDate = (dateVal: string) => {
    setCustomWeekDate(dateVal);
    if (!dateVal) return;
    const range = getWeekRange(dateVal);
    const key = `${range.startDate}_${range.endDate}`;
    setWeeklySelectedWeekKey(key);
  };

  // ---------------------------------------------------------
  // INSTRUCTOR / MODAL HELPER FUNCTIONS
  // ---------------------------------------------------------
  const handleOpenMarkAttendance = () => {
    setEditingSessionId(null);

    // Default to instructor's assigned course/batch if available
    let initialCourseId = courses[0]?.id || '';
    let initialBatchId = batches[0]?.id || '';

    if (isInstructor && currentUser.assignedCourseIds && currentUser.assignedCourseIds.length > 0) {
      initialCourseId = currentUser.assignedCourseIds[0];
    }
    if (isInstructor && currentUser.assignedBatchIds && currentUser.assignedBatchIds.length > 0) {
      initialBatchId = currentUser.assignedBatchIds[0];
    }

    // Filter students enrolled in initial batch
    const batchStudents = students.filter(
      (s) => (!initialBatchId || s.batchId === initialBatchId) && s.status === 'active'
    );

    const initialRecords: StudentAttendanceRecord[] = batchStudents.map((s) => ({
      studentId: s.id,
      studentRegNumber: s.regNumber,
      studentName: s.fullName,
      status: 'present',
      remarks: ''
    }));

    setFormData({
      courseId: initialCourseId,
      batchId: initialBatchId,
      date: new Date().toISOString().slice(0, 10),
      topic: '',
      records: initialRecords
    });

    setIsModalOpen(true);
  };

  const handleOpenEditAttendance = (session: AttendanceSession) => {
    setEditingSessionId(session.id);
    setFormData({
      courseId: session.courseId,
      batchId: session.batchId,
      date: session.date,
      topic: session.topic,
      records: [...session.records]
    });
    setIsModalOpen(true);
  };

  const handleBatchChangeInModal = (newBatchId: string) => {
    const selectedBatch = batches.find((b) => b.id === newBatchId);
    const newCourseId = selectedBatch ? selectedBatch.courseId : formData.courseId;

    const batchStudents = students.filter(
      (s) => s.batchId === newBatchId && s.status === 'active'
    );

    const newRecords: StudentAttendanceRecord[] = batchStudents.map((s) => ({
      studentId: s.id,
      studentRegNumber: s.regNumber,
      studentName: s.fullName,
      status: 'present',
      remarks: ''
    }));

    setFormData({
      ...formData,
      batchId: newBatchId,
      courseId: newCourseId,
      records: newRecords
    });
  };

  const handleSetAllStatus = (status: AttendanceStatus) => {
    setFormData({
      ...formData,
      records: formData.records.map((r) => ({ ...r, status }))
    });
  };

  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    setFormData({
      ...formData,
      records: formData.records.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    });
  };

  const handleStudentRemarkChange = (studentId: string, remarks: string) => {
    setFormData({
      ...formData,
      records: formData.records.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.batchId || !formData.topic.trim()) return;

    if (editingSessionId) {
      await onUpdateAttendance(editingSessionId, {
        courseId: formData.courseId,
        batchId: formData.batchId,
        date: formData.date,
        topic: formData.topic,
        records: formData.records
      });
    } else {
      await onSaveAttendance({
        courseId: formData.courseId,
        batchId: formData.batchId,
        instructorId: currentUser.id,
        instructorName: currentUser.name,
        date: formData.date,
        topic: formData.topic,
        records: formData.records
      });
    }

    setIsModalOpen(false);
  };

  // ---------------------------------------------------------
  // FILTERING SESSIONS
  // ---------------------------------------------------------
  const filteredSessions = attendanceSessions.filter((session) => {
    // If student role, filter only sessions where this student is present
    if (isStudent) {
      const isEnrolled = session.records.some((r) => r.studentId === currentUser.id);
      if (!isEnrolled) return false;
    }

    // If instructor, filter sessions for instructor's assigned batches/courses or created by instructor
    if (isInstructor) {
      if (currentUser.assignedBatchIds && currentUser.assignedBatchIds.length > 0) {
        if (!currentUser.assignedBatchIds.includes(session.batchId) && session.instructorId !== currentUser.id) {
          return false;
        }
      }
    }

    if (courseFilter !== 'all' && session.courseId !== courseFilter) return false;
    if (batchFilter !== 'all' && session.batchId !== batchFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = session.topic.toLowerCase().includes(q);
      const matchInstructor = session.instructorName.toLowerCase().includes(q);
      const matchBatch = session.batchName.toLowerCase().includes(q);
      const matchCourse = session.courseTitle.toLowerCase().includes(q) || (session.courseCode && session.courseCode.toLowerCase().includes(q));
      if (!matchTopic && !matchInstructor && !matchBatch && !matchCourse) return false;
    }

    return true;
  });

  // ---------------------------------------------------------
  // STUDENT ROLE STATS & RECORDS
  // ---------------------------------------------------------
  const studentSessions = attendanceSessions.filter((session) =>
    session.records.some((r) => r.studentId === currentUser.id)
  );

  let studentTotalClasses = studentSessions.length;
  let studentAttendedCount = 0;
  let studentLateCount = 0;
  let studentAbsentCount = 0;
  let studentExcusedCount = 0;

  studentSessions.forEach((sess) => {
    const rec = sess.records.find((r) => r.studentId === currentUser.id);
    if (rec) {
      if (rec.status === 'present') studentAttendedCount++;
      else if (rec.status === 'late') {
        studentAttendedCount++;
        studentLateCount++;
      } else if (rec.status === 'absent') studentAbsentCount++;
      else if (rec.status === 'excused') studentExcusedCount++;
    }
  });

  const studentAttendancePct = studentTotalClasses > 0 ? Math.round((studentAttendedCount / studentTotalClasses) * 100) : 100;

  // ---------------------------------------------------------
  // COORDINATOR / REGISTRAR STUDENT REGISTER STATS
  // ---------------------------------------------------------
  const studentRegisterStats = students.map((std) => {
    const stdSessions = attendanceSessions.filter((s) =>
      s.records.some((r) => r.studentId === std.id)
    );
    const totalHeld = stdSessions.length;
    let attended = 0;
    let absent = 0;
    let late = 0;

    stdSessions.forEach((s) => {
      const rec = s.records.find((r) => r.studentId === std.id);
      if (rec) {
        if (rec.status === 'present' || rec.status === 'late') attended++;
        if (rec.status === 'late') late++;
        if (rec.status === 'absent') absent++;
      }
    });

    const pct = totalHeld > 0 ? Math.round((attended / totalHeld) * 100) : 100;

    return {
      student: std,
      totalHeld,
      attended,
      absent,
      late,
      pct
    };
  });

  const filteredStudentRegister = studentRegisterStats.filter((item) => {
    if (courseFilter !== 'all' && item.student.courseId !== courseFilter) return false;
    if (batchFilter !== 'all' && item.student.batchId !== batchFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.student.fullName.toLowerCase().includes(q);
      const matchReg = item.student.regNumber.toLowerCase().includes(q);
      if (!matchName && !matchReg) return false;
    }
    return true;
  });

  // Overall Institute Summary Stats
  const totalSessionsHeld = attendanceSessions.length;
  let globalTotalRecords = 0;
  let globalPresentRecords = 0;

  attendanceSessions.forEach((s) => {
    s.records.forEach((r) => {
      globalTotalRecords++;
      if (r.status === 'present' || r.status === 'late') globalPresentRecords++;
    });
  });

  const globalAvgAttendancePct = globalTotalRecords > 0 ? Math.round((globalPresentRecords / globalTotalRecords) * 100) : 95;
  const atRiskStudentsCount = studentRegisterStats.filter((s) => s.pct < 75 && s.totalHeld > 0).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
            <CalendarCheck className="w-6 h-6 text-[#C8102E]" />
            <span>Class Attendance Register & Logs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isStudent
              ? 'Track your daily class attendance rate, attended lectures, and session logs'
              : isInstructor
              ? 'Mark student attendance for every lecture session and manage past records'
              : 'Institute-wide class attendance monitoring, roster summaries, and report exports'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (isInstructor || isCoordinator) && (
            <button
              onClick={handleOpenMarkAttendance}
              className="px-4 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 text-[#C8102E]" />
              <span>Mark New Attendance</span>
            </button>
          )}

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleOpenExportModal()}
              className="px-3.5 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
              title="Select Class Session to Export"
            >
              <Download className="w-4 h-4 text-[#C8102E]" />
              <span>Export Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT VIEW MODE HERO & CARDS */}
      {isStudent && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Overall Percentage */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Overall Attendance Rate
                </span>
                <span className={`text-2xl font-black ${
                  studentAttendancePct >= 75 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {studentAttendancePct}%
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                  {studentAttendancePct >= 75 ? 'Good Academic Standing' : 'Below 75% Threshold Warning'}
                </span>
              </div>
              <div className={`p-3 rounded-2xl ${
                studentAttendancePct >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 2: Total Classes Held */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Total Sessions Held
                </span>
                <span className="text-2xl font-black text-[#002B49] dark:text-white">
                  {studentTotalClasses}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                  Recorded in your batch
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 3: Attended vs Late */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Attended Sessions
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  {studentAttendedCount}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                  {studentLateCount > 0 ? `Includes ${studentLateCount} late arrival(s)` : '100% on-time attendance'}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Metric 4: Missed Classes */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Missed / Absent
                </span>
                <span className="text-2xl font-black text-rose-600">
                  {studentAbsentCount}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                  {studentExcusedCount > 0 ? `${studentExcusedCount} excused absence(s)` : 'No excuses logged'}
                </span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-2xl">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NON-STUDENT (STAFF) TOP STATS SUMMARY */}
      {!isStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                Total Class Sessions
              </span>
              <span className="text-2xl font-black text-[#002B49] dark:text-white">
                {totalSessionsHeld}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">Recorded lectures</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                Avg Attendance Rate
              </span>
              <span className="text-2xl font-black text-emerald-600">
                {globalAvgAttendancePct}%
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">Across all courses</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                Students Monitored
              </span>
              <span className="text-2xl font-black text-indigo-600">
                {students.length}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">Active roster</span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                Low Attendance Alert
              </span>
              <span className="text-2xl font-black text-rose-600">
                {atRiskStudentsCount}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">&lt;75% Attendance rate</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS FOR STAFF (SESSIONS VS STUDENT REGISTER) */}
      {!isStudent && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewTab('sessions')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewTab === 'sessions'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Class Session Logs ({attendanceSessions.length})
            </button>
            <button
              onClick={() => setViewTab('students')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewTab === 'students'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Student Attendance Roster Register ({students.length})
            </button>
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={
                viewTab === 'students' && !isStudent
                  ? 'Search student name or reg number...'
                  : 'Search lecture topic, instructor, course...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Course */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Batch */}
          <div>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT 1: CLASS SESSIONS LOG TABLE (OR CARDS) */}
      {(isStudent || viewTab === 'sessions') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#C8102E]" />
              <span>{isStudent ? 'My Class Attendance Log' : 'Recorded Lecture Sessions'}</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredSessions.length} session(s)
            </span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic text-xs space-y-2">
              <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No attendance sessions recorded matching your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Course / Batch</th>
                    <th className="px-4 py-3">Session Topic</th>
                    <th className="px-4 py-3">Instructor</th>
                    {isStudent ? (
                      <th className="px-4 py-3 text-center">My Status</th>
                    ) : (
                      <th className="px-4 py-3 text-center">Attendance Summary</th>
                    )}
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSessions.map((session) => {
                    // Calculate summary metrics for session
                    const presentCount = session.records.filter((r) => r.status === 'present' || r.status === 'late').length;
                    const totalCount = session.records.length;
                    const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

                    // Student status if student role
                    const studentRecord = isStudent
                      ? session.records.find((r) => r.studentId === currentUser.id)
                      : null;

                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                          {session.date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#002B49] dark:text-blue-300 block">
                            {session.courseCode || session.courseTitle}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                            {session.batchName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                          {session.topic}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {session.instructorName}
                        </td>

                        {/* Student specific status badge */}
                        {isStudent ? (
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {studentRecord?.status === 'present' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Present</span>
                              </span>
                            )}
                            {studentRecord?.status === 'late' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Late</span>
                              </span>
                            )}
                            {studentRecord?.status === 'absent' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center space-x-1">
                                <XCircle className="w-3 h-3" />
                                <span>Absent</span>
                              </span>
                            )}
                            {studentRecord?.status === 'excused' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 inline-flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Excused</span>
                              </span>
                            )}
                            {studentRecord?.remarks && (
                              <span className="block text-[10px] text-slate-400 italic mt-0.5">
                                "{studentRecord.remarks}"
                              </span>
                            )}
                          </td>
                        ) : (
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="font-extrabold text-[#002B49] dark:text-slate-200">
                              {presentCount}/{totalCount}
                            </span>{' '}
                            <span className={`text-[11px] font-bold ${
                              pct >= 75 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              ({pct}%)
                            </span>
                          </td>
                        )}

                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => setSelectedSessionView(session)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="View Full Attendance Roster"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenExportModal(session.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all"
                            title="Export Selected Session Register (PDF/Excel)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {!readOnly && (isInstructor || isCoordinator) && (
                            <>
                              <button
                                onClick={() => handleOpenEditAttendance(session)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Edit Session Attendance"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteAttendance(session.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Delete Attendance Session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT 2: STUDENT ATTENDANCE REGISTER TAB */}
      {!isStudent && viewTab === 'students' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-[#C8102E]" />
              <span>Student Roster Attendance Performance</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredStudentRegister.length} student(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Reg Number</th>
                  <th className="px-4 py-3">Course / Batch</th>
                  <th className="px-4 py-3 text-center">Sessions Held</th>
                  <th className="px-4 py-3 text-center">Attended</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Attendance %</th>
                  <th className="px-4 py-3 text-center">Academic Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudentRegister.map((item) => (
                  <tr
                    key={item.student.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {item.student.fullName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {item.student.regNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#002B49] dark:text-blue-300 block">
                        {item.student.courseTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{item.student.batchName}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {item.totalHeld}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">
                      {item.attended}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {item.absent}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-slate-900 dark:text-white">
                      {item.pct}%
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.pct >= 75 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Good Standing
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center space-x-1 mx-auto w-max">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Attendance (&lt;75%)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: MARK / EDIT CLASS ATTENDANCE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-[#C8102E]" />
                <span>{editingSessionId ? 'Edit Attendance Record' : 'Mark Class Attendance'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Select Batch */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Batch / Class
                  </label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => handleBatchChangeInModal(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lecture Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Lecture Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lecture / Session Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lecture 4: React State, Hooks & Context API"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Quick Action Buttons for Marking Roster */}
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Enrolled Students Roster ({formData.records.length})
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('present')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('absent')}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg shadow-xs"
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* Student Roster Item List */}
              <div className="space-y-2 max-h-64 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {formData.records.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No active students enrolled in this batch.
                  </div>
                ) : (
                  formData.records.map((r) => (
                    <div
                      key={r.studentId}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                            {r.studentName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {r.studentRegNumber}
                          </span>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(r.studentId, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              r.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(r.studentId, 'late')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              r.status === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(r.studentId, 'absent')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              r.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(r.studentId, 'excused')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              r.status === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      </div>

                      {/* Optional Remark Input */}
                      <input
                        type="text"
                        placeholder="Optional remark (e.g. Arrived 10 mins late, sick leave...)"
                        value={r.remarks || ''}
                        onChange={(e) => handleStudentRemarkChange(r.studentId, e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingSessionId ? 'Save Changes' : 'Save Class Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL SESSION ATTENDANCE ROSTER */}
      {selectedSessionView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {selectedSessionView.courseCode || selectedSessionView.courseTitle}
                </span>
                <h3 className="text-base font-extrabold text-[#002B49] dark:text-white mt-1">
                  {selectedSessionView.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Date: {selectedSessionView.date} | Batch: {selectedSessionView.batchName} | Instructor: {selectedSessionView.instructorName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionView(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Reg Number</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedSessionView.records.map((r, idx) => (
                    <tr key={r.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{r.studentName}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{r.studentRegNumber}</td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        {r.status === 'present' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Present
                          </span>
                        )}
                        {r.status === 'late' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Late
                          </span>
                        )}
                        {r.status === 'absent' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Absent
                          </span>
                        )}
                        {r.status === 'excused' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Excused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 italic">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => exportSingleSessionAttendancePDF(selectedSessionView)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportSingleSessionAttendanceExcel(selectedSessionView)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionView(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPORT CLASS ATTENDANCE REGISTER (WEEKLY HAB FORMAT OR SINGLE SESSION) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 rounded-xl text-[#C8102E]">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#002B49] dark:text-white flex items-center space-x-2">
                    <span>Export Attendance Register</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950 text-[#C8102E] font-bold">
                      HAB Register Template
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Export official HiiT Abuja class attendance registers by Course and Week
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExportMode('weekly')}
                className={`flex items-center space-x-2 py-2 px-4 border-b-2 text-xs font-bold transition-all ${
                  exportMode === 'weekly'
                    ? 'border-[#002B49] text-[#002B49] dark:border-red-500 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Weekly Register (By Course &amp; Week)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`flex items-center space-x-2 py-2 px-4 border-b-2 text-xs font-bold transition-all ${
                  exportMode === 'single'
                    ? 'border-[#002B49] text-[#002B49] dark:border-red-500 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Single Lecture Session</span>
              </button>
            </div>

            {/* MODE 1: WEEKLY ATTENDANCE REGISTER */}
            {exportMode === 'weekly' && (
              <div className="space-y-4">
                {/* Filter Controls: Course, Batch, Week */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {/* Select Course */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1. Select Course:
                    </label>
                    <select
                      value={weeklyCourseId}
                      onChange={(e) => {
                        const newCId = e.target.value;
                        setWeeklyCourseId(newCId);
                        setWeeklyBatchId('all');
                      }}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002B49]"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `${c.code}: ${c.title}` : c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Batch */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      2. Filter Batch:
                    </label>
                    <select
                      value={weeklyBatchId}
                      onChange={(e) => setWeeklyBatchId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002B49]"
                    >
                      <option value="all">All Center Batches ({batches.filter(b => !weeklyCourseId || b.courseId === weeklyCourseId).length})</option>
                      {batches
                        .filter((b) => !weeklyCourseId || b.courseId === weeklyCourseId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Select Week */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      3. Select Week:
                    </label>
                    <select
                      value={weeklySelectedWeekKey || (availableWeeks[0]?.key || '')}
                      onChange={(e) => setWeeklySelectedWeekKey(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002B49]"
                    >
                      {availableWeeks.map((w) => (
                        <option key={w.key} value={w.key}>
                          {w.label} {w.sessions.length > 0 ? `(${w.sessions.length} sessions)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Custom Week Date Picker */}
                <div className="flex flex-wrap items-center justify-between text-xs px-1 gap-2 text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold">Or Jump to Any Week:</span>
                    <input
                      type="date"
                      value={customWeekDate}
                      onChange={(e) => handleSetCustomWeekDate(e.target.value)}
                      className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                    />
                  </div>
                  {activeWeekData && (
                    <div className="text-[11px]">
                      <span>Found <strong>{activeWeekData.sessions.length}</strong> session(s) and <strong>{activeWeekData.students.length}</strong> enrolled student(s).</span>
                    </div>
                  )}
                </div>

                {/* Interactive Live Preview (HAB Template Layout) */}
                {activeWeekData ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    {/* Template Document Header */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black tracking-wide text-[#002B49] dark:text-white uppercase">
                            HiiT PLC
                          </h4>
                          <h5 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                            HAB STUDENTS CLASS ATTENDANCE REGISTER
                          </h5>
                          <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase mt-0.5">
                            COURSE: {activeWeekData.course?.title || 'General Course'}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                          <div>Week: <span className="font-bold text-slate-700 dark:text-slate-300">{activeWeekData.week.label}</span></div>
                          <div>Batch: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeWeekData.batch?.name || 'All Batches'}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Preview Table mimicking the template structure */}
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 font-bold">
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center w-10">S/N</th>
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 min-w-[150px]">STUDENT NAME</th>
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono min-w-[110px]">REG NUMBER</th>
                            {activeWeekData.sessionColumns.map((col, idx) => (
                              <th key={idx} className="p-2 border border-slate-300 dark:border-slate-700 text-center font-extrabold text-[#002B49] dark:text-sky-300 min-w-[95px]">
                                {col.displayDate}
                              </th>
                            ))}
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center text-emerald-700 dark:text-emerald-400">PRESENT</th>
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center text-rose-700 dark:text-rose-400">ABSENT</th>
                            <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center">% ATTEND</th>
                          </tr>
                          <tr className="bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-center">
                            {activeWeekData.sessionColumns.map((_, idx) => (
                              <th key={idx} className="p-1 border border-slate-300 dark:border-slate-700">
                                Remark
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {activeWeekData.students.length === 0 ? (
                            <tr>
                              <td colSpan={3 + activeWeekData.sessionColumns.length + 3} className="p-4 text-center text-slate-500 italic">
                                No active students currently enrolled in this course/batch.
                              </td>
                            </tr>
                          ) : (
                            activeWeekData.students.map((st, idx) => {
                              let presentCount = 0;
                              let absentCount = 0;
                              let evaluatedCount = 0;

                              return (
                                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 text-center font-mono text-slate-500">{idx + 1}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">{st.fullName}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 text-center font-mono font-semibold text-[#002B49] dark:text-red-400">{st.regNumber}</td>
                                  {activeWeekData.sessionColumns.map((col, cIdx) => {
                                    const sess = activeWeekData.sessions.find((s) => s.date === col.date);
                                    const rec = sess?.records.find((r) => r.studentId === st.id || r.studentRegNumber === st.regNumber);
                                    if (rec) {
                                      evaluatedCount++;
                                      if (rec.status === 'present') presentCount++;
                                      else if (rec.status === 'late') presentCount++;
                                      else if (rec.status === 'absent') absentCount++;
                                    }

                                    return (
                                      <td key={cIdx} className="p-2 border border-slate-200 dark:border-slate-800 text-center">
                                        {rec ? (
                                          rec.status === 'present' ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                              Present
                                            </span>
                                          ) : rec.status === 'late' ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                              Late
                                            </span>
                                          ) : rec.status === 'absent' ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                              Absent
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                              Excused
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-slate-400">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 text-center font-extrabold text-emerald-700 dark:text-emerald-400">{presentCount}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 text-center font-extrabold text-rose-700 dark:text-rose-400">{absentCount}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-800 text-center font-bold">
                                    {evaluatedCount > 0 ? `${Math.round((presentCount / evaluatedCount) * 100)}%` : '0%'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {/* Export Action Buttons */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Export Weekly Attendance Register:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={!activeWeekData}
                      onClick={() => {
                        if (activeWeekData) {
                          exportWeeklyAttendancePDF({
                            courseTitle: activeWeekData.course?.title || 'Course Attendance',
                            courseCode: activeWeekData.course?.code,
                            batchName: activeWeekData.batch?.name || (weeklyBatchId === 'all' ? 'All Centre Batches' : 'General Batch'),
                            weekLabel: activeWeekData.week.label,
                            startDate: activeWeekData.week.startDate,
                            endDate: activeWeekData.week.endDate,
                            sessionColumns: activeWeekData.sessionColumns,
                            sessions: activeWeekData.sessions,
                            students: activeWeekData.students.map((s) => ({
                              id: s.id,
                              fullName: s.fullName,
                              regNumber: s.regNumber
                            }))
                          });
                          setIsExportModalOpen(false);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-[#C8102E]" />
                      <span>Export PDF (HAB Register)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!activeWeekData}
                      onClick={() => {
                        if (activeWeekData) {
                          exportWeeklyAttendanceExcel({
                            courseTitle: activeWeekData.course?.title || 'Course Attendance',
                            courseCode: activeWeekData.course?.code,
                            batchName: activeWeekData.batch?.name || (weeklyBatchId === 'all' ? 'All Centre Batches' : 'General Batch'),
                            weekLabel: activeWeekData.week.label,
                            startDate: activeWeekData.week.startDate,
                            endDate: activeWeekData.week.endDate,
                            sessionColumns: activeWeekData.sessionColumns,
                            sessions: activeWeekData.sessions,
                            students: activeWeekData.students.map((s) => ({
                              id: s.id,
                              fullName: s.fullName,
                              regNumber: s.regNumber
                            }))
                          });
                          setIsExportModalOpen(false);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                      <span>Export Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!activeWeekData}
                      onClick={() => {
                        if (activeWeekData) {
                          exportWeeklyAttendanceCSV({
                            courseTitle: activeWeekData.course?.title || 'Course Attendance',
                            courseCode: activeWeekData.course?.code,
                            batchName: activeWeekData.batch?.name || (weeklyBatchId === 'all' ? 'All Centre Batches' : 'General Batch'),
                            weekLabel: activeWeekData.week.label,
                            startDate: activeWeekData.week.startDate,
                            endDate: activeWeekData.week.endDate,
                            sessionColumns: activeWeekData.sessionColumns,
                            sessions: activeWeekData.sessions,
                            students: activeWeekData.students.map((s) => ({
                              id: s.id,
                              fullName: s.fullName,
                              regNumber: s.regNumber
                            }))
                          });
                          setIsExportModalOpen(false);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-slate-300" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: SINGLE LECTURE SESSION EXPORT */}
            {exportMode === 'single' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Class / Lecture Session:
                  </label>
                  {attendanceSessions.length === 0 ? (
                    <p className="text-xs text-rose-500 italic p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900">
                      No recorded class sessions available to export. Please mark attendance for a session first.
                    </p>
                  ) : (
                    <select
                      value={exportSessionId}
                      onChange={(e) => setExportSessionId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002B49]"
                    >
                      {attendanceSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} — {s.courseCode || s.courseTitle} — {s.topic} ({s.batchName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Selected Session Preview Card */}
                {(() => {
                  const targetSession = attendanceSessions.find((s) => s.id === exportSessionId);
                  if (!targetSession) return null;

                  const presentCount = targetSession.records.filter((r) => r.status === 'present').length;
                  const lateCount = targetSession.records.filter((r) => r.status === 'late').length;
                  const absentCount = targetSession.records.filter((r) => r.status === 'absent').length;
                  const totalCount = targetSession.records.length;

                  return (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {targetSession.courseCode || targetSession.courseTitle}
                        </span>
                        <h4 className="text-sm font-extrabold text-[#002B49] dark:text-white mt-1">
                          {targetSession.topic}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Date: <span className="font-bold text-slate-700 dark:text-slate-300">{targetSession.date}</span> | Batch: <span className="font-bold text-slate-700 dark:text-slate-300">{targetSession.batchName}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{targetSession.instructorName}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Present</span>
                          <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{presentCount}</span>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Late</span>
                          <span className="text-sm font-extrabold text-amber-800 dark:text-amber-300">{lateCount}</span>
                        </div>
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Absent</span>
                          <span className="text-sm font-extrabold text-rose-800 dark:text-rose-300">{absentCount}</span>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">Total</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:white">{totalCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Single Session Export Format Actions */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choose Export Format:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!exportSessionId}
                      onClick={() => {
                        const target = attendanceSessions.find((s) => s.id === exportSessionId);
                        if (target) {
                          exportSingleSessionAttendancePDF(target);
                          setIsExportModalOpen(false);
                        }
                      }}
                      className="w-full py-3 px-4 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-[#C8102E]" />
                      <span>Export Single Session PDF</span>
                    </button>

                    <button
                      type="button"
                      disabled={!exportSessionId}
                      onClick={() => {
                        const target = attendanceSessions.find((s) => s.id === exportSessionId);
                        if (target) {
                          exportSingleSessionAttendanceExcel(target);
                          setIsExportModalOpen(false);
                        }
                      }}
                      className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                      <span>Export Single Session Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
