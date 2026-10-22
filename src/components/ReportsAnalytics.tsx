import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  PieChart as PieChartIcon,
  X,
  Filter,
  Search,
  BookOpen
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { SystemStats, ExamAttempt, Course, Batch, StudentProfile } from '../types';
import {
  exportToExcel,
  exportExamResultsPDF,
  exportCourseResultsPDF,
  exportCourseResultsExcel,
  exportCourseResultsCSV
} from '../utils/exportUtils';

interface ReportsAnalyticsProps {
  stats: SystemStats;
  attempts: ExamAttempt[];
  courses: Course[];
  batches: Batch[];
  students: StudentProfile[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  stats,
  attempts,
  courses,
  batches,
  students
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCourseId, setExportCourseId] = useState<string>('all');

  const handleOpenExportModal = () => {
    setExportCourseId(selectedCourseFilter);
    setIsExportModalOpen(true);
  };

  // Helper to get attempts for a given course ID
  const getAttemptsForCourse = (courseId: string) => {
    if (!courseId || courseId === 'all') return attempts;

    const course = courses.find((c) => c.id === courseId);
    const courseStudents = students.filter((s) => s.courseId === courseId);
    const studentRegs = new Set(courseStudents.map((s) => s.regNumber));
    const studentIds = new Set(courseStudents.map((s) => s.id));

    const courseName = course ? course.title.toLowerCase() : '';
    const courseCode = course ? course.code.toLowerCase() : '';

    const filtered = attempts.filter((att) => {
      if (studentRegs.has(att.studentRegNumber) || studentIds.has(att.studentId)) return true;
      if (courseName && att.examTitle.toLowerCase().includes(courseName)) return true;
      if (courseCode && att.examTitle.toLowerCase().includes(courseCode)) return true;
      return false;
    });

    // If no direct matches by ID, return attempts associated with this course if any
    return filtered;
  };

  const activeAttempts = getAttemptsForCourse(selectedCourseFilter);

