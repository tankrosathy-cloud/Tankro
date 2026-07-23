/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Compass,
  Share2,
  Send,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  Search,
  Filter,
  Users,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Map,
  Award,
  Camera,
  Edit,
  Database
} from 'lucide-react';
import { Appointment, Job, AppSettings, DailyAttendance } from '../types';
import { getTodayDateString, formatInRupees, formatWhatsappMessage, compressImage } from '../utils';

interface AppointmentsModuleProps {
  appointments: Appointment[];
  jobs: Job[];
  onAddAppointment: (appt: Appointment) => void;
  onUpdateStatus: (id: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => void;
  onDeleteAppointment: (id: string) => void;
  onCompleteAndLog: (appt: Appointment) => void;
  settings: AppSettings;
  attendanceRecords?: DailyAttendance[];
  onUpdateAppointmentFields?: (id: string, fields: Partial<Appointment>) => void;
}

const TIMESLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
];

export const STANDARD_CHECKLIST_STEPS = [
  'Dewatering & Mud Draining',
  'Wall & Floor Pressure Scrubbing',
  'Sludge Extraction & Vacuuming',
  'Antibacterial Spray / UV Disinfection',
  'Secure Tank Lid Lock Check',
  'Completion Site Cleanup & Photos',
];

export default function AppointmentsModule({
  appointments,
  jobs,
  onAddAppointment,
  onUpdateStatus,
  onDeleteAppointment,
  onCompleteAndLog,
  settings,
  onUpdateAppointmentFields,
  attendanceRecords,
}: AppointmentsModuleProps) {
  // Tabs: 'schedule' or 'book'
  const [subTab, setSubTab] = useState<'schedule' | 'book'>('schedule');

  const ALL_STAFF = settings?.staffList || ['Althaf', 'Nafees', 'Prabhu'];
  const getAvailableStaff = (currentDate: string) => {
    if (!attendanceRecords) return ALL_STAFF;
    const record = attendanceRecords.find(r => r.date === currentDate);
    if (!record) return ALL_STAFF;
    return ALL_STAFF.filter(staff => {
      const status = record.records[staff];
      if (status === 'Absent' || status === 'Leave') return false;
      return true;
    });
  };

  // Form State
  const [date, setDate] = useState(getTodayDateString());
  const [timeslot, setTimeslot] = useState(TIMESLOTS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const defaultArea = settings?.serviceAreas?.[0] || 'Erode';
  const [area, setArea] = useState(defaultArea);
  const [otherAreaText, setOtherAreaText] = useState('');
  const [tankCapacity, setTankCapacity] = useState<number | ''>(1000);
  const [numTanks, setNumTanks] = useState<number | ''>(1);
  const [staffAssigned, setStaffAssigned] = useState<string[]>(() => getAvailableStaff(getTodayDateString()));
  const [notes, setNotes] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [isFranchiseReferral, setIsFranchiseReferral] = useState<boolean>(false);

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<{ name: string; phone: string; address: string; area: string; otherAreaText?: string; googleLocation?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Calendar filter state
  const [filterDate, setFilterDate] = useState<string>(getTodayDateString());
  const [useDateFilter, setUseDateFilter] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // New features state
  const [activeChecklistAppt, setActiveChecklistAppt] = useState<Appointment | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [apptPhotoBefore, setApptPhotoBefore] = useState<string>('');
  const [apptPhotoAfter, setApptPhotoAfter] = useState<string>('');
  const [apptPhotosBefore, setApptPhotosBefore] = useState<string[]>([]);
  const [apptPhotosAfter, setApptPhotosAfter] = useState<string[]>([]);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isCustomCapacity, setIsCustomCapacity] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleEditClick = (appt: Appointment) => {
    setEditingAppointmentId(appt.id);
    setDate(appt.date);
    setTimeslot(appt.timeslot);
    setCustomerName(appt.customerName);
    setCustomerPhone(appt.customerPhone);
    setCustomerAddress(appt.customerAddress);
    setArea(appt.area);
    setOtherAreaText(appt.otherAreaText || '');
    
    const standardOptions = [1000, 3000, 5000, 7500, 10000, 15000, 20000, 30000];
    if (appt.tankCapacity && !standardOptions.includes(appt.tankCapacity)) {
      setIsCustomCapacity(true);
    } else {
      setIsCustomCapacity(false);
    }
    setTankCapacity(appt.tankCapacity);
    setNumTanks(appt.numTanks || 1);
    setStaffAssigned(appt.staffAssigned || [(settings?.staffList || ['Althaf'])[0]]);
    setNotes(appt.notes || '');
    setGoogleLocation(appt.googleLocation || '');
    setIsFranchiseReferral(appt.isFranchiseReferral || false);
    
    setSubTab('book'); // Switch to form tab
  };

  // Unique customers lookup for autocomplete
  const uniqueCustomers = useMemo(() => {
    const clients: Record<string, { name: string; phone: string; address: string; area: string; otherAreaText?: string; googleLocation?: string }> = {};
    jobs.forEach((j) => {
      if (j.customerName && !clients[j.customerName.toLowerCase().trim()]) {
        clients[j.customerName.toLowerCase().trim()] = {
          name: j.customerName,
          phone: j.customerPhone,
          address: j.customerAddress,
          area: j.area,
          otherAreaText: j.otherAreaText,
          googleLocation: j.googleLocation,
        };
      }
    });
    return Object.values(clients);
  }, [jobs]);

  // Check if selected date & timeslot has an active booking to prevent double-booking
  const occupiedBooking = useMemo(() => {
    if (!date || !timeslot) return null;
    return appointments.find(
      (a) => a.date === date && a.timeslot === timeslot && a.status === 'Scheduled' && a.id !== editingAppointmentId
    );
  }, [date, timeslot, appointments, editingAppointmentId]);

  // Filter and sort appointments for the list view
  const filteredAppointments = useMemo(() => {
    const list = appointments.filter((a) => {
      const matchDate = !useDateFilter || a.date === filterDate;
      const matchStatus = filterStatus === 'All' || a.status === filterStatus;
      return matchDate && matchStatus;
    });

    // Sort: 1st by routeSequence (if present, otherwise default to 9999), 2nd by timeslot chronological
    return [...list].sort((a, b) => {
      const seqA = a.routeSequence !== undefined ? a.routeSequence : 9999;
      const seqB = b.routeSequence !== undefined ? b.routeSequence : 9999;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      // Chronological fallback
      const idxA = TIMESLOTS.indexOf(a.timeslot);
      const idxB = TIMESLOTS.indexOf(b.timeslot);
      return idxA - idxB;
    });
  }, [appointments, filterDate, useDateFilter, filterStatus]);

  // --- Checklist Handlers ---
  const handleStartChecklist = (appt: Appointment) => {
    setActiveChecklistAppt(appt);
    if (appt.photosBefore && appt.photosBefore.length > 0) {
      setApptPhotosBefore(appt.photosBefore);
    } else {
      setApptPhotosBefore(appt.photoBefore ? [appt.photoBefore] : []);
    }
    if (appt.photosAfter && appt.photosAfter.length > 0) {
      setApptPhotosAfter(appt.photosAfter);
    } else {
      setApptPhotosAfter(appt.photoAfter ? [appt.photoAfter] : []);
    }
    setApptPhotoBefore(appt.photoBefore || '');
    setApptPhotoAfter(appt.photoAfter || '');
    const initialTicks: Record<string, boolean> = {};
    STANDARD_CHECKLIST_STEPS.forEach((step) => {
      initialTicks[step] = false;
    });
    setChecklistItems(initialTicks);
  };

  const handleToggleChecklistStep = (step: string) => {
    setChecklistItems((prev) => ({
      ...prev,
      [step]: !prev[step],
    }));
  };

  const handleCheckAllSteps = () => {
    const allTicked: Record<string, boolean> = {};
    STANDARD_CHECKLIST_STEPS.forEach((step) => {
      allTicked[step] = true;
    });
    setChecklistItems(allTicked);
  };

  const executeChecklistSubmit = (tickedSteps: string[]) => {
    if (!activeChecklistAppt) return;
    const firstB = apptPhotosBefore.find(p => !!p) || undefined;
    const firstA = apptPhotosAfter.find(p => !!p) || undefined;

    // Persist checklist and photo fields on the appointment
    if (onUpdateAppointmentFields) {
      onUpdateAppointmentFields(activeChecklistAppt.id, {
        qualityChecklist: tickedSteps,
        photosBefore: apptPhotosBefore,
        photosAfter: apptPhotosAfter,
        photoBefore: firstB,
        photoAfter: firstA,
      });
    }

    // Proceed to log the job with checklist and photos attached
    onCompleteAndLog({
      ...activeChecklistAppt,
      qualityChecklist: tickedSteps,
      photosBefore: apptPhotosBefore,
      photosAfter: apptPhotosAfter,
      photoBefore: firstB,
      photoAfter: firstA,
    });

    setActiveChecklistAppt(null);
    setApptPhotosBefore([]);
    setApptPhotosAfter([]);
    setApptPhotoBefore('');
    setApptPhotoAfter('');
  };

  const handleSubmitChecklist = () => {
    if (!activeChecklistAppt) return;
    
    const tickedSteps = Object.keys(checklistItems).filter((step) => checklistItems[step]);
    
    if (tickedSteps.length < STANDARD_CHECKLIST_STEPS.length) {
      setConfirmDialog({
        title: 'Pending Quality Checks',
        message: 'Some quality checklist procedures are not checked off. Are you sure you want to proceed to billing without completing all quality checks?',
        onConfirm: () => {
          setConfirmDialog(null);
          executeChecklistSubmit(tickedSteps);
        }
      });
    } else {
      executeChecklistSubmit(tickedSteps);
    }
  };

  // --- Route Sequencer Handlers ---
  const handleMoveRouteItem = (apptId: string, direction: 'up' | 'down') => {
    if (!onUpdateAppointmentFields) return;

    // Get all active scheduled stops for this specific date
    const scheduleForDay = appointments.filter((a) => a.date === filterDate && a.status === 'Scheduled');
    const sorted = [...scheduleForDay].sort((a, b) => {
      const seqA = a.routeSequence !== undefined ? a.routeSequence : 9999;
      const seqB = b.routeSequence !== undefined ? b.routeSequence : 9999;
      if (seqA !== seqB) return seqA - seqB;
      const idxA = TIMESLOTS.indexOf(a.timeslot);
      const idxB = TIMESLOTS.indexOf(b.timeslot);
      return idxA - idxB;
    });

    // Assure and write sequential route sequences to stabilize list
    sorted.forEach((item, index) => {
      if (item.routeSequence !== index + 1) {
        onUpdateAppointmentFields(item.id, { routeSequence: index + 1 });
        item.routeSequence = index + 1;
      }
    });

    const index = sorted.findIndex((item) => item.id === apptId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const curr = sorted[index];
      onUpdateAppointmentFields(curr.id, { routeSequence: index });
      onUpdateAppointmentFields(prev.id, { routeSequence: index + 1 });
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const curr = sorted[index];
      onUpdateAppointmentFields(curr.id, { routeSequence: index + 2 });
      onUpdateAppointmentFields(next.id, { routeSequence: index + 1 });
    }
  };

  const handleAutoOptimizeRoute = (criteria: 'area' | 'chronological') => {
    if (!onUpdateAppointmentFields) return;

    const scheduleForDay = appointments.filter((a) => a.date === filterDate && a.status === 'Scheduled');
    if (scheduleForDay.length === 0) return;

    const sorted = [...scheduleForDay];

    if (criteria === 'chronological') {
      sorted.sort((a, b) => {
        const idxA = TIMESLOTS.indexOf(a.timeslot);
        const idxB = TIMESLOTS.indexOf(b.timeslot);
        return idxA - idxB;
      });
    } else if (criteria === 'area') {
      // Group by Area: Erode (1), Gobichettipalayam (2), Punjai Puliambatti (3), Other (4)
      const areaWeights: Record<string, number> = {
        'Erode': 1,
        'Gobichettipalayam': 2,
        'Punjai Puliambatti': 3,
        'Other': 4
      };
      sorted.sort((a, b) => {
        const wtA = areaWeights[a.area] || 99;
        const wtB = areaWeights[b.area] || 99;
        if (wtA !== wtB) return wtA - wtB;
        // Fallback to chronological
        const idxA = TIMESLOTS.indexOf(a.timeslot);
        const idxB = TIMESLOTS.indexOf(b.timeslot);
        return idxA - idxB;
      });
    }

    // Persist new sequences
    sorted.forEach((appt, idx) => {
      onUpdateAppointmentFields(appt.id, { routeSequence: idx + 1 });
    });
  };

  const handleShareDailyRoute = () => {
    const scheduleForDay = appointments.filter((a) => a.date === filterDate && a.status === 'Scheduled');
    const sorted = [...scheduleForDay].sort((a, b) => {
      const seqA = a.routeSequence !== undefined ? a.routeSequence : 9999;
      const seqB = b.routeSequence !== undefined ? b.routeSequence : 9999;
      if (seqA !== seqB) return seqA - seqB;
      const idxA = TIMESLOTS.indexOf(a.timeslot);
      const idxB = TIMESLOTS.indexOf(b.timeslot);
      return idxA - idxB;
    });

    if (sorted.length === 0) {
      alert('No scheduled appointments to share for this day!');
      return;
    }

    let message = `🚩 *TANKRO DAILY ROUTE - ${filterDate}*\n`;
    message += `───────────────────\n`;
    message += `Planned Sequence of Cleanings:\n\n`;

    sorted.forEach((appt, idx) => {
      message += `*${idx + 1}. Stop ${idx + 1} (${appt.timeslot})*\n`;
      message += `👤 Customer: ${appt.customerName}\n`;
      message += `📞 Phone: +91 ${appt.customerPhone}\n`;
      message += `📍 Area: ${appt.area === 'Other' ? (appt.otherAreaText || 'Other') : appt.area}\n`;
      message += `🏠 Address: ${appt.customerAddress}\n`;
      message += `💧 Details: ${appt.numTanks} Tank(s) • ${appt.tankCapacity}L capacity\n`;
      if (appt.googleLocation) {
        const link = appt.googleLocation.startsWith('http') ? appt.googleLocation : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.googleLocation)}`;
        message += `🗺️ Map Pin: ${link}\n`;
      }
      if (appt.notes) {
        message += `📝 Note: "${appt.notes}"\n`;
      }
      message += `\n`;
    });

    message += `───────────────────\n`;
    message += `🔧 Let's execute perfectly! Stay safe!\n`;
    message += `_Powered by Tankro Erode_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Autocomplete change handler
  const handleNameChange = (val: string) => {
    setCustomerName(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = uniqueCustomers.filter((c) =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const selectSuggestion = (s: { name: string; phone: string; address: string; area: string; otherAreaText?: string; googleLocation?: string }) => {
    setCustomerName(s.name);
    setCustomerPhone(s.phone);
    setCustomerAddress(s.address);
    setArea(s.area);
    setOtherAreaText(s.otherAreaText || '');
    setGoogleLocation(s.googleLocation || '');
    setShowSuggestions(false);
  };

  const handleStaffToggle = (staff: string) => {
    if (staffAssigned.includes(staff)) {
      setStaffAssigned(staffAssigned.filter((s) => s !== staff));
    } else {
      setStaffAssigned([...staffAssigned, staff]);
    }
  };

  const resetForm = () => {
    setDate(getTodayDateString());
    setTimeslot(TIMESLOTS[0]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setArea('Erode');
    setOtherAreaText('');
    setTankCapacity(1000);
    setIsCustomCapacity(false);
    setNumTanks(1);
    setStaffAssigned([(settings?.staffList || ['Althaf'])[0]]);
    setNotes('');
    setGoogleLocation('');
    setEditingAppointmentId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !customerPhone || !customerAddress) {
      alert('Please fill out all required customer details.');
      return;
    }

    if (staffAssigned.length === 0) {
      alert('Please assign at least one staff member.');
      return;
    }

    const saveAppointment = () => {
      if (editingAppointmentId) {
        if (onUpdateAppointmentFields) {
          onUpdateAppointmentFields(editingAppointmentId, {
            date,
            timeslot,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            area,
            otherAreaText: area === 'Other' ? otherAreaText.trim() : undefined,
            tankCapacity: Number(tankCapacity) || 1000,
            numTanks: Number(numTanks) || 1,
            staffAssigned,
            notes: notes.trim() || undefined,
            googleLocation: googleLocation.trim() || undefined,
            isFranchiseReferral,
          });
          alert('Appointment successfully updated!');
        } else {
          alert('Appointment update function is not defined.');
        }
      } else {
        const newAppt: Appointment = {
          id: `${date.replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          date,
          timeslot,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          area,
          otherAreaText: area === 'Other' ? otherAreaText.trim() : undefined,
          tankCapacity: Number(tankCapacity) || 1000,
          numTanks: Number(numTanks) || 1,
          status: 'Scheduled',
          staffAssigned,
          notes: notes.trim() || undefined,
          googleLocation: googleLocation.trim() || undefined,
          createdAt: new Date().toISOString(),
          isFranchiseReferral,
        };

        onAddAppointment(newAppt);
        alert('Appointment successfully booked!');
      }

      resetForm();
      setSubTab('schedule');
      // Set schedule filter date to the booked date to view it immediately
      setFilterDate(date);
      setUseDateFilter(true);
    };

    // Double check confirmation if timeslot is occupied
    if (occupiedBooking) {
      setConfirmDialog({
        title: 'Double Booking Warning',
        message: `Warning: This timeslot (${timeslot}) is already booked for "${occupiedBooking.customerName}" on ${date}. Do you want to double-book anyway?`,
        onConfirm: () => {
          setConfirmDialog(null);
          saveAppointment();
        }
      });
    } else {
      saveAppointment();
    }
  };

  const triggerWhatsAppShare = (appt: Appointment) => {
    const areaText = appt.area === 'Other' ? (appt.otherAreaText || 'Erode') : appt.area;
    const template = settings?.whatsappTemplates?.reminder;
    let message = '';

    if (template) {
      message = formatWhatsappMessage(template, {
        customerName: appt.customerName,
        franchiseName: settings.franchiseName || 'Tankro Erode',
        date: appt.date,
        timeslot: appt.timeslot,
        capacity: appt.tankCapacity,
        tanksCount: appt.numTanks || 1,
        amount: '',
        googleLocation: appt.googleLocation,
        staffNames: appt.staffAssigned.join(', ')
      });
    } else {
      message = `*${settings?.franchiseName || 'Tankro Erode'}* - Water Tank Cleaning Schedule 💧

Hello ${appt.customerName},

Your water tank cleaning appointment is scheduled successfully!
📅 *Date:* ${appt.date}
⏰ *Time Slot:* ${appt.timeslot}
📍 *Address:* ${appt.customerAddress}, ${areaText}
🧹 *Service:* ${appt.numTanks} Tank(s) (${appt.tankCapacity}L capacity)
${appt.googleLocation ? `📍 *Location Link:* ${appt.googleLocation}\n` : ''}👷‍♂️ *Staff Assigned:* ${appt.staffAssigned.join(', ')}

Our staff will contact you shortly before arrival.
For support or reschedule, call us at 9629335542.`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=91${appt.customerPhone}&text=${encoded}`, '_blank');
  };

  const todayStr = getTodayDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl max-w-sm mx-auto text-xs">
        <button
          onClick={() => setSubTab('schedule')}
          className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'schedule' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
          id="subtab-view-schedule"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          Live Schedule
        </button>
        <button
          onClick={() => setSubTab('book')}
          className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'book' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
          id="subtab-add-booking"
        >
          <Plus className="w-3.5 h-3.5" />
          Book Appointment
        </button>
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'schedule' ? (
          <motion.div
            key="schedule-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter Section */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-500" />
                  Filter Schedule
                </h3>
                <button
                  onClick={() => setSubTab('book')}
                  className="text-xs text-blue-500 dark:text-sky-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Slot
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date Checkbox & Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useDateFilter"
                      checked={useDateFilter}
                      onChange={(e) => setUseDateFilter(e.target.checked)}
                      className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="useDateFilter" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Filter by Date
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={!useDateFilter}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-50"
                  />
                </div>

                {/* Status selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Status
                  </span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Quick Date Shortcuts */}
                <div className="flex flex-col justify-end">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setFilterDate(todayStr);
                        setUseDateFilter(true);
                      }}
                      className={`flex-1 text-[10px] p-2.5 rounded-xl font-bold transition-all ${
                        useDateFilter && filterDate === todayStr
                          ? 'bg-blue-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setFilterDate(tomorrowStr);
                        setUseDateFilter(true);
                      }}
                      className={`flex-1 text-[10px] p-2.5 rounded-xl font-bold transition-all ${
                        useDateFilter && filterDate === tomorrowStr
                          ? 'bg-blue-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={() => setUseDateFilter(false)}
                      className={`flex-1 text-[10px] p-2.5 rounded-xl font-bold transition-all ${
                        !useDateFilter
                          ? 'bg-blue-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Show All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Route Sequencer / Optimizer */}
            {useDateFilter && appointments.filter((a) => a.date === filterDate && a.status === 'Scheduled').length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                      <Map className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Daily Route Sequencer
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                        Arrange optimal sequence for {appointments.filter((a) => a.date === filterDate && a.status === 'Scheduled').length} stops
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
                    className="text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer select-none transition-all"
                  >
                    {isRoutePlannerOpen ? 'Hide Planner' : 'Open Planner'}
                  </button>
                </div>

                {!isRoutePlannerOpen ? (
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900/40 flex items-center gap-2 text-[10px] font-bold text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
                    <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-md uppercase tracking-wider text-[8px]">STOP CHAIN</span>
                    {appointments
                      .filter((a) => a.date === filterDate && a.status === 'Scheduled')
                      .sort((a, b) => {
                        const seqA = a.routeSequence !== undefined ? a.routeSequence : 9999;
                        const seqB = b.routeSequence !== undefined ? b.routeSequence : 9999;
                        if (seqA !== seqB) return seqA - seqB;
                        const idxA = TIMESLOTS.indexOf(a.timeslot);
                        const idxB = TIMESLOTS.indexOf(b.timeslot);
                        return idxA - idxB;
                      })
                      .map((appt, idx, arr) => (
                        <span key={appt.id} className="flex items-center gap-1.5">
                          <span className="text-slate-800 dark:text-slate-300">
                            #{idx + 1} {appt.customerName} ({appt.area === 'Other' ? (appt.otherAreaText || 'Other') : appt.area})
                          </span>
                          {idx < arr.length - 1 && <span className="text-slate-300 dark:text-slate-700">➔</span>}
                        </span>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    {/* Action Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleAutoOptimizeRoute('area')}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Group stops by area coordinates to save petrol"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-blue-500" />
                        Optimize by Area
                      </button>
                      <button
                        onClick={() => handleAutoOptimizeRoute('chronological')}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        title="Sort chronologically by booked hour slots"
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Sort by Timeslot
                      </button>
                      <button
                        onClick={handleShareDailyRoute}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm shadow-emerald-100 dark:shadow-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Share Route to Crew
                      </button>
                    </div>

                    {/* Drag-alike Up/Down List */}
                    <div className="space-y-2">
                      {appointments
                        .filter((a) => a.date === filterDate && a.status === 'Scheduled')
                        .sort((a, b) => {
                          const seqA = a.routeSequence !== undefined ? a.routeSequence : 9999;
                          const seqB = b.routeSequence !== undefined ? b.routeSequence : 9999;
                          if (seqA !== seqB) return seqA - seqB;
                          const idxA = TIMESLOTS.indexOf(a.timeslot);
                          const idxB = TIMESLOTS.indexOf(b.timeslot);
                          return idxA - idxB;
                        })
                        .map((appt, idx, arr) => (
                          <div
                            key={appt.id}
                            className="bg-white dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-200 dark:hover:border-blue-900/50 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              {/* Stop number badge */}
                              <div className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="text-xs">
                                <h4 className="font-bold text-slate-850 dark:text-slate-200 leading-tight">
                                  {appt.customerName}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                                  📍 {appt.area === 'Other' ? (appt.otherAreaText || 'Other') : appt.area} • 🕒 {appt.timeslot}
                                </p>
                                <p className="text-[9px] text-slate-400 font-medium">
                                  💧 {appt.numTanks} Tank(s) • {appt.tankCapacity}L
                                </p>
                              </div>
                            </div>

                            {/* Arrow sequencing buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleMoveRouteItem(appt.id, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveRouteItem(appt.id, 'down')}
                                disabled={idx === arr.length - 1}
                                className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appointments List */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                Booked Periods ({filteredAppointments.length})
              </h3>

              {filteredAppointments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">
                    No appointments scheduled for this period.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Toggle your filters or book a new appointment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAppointments.map((appt) => {
                    const isOverdue =
                      appt.status === 'Scheduled' &&
                      appt.date < getTodayDateString();

                    return (
                      <div
                        key={appt.id}
                        className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-sm flex flex-col justify-between transition-all relative ${
                          appt.status === 'Completed'
                            ? 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5'
                            : appt.status === 'Cancelled'
                            ? 'border-slate-100 dark:border-slate-850 opacity-60'
                            : isOverdue
                            ? 'border-amber-200 dark:border-amber-950 bg-amber-50/10 dark:bg-amber-950/5'
                            : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
                        }`}
                      >
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                          {appt.routeSequence !== undefined && appt.status === 'Scheduled' && useDateFilter && (
                            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-blue-600 text-white shadow-xs flex items-center gap-0.5 tracking-wider">
                              Stop #{appt.routeSequence}
                            </span>
                          )}
                          {appt.status === 'Scheduled' && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                              isOverdue
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200/50'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200/50'
                            }`}>
                              {isOverdue ? 'Overdue Service' : 'Scheduled'}
                            </span>
                          )}
                          {appt.status === 'Completed' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950 text-emerald-850 dark:text-emerald-300 border border-emerald-200/50 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Completed & Logged
                            </span>
                          )}
                          {appt.status === 'Cancelled' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/40">
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Customer Details */}
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-blue-500 dark:text-blue-400">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-extrabold tracking-wider leading-none">
                                {appt.date}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                                {appt.timeslot}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-50 dark:border-slate-800/80 space-y-1.5 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {appt.customerName}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a href={`tel:${appt.customerPhone}`} className="hover:text-blue-500 hover:underline cursor-pointer" title="Click to call directly">
                                {appt.customerPhone}
                              </a>
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-normal">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <span>
                                {appt.customerAddress}
                                <strong className="text-slate-700 dark:text-slate-300 ml-1">
                                  ({appt.area === 'Other' ? (appt.otherAreaText || 'Other') : appt.area})
                                </strong>
                              </span>
                            </p>
                            {appt.googleLocation && (
                              <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 leading-normal">
                                <Compass className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-pulse" />
                                <a
                                  href={appt.googleLocation.startsWith('http') ? appt.googleLocation : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.googleLocation)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-500 hover:underline font-bold"
                                >
                                  Open Google Maps Location
                                </a>
                              </p>
                            )}
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/60 font-semibold">
                              💧 {appt.numTanks} Tank(s) • {appt.tankCapacity} Liters Capacity
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              Staff: <strong className="text-slate-700 dark:text-slate-300">{appt.staffAssigned.join(', ')}</strong>
                            </p>
                            {appt.notes && (
                              <p className="text-[10px] italic text-slate-400 dark:text-slate-500 bg-amber-500/5 px-2 py-1.5 rounded-lg border border-amber-500/10">
                                Note: "{appt.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-1.5">
                          <div className="flex flex-wrap gap-1">
                            {/* Call button */}
                            <a
                              href={`tel:${appt.customerPhone}`}
                              title="Call Client directly"
                              className="p-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-bold"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                              Call
                            </a>

                            {/* WhatsApp share */}
                            <button
                              onClick={() => triggerWhatsAppShare(appt)}
                              title="Send WhatsApp Reminder"
                              className="p-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-bold"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-500" />
                              Remind
                            </button>

                            {/* Edit Button */}
                            {appt.status !== 'Completed' && (
                              <button
                                onClick={() => handleEditClick(appt)}
                                title="Edit booked slot details"
                                className="p-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] font-bold"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-500" />
                                Edit
                              </button>
                            )}

                            {appt.status === 'Scheduled' && (
                              <button
                                onClick={() => onUpdateStatus(appt.id, 'Cancelled')}
                                title="Cancel appointment"
                                className="p-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-100 rounded-xl transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold"
                              >
                                Cancel
                              </button>
                            )}
                            {appt.status === 'Cancelled' && (
                              <button
                                onClick={() => onUpdateStatus(appt.id, 'Scheduled')}
                                title="Reschedule appointment"
                                className="p-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-blue-500 rounded-xl transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold"
                              >
                                Restore
                              </button>
                            )}
                          </div>

                          <div className="flex gap-1 items-center">
                            {appt.status === 'Scheduled' && (
                              <button
                                onClick={() => handleStartChecklist(appt)}
                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md shadow-emerald-100 dark:shadow-none transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Complete & Log Job
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Delete Appointment',
                                  message: 'Delete this appointment record entirely? This cannot be undone.',
                                  onConfirm: () => {
                                    setConfirmDialog(null);
                                    onDeleteAppointment(appt.id);
                                  }
                                });
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                              title="Delete Appointment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="book-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-50 dark:border-slate-800 pb-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                {editingAppointmentId ? 'Modify Appointment Booking' : 'New Appointment Booking'}
              </h3>

              <CollapsibleSection title="Date & Time" icon={<Clock className="w-4 h-4 text-blue-500" />} defaultOpen={true}>
              {/* Occupied Time Warning Box */}
              {occupiedBooking && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-600 dark:text-amber-400">Timeslot Unavailable!</h4>
                    <p className="mt-0.5 text-[11px] font-semibold">
                      This date and timeslot is already booked for *{occupiedBooking.customerName}* (<a href={`tel:${occupiedBooking.customerPhone}`} className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800">{occupiedBooking.customerPhone}</a>).
                      Please choose a different period or double-book with caution.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Selection */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  />
                </div>

                {/* Timeslot Selection */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={timeslot}
                    onChange={(e) => setTimeslot(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {TIMESLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              </CollapsibleSection>
              <CollapsibleSection title="Client Details" icon={<User className="w-4 h-4 text-emerald-500" />}>
              {/* Customer Autocomplete Section */}
              <div className="space-y-1 relative">
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  Customer Name *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Type name to search or enter new customer"
                    value={customerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => { if (customerName.trim()) setShowSuggestions(true); }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    id="appt-cust-name"
                  />
                </div>

                {/* Autocomplete List overlay */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-800"
                    >
                      {suggestions.map((s) => (
                        <li
                          key={s.name}
                          onClick={() => selectSuggestion(s)}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{s.name}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{s.phone} • {s.area}</span>
                          </div>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Phone */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Customer Phone Number *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      placeholder="e.g. 9629335542"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                      id="appt-cust-phone"
                    />
                  </div>
                </div>

                {/* Area Dropdown */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Service Area Location *
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    id="appt-cust-area"
                  >
                    {(settings?.serviceAreas || ['Erode', 'Gobichettipalayam', 'Punjai Puliambatti']).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
              <option value="Other">Other Area</option>
                  </select>
                </div>
              </div>

              {/* Other Area specification if 'Other' selected */}
              {area === 'Other' && (
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Specify Area Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter area or village name"
                    value={otherAreaText}
                    onChange={(e) => setOtherAreaText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              {/* Address */}
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  Full Customer Address *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-start pl-3 pt-3.5 text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter street name, door number, landmarks..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 leading-normal"
                    id="appt-cust-address"
                  />
                </div>
              </div>

              {/* Site Location (Optional) */}
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  Site Location / Google Maps Link <span className="text-[9px] font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Compass className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. https://maps.app.goo.gl/... or Lat, Lng coordinates"
                    value={googleLocation}
                    onChange={(e) => setGoogleLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 leading-normal"
                    id="appt-google-location"
                  />
                </div>
              </div>

              
              
              </CollapsibleSection>
              <CollapsibleSection title="Service Specifications" icon={<Database className="w-4 h-4 text-purple-500" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tank Capacity */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Tank Capacity (Liters)
                  </label>
                  <div className="space-y-2">
                    <select
                      value={isCustomCapacity ? 'custom' : tankCapacity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomCapacity(true);
                          setTankCapacity('');
                        } else {
                          setIsCustomCapacity(false);
                          setTankCapacity(Number(val) || '');
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value={1000}>1000 Liters (0-1000)</option>
                      <option value={3000}>3000 Liters (1001-3000)</option>
                      <option value={5000}>5000 Liters (3001-5000)</option>
                      <option value={7500}>7500 Liters (5001-7500)</option>
                      <option value={10000}>10000 Liters (7501-10000)</option>
                      <option value={15000}>15000 Liters (10001-15000)</option>
                      <option value={20000}>20000 Liters (15001-20000)</option>
                      <option value={30000}>30000 Liters (20001-30000)</option>
                      <option value="custom">Custom Liters...</option>
                    </select>

                    {isCustomCapacity && (
                      <div className="relative">
                        <input
                          type="number"
                          value={tankCapacity || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTankCapacity(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                          }}
                          placeholder="Enter custom liters"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                          min={1}
                          required
                        />
                        <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-bold">Liters</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Number of Tanks */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    Number of Tanks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={numTanks}
                    onChange={(e) => setNumTanks(Number(e.target.value) || '')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Staff assigned */}
              <div>
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Staff Assigned *
                </label>
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                  {ALL_STAFF.map((staff) => {
                    const isAvailable = getAvailableStaff(date).includes(staff);
                    return (
                    <label
                      key={staff}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold select-none transition-all ${
                        !isAvailable
                          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                          : staffAssigned.includes(staff)
                            ? 'bg-blue-500 border-blue-500 text-white shadow-xs shadow-blue-100 cursor-pointer'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                      }`}
                      id={`appt-staff-label-${staff.toLowerCase()}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isAvailable}
                        checked={staffAssigned.includes(staff)}
                        onChange={() => isAvailable && handleStaffToggle(staff)}
                        className="sr-only"
                      />
                      <Check className={`w-3.5 h-3.5 ${staffAssigned.includes(staff) ? 'opacity-100' : 'opacity-20'}`} />
                      {staff}
                      {!isAvailable && <span className="ml-auto text-[8px] uppercase tracking-wider">Absent</span>}
                    </label>
                  )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. customer prefers morning service, needs chlorine tables"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Franchise Referral Toggle */}
              <div>
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  Franchise Referral
                </label>
                <div className="flex items-center h-10">
                  <button
                    type="button"
                    onClick={() => setIsFranchiseReferral(!isFranchiseReferral)}
                    className={`w-full py-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer select-none ${
                      isFranchiseReferral
                        ? 'bg-purple-500 border-purple-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    id="appt-franchise-toggle"
                  >
                    {isFranchiseReferral ? 'YES (10% Royalty)' : 'NO'}
                  </button>
                </div>
              </div>

              
              </CollapsibleSection>
              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setSubTab('schedule');
                  }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-100 dark:shadow-none transition-all cursor-pointer"
                >
                  {editingAppointmentId ? 'Save Changes' : 'Book Period Slot'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality SOP Checklist Modal */}
      <AnimatePresence>
        {activeChecklistAppt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="sop-checklist-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
                <button
                  onClick={() => setActiveChecklistAppt(null)}
                  className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight">SOP Quality Standards Check</h3>
                    <p className="text-white/80 text-[11px] font-semibold mt-0.5">Tankro Erode Professional Protocol</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="bg-blue-50/50 dark:bg-slate-950 p-4 rounded-2xl border border-blue-100 dark:border-slate-850 space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Verifying Cleaning for {activeChecklistAppt.customerName}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    📍 {activeChecklistAppt.area === 'Other' ? (activeChecklistAppt.otherAreaText || 'Other') : activeChecklistAppt.area} • 🏠 {activeChecklistAppt.customerAddress}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Execution Steps (6/6 Required)
                  </span>
                  <div className="space-y-2.5">
                    {STANDARD_CHECKLIST_STEPS.map((step) => {
                      const isChecked = !!checklistItems[step];
                      return (
                        <div
                          key={step}
                          onClick={() => handleToggleChecklistStep(step)}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-emerald-50/40 border-emerald-200 dark:border-emerald-950 dark:bg-emerald-950/5 text-emerald-850 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-150 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[4]" />
                          </div>
                          <div className="text-xs leading-tight">
                            <span className="font-bold block">{step}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Checklist shortcuts */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleCheckAllSteps}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Complete All Checklist Steps
                  </button>
                </div>

                {/* Before / After Photo Section in SOP Checklist */}
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3 mt-4" id="sop-checklist-photos">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      📸 Service Photo Proof (Before vs After)
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Required Proof
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    Attach before and after photo proofs of the cleaning service for each tank to verify quality.
                  </p>

                  <div className="space-y-3">
                    {Array.from({ length: Number(activeChecklistAppt?.numTanks) || 1 }).map((_, idx) => {
                      const beforeImg = apptPhotosBefore[idx] || '';
                      const afterImg = apptPhotosAfter[idx] || '';
                      return (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-150 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            🛢️ Tank {idx + 1}
                          </span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* BEFORE PHOTO */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Before Cleaning</span>
                              <div className="relative aspect-4/3 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center p-2 group">
                                {beforeImg ? (
                                  <>
                                    <img
                                      src={beforeImg}
                                      alt={`Tank ${idx + 1} Before`}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...apptPhotosBefore];
                                        updated[idx] = '';
                                        setApptPhotosBefore(updated);
                                      }}
                                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500">
                                    <Camera className="w-5 h-5 text-red-400" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-center">Capture/Upload</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const r = new FileReader();
                                          r.onloadend = async () => {
                                            if (typeof r.result === 'string') {
                                              const compressed = await compressImage(r.result);
                                              const updated = [...apptPhotosBefore];
                                              updated[idx] = compressed;
                                              setApptPhotosBefore(updated);
                                            }
                                          };
                                          r.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            </div>

                            {/* AFTER PHOTO */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">After Cleaning</span>
                              <div className="relative aspect-4/3 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center p-2 group">
                                {afterImg ? (
                                  <>
                                    <img
                                      src={afterImg}
                                      alt={`Tank ${idx + 1} After`}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...apptPhotosAfter];
                                        updated[idx] = '';
                                        setApptPhotosAfter(updated);
                                      }}
                                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500">
                                    <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-center">Capture/Upload</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const r = new FileReader();
                                          r.onloadend = async () => {
                                            if (typeof r.result === 'string') {
                                              const compressed = await compressImage(r.result);
                                              const updated = [...apptPhotosAfter];
                                              updated[idx] = compressed;
                                              setApptPhotosAfter(updated);
                                            }
                                          };
                                          r.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex gap-3">
                <button
                  onClick={() => setActiveChecklistAppt(null)}
                  className="flex-1 py-3 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitChecklist}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-100 dark:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Proceed to Billing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-150 dark:border-slate-800 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal px-2">
                  {confirmDialog.message}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-amber-100 dark:shadow-none transition-all cursor-pointer"
                >
                  Yes, Proceed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
