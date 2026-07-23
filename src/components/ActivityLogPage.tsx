import React from 'react';
import { ActivityLog } from '../types';
import { History, User, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface ActivityLogPageProps {
  onClearLogs?: () => void;
  logs: ActivityLog[];
}

import { useState } from 'react';

export default function ActivityLogPage({ logs, onClearLogs }: ActivityLogPageProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            Activity Log
          </h2>
          <p className="text-xs text-slate-500 mt-1">Audit trail of all actions performed in the application</p>
        </div>
        {onClearLogs && logs.length > 0 && (
          <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer border border-red-100">
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        )}
      </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Clear Activity Logs</h3>
              <p className="text-sm text-slate-600 mb-6">Are you sure you want to clear all activity logs? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">Cancel</button>
                <button onClick={() => { setShowConfirm(false); onClearLogs?.(); }} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors">Clear All</button>
              </div>
            </div>
          </div>
        )}
        {logs.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                  {log.user.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{log.action}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{log.details}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
                    <User className="w-3 h-3" />
                    By: {log.user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
