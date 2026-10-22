import React, { useState, useRef, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Filter,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileCode,
  Copy,
  Check,
  Layers,
  ArrowRight,
  RefreshCw,
  FolderUp,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Send,
  Inbox,
  ExternalLink,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { StudentProfile, Course, Batch, EmailRecord } from '../types';
import { exportToExcel, exportToCSV, exportStudentsPDF } from '../utils/exportUtils';
import {
  parseStudentCSV,
  getSampleStudentCSVText,
  downloadSampleStudentCSV,
  CSVParseResult
} from '../utils/csvParser';

interface StudentManagementProps {
  students: StudentProfile[];
  courses: Course[];
  batches: Batch[];
  onAddStudent: (data: any) => Promise<any> | void;
  onImportStudents: (studentList: any[], sendEmail?: boolean) => Promise<any> | void;
  onRemoveStudent: (id: string) => Promise<any> | void;
  onResetPassword?: (id: string, newPassword?: string) => Promise<any>;
  onSendCredentialsEmail?: (id: string, customPassword?: string) => Promise<any>;
  readOnly?: boolean;
  isInstructorView?: boolean;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  courses,
  batches,
  onAddStudent,
  onImportStudents,
  onRemoveStudent,
  onResetPassword,
  onSendCredentialsEmail,
  readOnly = false,
  isInstructorView = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Single Add Form
  const [formData, setFormData] = useState({
    fullName: '',
    regNumber: `HIIT/2026/00${students.length + 1}`,
    email: '',
    phone: '',
    password: 'student123',
    courseId: courses[0]?.id || '',
    batchId: batches[0]?.id || '',
    sendCredentialsEmail: true
  });

  // Email notifications & outbox state
  const [importSendEmail, setImportSendEmail] = useState(true);
  const [isEmailOutboxOpen, setIsEmailOutboxOpen] = useState(false);
  const [emailsList, setEmailsList] = useState<EmailRecord[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<EmailRecord | null>(null);
  const [previewTabMode, setPreviewTabMode] = useState<'rendered' | 'text'>('rendered');

  // SMTP diagnostics state
  const [smtpStatus, setSmtpStatus] = useState<{
    isConfigured: boolean;
    smtpService?: string;
    smtpHost?: string;
    smtpPort?: number;
    maskedUser?: string;
    mode: 'live_smtp' | 'internal_outbox';
    guidance?: string;
  } | null>(null);
  const [showSmtpGuide, setShowSmtpGuide] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Resend / Send Credentials Email Modal
  const [resendStudent, setResendStudent] = useState<StudentProfile | null>(null);
  const [resendPassword, setResendPassword] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Reset Password Modal
  const [resetStudent, setResetStudent] = useState<StudentProfile | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [sendEmailOnReset, setSendEmailOnReset] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    emailRecord?: EmailRecord;
  } | null>(null);

  const fetchEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setEmailsList(data);
      }
    } catch (err) {
      console.error('Failed to load email outbox:', err);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const fetchSmtpStatus = async () => {
    try {
      const res = await fetch('/api/emails/smtp-status');
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch SMTP status:', err);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/emails/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: testEmailAddress.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send test email');
      }
      setTestEmailResult({ success: true, message: data.message });
      fetchEmails();
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'SMTP test execution failed' });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  React.useEffect(() => {
    fetchEmails();
    fetchSmtpStatus();
  }, []);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [importInputMode, setImportInputMode] = useState<'upload' | 'paste'>('paste');
  const [rawCsvText, setRawCsvText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [defaultCourseId, setDefaultCourseId] = useState(courses[0]?.id || '');
  const [defaultBatchId, setDefaultBatchId] = useState(batches[0]?.id || '');
  const [previewTab, setPreviewTab] = useState<'table' | 'json'>('table');
  const [copiedJson, setCopiedJson] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Filtering existing students in table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);

      const matchesCourse = !selectedCourseFilter || s.courseId === selectedCourseFilter;
      const matchesBatch = !selectedBatchFilter || s.batchId === selectedBatchFilter;

      return matchesSearch && matchesCourse && matchesBatch;
    });
  }, [students, searchQuery, selectedCourseFilter, selectedBatchFilter]);

  // Real-time CSV to JSON parse result
  const parseResult: CSVParseResult = useMemo(() => {
    return parseStudentCSV(rawCsvText, {
      courses,
      batches,
      defaultCourseId: defaultCourseId || courses[0]?.id,
      defaultBatchId: defaultBatchId || batches[0]?.id,
      existingStudents: students
    });
  }, [rawCsvText, courses, batches, defaultCourseId, defaultBatchId, students]);

  // Open single add modal
  const handleOpenAdd = () => {
    setShowPassword(false);
    setFormData({
      fullName: '',
      regNumber: `HIIT/2026/00${students.length + 1}`,
      email: '',
      phone: '',
      password: 'student123',
      courseId: courses[0]?.id || '',
      batchId: batches[0]?.id || '',
      sendCredentialsEmail: true
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    try {
      const res: any = await onAddStudent({
        ...formData,
        sendEmail: formData.sendCredentialsEmail
      });
      setIsAddModalOpen(false);
      fetchEmails();
      if (formData.sendCredentialsEmail) {
        const isLive = res?.emailRecord?.status === 'sent';
        const isFailed = res?.emailRecord?.status === 'failed';
        if (isLive) {
          setToast({
            type: 'success',
            title: 'Student Enrolled & Live Email Delivered',
            message: `Official login credentials were sent via live SMTP directly to ${formData.email}.`,
            emailRecord: res?.emailRecord
          });
        } else if (isFailed) {
          setToast({
            type: 'error',
            title: 'Student Enrolled (SMTP Error)',
            message: `Student was enrolled, but live delivery to ${formData.email} failed (${res?.emailRecord?.deliveryDetails || 'Check SMTP'}). Email saved in Portal Outbox.`,
            emailRecord: res?.emailRecord
          });
        } else {
          setToast({
            type: 'success',
            title: 'Student Enrolled & Saved in Outbox',
            message: `Credentials generated and stored in Portal Outbox for ${formData.email}. Note: Real inbox delivery requires configuring SMTP_USER and SMTP_PASS in your .env file.`,
            emailRecord: res?.emailRecord
          });
        }
      } else {
        setToast({
          type: 'success',
          title: 'Student Enrolled',
          message: `Enrolled ${formData.fullName} (${formData.regNumber}) successfully.`
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Enrollment Error',
        message: err.message || 'Failed to add student.'
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open email credentials dispatch modal for a specific student
  const handleOpenResendEmail = (std: StudentProfile) => {
    setResendStudent(std);
    setResendPassword(std.password || 'student123');
  };

  const handleConfirmSendEmail = async () => {
    if (!resendStudent) return;
    setIsSendingEmail(true);
    try {
      let res: any;
      if (onSendCredentialsEmail) {
        res = await onSendCredentialsEmail(resendStudent.id, resendPassword);
      } else {
        const resp = await fetch(`/api/students/${resendStudent.id}/send-credentials-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customPassword: resendPassword })
        });
        res = await resp.json();
      }
      setResendStudent(null);
      fetchEmails();
      const isSent = res?.emailRecord?.status === 'sent';
      const isFailed = res?.emailRecord?.status === 'failed';
      if (isSent) {
        setToast({
          type: 'success',
          title: 'Live Email Delivered',
          message: `Login credentials email was sent live via SMTP to ${resendStudent.email}.`,
          emailRecord: res?.emailRecord
        });
      } else if (isFailed) {
        setToast({
          type: 'error',
          title: 'SMTP Delivery Failed',
          message: `Delivery to ${resendStudent.email} failed: ${res?.emailRecord?.deliveryDetails || 'Connection failed'}. Saved in Outbox.`,
          emailRecord: res?.emailRecord
        });
      } else {
        setToast({
          type: 'success',
          title: 'Credentials Saved in Outbox',
          message: `Credentials saved in Portal Outbox for ${resendStudent.email}. Note: Live delivery to real inboxes requires SMTP configured in your .env file.`,
          emailRecord: res?.emailRecord
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Email Dispatch Error',
        message: err.message || 'Failed to send credentials email.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Open reset password modal
  const handleOpenResetPassword = (std: StudentProfile) => {
    setResetStudent(std);
    setResetNewPassword(`student${Math.floor(100 + Math.random() * 900)}`);
    setSendEmailOnReset(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetStudent) return;
    setIsResettingPassword(true);
    try {
      let res: any;
      if (onResetPassword) {
        res = await onResetPassword(resetStudent.id, resetNewPassword);
      } else {
        const resp = await fetch(`/api/students/${resetStudent.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: resetNewPassword, sendEmail: sendEmailOnReset })
        });
        res = await resp.json();
      }
      setResetStudent(null);
      fetchEmails();
      setToast({
        type: 'success',
        title: 'Password Reset',
        message: `Password reset to "${resetNewPassword}" for ${resetStudent.fullName}.${sendEmailOnReset ? ` Credentials email sent to ${resetStudent.email}.` : ''}`,
        emailRecord: res?.emailRecord
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        title: 'Password Reset Failed',
        message: err.message || 'Could not reset password.'
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Open email outbox
  const handleOpenEmailOutbox = () => {
    fetchEmails();
    setIsEmailOutboxOpen(true);
  };

  // Open import modal
  const handleOpenImportModal = () => {
    if (!rawCsvText) {
      // Pre-fill with sample template if completely blank
      setRawCsvText(getSampleStudentCSVText(courses, batches));
    }
    setImportSuccessMessage(null);
    setIsImportModalOpen(true);
  };

  // Handle hidden file input selection
  const processUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setRawCsvText(text);
      setIsImportModalOpen(true);
      setImportInputMode('upload');
    };
    reader.readAsText(file);
  };

  const handleHiddenFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
      e.target.value = ''; // Reset input to allow re-upload of same file
    }
  };

  // Drag and Drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Insert sample CSV text
  const handleInsertSample = () => {
    setRawCsvText(getSampleStudentCSVText(courses, batches));
    setUploadedFileName('sample_hiit_students.csv');
    setUploadedFileSize(620);
    setImportSuccessMessage(null);
  };

  // Clear parser data
  const handleClear = () => {
    setRawCsvText('');
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setImportSuccessMessage(null);
  };

  // Copy parsed JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(parseResult.rawJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Final submit to server database
  const handleConfirmImport = async () => {
    const validStudents = parseResult.students.filter((s) => s.isValid);
    if (validStudents.length === 0) return;

    setIsImporting(true);
    try {
      await onImportStudents(validStudents, importSendEmail);
      fetchEmails();
      setImportSuccessMessage(
        `Successfully enrolled ${validStudents.length} student record${
          validStudents.length !== 1 ? 's' : ''
        } into persistent JSON storage!${importSendEmail ? ' Credentials emails dispatched.' : ''}`
      );
      setToast({
        type: 'success',
        title: 'Bulk Students Enrolled',
        message: `Enrolled ${validStudents.length} students.${importSendEmail ? ' Login credentials emails were dispatched to their inboxes.' : ''}`
      });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setRawCsvText('');
        setUploadedFileName(null);
        setImportSuccessMessage(null);
      }, 1500);
    } catch (err) {
      alert('Error importing students. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Direct CSV Upload Trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, text/csv, application/vnd.ms-excel, text/plain, .tsv"
        className="hidden"
        onChange={handleHiddenFileInputChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002B49] dark:text-white flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <span>Student Directory &amp; Enrolment</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register students, bulk import rosters with CSV-to-JSON parser, and export official credentials
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Buttons */}
          <button
            onClick={() => exportStudentsPDF(filteredStudents)}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
            title="Download PDF Roster"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={() => exportToExcel(filteredStudents, 'HiiT_Student_List')}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
            title="Download Excel Roster"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {!readOnly && (
            <>
              {/* Quick CSV File Upload (Triggers Hidden File Input) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs"
                title="Quick upload CSV file directly"
              >
                <FolderUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Upload CSV</span>
              </button>

              {/* Full CSV-to-JSON Import Modal */}
              <button
                onClick={handleOpenImportModal}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bulk CSV Parser</span>
              </button>

              {/* Credentials Email Outbox */}
              <button
                type="button"
                onClick={handleOpenEmailOutbox}
                className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs"
                title="View dispatched student credentials emails & delivery log"
              >
                <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Email Outbox</span>
                {emailsList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 font-mono font-bold">
                    {emailsList.length}
                  </span>
                )}
              </button>

              {/* Add Single Student */}
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-[#002B49] hover:bg-[#001f35] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4 text-[#C8102E]" />
                <span>Add Student</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-950 dark:text-red-100'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <strong className="text-xs font-bold block">{toast.title}</strong>
              <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            {toast.emailRecord && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmailPreview(toast.emailRecord!);
                  setToast(null);
                }}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 text-xs font-bold rounded-lg shadow-2xs flex items-center space-x-1"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>View Dispatched Email</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              &times; Dismiss
            </button>
          </div>
        </div>
      )}

      {isInstructorView && (
        <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Course Access Control Active:</strong> Showing students enrolled in your assigned courses and batches ({filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}).
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, Reg Number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Course */}
        <div>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          >
            <option value="">All Courses</option>
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
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Student Name</th>
                <th className="p-4">Reg Number</th>
                <th className="p-4">Email &amp; Phone</th>
                <th className="p-4">Enrolled Course</th>
                <th className="p-4">Batch</th>
                {!readOnly && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No students match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-black">
                          {std.fullName.charAt(0)}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white">{std.fullName}</div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[#002B49] dark:text-red-400">
                        {std.regNumber}
                      </span>
                    </td>

                    <td className="p-4">
                      <div>{std.email}</div>
                      <div className="text-[10px] text-slate-400">{std.phone}</div>
                    </td>

                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {std.courseTitle}
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {std.batchName}
                      </span>
                    </td>

                    {!readOnly && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenResendEmail(std)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 rounded-lg transition-colors"
                            title="Dispatch / Resend Login Credentials Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(std)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition-colors"
                            title="Reset Student Password & Email Credentials"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveStudent(std.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                            title="Remove Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#002B49] dark:text-white">
              Register New Student
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Adewale"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.regNumber}
                  onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  placeholder="e.g. samuel@student.hiit.ng"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  placeholder="+234 800 000 0000"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Student Login Password
                  </label>
                  <span className="text-[10px] text-slate-400">Default: student123</span>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password (e.g. student123)"
                    className="w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Student uses their Reg Number or Email together with this password to log in and sit for exams.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch
                  </label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Credentials Email Dispatch Toggle Card */}
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="sendCredentialsEmail"
                  checked={formData.sendCredentialsEmail}
                  onChange={(e) => setFormData({ ...formData, sendCredentialsEmail: e.target.checked })}
                  className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="sendCredentialsEmail" className="text-xs text-sky-950 dark:text-sky-100 cursor-pointer">
                  <span className="font-bold flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Send Login Credentials Email to Student</span>
                  </span>
                  <span className="text-[11px] text-sky-700 dark:text-sky-300 block mt-0.5 leading-snug">
                    An official welcome email with Registration Number (<code className="font-mono font-bold">{formData.regNumber}</code>), student password, and CBT portal login instructions will be dispatched to <strong>{formData.email || `${formData.regNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.hiit.ng`}</strong>.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 bg-[#002B49] hover:bg-[#001d32] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                >
                  {isSubmittingAdd ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enrolling &amp; Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#C8102E]" />
                      <span>Enroll Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV-TO-JSON BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#002B49] dark:text-white flex items-center space-x-2">
                      <span>Bulk Student Enrolment — CSV-to-JSON Parser</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C8102E]/10 text-[#C8102E] uppercase">
                        Coordinator Tool
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a CSV file via hidden file selector or paste raw spreadsheet text to convert into JSON student records.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => downloadSampleStudentCSV(courses, batches)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
                  title="Download standard CSV template file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg transition-colors"
                >
                  Insert Sample Data
                </button>
              </div>
            </div>

            {/* Success message banner */}
            {importSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{importSuccessMessage}</span>
              </div>
            )}

            {/* Input Method Switcher Tabs */}
            <div className="flex items-center justify-between">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setImportInputMode('paste')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                    importInputMode === 'paste'
                      ? 'bg-white dark:bg-slate-700 text-[#002B49] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy-Paste CSV / Spreadsheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                    importInputMode === 'upload'
                      ? 'bg-white dark:bg-slate-700 text-[#002B49] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV File</span>
                </button>
              </div>

              {rawCsvText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Clear Input
                </button>
              )}
            </div>

            {/* File Upload Tab (with Hidden File Input) */}
            {importInputMode === 'upload' && (
              <div className="space-y-3">
                {/* Secondary hidden input inside modal */}
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept=".csv, text/csv, application/vnd.ms-excel, text/plain, .tsv"
                  className="hidden"
                  onChange={handleHiddenFileInputChange}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-xs border border-slate-200 dark:border-slate-700">
                      <FolderUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag &amp; drop student CSV file here, or click to browse
                    </div>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      Supports comma-separated (.csv), tab-delimited (.tsv), and standard spreadsheet exports.
                    </p>

                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="mt-2 px-4 py-2 bg-[#002B49] hover:bg-[#001e33] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select CSV File</span>
                    </button>
                  </div>
                </div>

                {uploadedFileName && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{uploadedFileName}</span>
                      {uploadedFileSize && (
                        <span className="text-[10px] text-slate-400">
                          ({(uploadedFileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      File Loaded &amp; Parsed
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Copy-Paste Text Area Tab */}
            {importInputMode === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Paste comma-separated (CSV) or tab-separated text directly from Excel/Sheets:</span>
                  <span>{rawCsvText.split('\n').filter(Boolean).length} rows detected</span>
                </div>
                <textarea
                  rows={6}
                  placeholder={`FullName,RegNumber,Email,Phone,CourseCode,BatchName\n"Chukwuemeka Okoye","HIIT/2026/020","emeka.okoye@gmail.com","+234 802 334 1122","WD-101","March 2026 Morning Cohort"`}
                  value={rawCsvText}
                  onChange={(e) => {
                    setRawCsvText(e.target.value);
                    setUploadedFileName('Pasted_CSV_Text');
                    setImportSuccessMessage(null);
                  }}
                  className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49] dark:focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Fallback Defaults (Course & Batch assignment for rows with omitted values) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Default Course (for records without course in CSV):
                </label>
                <select
                  value={defaultCourseId}
                  onChange={(e) => setDefaultCourseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Default Batch (for records without batch in CSV):
                </label>
                <select
                  value={defaultBatchId}
                  onChange={(e) => setDefaultBatchId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parser Results & Live Inspection Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Parser Metrics:
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{parseResult.validCount} Valid Students</span>
                  </span>

                  {parseResult.invalidCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{parseResult.invalidCount} Invalid Rows</span>
                    </span>
                  )}

                  {parseResult.warnings.length > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{parseResult.warnings.length} Warnings</span>
                    </span>
                  )}

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Delimiter: {parseResult.delimiter === '\t' ? 'TAB' : parseResult.delimiter}
                  </span>
                </div>

                {/* Switch between Table Preview and Parsed JSON Code */}
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('table')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                      previewTab === 'table'
                        ? 'bg-white dark:bg-slate-700 text-[#002B49] dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Table Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('json')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center space-x-1 ${
                      previewTab === 'json'
                        ? 'bg-white dark:bg-slate-700 text-[#002B49] dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Parsed JSON</span>
                  </button>
                </div>
              </div>

              {/* Warnings & Errors List */}
              {parseResult.invalidRows.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl space-y-1 text-xs text-red-800 dark:text-red-200">
                  <div className="font-bold flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Row Validation Failures (these will be skipped):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-700 dark:text-red-300">
                    {parseResult.invalidRows.slice(0, 4).map((row, idx) => (
                      <li key={idx}>
                        <strong>Row {row.rowNumber}:</strong> {row.reason}
                      </li>
                    ))}
                    {parseResult.invalidRows.length > 4 && (
                      <li>...and {parseResult.invalidRows.length - 4} more invalid rows.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Duplicate/Existing Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Database Duplicate Notice: </span>
                    {parseResult.warnings.slice(0, 2).join(' | ')}
                    {parseResult.warnings.length > 2 && ` (and ${parseResult.warnings.length - 2} more)`}
                  </div>
                </div>
              )}

              {/* View 1: Table Preview */}
              {previewTab === 'table' && (
                <div className="max-h-56 overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  {parseResult.students.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No CSV data parsed yet. Upload a file above or click &quot;Insert Sample Data&quot; to test the parser.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Full Name</th>
                          <th className="p-2.5">Reg Number</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Course</th>
                          <th className="p-2.5">Batch</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {parseResult.students.map((item, idx) => (
                          <tr
                            key={idx}
                            className={
                              !item.isValid
                                ? 'bg-red-50/50 dark:bg-red-950/20'
                                : item.isDuplicateInDb
                                ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                            }
                          >
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {item.fullName || <span className="text-red-500 italic">Empty</span>}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-[#002B49] dark:text-red-400">
                              {item.regNumber || <span className="text-red-500 italic">Missing</span>}
                            </td>
                            <td className="p-2.5 text-slate-500">{item.email}</td>
                            <td className="p-2.5">{item.courseTitle}</td>
                            <td className="p-2.5">{item.batchName}</td>
                            <td className="p-2.5">
                              {item.isValid ? (
                                item.isDuplicateInDb ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    Exists in DB
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1 w-max">
                                    <Check className="w-3 h-3" />
                                    <span>Ready</span>
                                  </span>
                                )
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                  Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* View 2: Formatted JSON Output with Copy Action */}
              {previewTab === 'json' && (
                <div className="relative">
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-mono rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied JSON!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 max-h-56 overflow-auto font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-800">
                    {parseResult.rawJson}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="importSendEmail"
                    checked={importSendEmail}
                    onChange={(e) => setImportSendEmail(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="importSendEmail" className="text-xs font-bold text-sky-900 dark:text-sky-200 cursor-pointer flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    <span>Email login credentials to imported students</span>
                  </label>
                </div>
                <span className="text-xs text-slate-500">
                  {parseResult.validCount > 0 ? (
                    <span>
                      Ready to commit <strong>{parseResult.validCount}</strong> student record{parseResult.validCount !== 1 ? 's' : ''} to persistent JSON database.
                    </span>
                  ) : (
                    <span>Provide CSV data or select a valid file to activate enrollment.</span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={parseResult.validCount === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Import {parseResult.validCount} Student{parseResult.validCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Send / Resend Student Credentials Email Modal */}
      {resendStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002B49] dark:text-white">
                  Send Login Credentials Email
                </h3>
                <p className="text-xs text-slate-500">
                  Deliver official login credentials to student inbox
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900 dark:text-white">{resendStudent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registration Number:</span>
                <span className="font-mono font-bold text-[#002B49] dark:text-red-400">{resendStudent.regNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Email:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{resendStudent.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course / Batch:</span>
                <span className="text-slate-700 dark:text-slate-300">{resendStudent.courseTitle}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password to Include in Email
                </label>
                <button
                  type="button"
                  onClick={() => setResendPassword(`student${Math.floor(100 + Math.random() * 900)}`)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={resendPassword}
                  onChange={(e) => setResendPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                  placeholder="Password"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                This password will be updated on the student's profile and sent directly to their email.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResendStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingEmail || !resendPassword.trim()}
                onClick={handleConfirmSendEmail}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Email Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Student Password Modal */}
      {resetStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002B49] dark:text-white">
                  Reset Student Password
                </h3>
                <p className="text-xs text-slate-500">
                  Assign new credentials for {resetStudent.fullName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900 dark:text-white">{resetStudent.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registration Number:</span>
                <span className="font-mono font-bold text-[#002B49] dark:text-red-400">{resetStudent.regNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Email:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{resetStudent.email}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetNewPassword(`student${Math.floor(100 + Math.random() * 900)}`)}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Randomize</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                  placeholder="Enter new password"
                />
              </div>
            </div>

            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-start space-x-2">
              <input
                type="checkbox"
                id="sendEmailOnReset"
                checked={sendEmailOnReset}
                onChange={(e) => setSendEmailOnReset(e.target.checked)}
                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
              />
              <label htmlFor="sendEmailOnReset" className="text-xs text-sky-950 dark:text-sky-200 cursor-pointer">
                <span className="font-bold flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <span>Send updated password to student's email</span>
                </span>
                <span className="text-[11px] text-sky-700 dark:text-sky-300 block mt-0.5">
                  Sends notice with their registration number, new password, and portal link.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingPassword || !resetNewPassword.trim()}
                onClick={handleConfirmResetPassword}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                {isResettingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save &amp; Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Credentials Email Outbox & Delivery History Modal */}
      {isEmailOutboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#002B49] dark:text-white flex items-center space-x-2">
                    <span>Credentials Email Outbox &amp; Delivery Log</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold">
                      {emailsList.length} Dispatched
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    All student login credentials emails recorded in persistent storage (<code className="font-mono">/data/emails.json</code>)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchEmails}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Refresh Outbox"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailOutboxOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>

            {/* SMTP Mail Server Status & Diagnostics Banner */}
            <div className={`p-4 rounded-xl border text-xs ${
              smtpStatus?.isConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    smtpStatus?.isConfigured
                      ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">
                        {smtpStatus?.isConfigured ? 'Live SMTP Email Delivery Active' : 'Internal Outbox Mode (SMTP Not Configured)'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        smtpStatus?.isConfigured ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      }`}>
                        {smtpStatus?.mode === 'live_smtp' ? 'Live Inbox Delivery' : 'Outbox Only'}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {smtpStatus?.isConfigured
                        ? `Outgoing emails are sent live using ${smtpStatus.smtpService === 'gmail' ? 'Google Gmail' : smtpStatus.smtpHost} (${smtpStatus.maskedUser}). Real emails arrive directly in student inboxes.`
                        : `Outgoing credentials are saved in this portal outbox (/data/emails.json). To deliver live emails to real Gmail/Yahoo/Outlook student inboxes, add your SMTP credentials to your local .env file.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSmtpGuide(!showSmtpGuide)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  >
                    {showSmtpGuide ? 'Hide Setup Guide' : 'Setup Guide (.env)'}
                  </button>
                </div>
              </div>

              {/* Collapsible Setup Guide */}
              {showSmtpGuide && (
                <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 space-y-2 text-[11.5px]">
                  <p className="font-bold text-slate-800 dark:text-slate-200">How to enable real inbox delivery with Gmail or custom SMTP:</p>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                    <div># In your local project root, open or create .env and add:</div>
                    <div className="text-emerald-400">SMTP_SERVICE="gmail"</div>
                    <div className="text-emerald-400">SMTP_USER="your-email@gmail.com"</div>
                    <div className="text-emerald-400">SMTP_PASS="your-16-char-app-password"</div>
                    <div className="text-emerald-400">SMTP_FROM="HiiT CBT Assessment Centre &lt;your-email@gmail.com&gt;"</div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    💡 <strong>Gmail Tip:</strong> Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-sky-600 dark:text-sky-400">myaccount.google.com/apppasswords</a> to generate a 16-character App Password (requires 2-Step Verification). Restart the server (`npm run dev`) after updating `.env`.
                  </p>
                </div>
              )}

              {/* Quick Send Test Email Form */}
              <form onSubmit={handleSendTestEmail} className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[11px]">Verify Live Delivery:</span>
                <input
                  type="email"
                  placeholder="Enter email to test (e.g. cidusface@gmail.com)"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 min-w-[220px] text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isSendingTestEmail || !testEmailAddress.trim()}
                  className="px-3 py-1 bg-[#002B49] text-white hover:bg-[#001d32] disabled:opacity-50 text-xs font-bold rounded-lg flex items-center space-x-1"
                >
                  {isSendingTestEmail ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>{isSendingTestEmail ? 'Testing...' : 'Send Test Email'}</span>
                </button>
                {testEmailResult && (
                  <span className={`text-[11px] font-bold ${testEmailResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {testEmailResult.message}
                  </span>
                )}
              </form>
            </div>

            {/* Outbox Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by student name, registration number, or email..."
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Email List Table */}
            <div className="overflow-x-auto max-h-96 border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3">Student &amp; Reg No</th>
                    <th className="p-3">Recipient Email</th>
                    <th className="p-3">Password Sent</th>
                    <th className="p-3">Trigger</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time Dispatched</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emailsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No emails have been dispatched yet. When students are enrolled, their credentials email will appear here.
                      </td>
                    </tr>
                  ) : (
                    emailsList
                      .filter((e) => {
                        if (!emailSearchQuery) return true;
                        const q = emailSearchQuery.toLowerCase();
                        return (
                          e.studentName.toLowerCase().includes(q) ||
                          e.regNumber.toLowerCase().includes(q) ||
                          e.to.toLowerCase().includes(q) ||
                          (e.courseTitle && e.courseTitle.toLowerCase().includes(q))
                        );
                      })
                      .map((mail) => (
                        <tr key={mail.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{mail.studentName}</div>
                            <span className="font-mono text-[10px] text-slate-500">{mail.regNumber}</span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                            {mail.to}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              {mail.passwordSent || 'student123'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {mail.trigger.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            {mail.status === 'sent' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1 w-max" title={mail.deliveryDetails || 'Delivered live via SMTP'}>
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                <span>Live Sent</span>
                              </span>
                            ) : mail.status === 'failed' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center space-x-1 w-max" title={mail.deliveryDetails || 'SMTP Delivery Failed'}>
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>SMTP Error</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center space-x-1 w-max" title={mail.deliveryDetails || 'Archived in Portal Outbox (SMTP not configured)'}>
                                <Inbox className="w-3 h-3 text-amber-600" />
                                <span>In Outbox</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[10px]">
                            {new Date(mail.sentAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEmailPreview(mail)}
                              className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1 ml-auto"
                              title="Preview rendered HTML email"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>All dispatched student emails are permanently recorded and available for coordinator verification.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEmailOutboxOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Interactive HTML Email Preview Modal */}
      {selectedEmailPreview && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002B49] dark:text-white">
                    Student Email Preview &amp; Delivery Transcript
                  </h3>
                  <p className="text-xs text-slate-500">
                    To: <strong>{selectedEmailPreview.to}</strong> &bull; Sent: {new Date(selectedEmailPreview.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewTabMode('rendered')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      previewTabMode === 'rendered'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    HTML View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTabMode('text')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                      previewTabMode === 'text'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Text View
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmailPreview(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Email Meta Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>
                <strong className="text-slate-500">Subject:</strong>{' '}
                <span className="font-bold text-slate-900 dark:text-white">{selectedEmailPreview.subject}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-400 pt-1">
                <span>
                  <strong>Recipient:</strong> {selectedEmailPreview.studentName} ({selectedEmailPreview.to})
                </span>
                <span>
                  <strong>Reg Number:</strong>{' '}
                  <code className="font-mono font-bold text-sky-600 dark:text-sky-400">{selectedEmailPreview.regNumber}</code>
                </span>
                <span>
                  <strong>Password:</strong>{' '}
                  <code className="font-mono font-bold text-rose-600 dark:text-rose-400">{selectedEmailPreview.passwordSent}</code>
                </span>
              </div>
            </div>

            {/* Delivery Status Banner */}
            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              selectedEmailPreview.status === 'sent'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : selectedEmailPreview.status === 'failed'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center space-x-2">
                {selectedEmailPreview.status === 'sent' ? (
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : selectedEmailPreview.status === 'failed' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {selectedEmailPreview.deliveryDetails || (
                    selectedEmailPreview.status === 'sent'
                      ? 'Delivered live to recipient inbox via outgoing SMTP.'
                      : 'Saved in Portal Outbox (SMTP not configured in local .env).'
                  )}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800">
                {selectedEmailPreview.status}
              </span>
            </div>

            {/* Rendered Container */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
              {previewTabMode === 'rendered' ? (
                <iframe
                  title="Rendered Email Preview"
                  srcDoc={selectedEmailPreview.htmlContent}
                  className="w-full h-[450px] bg-white border-0"
                />
              ) : (
                <pre className="p-4 h-[450px] overflow-auto font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedEmailPreview.textContent}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
                <span>Recorded in HiiT Examination Automated Outbox</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const portalUrl = window.location.origin;
                    navigator.clipboard.writeText(
                      `Student Name: ${selectedEmailPreview.studentName}\nRegistration Number: ${selectedEmailPreview.regNumber}\nEmail: ${selectedEmailPreview.to}\nPassword: ${selectedEmailPreview.passwordSent}\nCourse: ${selectedEmailPreview.courseTitle || 'Training Program'}\nPortal URL: ${portalUrl}`
                    );
                    setToast({
                      type: 'success',
                      title: 'Credentials Copied',
                      message: 'Student login credentials copied to clipboard. You can now share them via WhatsApp, SMS, or external mail.'
                    });
                  }}
                  className="px-3.5 py-1.5 bg-[#002B49] hover:bg-[#001d32] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5 text-[#C8102E]" />
                  <span>Copy Credentials</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
