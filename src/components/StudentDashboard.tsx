import React from 'react';
import { UserCheck, FileSpreadsheet, Play, Award, CheckCircle2, Clock, AlertCircle, FileText, Download } from 'lucide-react';
import { User, Exam, ExamAttempt, SystemSettings } from '../types';
import { exportSingleStudentResultPDF } from '../utils/exportUtils';

interface StudentDashboardProps {
  currentUser: User;
  availableExams: Exam[];
  studentAttempts: ExamAttempt[];
  settings: SystemSettings;
  onStartExam: (examId: string) => void;
  onViewResultDetails: (attempt: ExamAttempt) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  availableExams,
  studentAttempts,
  settings,
  onStartExam,
  onViewResultDetails
}) => {
  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-[#002B49] to-[#001d32] text-white p-4 sm:p-6 rounded-2xl shadow-md border-b-4 border-[#C8102E] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-red-600/30 text-red-200 border border-red-500/30 text-xs font-bold rounded-full uppercase tracking-wider inline-block mb-2">
            Student Assessment Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Welcome, {currentUser.name}!</h1>
          <p className="text-xs text-slate-300 mt-1">
            Registration Number: <strong className="text-white font-mono">{currentUser.regNumber}</strong>
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-xs text-left md:text-right">
          <p className="text-slate-300">Centre Location</p>
          <p className="font-bold text-white">HiiT PLC Abuja Training Centre</p>
        </div>
      </div>

      {/* Available CBT Exams Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-[#C8102E]" />
          <span>Available CBT Examinations</span>
        </h2>

        {availableExams.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No pending live CBT examinations at this time.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Check back when your course instructor publishes scheduled tests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableExams.map((exam) => {
              const previousAttempt = studentAttempts.find(
                (a) => a.examId === exam.id && a.status === 'submitted'
              );

              return (
                <div
                  key={exam.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>{exam.courseTitle}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {exam.durationMinutes} Mins Duration
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                      {exam.title}
                    </h3>

                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div>Total Questions: <strong>{exam.questionIds.length}</strong></div>
                      <div>Passing Threshold: <strong>{exam.passingScorePercent}%</strong></div>
                    </div>
                  </div>

                  {previousAttempt ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Completed (Score: {previousAttempt.percentage}%)
                      </span>
                      <button
                        onClick={() => onViewResultDetails(previousAttempt)}
                        className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                      >
                        View Result
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartExam(exam.id)}
                      className="w-full py-3 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4 text-[#C8102E] fill-current" />
                      <span>Start CBT Examination</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Exam Results History */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>My Statements of Result</span>
        </h2>

        {studentAttempts.length === 0 ? (
          <p className="text-xs text-slate-400 italic">You have not completed any CBT exams yet.</p>
        ) : (
          <div className="space-y-3">
            {studentAttempts.map((att) => (
              <div
                key={att.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Submitted: {new Date(att.gradedAt || att.startTime).toLocaleDateString()}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {att.examTitle}
                  </h4>
                </div>

                {settings.showResultsImmediately ? (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start sm:self-auto">
                    <div className="text-left sm:text-right">
                      <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {att.percentage}%
                      </span>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Grade: {att.grade}</div>
                    </div>

                    <span
                      className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase ${
                        att.isPassed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {att.isPassed ? 'Passed' : 'Failed'}
                    </span>

                    <button
                      onClick={() => exportSingleStudentResultPDF(att, 'HiiT Academic Course', currentUser.assignedBatchIds?.[0] || 'Batch 2026')}
                      className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Download PDF Statement of Result"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-200 self-start sm:self-auto">
                    Results Hidden by Coordinator
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
