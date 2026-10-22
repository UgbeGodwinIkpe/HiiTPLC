import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileQuestion, MessageSquare } from 'lucide-react';
import { Question } from '../types';

interface QuestionApprovalProps {
  questions: Question[];
  onReviewQuestion: (id: string, action: 'approve' | 'reject' | 'modification', reason?: string) => void;
}

export const QuestionApprovalModal: React.FC<QuestionApprovalProps> = ({
  questions,
  onReviewQuestion
}) => {
  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(pendingQuestions[0] || null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeAction, setActiveAction] = useState<'reject' | 'modification' | null>(null);

  const handleApprove = (id: string) => {
    onReviewQuestion(id, 'approve');
    setActiveAction(null);
    setRejectionReason('');
  };

  const handleActionSubmit = (id: string) => {
    if (!activeAction) return;
    onReviewQuestion(id, activeAction, rejectionReason);
    setActiveAction(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <span>Question Approval Queue</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review instructor-submitted CBT questions for quality, correctness, and curriculum standards
        </p>
      </div>

      {pendingQuestions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Pending Questions for Approval
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted instructor questions have been reviewed. New submissions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Pending Questions */}
          <div className="space-y-3 lg:col-span-1 max-h-[600px] overflow-y-auto pr-1">
            {pendingQuestions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-slate-800 border-[#002B49] dark:border-red-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>{q.courseTitle}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending Review
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2 line-clamp-2">
                    {q.questionText}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>By: {q.instructorName}</span>
                    <span className="font-semibold text-[#C8102E]">{q.marks} Marks</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Question Detailed Review Card */}
          {selectedQuestion && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#002B49] text-white">
                    {selectedQuestion.courseTitle}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Submitted by <strong>{selectedQuestion.instructorName}</strong> on{' '}
                    {new Date(selectedQuestion.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[#C8102E]">
                    {selectedQuestion.marks} Marks
                  </span>
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Difficulty: {selectedQuestion.difficulty}
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Question Text
                </label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedQuestion.questionText}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Options & Correct Answer
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const optionText = selectedQuestion[`option${optKey}` as keyof Question];
                    const isCorrect = selectedQuestion.correctAnswer === optKey;

                    return (
                      <div
                        key={optKey}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-start space-x-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-950 dark:text-emerald-100'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="break-words">{optionText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rejection / Modification Input Box */}
              {activeAction && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                    {activeAction === 'reject' ? 'Reason for Rejection' : 'Modification Feedback for Instructor'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide specific feedback..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setActiveAction(null)}
                      className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleActionSubmit(selectedQuestion.id)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
                    >
                      Confirm Action
                    </button>
                  </div>
                </div>
              )}

              {/* Approval Buttons */}
              {!activeAction && (
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveAction('modification')}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    onClick={() => setActiveAction('reject')}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Question</span>
                  </button>

                  <button
                    onClick={() => handleApprove(selectedQuestion.id)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Question</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
