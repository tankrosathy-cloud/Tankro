/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, ChevronRight, Edit2, Trash2, FileText, CheckCircle, Clock, Compass, Tag, User, MapPin, AlertTriangle } from 'lucide-react';
import { Job, Expense, AppSettings } from '../types';
import { formatInRupees } from '../utils';

interface RecordsPageProps {
  jobs: Job[];
  expenses: Expense[];
  onDeleteJob: (jobId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onTriggerEditJob: (job: Job) => void;
  onTriggerEditExpense: (expense: Expense) => void;
  onViewInvoice: (job: Job) => void;
  defaultSubTab?: 'jobs' | 'expenses';
  settings: AppSettings;
}

type DateFilterType = 'Today' | 'This Week' | 'This Month' | 'Custom';

export default function RecordsPage({
  jobs,
  expenses,
  onDeleteJob,
  onDeleteExpense,
  onTriggerEditJob,
  onTriggerEditExpense,
  onViewInvoice,
  defaultSubTab,
  settings,
}: RecordsPageProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'expenses'>(defaultSubTab || 'jobs');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'job' | 'expense' | 'alert';
    id?: string;
    title: string;
    message: string;
    messageTa?: string;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  React.useEffect(() => {
    if (defaultSubTab) {
      setActiveTab(defaultSubTab);
    }
  }, [defaultSubTab]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Date filter comparison helper
  const isDateInFilter = (dateStr: string) => {
    const itemDate = new Date(dateStr);
    const today = new Date();

    // Reset times for robust date comparison
    today.setHours(0, 0, 0, 0);
    itemDate.setHours(0, 0, 0, 0);

    if (dateFilter === 'Today') {
      return itemDate.getTime() === today.getTime();
    }

    if (dateFilter === 'This Week') {
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const lastDayOfWeek = new Date(today);
      lastDayOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
      return itemDate >= firstDayOfWeek && itemDate <= lastDayOfWeek;
    }

    if (dateFilter === 'This Month') {
      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth()
      );
    }

    if (dateFilter === 'Custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }

    return true;
  };

  // Filter Jobs
  const filteredJobs = jobs
    .filter((j) => isDateInFilter(j.date))
    .filter((j) => {
      const term = searchTerm.toLowerCase();
      return (
        j.customerName.toLowerCase().includes(term) ||
        j.customerPhone.includes(term) ||
        j.area.toLowerCase().includes(term) ||
        (j.otherAreaText && j.otherAreaText.toLowerCase().includes(term)) ||
        (j.notes && j.notes.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Filter Expenses
  const filteredExpenses = expenses
    .filter((e) => isDateInFilter(e.date))
    .filter((e) => {
      const term = searchTerm.toLowerCase();
      return (
        e.category.toLowerCase().includes(term) ||
        e.paidBy.toLowerCase().includes(term) ||
        (e.notes && e.notes.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleDeleteJobClick = (jobId: string, name: string) => {
    if (settings.currentUserRole === 'Manager') {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: 'Access Denied',
        message: 'Managers (Prabhu) are not authorized to delete transaction records. Only Owners (Karthick & Kiruthika) can delete items.',
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'job',
      id: jobId,
      title: 'Delete Job Entry',
      message: `Are you sure you want to delete the job entry for ${name}?`,
    });
  };

  const handleDeleteExpenseClick = (expId: string, cat: string, amt: number) => {
    if (settings.currentUserRole === 'Manager') {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        title: 'Access Denied',
        message: 'Managers (Prabhu) are not authorized to delete transaction records. Only Owners (Karthick & Kiruthika) can delete items.',
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'expense',
      id: expId,
      title: 'Delete Expense Log',
      message: `Are you sure you want to delete the expense of ${formatInRupees(amt)} for ${cat}?`,
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 text-xs text-slate-700" id="records-page-wrapper">
      {/* Top Toggle & Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        {/* Search Input - At the Very Top */}
        <div className="relative">
          <span className="absolute left-3.5 top-3 text-slate-400">
            <Search className={`w-4 h-4 transition-colors ${activeTab === 'jobs' ? 'text-blue-500' : 'text-red-500'}`} />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-2 font-medium transition-all ${
              activeTab === 'jobs' 
                ? 'focus:ring-blue-500/20 focus:border-blue-500' 
                : 'focus:ring-red-500/20 focus:border-red-500'
            }`}
            placeholder={
              activeTab === 'jobs'
                ? 'Search customer name, area, phone, notes...'
                : 'Search expense category, paid by, notes...'
            }
            id="records-search-bar"
          />
        </div>

        {/* Tab selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => {
              setActiveTab('jobs');
            }}
            className={`flex-1 text-center py-2.5 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="records-jobs-tab"
          >
            Jobs Log
          </button>
          <button
            onClick={() => {
              setActiveTab('expenses');
            }}
            className={`flex-1 text-center py-2.5 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === 'expenses' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="records-expenses-tab"
          >
            Expenses Log
          </button>
        </div>

        {/* Date Filter buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(['Today', 'This Week', 'This Month', 'Custom'] as DateFilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  dateFilter === filter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                }`}
                id={`date-filter-${filter.toLowerCase().replace(' ', '')}`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Conditional Custom Date range fields */}
          {dateFilter === 'Custom' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-fade-in">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 focus:outline-none"
                  id="custom-start-date"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 focus:outline-none"
                  id="custom-end-date"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs Render Container */}
      <div className="space-y-3">
        {activeTab === 'jobs' ? (
          /* JOBS LOG RENDER */
          filteredJobs.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 text-slate-400 text-xs">
              No job records found for this period.
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3 hover:border-blue-100 transition-colors"
                id={`record-job-row-${job.id}`}
              >
                {/* Row Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 font-mono bg-blue-50 px-1.5 py-0.5 rounded-full">
                      {job.date}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1">{job.customerName}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {job.area}{job.otherAreaText ? ` (${job.otherAreaText})` : ''} |{' '}
                      {job.individualTanks && job.individualTanks.length > 0 ? (
                        <span>Tanks: {job.individualTanks.map((t) => `${t}L`).join(' + ')}</span>
                      ) : (
                        <span>Tump/Tank: {job.tankCapacity}L {job.numTanks > 1 ? `(x${job.numTanks})` : ''}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-800 text-sm">{formatInRupees(job.grandTotal)}</p>
                    <div className="flex flex-col items-end gap-1 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        job.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {job.paymentStatus}
                      </span>
                      {job.isSlabOverridden && (
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold">
                          Manual Price
                        </span>
                      )}
                      {job.isDistanceOverridden && (
                        <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold">
                          Manual Travel
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-details (Staff + Surcharges + Notes) */}
                <div className="p-2.5 bg-slate-50/50 rounded-2xl text-[10px] text-slate-500 space-y-1 leading-relaxed">
                  <p><span className="font-semibold text-slate-600">Assigned:</span> {job.staffAssigned.join(', ')}</p>
                  {job.jobType === 'Subscription' && (
                    <p>
                      <span className="font-semibold text-blue-600">Subscription:</span> {job.subscriptionInterval} (Next: <strong>{job.nextServiceDueDate}</strong>)
                    </p>
                  )}
                  {job.notes && (
                    <p><span className="font-semibold text-slate-600">Notes:</span> "{job.notes}"</p>
                  )}
                  {job.googleLocation && (
                    <p className="flex items-center gap-1">
                      <span className="font-semibold text-slate-600">Site Location:</span>{' '}
                      <a
                        href={job.googleLocation.startsWith('http') ? job.googleLocation : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.googleLocation)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5"
                      >
                        <Compass className="w-3 h-3 text-blue-500" />
                        Open Google Maps
                      </a>
                    </p>
                  )}
                  {(job.photosBefore && job.photosBefore.length > 0) || (job.photosAfter && job.photosAfter.length > 0) || job.photoBefore || job.photoAfter ? (
                    <div className="mt-2 pt-2 border-t border-slate-100/60 space-y-1.5" id="records-photo-proofs">
                      <span className="font-semibold text-slate-600 block text-[10px] uppercase tracking-wider">📸 Photo Proofs:</span>
                      <div className="flex flex-wrap gap-2.5">
                        {/* Before Photos */}
                        {job.photosBefore && job.photosBefore.length > 0 ? (
                          job.photosBefore.map((photo, i) => photo && (
                            <div key={`before-${i}`} className="relative group flex flex-col items-center">
                              <img
                                src={photo}
                                alt={`Tank ${i+1} Before`}
                                className="w-12 h-9 rounded-md object-cover border border-slate-200 cursor-zoom-in"
                                onClick={() => window.open(photo, '_blank')}
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8px] text-slate-500 font-bold mt-0.5">T{i+1} Before</span>
                            </div>
                          ))
                        ) : job.photoBefore ? (
                          <div className="relative group flex flex-col items-center">
                            <img
                              src={job.photoBefore}
                              alt="Before"
                              className="w-12 h-9 rounded-md object-cover border border-slate-200 cursor-zoom-in"
                              onClick={() => window.open(job.photoBefore, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8px] text-slate-500 font-bold mt-0.5">Before</span>
                          </div>
                        ) : null}

                        {/* After Photos */}
                        {job.photosAfter && job.photosAfter.length > 0 ? (
                          job.photosAfter.map((photo, i) => photo && (
                            <div key={`after-${i}`} className="relative group flex flex-col items-center">
                              <img
                                src={photo}
                                alt={`Tank ${i+1} After`}
                                className="w-12 h-9 rounded-md object-cover border border-slate-200 cursor-zoom-in"
                                onClick={() => window.open(photo, '_blank')}
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8px] text-slate-500 font-bold mt-0.5">T{i+1} After</span>
                            </div>
                          ))
                        ) : job.photoAfter ? (
                          <div className="relative group flex flex-col items-center">
                            <img
                              src={job.photoAfter}
                              alt="After"
                              className="w-12 h-9 rounded-md object-cover border border-slate-200 cursor-zoom-in"
                              onClick={() => window.open(job.photoAfter, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8px] text-slate-500 font-bold mt-0.5">After</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Row Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                  <button
                    onClick={() => onViewInvoice(job)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold cursor-pointer transition-colors"
                    id={`view-inv-rec-${job.id}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Invoice
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => onTriggerEditJob(job)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      id={`edit-job-rec-${job.id}`}
                      title="Edit Log"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteJobClick(job.id, job.customerName)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      id={`delete-job-rec-${job.id}`}
                      title="Delete Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          /* EXPENSES LOG RENDER */
          filteredExpenses.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 text-slate-400 text-xs">
              No expense records found for this period.
            </div>
          ) : (
            filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-3 hover:border-red-100 transition-colors"
                id={`record-exp-row-${exp.id}`}
              >
                {/* Row Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-red-500 font-mono bg-red-50 px-1.5 py-0.5 rounded-full">
                      {exp.date}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1">{exp.category}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-red-400" />
                      Paid by: <strong>{exp.paidBy}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-red-600 text-sm">{formatInRupees(exp.amount)}</p>
                  </div>
                </div>

                {/* Notes if present */}
                {exp.notes && (
                  <div className="p-2.5 bg-slate-50/50 rounded-2xl text-[10px] text-slate-500 leading-relaxed">
                    <p><span className="font-semibold text-slate-600">Details:</span> "{exp.notes}"</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-1 pt-2 border-t border-slate-50">
                  <button
                    onClick={() => onTriggerEditExpense(exp)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    id={`edit-exp-rec-${exp.id}`}
                    title="Edit Expense"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpenseClick(exp.id, exp.category, exp.amount)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    id={`delete-exp-rec-${exp.id}`}
                    title="Delete Expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Custom Confirmation/Alert Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="records-confirm-modal-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl border border-slate-100 text-center space-y-4"
              id="records-confirm-modal-card"
            >
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  {confirmModal.title}
                </h3>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal px-2">
                {confirmModal.message}
              </p>

              <div className="flex gap-2.5 pt-2">
                {confirmModal.type === 'alert' ? (
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-all text-xs"
                    id="confirm-modal-close-btn"
                  >
                    Got It
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition-all text-xs"
                      id="confirm-modal-cancel-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmModal.id) {
                          if (confirmModal.type === 'job') {
                            onDeleteJob(confirmModal.id);
                          } else if (confirmModal.type === 'expense') {
                            onDeleteExpense(confirmModal.id);
                          }
                        }
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl cursor-pointer transition-all text-xs shadow-md shadow-red-100"
                      id="confirm-modal-action-btn"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
