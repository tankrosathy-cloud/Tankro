/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, CheckSquare, BellRing, Search, Info, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Job, AppSettings } from '../types';
import { formatInRupees, getDaysRemaining, getTodayDateString, addMonths, formatWhatsappMessage } from '../utils';

interface SubscriptionListProps {
  jobs: Job[];
  onQuickLogJob: (completedJob: Job) => void;
  settings?: AppSettings;
}

export default function SubscriptionList({ jobs, onQuickLogJob, settings }: SubscriptionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Group jobs to find the latest subscription details per unique customer (name + phone)
  const subscriptionsMap: Record<string, Job> = {};

  jobs.forEach((job) => {
    if (job.jobType === 'Subscription' && job.nextServiceDueDate) {
      const key = `${job.customerName.trim()}||${job.customerPhone.trim()}`;
      const existing = subscriptionsMap[key];
      // Keep only the most recent service based on date
      if (!existing || new Date(job.date) > new Date(existing.date)) {
        subscriptionsMap[key] = job;
      }
    }
  });

  const subscriptionList = Object.values(subscriptionsMap);

  // Calculate days remaining and map metadata for UI rendering
  const mappedSubscriptions = subscriptionList.map((sub) => {
    const daysRemaining = getDaysRemaining(sub.nextServiceDueDate!);
    return {
      job: sub,
      daysRemaining,
    };
  });

  // Sort by 'Due Soonest': oldest or overdue dates at the top
  const sortedSubscriptions = mappedSubscriptions.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Filter based on search query
  const filteredSubscriptions = sortedSubscriptions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    return (
      sub.job.customerName.toLowerCase().includes(term) ||
      sub.job.customerPhone.includes(term) ||
      sub.job.area.toLowerCase().includes(term)
    );
  });

  const handleSendReminder = (sub: Job) => {
    const template = settings?.whatsappTemplates?.due;
    let message = '';

    if (template) {
      message = formatWhatsappMessage(template, {
        customerName: sub.customerName,
        franchiseName: settings.franchiseName || 'Tankro Sathyamangalam',
        date: sub.nextServiceDueDate || '',
        capacity: sub.tankCapacity,
        tanksCount: sub.numTanks || 1,
        amount: '',
        nextDueDate: sub.nextServiceDueDate || '',
      });
    } else {
      const tankSizeText = sub.individualTanks && sub.individualTanks.length > 0
        ? sub.individualTanks.map((t) => `${t}L`).join(' + ')
        : `${sub.tankCapacity}L (${sub.numTanks} tanks)`;

      message = `*${settings?.franchiseName || 'Tankro Sathyamangalam'}* - Water Tank Cleaning Subscription Due 💧

Hello ${sub.customerName},

This is a friendly reminder that your next water tank cleaning service is due! Regular cleaning ensures safe and clean water for your family.

📅 *Service Due Date:* ${sub.nextServiceDueDate}
💧 *Tank Size:* ${tankSizeText}

Please let us know when we can schedule your cleaning service. Thank you!`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=91${sub.customerPhone}&text=${encoded}`, '_blank');
  };

  const handleMarkAsServicedClick = (subJob: Job) => {
    // Stage a new job template based on the previous subscription job
    const today = getTodayDateString();
    let monthsToAdd = 3;
    if (subJob.subscriptionInterval === '6 months') monthsToAdd = 6;
    else if (subJob.subscriptionInterval === 'Custom') monthsToAdd = subJob.customIntervalMonths || 3;

    const newNextDue = addMonths(today, monthsToAdd);

    const stagedNewJob: Job = {
      ...subJob,
      id: `job-${Date.now()}`,
      date: today,
      paymentStatus: 'Paid', // Default to paid upon servicing
      paymentMode: 'UPI', // Default to UPI
      nextServiceDueDate: newNextDue,
    };

    setConfirmJob(stagedNewJob);
  };

  const handleConfirmLog = () => {
    if (!confirmJob) return;
    onQuickLogJob(confirmJob);
    setSuccessMsg(`Service successfully logged for ${confirmJob.customerName}! New due date is ${confirmJob.nextServiceDueDate}.`);
    setConfirmJob(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4" id="subscription-list-wrapper">
      {/* Search and Quick Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            placeholder="Search subscriptions by name, area..."
            id="sub-search-input"
          />
        </div>
      </div>

      {/* Success Message Banner */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-2xl flex items-start gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Subscription Card Lists */}
      <div className="space-y-3">
        {filteredSubscriptions.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 text-slate-400 text-xs">
            No active subscriptions found matching your query.
          </div>
        ) : (
          filteredSubscriptions.map(({ job: sub, daysRemaining }) => {
            // Colors based on urgency
            let cardStyle = 'border-slate-100 hover:border-slate-200';
            let badgeStyle = 'bg-slate-100 text-slate-700';
            let urgencyIcon = <Info className="w-4 h-4 text-slate-500" />;
            let urgencyLabel = `Due in ${daysRemaining} days`;

            if (daysRemaining < 0) {
              cardStyle = 'border-red-200 bg-red-50/20 hover:border-red-300';
              badgeStyle = 'bg-red-100 text-red-700';
              urgencyIcon = <AlertCircle className="w-4 h-4 text-red-500" />;
              urgencyLabel = `${Math.abs(daysRemaining)} Days Overdue!`;
            } else if (daysRemaining <= 7) {
              cardStyle = 'border-amber-200 bg-amber-50/20 hover:border-amber-300';
              badgeStyle = 'bg-amber-100 text-amber-700';
              urgencyIcon = <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />;
              urgencyLabel = `Due soon: ${daysRemaining} days remaining`;
            } else {
              cardStyle = 'border-emerald-100 bg-emerald-50/10 hover:border-emerald-200';
              badgeStyle = 'bg-emerald-100 text-emerald-700';
              urgencyLabel = `${daysRemaining} days left`;
            }

            return (
              <div
                key={sub.id}
                className={`bg-white p-4 rounded-3xl border transition-all ${cardStyle} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                id={`subscription-card-${sub.customerName.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-sm">{sub.customerName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${badgeStyle} flex items-center gap-1`}>
                      {urgencyIcon}
                      {urgencyLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                    Phone:{' '}
                    <a href={`tel:${sub.customerPhone}`} className="text-blue-500 hover:underline cursor-pointer" title="Click to call directly">
                      {sub.customerPhone}
                    </a>{' '}
                    | Area: {sub.area}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Tank Size:{' '}
                    {sub.individualTanks && sub.individualTanks.length > 0 ? (
                      <span className="font-semibold">{sub.individualTanks.map((t) => `${t}L`).join(' + ')}</span>
                    ) : (
                      <span className="font-semibold">{sub.tankCapacity}L ({sub.numTanks} tanks)</span>
                    )}{' '}
                    | Interval: {sub.subscriptionInterval}
                  </p>
                  <div className="flex gap-4 pt-1 text-[10px] text-slate-500">
                    <p>Last Cleaned: <span className="font-semibold text-slate-700">{sub.date}</span></p>
                    <p>Next Due: <span className="font-bold text-slate-800">{sub.nextServiceDueDate}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleSendReminder(sub)}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer justify-center flex-1 md:flex-initial"
                    title="Send WhatsApp reminder"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Remind
                  </button>

                  <button
                    onClick={() => handleMarkAsServicedClick(sub)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-50 cursor-pointer justify-center flex-1 md:flex-initial"
                    id={`sub-quick-service-${sub.id}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Mark Serviced
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarClock className="w-5 h-5 text-blue-500 animate-pulse" />
              Log Recurring Service Today?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to log a new service entry for <span className="font-bold text-slate-800">{confirmJob.customerName}</span> on <span className="font-bold text-slate-800">Today ({confirmJob.date})</span>?
            </p>

            <div className="bg-blue-50 p-3 rounded-2xl text-[11px] text-blue-900 space-y-1">
              <p>• Capacity: <strong>{confirmJob.tankCapacity} L</strong> ({confirmJob.numTanks} Tank)</p>
              <p>• Area: <strong>{confirmJob.area}</strong></p>
              <p>• Subtotal Cost: <strong>{formatInRupees(confirmJob.grandTotal)}</strong></p>
              <p>• Next Cycle Due: <strong>{confirmJob.nextServiceDueDate}</strong></p>
            </div>

            <p className="text-[10px] text-slate-400">
              * This will immediately log the job as <strong>Paid ({confirmJob.paymentMode})</strong> and push their subscription forward. You can edit this record later from the Records tab.
            </p>

            <div className="flex gap-2 justify-end pt-2 text-xs">
              <button
                onClick={() => setConfirmJob(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                id="cancel-sub-confirm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLog}
                className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-blue-100"
                id="confirm-sub-service"
              >
                Yes, Log Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
