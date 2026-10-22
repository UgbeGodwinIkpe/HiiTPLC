import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  GraduationCap,
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Database,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
  onClose?: () => void;
  isLandingPage?: boolean;
  onOpenDatabase?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onClose,
  isLandingPage = false,
  onOpenDatabase,
  darkMode = false,
  onToggleDarkMode
}) => {
  const [roleTab, setRoleTab] = useState<UserRole>('coordinator');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (role: UserRole) => {
    setRoleTab(role);
    setErrorMessage('');
    setIdentifier('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: roleTab,
          identifier,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      try {
        localStorage.setItem('hiit_auth_user', JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('hiit_auth_token', data.token);
        }
      } catch (storageErr) {
        console.error('Failed to save auth to localStorage:', storageErr);
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check network or credentials.');
    } finally {
      setLoading(false);
    }
  };

  const formCard = (
    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
      {/* Banner */}
      <div className="bg-[#002B49] text-white p-5 sm:p-6 border-b-4 border-[#C8102E] text-center space-y-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center text-[#C8102E] shadow-inner">
          <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
        </div>
        <h2 className="text-lg sm:text-xl font-black tracking-tight">HiiT CBT Assessment Portal</h2>
        <p className="text-xs text-slate-300">Abuja Training Centre — Portal Sign In</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Role Tabs */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Select Login Portal:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTabChange('coordinator')}
              className={`py-2 rounded-lg transition-all ${
                roleTab === 'coordinator'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Coordinator
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('instructor')}
              className={`py-2 rounded-lg transition-all ${
                roleTab === 'instructor'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Instructor
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('registrar')}
              className={`py-2 rounded-lg transition-all ${
                roleTab === 'registrar'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('student')}
              className={`py-2 rounded-lg transition-all ${
                roleTab === 'student'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Student
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {roleTab === 'student' ? 'Student Registration Number or Email' : 'Email Address'}
            </label>
            <div className="relative">
              {roleTab === 'student' ? (
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              ) : (
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              )}
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={roleTab === 'student' ? 'e.g. HIIT/2026/001 or email' : 'e.g. user@hiit.ng'}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] dark:focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] dark:focus:ring-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#002B49] hover:bg-[#001d32] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 uppercase tracking-wider cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : `Sign In as ${roleTab.toUpperCase()}`}</span>
            <ArrowRight className="w-4 h-4 text-[#C8102E]" />
          </button>
        </form>

        {onClose && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close Login Modal
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // If used as full Landing Page:
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001D32] via-[#002B49] to-slate-900 text-white flex flex-col justify-between selection:bg-[#C8102E] selection:text-white">
        {/* Top Brand Bar */}
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#C8102E] text-white flex items-center justify-center font-black text-sm sm:text-lg shadow-md shrink-0">
              HiiT
            </div>
            <div>
              <div className="font-black text-xs sm:text-sm tracking-tight text-white flex items-center space-x-1.5 sm:space-x-2">
                <span>HiiT PLC CBT PORTAL</span>
                <span className="text-[9px] sm:text-[10px] bg-[#C8102E] text-white px-2 py-0.5 rounded-full font-bold">
                  ABUJA
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300">
                Academic Examination & Assessment System
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* {onOpenDatabase && (
              <button
                onClick={onOpenDatabase}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/60 text-xs font-bold transition-all shadow-sm"
                title="Persistent JSON File Database Status"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">JSON DB: Synced</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            )} */}

            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            )}
          </div>
        </header>

        {/* Hero Landing Content */}
        <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            {/* Left Brand Showcase */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Welcome to the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-red-300">
                    HiiT CBT Assessment System
                  </span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed max-w-xl">
                  Centralized examination, automated question banking, attendance tracking, and instant results portal for HiiT PLC Abuja Training Centre. Please sign in below to access your role workspace.
                </p>
              </div>

              {/* Core Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Full-Fledged RBAC</h4>
                    <p className="text-[11px] text-slate-300">Coordinators, Instructors, Registrars & Students.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-red-500/20 text-red-300 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">CBT Exam Engine</h4>
                    <p className="text-[11px] text-slate-300">Auto-save, palette grid & final 5-minute red warning.</p>
                  </div>
                </div>

                {/* <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">JSON File Persistence</h4>
                    <p className="text-[11px] text-slate-300">All student records and test answers saved safely to disk.</p>
                  </div>
                </div> */}

                {/* <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Official Result Downloads</h4>
                    <p className="text-[11px] text-slate-300">Course-selected PDF transcripts & Excel export.</p>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Right Login Card */}
            <div className="lg:col-span-5 flex justify-center">
              {formCard}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/30 px-6 py-4 text-center text-xs text-slate-400">
          <p>© 2026 HiiT PLC. Abuja Training Centre • Authorized Computer-Based Testing Portal</p>
        </footer>
      </div>
    );
  }

  // Modal mode:
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      {formCard}
    </div>
  );
};
