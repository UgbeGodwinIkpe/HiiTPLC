import React, { useState } from 'react';
import { FolderGit2, Plus, Calendar, Users, Edit2, Trash2, Power, CheckCircle } from 'lucide-react';
import { Batch, Course, User } from '../types';

interface BatchManagementProps {
  batches: Batch[];
  courses: Course[];
  instructors: User[];
  onCreateBatch: (data: any) => void;
  onEditBatch: (id: string, data: any) => void;
  onCloseBatch: (id: string) => void;
  onDeleteBatch: (id: string) => void;
  readOnly?: boolean;
}

export const BatchManagement: React.FC<BatchManagementProps> = ({
  batches,
  courses,
  instructors,
  onCreateBatch,
  onEditBatch,
  onCloseBatch,
  onDeleteBatch,
  readOnly = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: courses[0]?.id || '',
    instructorId: instructors[0]?.id || '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: ''
  });

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setFormData({
      name: '',
      courseId: courses[0]?.id || '',
      instructorId: instructors[0]?.id || '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      courseId: batch.courseId,
      instructorId: batch.instructorId,
      startDate: batch.startDate,
      endDate: batch.endDate
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.courseId || !formData.instructorId) return;

    if (editingBatch) {
      onEditBatch(editingBatch.id, formData);
    } else {
      onCreateBatch(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
            <FolderGit2 className="w-6 h-6 text-amber-600" />
            <span>Academic Batch Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize student cohorts by course, schedule, and instructor assignment
          </p>
        </div>

        {!readOnly && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4 text-[#C8102E]" />
            <span>Create New Batch</span>
          </button>
        )}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className={`p-5 rounded-2xl border transition-all ${
              batch.status === 'active'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  batch.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {batch.status}
              </span>

              {!readOnly && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onCloseBatch(batch.id)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg"
                    title={batch.status === 'active' ? 'Close Batch' : 'Reopen Batch'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(batch)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
                    title="Edit Batch"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteBatch(batch.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                    title="Delete Batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              {batch.name}
            </h3>

            <p className="text-xs font-semibold text-[#002B49] dark:text-slate-300 mt-1">
              Course: {batch.courseTitle}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Instructor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{batch.instructorName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Start Date:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{batch.startDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Enrolled Students:</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[11px]">
                  {batch.studentCount || 0} Students
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#002B49] dark:text-white">
              {editingBatch ? 'Edit Batch Details' : 'Create New Academic Batch'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Name (e.g. 2026-B1 Morning)
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Course
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Instructor
                </label>
                <select
                  value={formData.instructorId}
                  onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002B49] hover:bg-[#001d32] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
