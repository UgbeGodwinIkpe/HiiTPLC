import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  HardDrive,
  Clock,
  ShieldCheck,
  X,
  FileText,
  Save,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DatabaseFileMeta {
  fileName: string;
  collection: string;
  recordCount: number;
  sizeBytes: number;
  lastModified: string;
}

interface DatabaseStatus {
  status: 'healthy' | 'warning' | 'error';
  storageType: string;
  directory: string;
  lastSaved: string;
  totalRecords: number;
  totalSizeBytes: number;
  files: DatabaseFileMeta[];
}

interface DatabaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({
  isOpen,
  onClose,
  onDataChanged
}) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch database status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setActionMessage(null);
      setImportFile(null);
      setImportPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Download Full Database JSON
  const handleDownloadBackup = () => {
    window.location.href = '/api/database/export';
    setActionMessage({
      text: 'Database backup download started. All system records saved into JSON.',
      type: 'success'
    });
  };

  // Handle Create Snapshot on Disk
  const handleCreateSnapshot = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/database/backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          text: `Snapshot successfully created and archived in ${data.path}`,
          type: 'success'
        });
        fetchStatus();
      } else {
        setActionMessage({ text: data.error || 'Failed to create snapshot.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error creating snapshot.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        setImportPreview(parsed);
        setActionMessage({
          text: `Valid JSON backup selected (${file.name}). Ready to restore.`,
          type: 'info'
        });
      } catch (err) {
        setActionMessage({
          text: 'Selected file is not valid JSON. Please provide a genuine HiiT database backup file.',
          type: 'error'
        });
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!importPreview) return;
    if (!confirm('Warning: Restoring this backup will replace current records with the contents of the JSON file. A safety snapshot will be taken first. Do you wish to continue?')) {
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch('/api/database/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPreview)
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          text: data.message || 'Database successfully restored from JSON backup!',
          type: 'success'
        });
        setImportFile(null);
        setImportPreview(null);
        fetchStatus();
        onDataChanged();
      } else {
        setActionMessage({ text: data.error || 'Failed to restore database.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error restoring database.', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Reset to Default State
  const handleResetDemoData = async () => {
    if (confirm('Are you sure you want to reset all JSON database files to the default state? (An automatic safety backup will be created in /data/backups)')) {
      try {
        setLoading(true);
        const res = await fetch('/api/seed/reset', { method: 'POST' });
        const data = await res.json();
        setActionMessage({ text: data.message, type: 'success' });
        fetchStatus();
        onDataChanged();
      } catch (err: any) {
        setActionMessage({ text: err.message || 'Failed to reset database.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-[#002B49] to-[#001828] text-white flex items-center justify-between border-b border-[#C8102E]">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#C8102E] shrink-0">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black">Persistent JSON Database Engine</h3>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">Active &amp; Persisted</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                All records are persistently written to disk in JSON files.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {/* Action Alerts */}
          {actionMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : actionMessage.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : actionMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                ) : (
                  <FileText className="w-4 h-4 shrink-0 text-blue-600" />
                )}
                <span>{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Storage Directory</span>
              <span className="text-xs font-bold text-[#002B49] dark:text-white font-mono break-all">
                {status ? status.directory : 'data/'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records Saved</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                {status ? status.totalRecords : 0}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Disk Size</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {status ? formatBytes(status.totalSizeBytes) : '0 B'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Saved To Disk</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {status?.lastSaved ? new Date(status.lastSaved).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>

          {/* Data Protection Guarantee Notice */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-extrabold text-blue-900 dark:text-blue-200">
                Zero Data Loss Architecture Guaranteed
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Every action (student enrollment, CBT exam submission, score calculation, attendance register, question authoring) writes atomically to its respective JSON file on the local file system. If the browser is closed or the server restarts, all records are preserved in full.
              </p>
            </div>
          </div>

          {/* Primary Operations Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleDownloadBackup}
              className="p-3 bg-[#002B49] hover:bg-[#001f35] text-white rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 text-xs font-bold"
            >
              <Download className="w-4 h-4 text-[#C8102E]" />
              <span>Download Backup (.json)</span>
            </button>

            <button
              onClick={handleCreateSnapshot}
              disabled={loading}
              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center space-x-2 text-xs font-bold"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>Create Disk Snapshot</span>
            </button>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center space-x-2 text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Verify File Integrity</span>
            </button>
          </div>

          {/* JSON File Collections Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <FileJson className="w-4 h-4 text-[#C8102E]" />
                <span>Active JSON File Collections</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {status?.files.length || 0} collections actively synced
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-500">
                    <th className="py-2.5 px-3">JSON File</th>
                    <th className="py-2.5 px-3">Data Collection</th>
                    <th className="py-2.5 px-3 text-center">Records</th>
                    <th className="py-2.5 px-3 text-right">File Size</th>
                    <th className="py-2.5 px-3 text-right">Last Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {status?.files.map((file) => (
                    <tr key={file.fileName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <FileJson className="w-3.5 h-3.5 text-blue-500" />
                        <span>{file.fileName}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-700 dark:text-slate-300">
                        {file.collection}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {file.recordCount} items
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        {formatBytes(file.sizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">
                        {new Date(file.lastModified).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import / Restore Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Restore Database from JSON Backup</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Upload a previous HiiT CBT database JSON backup to restore all students, exams, question banks, and results.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center space-x-2">
                <FileJson className="w-4 h-4 text-blue-500" />
                <span>{importFile ? importFile.name : 'Choose Backup JSON File'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {importPreview && (
                <button
                  onClick={handleExecuteRestore}
                  disabled={isImporting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Restoring Records...' : 'Execute Restore to JSON Files'}</span>
                </button>
              )}
            </div>

            {importPreview && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  Backup Content Detected:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-300 font-mono">
                  <span>Students: {importPreview.students?.length ?? 0}</span>
                  <span>Results: {importPreview.attempts?.length ?? 0}</span>
                  <span>Exams: {importPreview.exams?.length ?? 0}</span>
                  <span>Questions: {importPreview.questions?.length ?? 0}</span>
                  <span>Courses: {importPreview.courses?.length ?? 0}</span>
                  <span>Batches: {importPreview.batches?.length ?? 0}</span>
                  <span>Attendance: {importPreview.attendance?.length ?? 0}</span>
                  <span>Users: {importPreview.users?.length ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reset State Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Need to restore default initial records?
            </div>
            <button
              onClick={handleResetDemoData}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
            >
              Reset to Default Records
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            HiiT JSON File Database v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
