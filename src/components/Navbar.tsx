import React from 'react';
import {
  GraduationCap,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  Database,
  Menu
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenDatabase?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onOpenLogin,
  onOpenDatabase,
  onToggleMobileSidebar
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Side: Mobile Hamburger & Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {currentUser && onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#002B49] dark:bg-slate-800 flex items-center justify-center text-white border-b-2 border-[#C8102E] shadow-sm shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-[#C8102E] dark:text-red-400" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#002B49] dark:text-white">
                HiiT<span className="text-[#C8102E]">.CBT</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-[#C8102E] dark:bg-red-950/60 dark:text-red-300">
                Abuja Centre
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">
              Academic Assessment & CBT Management System
            </p>
          </div>
        </div>

        {/* Right Action Icons & Profile Info */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Persistent JSON Storage Status */}
          {onOpenDatabase && (
            // <button
            //   onClick={onOpenDatabase}
            //   className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-xs font-bold transition-all shadow-2xs"
            //   title="Persistent JSON File Storage: Synchronized & Active (Click to Manage)"
            // >
            //   <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            //   <span className="hidden md:inline">JSON DB: Synced</span>
            //   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            // </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Dark / Light Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Current User Badge & Logout */}
          {currentUser ? (
            <div className="flex items-center space-x-1.5 sm:space-x-3 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#C8102E] dark:text-red-400">
                  {currentUser.role === 'student' ? `REG: ${currentUser.regNumber}` : currentUser.role}
                </div>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 shrink-0">
                {currentUser.name.charAt(0)}
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#001d32] dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1"
            >
              <UserCheck className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