  const searchedAttempts = activeAttempts.filter((att) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      att.studentName.toLowerCase().includes(term) ||
      att.studentRegNumber.toLowerCase().includes(term) ||
      att.examTitle.toLowerCase().includes(term)
    );
  });

  // Calculate stats for current filter
  const totalSubmissions = activeAttempts.length;
  const passCount = activeAttempts.filter((a) => a.isPassed).length;
  const failCount = totalSubmissions - passCount;
  const passRatePercent = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;
  const failRatePercent = totalSubmissions > 0 ? Math.round((failCount / totalSubmissions) * 100) : 0;

  // Chart Data Preparation
  const passFailData = [
    { name: 'Passed', value: passRatePercent, color: '#10B981' },
    { name: 'Failed', value: failRatePercent, color: '#EF4444' }
  ];

  const studentsPerCourseData = courses.map((c) => ({
    name: c.code,
    fullName: c.title,
    students: students.filter((s) => s.courseId === c.id).length
  }));

  const studentsPerBatchData = batches.map((b) => ({
    name: b.name.split(' ')[0],
    students: students.filter((s) => s.batchId === b.id).length
  }));

  const monthlyExamsTrend = [
    { month: 'Jan 2026', exams: 2, avgScore: 78 },
    { month: 'Feb 2026', exams: 5, avgScore: 82 },
    { month: 'Mar 2026', exams: 8, avgScore: 85 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-[#C8102E]" />
            <span>Academic Performance & CBT Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual statistics, pass/fail trends, and downloadable course assessment reports
          </p>
        </div>

        {/* Course Filter & Primary Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Courses (Overview)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenExportModal}
            className="px-4 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-[#C8102E]" />
            <span>Export Student Results</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total CBT Submissions</p>
          <p className="text-2xl font-black text-[#002B49] dark:text-white mt-1">{totalSubmissions}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Average Pass Rate</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{passRatePercent}%</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Enrolled Students</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {selectedCourseFilter === 'all'
              ? stats.totalStudents
              : students.filter((s) => s.courseId === selectedCourseFilter).length}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Active Courses</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{stats.totalCourses}</p>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass vs Fail Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#002B49] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
            <PieChartIcon className="w-4 h-4 text-emerald-600" />
            <span>Pass vs Fail Ratio (%)</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students per Course Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#002B49] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Student Distribution Per Course</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentsPerCourseData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#888888" fontSize={11} />
                <Tooltip />
                <Bar dataKey="students" fill="#002B49" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students per Batch Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#002B49] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Students Enrolled Per Batch</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentsPerBatchData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#888888" fontSize={11} />
                <Tooltip />
                <Bar dataKey="students" fill="#C8102E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly CBT Trend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#002B49] dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Monthly Exam Volume & Average Score (%)</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyExamsTrend}>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="avgScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* STUDENT RESULTS LOG TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#002B49] dark:text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#C8102E]" />
              <span>Student CBT Examination Results Log</span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedCourseFilter === 'all'
                ? 'Showing all student assessment records across all courses'
                : `Showing filtered results for: ${courses.find((c) => c.id === selectedCourseFilter)?.title}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#002B49]"
              />
            </div>
            <button
              onClick={handleOpenExportModal}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {searchedAttempts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No student examination results found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Reg Number</th>
                  <th className="py-3 px-4">Exam Title</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4 text-center">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {searchedAttempts.map((att, idx) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{att.studentName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{att.studentRegNumber}</td>
                    <td className="py-3 px-4">{att.examTitle}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {att.scoreObtained !== undefined ? `${att.scoreObtained}/${att.totalMarksPossible}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {att.percentage !== undefined ? `${att.percentage.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {att.grade || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          att.isPassed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {att.isPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SELECT COURSE TO DOWNLOAD STUDENT RESULTS */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-50 dark:bg-red-950/50 rounded-xl">
                  <Download className="w-5 h-5 text-[#C8102E]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49] dark:text-white">
                    Select Course to Download Student Results
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose a specific course to generate its official student CBT results
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course Selector Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Course:
              </label>
              <select
                value={exportCourseId}
                onChange={(e) => setExportCourseId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#002B49]"
              >
                <option value="all">All Courses (Overall Summary)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Course Preview Card */}
            {(() => {
              const selectedCourse = courses.find((c) => c.id === exportCourseId);
              const targetAttempts = getAttemptsForCourse(exportCourseId);
              const targetPassCount = targetAttempts.filter((a) => a.isPassed).length;
              const targetFailCount = targetAttempts.length - targetPassCount;
              const targetPassRate = targetAttempts.length > 0 ? ((targetPassCount / targetAttempts.length) * 100).toFixed(1) : '0';

              return (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {selectedCourse ? selectedCourse.code : 'ALL COURSES'}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#002B49] dark:text-white mt-1">
                        {selectedCourse ? selectedCourse.title : 'Overall HiiT CBT Assessment Summary'}
                      </h4>
                    </div>
                  </div>

                  {/* Roster Breakdown Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg">
                      <span className="block text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">Total Attempts</span>
                      <span className="text-sm font-extrabold text-blue-800 dark:text-blue-300">{targetAttempts.length}</span>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                      <span className="block text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Passed</span>
                      <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{targetPassCount}</span>
                    </div>
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                      <span className="block text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Failed</span>
                      <span className="text-sm font-extrabold text-rose-800 dark:text-rose-300">{targetFailCount}</span>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                      <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Pass Rate</span>
                      <span className="text-sm font-extrabold text-amber-800 dark:text-amber-300">{targetPassRate}%</span>
                    </div>
                  </div>

                  {targetAttempts.length === 0 ? (
                    <p className="text-xs text-rose-500 italic text-center pt-2">
                      No CBT submission records found for this course.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      The exported report will include student names, registration numbers, scores, percentages, grades, and pass/fail remarks.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Export Format Actions */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Choose Export Format:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const selectedCourse = courses.find((c) => c.id === exportCourseId);
                    const targetAttempts = getAttemptsForCourse(exportCourseId);
                    if (selectedCourse) {
                      exportCourseResultsPDF(selectedCourse.title, selectedCourse.code, targetAttempts);
                    } else {
                      exportExamResultsPDF(targetAttempts, 'Overall HiiT CBT Assessment Summary');
                    }
                    setIsExportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-[#C8102E]" />
                  <span>Export as PDF Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selectedCourse = courses.find((c) => c.id === exportCourseId);
                    const targetAttempts = getAttemptsForCourse(exportCourseId);
                    if (selectedCourse) {
                      exportCourseResultsExcel(selectedCourse.title, selectedCourse.code, targetAttempts);
                    } else {
                      const summaryData = targetAttempts.map((att) => ({
                        'Student Name': att.studentName,
                        'Reg Number': att.studentRegNumber,
                        'Exam Title': att.examTitle,
                        'Score Obtained': att.scoreObtained,
                        'Total Marks': att.totalMarksPossible,
                        'Percentage (%)': att.percentage,
                        'Grade': att.grade,
                        'Pass/Fail': att.isPassed ? 'PASS' : 'FAIL',
                        'Time Spent (Seconds)': att.timeSpentSeconds,
                        'Submission Date': new Date(att.gradedAt || att.startTime).toLocaleString()
                      }));
                      exportToExcel(summaryData, 'HiiT_Abuja_CBT_Analytics_Report');
                    }
                    setIsExportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Export as Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

