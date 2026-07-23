/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, CreditCard, Settings, ShieldAlert, Award, Info } from 'lucide-react';
import { DailyAttendance, AttendanceStatus, AppSettings } from '../types';
import { getTodayDateString, formatInRupees } from '../utils';

interface AttendanceModuleProps {
  attendanceRecords: DailyAttendance[];
  settings: AppSettings;
  onSaveAttendance: (attendance: DailyAttendance) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export default function AttendanceModule({
  attendanceRecords,
  settings,
  onSaveAttendance,
  onUpdateSettings,
}: AttendanceModuleProps) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');

  // Mark Attendance State
  const [date, setDate] = useState(getTodayDateString());
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({
    Althaf: 'Present',
    Nafees: 'Present',
    Akram: 'Present',
  });
  const [wages, setWages] = useState<Record<string, number | ''>>({
    Althaf: (settings.dailyWages?.Althaf) || 300,
    Nafees: (settings.dailyWages?.Nafees) || 400,
    Akram: (settings.dailyWages?.Akram) || 500,
  });

  // Settings state in terms of Monthly Salaries (computed as dailyWage * 30)
  const [althafMonthly, setAlthafMonthly] = useState<number | ''>(((settings.dailyWages?.Althaf) || 300) * 30);
  const [nafeesMonthly, setNafeesMonthly] = useState<number | ''>(((settings.dailyWages?.Nafees) || 400) * 30);
  const [akramMonthly, setAkramMonthly] = useState<number | ''>(((settings.dailyWages?.Akram) || 500) * 30);
  const [showSettings, setShowSettings] = useState(false);

  // Custom Franchise Branding & Pricing Slabs & WhatsApp Templates Settings
  const [franchiseName, setFranchiseName] = useState(settings.franchiseName || 'Tankro Sathyamangalam');
  const [customSlabRates, setCustomSlabRates] = useState<Record<string, number>>(settings.customSlabRates || {
    '1000': 800,
    '3000': 950,
    '5000': 1250,
    '7500': 1850,
    '10000': 2350,
    '15000': 2950,
    '20000': 3550,
    '30000': 4000,
  });
  const [whatsappTemplates, setWhatsappTemplates] = useState<Record<string, string>>(settings.whatsappTemplates || {
    reminder: '',
    invoice: '',
    due: '',
  });

  // History / Filter State
  const [historyMonth, setHistoryMonth] = useState<string>(getTodayDateString().slice(0, 7)); // YYYY-MM

  // Load attendance record if it already exists for the selected date
  useEffect(() => {
    const existing = attendanceRecords.find((r) => r.date === date);
    if (existing) {
      setRecords(existing.records);
      setWages(existing.wages);
    } else {
      // Default behavior from settings
      const defaultRecords: Record<string, AttendanceStatus> = {
        Althaf: 'Present',
        Nafees: 'Present',
        Akram: 'Present',
      };
      const defaultWages: Record<string, number> = {
        Althaf: (settings.dailyWages?.Althaf) || 300,
        Nafees: (settings.dailyWages?.Nafees) || 400,
        Akram: (settings.dailyWages?.Akram) || 500,
      };
      setRecords(defaultRecords);
      setWages(defaultWages);
    }
  }, [date, attendanceRecords, settings]);

  // Keep state in sync when settings prop updates
  useEffect(() => {
    setAlthafMonthly(((settings.dailyWages?.Althaf) || 300) * 30);
    setNafeesMonthly(((settings.dailyWages?.Nafees) || 400) * 30);
    setAkramMonthly(((settings.dailyWages?.Akram) || 500) * 30);
    setFranchiseName(settings.franchiseName || 'Tankro Sathyamangalam');
    if (settings.customSlabRates) {
      setCustomSlabRates(settings.customSlabRates);
    }
    if (settings.whatsappTemplates) {
      setWhatsappTemplates(settings.whatsappTemplates);
    }
  }, [settings]);

