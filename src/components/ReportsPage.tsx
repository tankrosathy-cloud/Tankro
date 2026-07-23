/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Users, MapPin, ListCollapse, CheckCircle, FileText, Phone, MessageSquare, ChevronDown, ChevronUp, Calendar, PlusCircle, Wallet, UserCheck } from 'lucide-react';
import { Job, Expense, ExpenseCategory, AppSettings } from '../types';
import { formatInRupees, getTodayDateString, addMonths, formatWhatsappMessage } from '../utils';

interface ReportsPageProps {
  jobs: Job[];
  expenses: Expense[];
  onMarkJobAsPaid?: (jobId: string) => void;
  onMarkAllRoyaltyPaid?: (jobIds: string[]) => void;
  onViewInvoice?: (job: Job) => void;
  settings: AppSettings;
  onNavigate?: (tab: 'add-job' | 'appointments' | 'add-expense' | 'attendance') => void;
}

const PIE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#64748b', // slate
];

export default function ReportsPage({
  jobs,
  expenses,
  onMarkJobAsPaid,
  onMarkAllRoyaltyPaid,
  onViewInvoice,
  settings,
  onNavigate,
}: ReportsPageProps) {
  const [reportRange, setReportRange] = useState<'month' | 'week' | 'today' | 'lifetime'>('today');
  const [showRoyaltyList, setShowRoyaltyList] = useState(false);

  // Helpers to check date ranges
  const todayStr = getTodayDateString();
  const getStartOfWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  };

  const getStartOfMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  const isDateInSelectedRange = (dateStr: string) => {
    const itemDate = new Date(dateStr);
    itemDate.setHours(0, 0, 0, 0);

    const today = new Date(todayStr);
    today.setHours(0, 0, 0, 0);

    if (reportRange === 'today') {
      return itemDate.getTime() === today.getTime();
    }
    if (reportRange === 'week') {
      return itemDate >= startOfWeek && itemDate <= new Date(todayStr);
    }
    if (reportRange === 'month') {
      return itemDate >= startOfMonth && itemDate <= new Date(todayStr);
    }
    if (reportRange === 'lifetime') {
      return true;
    }
    return true;
  };

  // Compile calculations based on range
  const rangeJobs = jobs.filter((j) => isDateInSelectedRange(j.date));
  const rangeExpenses = expenses.filter((e) => isDateInSelectedRange(e.date));

  const totalRevenue = rangeJobs.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalExpenses = rangeExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRoyaltyDeduction = rangeJobs.reduce((acc, curr) => acc + (curr.isFranchiseReferral ? curr.subtotal * 0.1 : 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalRoyaltyDeduction;
  const completedJobsCount = rangeJobs.length;
  const totalTanksCleaned = rangeJobs.reduce((acc, curr) => acc + (curr.numTanks || 1), 0);
  const totalPendingRange = rangeJobs.filter(j => j.paymentStatus === 'Pending').reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Last 7 days Bar Chart compilation (inclusive of today)
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayJobs = jobs.filter((j) => j.date === dateStr);
    const dayExpenses = expenses.filter((e) => e.date === dateStr);

    const rev = dayJobs.reduce((acc, curr) => acc + curr.grandTotal, 0);
    const exp = dayExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Format like '13-Jul' or similar
    const label = `${day}-${d.toLocaleString('en-US', { month: 'short' })}`;

    return {
      name: label,
      Revenue: rev,
      Expenses: exp,
    };
  });

  // Pie chart expenses by category
  const expenseByCategoryMap: Record<string, number> = {};
  rangeExpenses.forEach((exp) => {
    expenseByCategoryMap[exp.category] = (expenseByCategoryMap[exp.category] || 0) + exp.amount;
  });

  const pieChartData = Object.entries(expenseByCategoryMap)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Area-wise revenue breakdown
  const areaRevenueMap: Record<string, number> = {};
  rangeJobs.forEach((job) => {
    const areaName = job.area === 'Other' ? (job.otherAreaText || 'Other') : job.area;
    areaRevenueMap[areaName] = (areaRevenueMap[areaName] || 0) + job.grandTotal;
  });

  const areaRevenueList = Object.entries(areaRevenueMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Staff-wise jobs for selected range
  const staffJobsMap: Record<string, number> = { Althaf: 0, Nafees: 0, Akram: 0 };
  rangeJobs.forEach((job) => {
    job.staffAssigned.forEach((staff) => {
      if (staffJobsMap[staff] !== undefined) {
        staffJobsMap[staff]++;
      }
    });
  });

  const staffJobsList = Object.entries(staffJobsMap).map(([name, count]) => ({
    name,
    count,
  }));

  // Pending payments (All outstanding unpaid jobs across time)
  const pendingJobsList = jobs
    .filter((j) => j.paymentStatus === 'Pending')
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalOutstanding = pendingJobsList.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Franchise Royalty Pending
  const pendingRoyaltyJobsList = jobs
    .filter((j) => j.isFranchiseReferral && !j.isFranchiseRoyaltyPaid)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalRoyaltyPending = pendingRoyaltyJobsList.reduce((acc, curr) => acc + (curr.subtotal * 0.1), 0);

  return (
    <div className="max-w-xl mx-auto space-y-5 text-xs text-slate-700" id="reports-page-wrapper">
      {/* Greeting and Date */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">Hello, {settings?.currentOwner || 'User'}!</h2>
        <p className="text-slate-500 text-xs mt-1">Ready for today's tank cleanings? Keep tracking daily jobs.</p>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold">
          <Calendar className="w-3.5 h-3.5" />
          Today: {todayStr}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onNavigate && onNavigate('add-job')}
            className="flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 p-4 rounded-2xl transition-colors text-blue-600 font-bold text-xs"
          >
            <PlusCircle className="w-6 h-6" />
            Log Work
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('appointments')}
            className="flex flex-col items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 p-4 rounded-2xl transition-colors text-emerald-600 font-bold text-xs"
          >
            <Calendar className="w-6 h-6" />
            Schedule
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('add-expense')}
            className="flex flex-col items-center justify-center gap-2 bg-red-50 hover:bg-red-100 p-4 rounded-2xl transition-colors text-red-600 font-bold text-xs"
          >
            <Wallet className="w-6 h-6" />
            Add Expense
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('attendance')}
            className="flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl transition-colors text-slate-600 font-bold text-xs"
          >
            <UserCheck className="w-6 h-6" />
            Attendance
          </button>
        </div>
      </div>

      {/* Time Range Filter Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <span className="font-bold text-slate-700 text-sm">Select Summary Period:</span>
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button
            onClick={() => setReportRange('today')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              reportRange === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="report-btn-today"
          >
            Today
          </button>
          <button
            onClick={() => setReportRange('week')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              reportRange === 'week' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="report-btn-week"
          >
            This Week
          </button>
          <button
            onClick={() => setReportRange('month')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              reportRange === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="report-btn-month"
          >
            This Month
          </button>
          <button
            onClick={() => setReportRange('lifetime')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              reportRange === 'lifetime' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="report-btn-lifetime"
          >
            Lifetime
          </button>
        </div>
      </div>

      {/* Numerical summaries */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <p className="font-semibold text-slate-400 text-[10px] uppercase">Logged Revenue</p>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{formatInRupees(totalRevenue)}</p>
          <p className="text-[9px] text-slate-400 mt-1">{completedJobsCount} job(s) logged</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <p className="font-semibold text-slate-400 text-[10px] uppercase">Logged Expenses</p>
          <p className="text-xl font-extrabold text-red-500 mt-1">{formatInRupees(totalExpenses)}</p>
          <p className="text-[9px] text-slate-400 mt-1">{rangeExpenses.length} purchase(s)</p>
        </div>
        
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <p className="font-semibold text-slate-400 text-[10px] uppercase">Outstanding Dues</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{formatInRupees(totalPendingRange)}</p>
          <p className="text-[9px] text-slate-400 mt-1">Pending collection</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          <p className="font-semibold text-slate-400 text-[10px] uppercase">Tanks Cleaned</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{totalTanksCleaned}</p>
          <p className="text-[9px] text-slate-400 mt-1">Total tanks serviced</p>
        </div>

        {reportRange === 'lifetime' ? (
          <div className="bg-purple-50 p-4 rounded-3xl border border-purple-100 shadow-xs col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-400"></div>
            <div className="pl-2">
              <div className="flex flex-col items-center justify-center pt-2 pb-4">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle className="text-purple-200 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                      <circle className="text-purple-600 stroke-current transition-all duration-1000 ease-out" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(((netProfit / 810000) * 100), 100) / 100)}></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-black text-purple-700 tracking-tighter">{((netProfit / 810000) * 100).toFixed(1)}%</span>
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">ROI</span>
                    </div>
                 </div>
              </div>
              <div className="w-full h-px bg-purple-200/50 mb-3"></div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-bold text-purple-600/70 text-[10px] uppercase tracking-wider">Lifetime Net Profit</p>
                  <p className="text-xl font-black text-purple-700 mt-1">{formatInRupees(netProfit)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-700/80 text-[10px] uppercase tracking-wider">Cash Available</p>
                  <p className="text-xl font-black text-purple-800 mt-1">{formatInRupees(totalRevenue - totalExpenses)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs col-span-2 flex justify-between items-center bg-gradient-to-br from-blue-500/5 to-emerald-500/5">
            <div>
              <p className="font-semibold text-slate-500 text-[10px] uppercase">Net Profit</p>
              <p className={`text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatInRupees(netProfit)}
              </p>
              <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full mt-1.5 ${
                netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {netProfit >= 0 ? 'Profitable ✓' : 'Loss'}
              </span>
            </div>
            <div className="text-right flex flex-col items-end gap-0.5">
              <p className="font-semibold text-slate-500 text-[10px] uppercase">Cash Available</p>
              <p className="text-2xl font-black mt-1 text-slate-700">
                {formatInRupees(totalRevenue - totalExpenses)}
              </p>
              {totalRoyaltyDeduction > 0 && (
                <span className="text-[9px] text-slate-500 font-medium mt-1">
                  (Royalty: -{formatInRupees(totalRoyaltyDeduction)})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recharts Bar Chart: Daily Revenue vs Expenses */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Last 7 Days Balance (Revenue vs Expenses)
        </h3>
        <div className="h-56" id="7-days-recharts-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7DaysData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: any) => [`₹${value}`, '']} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recharts Pie Chart: Expense categories */}
      {pieChartData.length > 0 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800">Expenses by Category</h3>
          <div className="flex flex-col md:flex-row items-center justify-around gap-4">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹${value}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legends list with values */}
            <div className="flex-1 space-y-1.5 w-full text-[10px]">
              {pieChartData.map((d, index) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                    <span className="font-semibold text-slate-700">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatInRupees(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Jobs summary */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-1">
          <Users className="w-4 h-4 text-blue-500" />
          Staff Job Counts
        </h3>
        <p className="text-[10px] text-slate-400">Number of sites cleaned in the selected range.</p>
        <div className="grid grid-cols-3 gap-3 pt-1">
          {staffJobsList.map((staff) => (
            <div key={staff.name} className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
              <span className="font-bold text-slate-700 text-xs block">{staff.name}</span>
              <span className="font-black text-blue-600 text-lg block mt-1">{staff.count}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Sites cleaned</span>
            </div>
          ))}
        </div>
      </div>

      {/* Area-wise revenue summary */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-1">
          <MapPin className="w-4 h-4 text-blue-500" />
          Area Revenue Leaderboard
        </h3>
        <div className="space-y-2">
          {areaRevenueList.length === 0 ? (
            <p className="text-slate-400 py-3 text-center">No area bookings logged.</p>
          ) : (
            areaRevenueList.map((area, index) => (
              <div key={area.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-700">{area.name}</span>
                </div>
                <span className="font-bold text-slate-800">{formatInRupees(area.revenue)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending payments list (Outstanding dues) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Pending Payments List
          </h3>
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
            Total: {formatInRupees(totalOutstanding)}
          </span>
        </div>

        {pendingJobsList.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            No pending payments. Outstanding balances is completely clear!
          </div>
        ) : (
          <div className="space-y-2 divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
            {pendingJobsList.map((pJob) => (
              <div key={pJob.id} className="pt-2.5 first:pt-0 space-y-2" id={`pending-report-row-${pJob.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{pJob.customerName}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {pJob.date} | Phone: {pJob.customerPhone}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Area: {pJob.area}{pJob.otherAreaText ? ` (${pJob.otherAreaText})` : ''} | Tank: {pJob.tankCapacity}L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{formatInRupees(pJob.grandTotal)}</p>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold inline-block mt-1">Pending</span>
                  </div>
                </div>

                {/* Micro Actions (Call, WhatsApp, Mark Paid, Invoice) */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <button
                    onClick={() => window.location.href = `tel:${pJob.customerPhone}`}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg"
                    title="Call Client"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const template = settings.whatsappTemplates?.due || `Hello {customerName}, this is a gentle reminder from {franchiseName}. Regarding your water tank cleaning service completed on {date}, the pending balance amount is {amount}. Kindly transfer via GPay/UPI. Thank you!`;
                      const msg = formatWhatsappMessage(template, {
                        customerName: pJob.customerName,
                        franchiseName: settings.franchiseName || 'Tankro Sathyamangalam',
                        date: pJob.date,
                        capacity: pJob.tankCapacity,
                        tanksCount: pJob.numTanks || 1,
                        amount: formatInRupees(pJob.grandTotal),
                        googleLocation: pJob.googleLocation,
                        staffNames: pJob.staffAssigned?.join(', ') || 'our staff'
                      });
                      window.open(`https://api.whatsapp.com/send?phone=91${pJob.customerPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-emerald-600 rounded-lg"
                    title="Remind on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  {onViewInvoice && (
                    <button
                      onClick={() => onViewInvoice(pJob)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold"
                      id={`pending-inv-${pJob.id}`}
                    >
                      <FileText className="w-3 h-3" />
                      Invoice
                    </button>
                  )}
                  {onMarkJobAsPaid && (
                    <button
                      onClick={() => onMarkJobAsPaid(pJob.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold"
                      id={`pending-paid-${pJob.id}`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Received
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Franchise Royalty Payable */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setShowRoyaltyList(!showRoyaltyList)}
          className="w-full flex items-center justify-between mb-2 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-xl">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">Franchise Royalty Payable</h3>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">TOTAL OUTSTANDING</span>
              <span className="text-base font-black text-purple-600">{formatInRupees(totalRoyaltyPending)}</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
              {showRoyaltyList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {showRoyaltyList && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {pendingRoyaltyJobsList.length === 0 ? (
              <p className="text-center text-slate-400 py-3 italic bg-slate-50 rounded-2xl">No pending royalty payments.</p>
            ) : (
              <div className="space-y-4">
                {onMarkAllRoyaltyPaid && (
                  <button
                    onClick={() => onMarkAllRoyaltyPaid(pendingRoyaltyJobsList.map(j => j.id))}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold transition-all shadow-sm cursor-pointer"
                    id="mark-all-royalty-paid"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark All as Paid
                  </button>
                )}
                <div className="space-y-2">
                  {pendingRoyaltyJobsList.map((pJob) => {
                    const royaltyAmount = pJob.subtotal * 0.1;
                    return (
                      <div key={pJob.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 rounded-2xl gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{pJob.customerName}</span>
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded-lg uppercase">
                              Royalty: {formatInRupees(royaltyAmount)}
                            </span>
                          </div>
                          <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                            <span>{pJob.date}</span>
                            <span>•</span>
                            <span>{pJob.area}</span>
                            <span>•</span>
                            <span>{pJob.id.slice(-5)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
