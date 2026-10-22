import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CheckCircle2,
  FolderGit2,
  UserCheck,
  FileQuestion,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Settings,
  Sparkles,
  Award,
  Eye,
  CalendarCheck,
  Database,
  X
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingQuestionsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeTab,
  onTabChange,
  pendingQuestionsCount = 0,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const getMenuItems = () => {
    switch (currentRole) {
      case 'coordinator':
        return [
          { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'courses', label: 'Course Management', icon: BookOpen },
          { id: 'instructors', label: 'Instructor Management', icon: Users },
          {
            id: 'question-approval',
            label: 'Question Approvals',
            icon: CheckCircle2,
            badge: pendingQuestionsCount > 0 ? pendingQuestionsCount : undefined
          },
          { id: 'batches', label: 'Batch Management', icon: FolderGit2 },
          { id: 'students', label: 'Student Directory', icon: UserCheck },
          { id: 'attendance', label: 'Class Attendance', icon: CalendarCheck },
          { id: 'questions', label: 'Question Bank', icon: FileQuestion },
          { id: 'exams', label: 'Exams & CBT Setup', icon: FileSpreadsheet },
          { id: 'reports', label: 'Results & Analytics', icon: BarChart3 },
          { id: 'database', label: 'Database & JSON Storage', icon: Database },
          { id: 'logs', label: 'Audit Logs', icon: Clock },
          { id: 'settings', label: 'System Settings', icon: Settings },
        ];

      case 'instructor':
        return [
          { id: 'overview', label: 'Instructor Dashboard', icon: LayoutDashboard },
          { id: 'batches', label: 'Batch Management', icon: FolderGit2 },
          { id: 'students', label: 'Student Roster', icon: UserCheck },
          { id: 'attendance', label: 'Class Attendance', icon: CalendarCheck },
          { id: 'questions', label: 'Question Bank', icon: FileQuestion },
          { id: 'exams', label: 'Exam Creator', icon: FileSpreadsheet },
          { id: 'reports', label: 'Results & Performance', icon: BarChart3 },
        ];

      case 'registrar':
        return [
          { id: 'overview', label: 'Registrar Portal', icon: LayoutDashboard },
          { id: 'courses', label: 'View Courses', icon: BookOpen },
          { id: 'batches', label: 'View Batches', icon: FolderGit2 },
          { id: 'students', label: 'Student Directory', icon: UserCheck },
          { id: 'attendance', label: 'Class Attendance', icon: CalendarCheck },
          { id: 'questions', label: 'View Question Bank', icon: FileQuestion },
          { id: 'exams', label: 'View Exams', icon: FileSpreadsheet },
          { id: 'reports', label: 'Official Results', icon: BarChart3 },
        ];

      case 'student':
        return [
          { id: 'overview', label: 'Student Portal', icon: LayoutDashboard },
          { id: 'attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'cbt-exams', label: 'Available CBT Exams', icon: FileSpreadsheet },
          { id: 'my-results', label: 'My Statement of Result', icon: Award },
          { id: 'profile', label: 'My Academic Profile', icon: UserCheck },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const handleItemClick = (id: string) => {
    onTabChange(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 overflow-y-auto">
      <div>
        {/* Mobile Header Close */}
        {onCloseMobile && (
          <div className="lg:hidden flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="font-extrabold text-sm text-[#002B49] dark:text-white">Navigation Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Role Identity Tag */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
            Active Workspace
          </div>
          <div className="text-sm font-bold text-[#002B49] dark:text-slate-100 capitalize flex items-center justify-between mt-0.5">
            <span>
              {currentRole === 'coordinator' && 'Faculty Coordinator'}
              {currentRole === 'instructor' && 'Academic Instructor'}
              {currentRole === 'registrar' && 'Registrar (Read Only)'}
              {currentRole === 'student' && 'Student Portal'}
            </span>
            {currentRole === 'registrar' && (
              <span className="p-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold rounded">
                <Eye className="w-3 h-3 inline mr-0.5" /> RO
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#002B49] text-white shadow-xs dark:bg-slate-800 dark:text-white dark:border-l-4 dark:border-[#C8102E]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C8102E] dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#C8102E] text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center mt-6">
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40">
          <p className="text-[11px] font-bold text-[#002B49] dark:text-slate-200">HiiT Assessment Engine</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">v2.4 - Abuja Centre</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 min-h-[calc(100vh-4rem)] flex-col justify-between transition-colors duration-200">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl h-full z-10 flex flex-col transition-transform duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
