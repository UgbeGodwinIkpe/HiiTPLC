import React, { useState } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2, Power, AlertCircle, Check } from 'lucide-react';
import { Course } from '../types';

interface CourseManagementProps {
  courses: Course[];
  onAddCourse: (courseData: Partial<Course>) => void;
  onEditCourse: (id: string, courseData: Partial<Course>) => void;
  onDeleteCourse: (id: string) => void;
  onToggleCourseStatus: (id: string) => void;
  readOnly?: boolean;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  onToggleCourseStatus,
  readOnly = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    durationWeeks: 12
  });

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({ code: '', title: '', description: '', durationWeeks: 12 });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      title: course.title,
      description: course.description,
      durationWeeks: course.durationWeeks
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.title) return;

    if (editingCourse) {
      onEditCourse(editingCourse.id, formData);
    } else {
      onAddCourse(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-[#C8102E]" />
            <span>Course Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure academic courses offered at HiiT PLC Abuja Training Centre
          </p>
        </div>

        {!readOnly && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4 text-[#C8102E]" />
            <span>Add New Course</span>
          </button>
        )}
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by course code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]"
          />
        </div>
      </div>

      {/* Course List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className={`p-5 rounded-2xl border transition-all ${
              course.status === 'active'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#002B49] text-white">
                    {course.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      course.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {course.description}
                </p>
                <div className="text-[11px] font-semibold text-slate-400 mt-3">
                  Duration: <span className="text-slate-700 dark:text-slate-300 font-bold">{course.durationWeeks} Weeks</span>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => onToggleCourseStatus(course.id)}
                    className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
                    title={course.status === 'active' ? 'Deactivate Course' : 'Activate Course'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                    title="Edit Course"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteCourse(course.id)}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#002B49] dark:text-white">
              {editingCourse ? 'Edit Course' : 'Add New Academic Course'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code (e.g. SE-301)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.durationWeeks}
                  onChange={(e) => setFormData({ ...formData, durationWeeks: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
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
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