  // Handle setting updates (Comprehensive Partners & Franchise system)
  const saveAllSettings = () => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Managers cannot edit franchise settings!');
      return;
    }

    const updatedSettings: AppSettings = {
      ...settings,
      dailyWages: {
        Althaf: Math.round(Number(althafMonthly) / 30),
        Nafees: Math.round(Number(nafeesMonthly) / 30),
        Akram: Math.round(Number(akramMonthly) / 30),
      },
      franchiseName,
      customSlabRates,
      whatsappTemplates,
    };

    onUpdateSettings(updatedSettings);
    setShowSettings(false);
    alert('Franchise and pricing settings updated successfully!');

    setWages({
      Althaf: Math.round(Number(althafMonthly) / 30),
      Nafees: Math.round(Number(nafeesMonthly) / 30),
      Akram: Math.round(Number(akramMonthly) / 30),
    });
  };

  const handleStatusChange = (staff: string, status: AttendanceStatus) => {
    const newRecords = { ...records, [staff]: status };
    setRecords(newRecords);

    // Auto calculate wage based on status and standard daily wage (monthly salary / 30)
    const standardWage = (settings.dailyWages?.[staff]) || (staff === 'Akram' ? 500 : staff === 'Nafees' ? 400 : 300);
    let calculatedWage = standardWage;
    if (status === 'Absent' || status === 'Leave') {
      calculatedWage = 0;
    } else if (status === 'Half-Day') {
      calculatedWage = Math.round(standardWage / 2);
    }

    setWages({
      ...wages,
      [staff]: calculatedWage,
    });
  };

  const handleCustomWageChange = (staff: string, amount: number | '') => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Managers are not authorized to modify computed daily wages manually.');
      return;
    }
    setWages({
      ...wages,
      [staff]: amount,
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedWages: Record<string, number> = {};
    Object.entries(wages).forEach(([key, val]) => {
      sanitizedWages[key] = Number(val) || 0;
    });

    const attendanceData: DailyAttendance = {
      id: date,
      date,
      records,
      wages: sanitizedWages,
    };
    onSaveAttendance(attendanceData);
    alert(`Attendance saved for ${date}!`);
  };

  const handleSettingsClick = () => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Only Owners (Nadeem & Yuvaraj) can configure settings.');
      return;
    }
    setShowSettings(!showSettings);
  };

  // Compile stats for selected month
  const staffStats = ['Althaf', 'Nafees', 'Akram'].map((staff) => {
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;

    attendanceRecords.forEach((r) => {
      if (r.date.startsWith(historyMonth)) {
        const status = r.records[staff];
        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Half-Day') halfDayCount++;
        else if (status === 'Leave') leaveCount++;
      }
    });

    const baseSalary = 15000;
    const allowedLeaves = 4;
    const penaltyPerDay = 500;
    
    // Half day is 0.5 leaves
    const totalLeaveDays = leaveCount + absentCount + (halfDayCount * 0.5);
    const penaltyDays = Math.max(0, totalLeaveDays - allowedLeaves);
    const finalSalary = Math.max(0, baseSalary - (penaltyDays * penaltyPerDay));

    return {
      name: staff,
      present: presentCount,
      absent: absentCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      totalLeaveDays,
      penaltyDays,
      finalSalary,
      baseSalary,
    };
  });

  // Filtered attendance history logs
  const filteredLogs = attendanceRecords
    .filter((r) => r.date.startsWith(historyMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden" id="attendance-wrapper">
      {/* Top Banner Navigation */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 pb-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Staff Attendance
            </h2>
            <p className="text-xs text-blue-100">
              Daily Attendance Tracking
            </p>
          </div>
          <button
            onClick={handleSettingsClick}
            className={`p-2 rounded-xl transition-colors text-white cursor-pointer ${
              settings.currentUserRole === 'Manager' ? 'opacity-50 cursor-not-allowed bg-black/10' : 'bg-white/10 hover:bg-white/20'
            }`}
            id="toggle-wage-settings"
            title={settings.currentUserRole === 'Manager' ? "Locked for Managers" : "Configure Settings"}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/20 text-xs">
          <button
            onClick={() => setActiveTab('mark')}
            className={`flex-1 text-center py-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mark' ? 'border-white text-white' : 'border-transparent text-blue-100 hover:text-white'
            }`}
            id="tab-mark-attendance"
          >
            Mark Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 text-center py-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history' ? 'border-white text-white' : 'border-transparent text-blue-100 hover:text-white'
            }`}
            id="tab-attendance-summary"
          >
            Payroll Summary
          </button>
        </div>
      </div>

      {/* Settings Panel (Comprehensive Partner & Franchise customizer) */}
      {showSettings && settings.currentUserRole !== 'Manager' && (
        <div className="p-5 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Settings className="w-4 h-4 text-blue-600 animate-spin-slow" />
              Franchise & Partner Settings Console
            </h3>
            <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Owner Mode
            </span>
          </div>

          {/* SECTION 1: Franchise Branding */}
          <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <h4 className="font-bold text-slate-800">1. Franchise Branding</h4>
            <p className="text-[10px] text-slate-400">
              Customize the business branding name printed on PDF invoices and WhatsApp notifications.
            </p>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">Business Name:</label>
              <input
                type="text"
                value={franchiseName}
                onChange={(e) => setFranchiseName(e.target.value)}
                className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                placeholder="e.g. Tankro Sathyamangalam"
              />
            </div>
          </div>

          {/* SECTION 3: Standard Slabs */}
          <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <h4 className="font-bold text-slate-800">3. Standard Pricing Slabs Customizer (₹)</h4>
            <p className="text-[10px] text-slate-400">
              Edit the flat cleaning price per tank based on tank capacity limits. Saves time on auto calculation.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.keys(customSlabRates).sort((a,b)=>Number(a)-Number(b)).map((capacity) => (
                <div key={capacity} className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Up to {capacity} Liters:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">₹</span>
                    <input
                      type="number"
                      value={customSlabRates[capacity]}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = val === '' ? 0 : Math.max(0, parseInt(val) || 0);
                        setCustomSlabRates(prev => ({
                          ...prev,
                          [capacity]: num
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 font-extrabold text-slate-800 text-center text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: WhatsApp Templates */}
          <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div>
              <h4 className="font-bold text-slate-800">4. WhatsApp Notification Message Templates</h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Customize templates triggered on direct notifications. Keep these placeholders intact:
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['{customerName}', '{franchiseName}', '{date}', '{timeslot}', '{capacity}', '{tanksCount}', '{amount}', '{nextDueDate}', '{googleLocation}'].map(tag => (
                  <span key={tag} className="text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] text-slate-600 font-bold block mb-1">
                  📅 Appointment Scheduled / Reminder Template:
                </label>
                <textarea
                  rows={2}
                  value={whatsappTemplates.reminder || ''}
                  onChange={(e) => setWhatsappTemplates(prev => ({ ...prev, reminder: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 leading-normal"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 font-bold block mb-1">
                  🧾 Completed / Invoice Shared Template:
                </label>
                <textarea
                  rows={2}
                  value={whatsappTemplates.invoice || ''}
                  onChange={(e) => setWhatsappTemplates(prev => ({ ...prev, invoice: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 leading-normal"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-600 font-bold block mb-1">
                  💧 Service Overdue / CRM Follow-up Template:
                </label>
                <textarea
                  rows={2}
                  value={whatsappTemplates.due || ''}
                  onChange={(e) => setWhatsappTemplates(prev => ({ ...prev, due: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 leading-normal"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all cursor-pointer text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAllSettings}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-sm hover:shadow-md"
              id="save-franchise-settings-btn"
            >
              Save Franchise Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="p-5 text-xs text-slate-700">
        {activeTab === 'mark' ? (
          /* Tab 1: MARK ATTENDANCE */
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sky-800">Payroll Rules:</p>
                <p className="text-[10px] text-sky-700 leading-relaxed mt-0.5">
                  Base Salary: ₹15,000 / month per staff.<br />
                  Allowed Leaves: 4 days / month.<br />
                  Penalty: ₹500 deducted for each leave/absent from the 5th day onwards.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Select Date for Attendance:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                id="attendance-date"
                required
              />
            </div>

            <div className="space-y-4 pt-2">
              {['Althaf', 'Nafees', 'Akram'].map((staff) => {
                const currentStatus = records[staff] || 'Present';
                const currentWage = wages[staff] !== undefined ? wages[staff] : 0;
                const dailyRate = (settings.dailyWages?.[staff]) || (staff === 'Akram' ? 500 : staff === 'Nafees' ? 400 : 300);

                return (
                  <div
                    key={staff}
                    className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-3 hover:shadow-xs transition-shadow"
                    id={`attendance-row-${staff.toLowerCase()}`}
                  >
                    {/* Staff Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold font-display">
                          {staff[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{staff}</p>
                          
                        </div>
                      </div>
                    </div>

                    {/* Status Select Grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Present', 'Half-Day', 'Absent', 'Leave'] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(staff, status)}
                          className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                            currentStatus === status
                              ? status === 'Present'
                                ? 'bg-green-500 border-green-500 text-white shadow-xs'
                                : status === 'Half-Day'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                : status === 'Absent'
                                ? 'bg-red-500 border-red-500 text-white shadow-xs'
                                : 'bg-slate-500 border-slate-500 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          id={`btn-status-${staff.toLowerCase()}-${status.toLowerCase().replace('-', '')}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
              id="save-attendance-btn"
            >
              Save Attendance
            </button>
          </form>
        ) : (
          /* Tab 2: ATTENDANCE SUMMARY & LOGS */
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Select Month:</span>
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800 text-center cursor-pointer"
                id="attendance-month-filter"
              />
            </div>

            {/* Payroll Summary */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-1">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Monthly Payroll & Attendance Summary
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {staffStats.map((stat) => (
                  <div key={stat.name} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors shadow-xs">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{stat.name}</span>
                        <span className="text-[10px] text-slate-400">
                          Base Salary: <strong className="text-slate-600">{formatInRupees(stat.baseSalary)}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Calculated Salary</span>
                        <span className="font-extrabold text-blue-600 text-base">
                          {formatInRupees(stat.finalSalary)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl mb-3 flex justify-between items-center border border-slate-100">
                      <span>Leaves Taken: <strong>{stat.totalLeaveDays}</strong> / 4</span>
                      {stat.penaltyDays > 0 ? (
                        <span className="text-red-600 font-semibold text-right">Penalty: ₹{stat.penaltyDays * 500} ({stat.penaltyDays} days)</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">No Penalty</span>
                      )}
                    </div>

                    {/* Matrix of counts */}
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-2 border-t border-slate-100">
                      <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl text-center">
                        <span className="block text-[9px] font-bold uppercase">Present</span>
                        <span className="block text-sm font-black">{stat.present}</span>
                      </div>
                      <div className="bg-amber-50 text-amber-700 p-2 rounded-xl text-center">
                        <span className="block text-[9px] font-bold uppercase">Half</span>
                        <span className="block text-sm font-black">{stat.halfDay}</span>
                      </div>
                      <div className="bg-purple-50 text-purple-700 p-2 rounded-xl text-center">
                        <span className="block text-[9px] font-bold uppercase">Leave</span>
                        <span className="block text-sm font-black">{stat.leave}</span>
                      </div>
                      <div className="bg-red-50 text-red-700 p-2 rounded-xl text-center">
                        <span className="block text-[9px] font-bold uppercase">Absent</span>
                        <span className="block text-sm font-black">{stat.absent}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date-wise logs log */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-500" />
                Date-wise Logs ({historyMonth})
              </h3>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                  No attendance records found for this month.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredLogs.map((log) => (
                    <div key={log.date} className="p-3 hover:bg-slate-50/50 transition-colors flex justify-between items-center text-[11px]">
                      <div className="font-semibold text-slate-700">{log.date}</div>
                      <div className="flex gap-2">
                        {Object.entries(log.records).map(([name, status]) => (
                          <span
                              key={name}
                              className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                                  status === 'Present'
                                      ? 'bg-green-50 text-green-700'
                                      : status === 'Half-Day'
                                      ? 'bg-amber-50 text-amber-700'
                                      : status === 'Absent'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {name[0]}: {status === 'Present' ? 'P' : status === 'Half-Day' ? 'H' : status === 'Absent' ? 'A' : 'L'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
