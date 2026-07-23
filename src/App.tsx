/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Calendar,
  User,
  LogOut,
  TrendingUp,
  PlusCircle,
  Database,
  Users,
  UserCheck,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  Wallet,
  Settings,
  HelpCircle,
  CheckCircle2,
  ListFilter,
  Info,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  Sun,
  Moon,
  History
} from 'lucide-react';

import { Job, Expense, DailyAttendance, AppSettings, Appointment, ActivityLog } from './types';
import {
  SAMPLE_JOBS,
  SAMPLE_EXPENSES,
  SAMPLE_ATTENDANCE,
  DEFAULT_SETTINGS,
  formatInRupees,
  getTodayDateString,
  getDaysRemaining,
  addMonths
} from './utils';

import { db } from './lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import Logo from './components/Logo';

// Helper to safely write to localStorage without throwing QuotaExceededError (e.g. when base64 image data exceeds 5MB limit)
const safeLocalStorageSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Local storage write failed for key "${key}":`, error);
  }
};

// Import Child Components
import OwnerSelector from './components/OwnerSelector';
import JobForm from './components/JobForm';
import ExpenseForm from './components/ExpenseForm';
import AttendanceModule from './components/AttendanceModule';
import CustomerHistory from './components/CustomerHistory';
import SubscriptionList from './components/SubscriptionList';
import RecordsPage from './components/RecordsPage';
import ReportsPage from './components/ReportsPage';
import InvoiceModal from './components/InvoiceModal';
import AppointmentsModule from './components/AppointmentsModule';
import ActivityLogPage from './components/ActivityLogPage';

export default function App() {
  // Theme State & Persistent Low-Light Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
    safeLocalStorageSetItem('theme', theme);
  }, [theme]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'records' | 'crm' | 'attendance' | 'appointments' | 'history'>('dashboard');
  const [logSubTab, setLogSubTab] = useState<'job' | 'expense'>('job');
  const [crmSubTab, setCrmSubTab] = useState<'customers' | 'subscriptions'>('customers');
  const [recordsSubTab, setRecordsSubTab] = useState<'jobs' | 'expenses'>('jobs');

  // Core App Data States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Active Interactive/Modals State
  const [selectedInvoiceJob, setSelectedInvoiceJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Toast notifications & custom confirm state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Live Offline & Sync States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingWriteCollections, setPendingWriteCollections] = useState<Record<string, boolean>>({
    jobs: false,
    expenses: false,
    attendance: false,
    customerNotes: false,
    appointments: false,
    settings: false,
  });
  const [showSyncStatusModal, setShowSyncStatusModal] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: 'success' | 'error' | 'info' }>;
      if (customEvent.detail) {
        const msg = customEvent.detail.message || '';
        let type: 'success' | 'error' | 'info' = 'success';
        if (
          msg.toLowerCase().includes('denied') ||
          msg.toLowerCase().includes('authorized') ||
          msg.toLowerCase().includes('please enter') ||
          msg.toLowerCase().includes('invalid') ||
          msg.toLowerCase().includes('error')
        ) {
          type = 'error';
        }
        setToast({ message: msg, type });
      }
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => {
      window.removeEventListener('show-toast', handleToastEvent);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load from local storage or initialize with sample data & Firebase subscriptions
  useEffect(() => {
    // 1. Initialize Settings synchronously from local storage (to avoid splash/flicker)
    const savedSettings = localStorage.getItem('tankro_settings');
    let initialSettings = DEFAULT_SETTINGS;
    if (savedSettings) {
      try {
        initialSettings = JSON.parse(savedSettings);
        setSettings(initialSettings);
      } catch (e) {
        console.error(e);
      }
    }

    // Load other states from local storage as offline fallback first
    const savedJobs = localStorage.getItem('tankro_jobs');
    const savedExpenses = localStorage.getItem('tankro_expenses');
    const savedAttendance = localStorage.getItem('tankro_attendance');
    const savedNotes = localStorage.getItem('tankro_customer_notes');
    const savedAppointments = localStorage.getItem('tankro_appointments');

    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedAttendance) setAttendanceRecords(JSON.parse(savedAttendance));
    if (savedNotes) setCustomerNotes(JSON.parse(savedNotes));
    if (savedAppointments) setAppointments(JSON.parse(savedAppointments));

    // 2. Setup real-time Firebase subscriptions
    const unsubscribeJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      setPendingWriteCollections(prev => ({ ...prev, jobs: snapshot.metadata.hasPendingWrites }));
      const items: Job[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Job);
      });
      // Sort: newest first
      items.sort((a, b) => b.id.localeCompare(a.id));

      setJobs(items);
      safeLocalStorageSetItem('tankro_jobs', JSON.stringify(items));
    }, (error) => {
      console.error("Error listening to jobs:", error);
    });

    const unsubscribeExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      setPendingWriteCollections(prev => ({ ...prev, expenses: snapshot.metadata.hasPendingWrites }));
      const items: Expense[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Expense);
      });
      items.sort((a, b) => b.id.localeCompare(a.id));

      setExpenses(items);
      safeLocalStorageSetItem('tankro_expenses', JSON.stringify(items));
    }, (error) => {
      console.error("Error listening to expenses:", error);
    });

    const unsubscribeAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      setPendingWriteCollections(prev => ({ ...prev, attendance: snapshot.metadata.hasPendingWrites }));
      const items: DailyAttendance[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as DailyAttendance);
      });
      items.sort((a, b) => b.date.localeCompare(a.date));

      setAttendanceRecords(items);
      safeLocalStorageSetItem('tankro_attendance', JSON.stringify(items));
    }, (error) => {
      console.error("Error listening to attendance:", error);
    });

    const unsubscribeCustomerNotes = onSnapshot(collection(db, 'customerNotes'), (snapshot) => {
      setPendingWriteCollections(prev => ({ ...prev, customerNotes: snapshot.metadata.hasPendingWrites }));
      const notesDict: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        notesDict[doc.id] = data.text || '';
      });

      setCustomerNotes(notesDict);
      safeLocalStorageSetItem('tankro_customer_notes', JSON.stringify(notesDict));
    }, (error) => {
      console.error("Error listening to customer notes:", error);
    });

    const unsubscribeAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      setPendingWriteCollections(prev => ({ ...prev, appointments: snapshot.metadata.hasPendingWrites }));
      const items: Appointment[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Appointment);
      });
      // Sort: date ascending, then timeslot
      items.sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.timeslot.localeCompare(b.timeslot);
      });

      setAppointments(items);
      safeLocalStorageSetItem('tankro_appointments', JSON.stringify(items));
    }, (error) => {
      console.error("Error listening to appointments:", error);
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'activityLogs'), (snapshot) => {
      const items: ActivityLog[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as ActivityLog);
      });
      // Sort: timestamp descending
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogs(items);
    }, (error) => {
      console.error("Error listening to activity logs:", error);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'wages'), (docSnap) => {
      setPendingWriteCollections(prev => ({ ...prev, settings: docSnap.metadata.hasPendingWrites }));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings((prev) => {
          // Explicitly omit session state from incoming Firestore data
          const { currentOwner, currentUserRole, seeded, ...cleanData } = data;
          
          const merged = {
            ...prev,
            ...cleanData
          };
          safeLocalStorageSetItem('tankro_settings', JSON.stringify(merged));
          return merged;
        });
      } else {
        // Seed only when settings/wages is completely missing (meaning brand new Firestore database)
        const defaultWages = initialSettings.dailyWages || DEFAULT_SETTINGS.dailyWages;
        setDoc(doc(db, 'settings', 'wages'), { dailyWages: defaultWages, seeded: true }).catch(err => console.error(err));

        // Seed other collections
        SAMPLE_JOBS.forEach((j: Job) => {
          setDoc(doc(db, 'jobs', j.id), j).catch(err => console.error(err));
        });
        SAMPLE_EXPENSES.forEach((e: Expense) => {
          setDoc(doc(db, 'expenses', e.id), e).catch(err => console.error(err));
        });
        SAMPLE_ATTENDANCE.forEach((a: DailyAttendance) => {
          setDoc(doc(db, 'attendance', a.id), a).catch(err => console.error(err));
        });
        const startingNotes = {
          'Karthik Raja||9842512345': 'sump is near back gate, prefers morning service',
          'Senthil Kumar||9786432101': 'has 2 tanks on rooftop, ladder needed',
          'Anitha Srinivasan||9443212345': 'very friendly customer, has active borewell',
        };
        Object.entries(startingNotes).forEach(([key, val]) => {
          setDoc(doc(db, 'customerNotes', key), { id: key, text: val }).catch(err => console.error(err));
        });
      }
    }, (error) => {
      console.error("Error listening to settings:", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeExpenses();
      unsubscribeAttendance();
      unsubscribeCustomerNotes();
      unsubscribeAppointments();
      unsubscribeLogs();
      unsubscribeSettings();
    };
  }, []);

  // Sync state helpers (with local cache + remote firestore updates)
  const saveJobsToStore = (updatedJobs: Job[]) => {
    setJobs(updatedJobs);
    safeLocalStorageSetItem('tankro_jobs', JSON.stringify(updatedJobs));
  };

  const saveExpensesToStore = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    safeLocalStorageSetItem('tankro_expenses', JSON.stringify(updatedExpenses));
  };

  const saveAttendanceToStore = (updatedAttendance: DailyAttendance[]) => {
    setAttendanceRecords(updatedAttendance);
    safeLocalStorageSetItem('tankro_attendance', JSON.stringify(updatedAttendance));
  };

  const saveCustomerNotesToStore = (key: string, notes: string) => {
    const updatedNotes = { ...customerNotes, [key]: notes };
    setCustomerNotes(updatedNotes);
    safeLocalStorageSetItem('tankro_customer_notes', JSON.stringify(updatedNotes));
    setDoc(doc(db, 'customerNotes', key), { id: key, text: notes }).catch(err => console.error(err));
  };

  const logActivity = (action: string, details: string) => {
    if (!settings.currentOwner) return;
    const logRef = doc(collection(db, 'activityLogs'));
    const logData: ActivityLog = {
      id: logRef.id,
      timestamp: new Date().toISOString(),
      user: settings.currentOwner,
      action,
      details,
    };
    setDoc(logRef, logData).catch(err => console.error("Error logging activity", err));
  };

  const handleClearLogs = async () => {
    try {
      for (const log of activityLogs) {
        await deleteDoc(doc(db, 'activityLogs', log.id));
      }
      alert('Logs cleared successfully');
    } catch (err) {
      console.error('Error clearing logs', err);
      alert('Failed to clear logs');
    }
  };

  const saveSettingsToStore = (newSettings: AppSettings) => {
    setSettings(newSettings);
    safeLocalStorageSetItem('tankro_settings', JSON.stringify(newSettings));
    
    // Omit session data from Firestore sync
    const { currentOwner, currentUserRole, ...firestoreSettings } = newSettings;
    setDoc(doc(db, 'settings', 'wages'), firestoreSettings, { merge: true }).catch(err => console.error(err));
    logActivity('Updated Settings', `System settings updated`);
  };

  // Owner Selection handler
  const handleSelectUser = (owner: 'Yuvaraj' | 'Nadeem' | 'Akram', role: 'Owner' | 'Manager') => {
    const updated = { ...settings, currentOwner: owner, currentUserRole: role };
    saveSettingsToStore(updated);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    const updated = { ...settings, currentOwner: null as any, currentUserRole: null as any };
    saveSettingsToStore(updated);
    setShowLogoutConfirm(false);
  };

  // APPOINTMENT MANAGEMENT CRUD
  const handleAddAppointment = (appt: Appointment) => {
    const updated = [appt, ...appointments];
    setAppointments(updated);
    safeLocalStorageSetItem('tankro_appointments', JSON.stringify(updated));
    setDoc(doc(db, 'appointments', appt.id), appt).catch(err => console.error(err));
    logActivity('Added Appointment', `Appointment booked for ${appt.customerName}`);
  };

  const handleUpdateAppointmentStatus = (id: string, status: 'Scheduled' | 'Completed' | 'Cancelled') => {
    const updated = appointments.map((a) => (a.id === id ? { ...a, status } : a));
    setAppointments(updated);
    safeLocalStorageSetItem('tankro_appointments', JSON.stringify(updated));
    setDoc(doc(db, 'appointments', id), { status }, { merge: true }).catch(err => console.error(err));
    const appt = appointments.find(a => a.id === id);
    logActivity('Updated Appointment Status', `Appointment status for ${appt?.customerName || id} changed to ${status}`);
  };

  const handleUpdateAppointmentFields = (id: string, fields: Partial<Appointment>) => {
    const updated = appointments.map((a) => (a.id === id ? { ...a, ...fields } : a));
    setAppointments(updated);
    safeLocalStorageSetItem('tankro_appointments', JSON.stringify(updated));
    setDoc(doc(db, 'appointments', id), fields, { merge: true }).catch(err => console.error(err));
    const appt = appointments.find(a => a.id === id);
    logActivity('Updated Appointment Details', `Updated details for appointment ${appt?.customerName || id}`);
  };

  const handleDeleteAppointment = (id: string) => {
    const updated = appointments.filter((a) => a.id !== id);
    setAppointments(updated);
    safeLocalStorageSetItem('tankro_appointments', JSON.stringify(updated));
    deleteDoc(doc(db, 'appointments', id)).catch(err => console.error(err));
    const appt = appointments.find(a => a.id === id);
    logActivity('Deleted Appointment', `Appointment for ${appt?.customerName || id} deleted`);
  };

  const handleCompleteAndLogAppointment = (appt: Appointment) => {
    logActivity('Completed Appointment', `Marked appointment for ${appt.customerName} as completed and logged as job`);
    // Construct a pre-filled partial job
    const prefilledJob: Partial<Job> & { id: string } = {
      id: `TEMP-${Date.now()}`,
      date: appt.date,
      customerName: appt.customerName,
      customerPhone: appt.customerPhone,
      customerAddress: appt.customerAddress,
      area: appt.area,
      otherAreaText: appt.otherAreaText,
      tankCapacity: appt.tankCapacity,
      numTanks: appt.numTanks,
      staffAssigned: appt.staffAssigned,
      jobType: 'One-Time',
      gstApplicable: false,
      paymentStatus: 'Paid',
      paymentMode: 'UPI',
      notes: appt.notes || '',
      googleLocation: appt.googleLocation,
      photoBefore: appt.photoBefore,
      photoAfter: appt.photoAfter,
      photosBefore: appt.photosBefore,
      photosAfter: appt.photosAfter,
      subtotal: 0,
      gstAmount: 0,
      grandTotal: 0,
      qualityChecklist: appt.qualityChecklist || [],
    };

    setEditingJob(prefilledJob as Job);
    setActiveTab('add-job');

    // Automatically update appointment status to Completed in the DB
    handleUpdateAppointmentStatus(appt.id, 'Completed');
  };

  // JOB MANAGEMENT CRUD
  const handleAddJob = (job: Job) => {
    const updated = [job, ...jobs];
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', job.id), job).catch(err => console.error(err));
    // Show invoice instantly for convenience!
    setSelectedInvoiceJob(job);
    setRecordsSubTab('jobs');
    // Notify success
    alert('Job successfully registered!');
    logActivity('Added Job', `Job #${job.id.slice(-5)} for ${job.customerName}`);
  };

  const handleEditJobComplete = (updatedJob: Job) => {
    const updated = jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j));
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', updatedJob.id), updatedJob).catch(err => console.error(err));
    setEditingJob(null);
    alert('Job updated successfully!');
    setRecordsSubTab('jobs');
    setActiveTab('records');
    logActivity('Updated Job', `Job #${updatedJob.id.slice(-5)} updated`);
  };

  const handleDeleteJob = (jobId: string) => {
    const updated = jobs.filter((j) => j.id !== jobId);
    saveJobsToStore(updated);
    deleteDoc(doc(db, 'jobs', jobId)).catch(err => console.error(err));
    alert('Job record successfully deleted!');
    logActivity('Deleted Job', `Job #${jobId.slice(-5)} deleted`);
  };

  const handleMarkJobAsPaid = (jobId: string) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, paymentStatus: 'Paid' as const } : j));
    saveJobsToStore(updated);
    const targetJob = jobs.find((j) => j.id === jobId);
    if (targetJob) {
      setDoc(doc(db, 'jobs', jobId), { ...targetJob, paymentStatus: 'Paid' as const }).catch(err => console.error(err));
    }
    alert('Payment marked as Paid!');
    logActivity('Marked Job Paid', `Job #${jobId.slice(-5)} marked as Paid`);
  };

  const handleMarkAllRoyaltyPaid = (jobIds: string[]) => {
    if (jobIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to mark ${jobIds.length} jobs as franchise royalty paid?`)) return;

    const updated = jobs.map((j) => (jobIds.includes(j.id) ? { ...j, isFranchiseRoyaltyPaid: true } : j));
    saveJobsToStore(updated);
    
    jobIds.forEach(id => {
      const targetJob = jobs.find((j) => j.id === id);
      if (targetJob) {
        setDoc(doc(db, 'jobs', id), { ...targetJob, isFranchiseRoyaltyPaid: true }).catch(err => console.error(err));
      }
    });

    alert('Franchise royalties marked as paid!');
    logActivity('Marked All Royalty Paid', `${jobIds.length} jobs marked as royalty paid`);
  };

  // EXPENSE MANAGEMENT CRUD
  const handleAddExpense = (expense: Expense) => {
    const updated = [expense, ...expenses];
    saveExpensesToStore(updated);
    setDoc(doc(db, 'expenses', expense.id), expense).catch(err => console.error(err));
    alert('Expense successfully logged!');
    setRecordsSubTab('expenses');
    setActiveTab('records');
    logActivity('Added Expense', `Expense of ₹${expense.amount} for ${expense.category}`);
  };

  const handleEditExpenseComplete = (updatedExpense: Expense) => {
    const updated = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    saveExpensesToStore(updated);
    setDoc(doc(db, 'expenses', updatedExpense.id), updatedExpense).catch(err => console.error(err));
    setEditingExpense(null);
    alert('Expense updated successfully!');
    setRecordsSubTab('expenses');
    setActiveTab('records');
    logActivity('Updated Expense', `Expense #${updatedExpense.id.slice(-5)} updated`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = expenses.filter((e) => e.id !== expenseId);
    saveExpensesToStore(updated);
    deleteDoc(doc(db, 'expenses', expenseId)).catch(err => console.error(err));
    alert('Expense successfully deleted!');
    logActivity('Deleted Expense', `Expense #${expenseId.slice(-5)} deleted`);
  };

  // ATTENDANCE SAVER
  const handleSaveAttendance = (dailyRecord: DailyAttendance) => {
    const existingIdx = attendanceRecords.findIndex((r) => r.date === dailyRecord.date);
    let updated: DailyAttendance[] = [];
    if (existingIdx >= 0) {
      updated = [...attendanceRecords];
      updated[existingIdx] = dailyRecord;
    } else {
      updated = [dailyRecord, ...attendanceRecords];
    }
    saveAttendanceToStore(updated);
    setDoc(doc(db, 'attendance', dailyRecord.id), dailyRecord).catch(err => console.error(err));
    logActivity('Saved Attendance', `Attendance saved for ${dailyRecord.date}`);
  };

  // TRACE ACTIVE SUBSCRIPTIONS & OVERDUES (Alert Card logic)
  const todayStr = getTodayDateString();
  const getSubscriptionAlerts = () => {
    const subMap: Record<string, Job> = {};
    jobs.forEach((j) => {
      if (j.jobType === 'Subscription' && j.nextServiceDueDate) {
        const key = `${j.customerName.trim()}||${j.customerPhone.trim()}`;
        const existing = subMap[key];
        if (!existing || new Date(j.date) > new Date(existing.date)) {
          subMap[key] = j;
        }
      }
    });

    const activeSubs = Object.values(subMap);
    const overdueCount = activeSubs.filter((s) => getDaysRemaining(s.nextServiceDueDate!) < 0).length;
    const dueSoonCount = activeSubs.filter((s) => {
      const rem = getDaysRemaining(s.nextServiceDueDate!);
      return rem >= 0 && rem <= 7;
    }).length;

    return {
      overdueCount,
      dueSoonCount,
      totalAlerts: overdueCount + dueSoonCount,
    };
  };

  const subAlerts = getSubscriptionAlerts();

  // DASHBOARD MATH COMPUTATIONS
  const getDashboardStats = () => {
    const todayStr = getTodayDateString();

    // Today's numbers
    const todayJobs = jobs.filter((j) => j.date === todayStr);
    const todayExpenses = expenses.filter((e) => e.date === todayStr);

    const todayRev = todayJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const todayExp = todayExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const todayRoyalty = todayJobs.reduce((sum, curr) => sum + (curr.isFranchiseReferral ? curr.subtotal * 0.1 : 0), 0);
    const todayProfit = todayRev - todayExp - todayRoyalty;
    const todayJobsCompleted = todayJobs.length;

    // Weekly numbers (Current ISO week starting Monday)
    const today = new Date();
    const day = today.getDay();
    const mondayDiff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(mondayDiff));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekJobs = jobs.filter((j) => {
      const jd = new Date(j.date);
      jd.setHours(0, 0, 0, 0);
      return jd >= startOfWeek && jd <= new Date();
    });
    const weekExpenses = expenses.filter((e) => {
      const ed = new Date(e.date);
      ed.setHours(0, 0, 0, 0);
      return ed >= startOfWeek && ed <= new Date();
    });

    const weekRev = weekJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const weekExp = weekExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const weekRoyalty = weekJobs.reduce((sum, curr) => sum + (curr.isFranchiseReferral ? curr.subtotal * 0.1 : 0), 0);
    const weekProfit = weekRev - weekExp - weekRoyalty;

    // Monthly numbers
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthJobs = jobs.filter((j) => {
      const jd = new Date(j.date);
      return jd >= startOfMonth && jd <= new Date();
    });
    const monthExpenses = expenses.filter((e) => {
      const ed = new Date(e.date);
      return ed >= startOfMonth && ed <= new Date();
    });

    const monthRev = monthJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const monthExp = monthExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const monthRoyalty = monthJobs.reduce((sum, curr) => sum + (curr.isFranchiseReferral ? curr.subtotal * 0.1 : 0), 0);
    const monthProfit = monthRev - monthExp - monthRoyalty;

    // Lifetime numbers
    const lifetimeRev = jobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const lifetimeExp = expenses.reduce((sum, curr) => sum + curr.amount, 0);
    const lifetimeRoyalty = jobs.reduce((sum, curr) => sum + (curr.isFranchiseReferral ? curr.subtotal * 0.1 : 0), 0);
    const lifetimeProfit = lifetimeRev - lifetimeExp - lifetimeRoyalty;

    // Pending counts
    const pendingCount = jobs.filter((j) => j.paymentStatus === 'Pending').length;

    return {
      lifetimeRev,
      lifetimeExp,
      lifetimeProfit,
      lifetimeRoyalty,
      lifetimeAvailable: lifetimeProfit + lifetimeRoyalty,
      todayRev,
      todayExp,
      todayProfit,
      todayRoyalty,
      todayAvailable: todayProfit + todayRoyalty,
      todayJobsCompleted,
      weekRev,
      weekExp,
      weekProfit,
      weekRoyalty,
      weekAvailable: weekProfit + weekRoyalty,
      monthRev,
      monthExp,
      monthProfit,
      monthRoyalty,
      monthAvailable: monthProfit + monthRoyalty,
      pendingCount,
    };
  };

  const stats = getDashboardStats();

  // EXPORT UTILITIES (CSV DOWNLOADERS)
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJobsCSV = () => {
    const headers = [
      'Job ID',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Area',
      'Capacity (L)',
      'Tanks Count',
      'Distance (KM)',
      'Staff Assigned',
      'Service Type',
      'Billing Subtotal',
      'GST (18%) Amount',
      'Grand Total Amount',
      'Payment Status',
      'Payment Mode',
      'Next Due Date',
      'Notes'
    ];
    const rows = jobs.map((j) => [
      j.id,
      j.date,
      `"${j.customerName.replace(/"/g, '""')}"`,
      j.customerPhone,
      `"${j.customerAddress.replace(/"/g, '""')}"`,
      j.area === 'Other' ? (j.otherAreaText || 'Other') : j.area,
      j.tankCapacity,
      j.numTanks,
      j.distance,
      j.staffAssigned.join(';'),
      j.jobType,
      j.subtotal,
      j.gstAmount,
      j.grandTotal,
      j.paymentStatus,
      j.paymentMode,
      j.nextServiceDueDate || 'N/A',
      j.notes ? `"${j.notes.replace(/"/g, '""')}"` : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Jobs_${getTodayDateString()}.csv`, csvContent);
  };

  const exportExpensesCSV = () => {
    const headers = ['Expense ID', 'Date', 'Category', 'Amount (₹)', 'Paid By', 'Notes'];
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      e.category,
      e.amount,
      e.paidBy,
      e.notes ? `"${e.notes.replace(/"/g, '""')}"` : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Expenses_${getTodayDateString()}.csv`, csvContent);
  };

  const exportAttendanceCSV = () => {
    const headers = ['Date', 'Althaf Status', 'Althaf Wage', 'Nafees Status', 'Nafees Wage', 'Akram Status', 'Akram Wage'];
    const rows = attendanceRecords.map((a) => [
      a.date,
      a.records.Althaf || 'Absent',
      a.wages.Althaf || 0,
      a.records.Nafees || 'Absent',
      a.wages.Nafees || 0,
      a.records.Akram || 'Absent',
      a.wages.Akram || 0
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Attendance_${getTodayDateString()}.csv`, csvContent);
  };

  // TRIGGER EDITING UTILITIES
  const triggerEditJob = (job: Job) => {
    setEditingJob(job);
    setActiveTab('add-job');
  };

  const triggerEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setActiveTab('add-expense');
  };

  const handleQuickLogSubscriptionJob = (completedJob: Job) => {
    // Inject and save this job in state
    const updated = [completedJob, ...jobs];
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', completedJob.id), completedJob).catch(err => console.error(err));
  };

  const isSyncing = Object.values(pendingWriteCollections).some(Boolean);

  const getSyncStatus = () => {
    if (!isOnline) {
      return {
        label: 'Offline',
        color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/60',
        badgeColor: 'bg-amber-500',
        icon: <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />,
        text: 'Working Offline',
        desc: 'All changes are safely stored locally on your device (IndexedDB & LocalStorage). They will automatically sync with the cloud database once you are reconnected to the internet.'
      };
    }
    if (isSyncing) {
      return {
        label: 'Syncing',
        color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/60',
        badgeColor: 'bg-blue-500',
        icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />,
        text: 'Syncing Updates',
        desc: 'Your internet connection is active, and changes are being synchronized with the secure Cloud Firestore database.'
      };
    }
    return {
      label: 'Synced',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60',
      badgeColor: 'bg-emerald-500',
      icon: <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      text: 'Connected & Synced',
      desc: 'All your records are securely synchronized with the Cloud Firestore database. Everything is safe and up-to-date!'
    };
  };

  const syncStatus = getSyncStatus();

  // If no owner is logged in yet, prompt selection
  if (!settings.currentOwner) {
    return <OwnerSelector onSelect={handleSelectUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans select-none pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-0" id="app-root-container">
      {/* Desktop Left Sidebar (Sleek Theme Layout Pattern) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 sticky top-0 h-screen z-40 print:hidden" id="desktop-sidebar">
        {/* Logo block */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-16 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shrink-0 p-0.5 shadow-sm">
            <Logo className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-blue-900 font-display block leading-none">Tankro Sathy</span>
            <span className="text-[10px] text-blue-600 font-bold mt-1 block">Tankro Sathy</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-4 space-y-1" id="desktop-nav-menu">
          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('dashboard');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-home"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('add-job');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'add-job'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-add-job"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Add New Job</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('add-expense');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'add-expense'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-add-expense"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('appointments');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-appointments"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Bookings & Schedule</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('records');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'records'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-records"
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Records Database</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('crm');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'crm'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-crm"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Client Profiles</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('appointments');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-appointments"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </button>

          {settings.currentUserRole === 'Owner' && (
            <button
              onClick={() => {
                setEditingJob(null);
                setEditingExpense(null);
                setActiveTab('attendance');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="desktop-nav-attendance"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Staff Attendance</span>
            </button>
          )}

          {settings.currentUserRole === 'Owner' && (
            <button
              onClick={() => {
                setEditingJob(null);
                setEditingExpense(null);
                setActiveTab('history');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="desktop-nav-history"
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Activity Log</span>
            </button>
          )}
        </nav>
        
        {/* Desktop Sidebar Footer */}
        <div className="mt-auto p-4 border-t border-slate-200 bg-white" id="desktop-sidebar-footer">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowSyncStatusModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 text-xs font-bold"
              id="desktop-status-btn"
            >
              <div className="relative">
                <Cloud className="w-4 h-4 shrink-0" />
                {pendingWriteCollections.all && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </div>
              <span className="flex-1 text-left">Sync Status</span>
              {pendingWriteCollections.all ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200 bg-slate-50 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              <span>Toggle Night Mode</span>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border border-red-100 bg-red-50 hover:bg-red-600 hover:border-red-600 text-red-600 hover:text-white text-xs font-bold group"
              id="desktop-logout-btn"
            >
              <LogOut className="w-4 h-4 shrink-0 group-hover:text-white transition-colors" />
              <span>Log Out User</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-20 md:pb-0" id="main-content-scroll">
        {/* Mobile Header */}
        <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md" id="mobile-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-white/20"><Logo className="w-full h-full object-contain" /></div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-tight">Tankro<br/><span className="text-blue-200 text-xs font-medium tracking-normal">Sathy</span></h1>
          </div>
          <div className="flex items-center gap-2">
            {pendingWriteCollections.all ? (
              <span className="text-[10px] font-bold text-blue-100 flex items-center gap-1 bg-blue-500/50 px-2 py-1 rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-100 flex items-center gap-1 bg-emerald-500/50 px-2 py-1 rounded-full">
                <Check className="w-3 h-3" /> Synced
              </span>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 bg-blue-500/50 hover:bg-blue-500 text-blue-50 rounded-xl"
              title="Toggle Night Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 bg-blue-500/50 hover:bg-blue-500 text-blue-50 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ReportsPage 
                  jobs={jobs} 
                  expenses={expenses} 
                  onMarkJobAsPaid={handleMarkJobAsPaid}
                  onMarkAllRoyaltyPaid={handleMarkAllRoyaltyPaid}
                  onViewInvoice={(job) => setSelectedInvoiceJob(job)}
                  settings={settings}
                  onNavigate={(tab) => { setEditingJob(null); setEditingExpense(null); setActiveTab(tab); }}
                />
              </motion.div>
            )}
            {activeTab === 'add-job' && (
              <motion.div key="add-job" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <JobForm 
                  onAddJob={handleAddJob} 
                  existingJobs={jobs}
                  attendanceRecords={attendanceRecords}
                  initialJobToEdit={editingJob} 
                  onEditComplete={(job) => {
                    handleEditJobComplete(job);
                    setEditingJob(null);
                    setActiveTab('records');
                  }}
                  onCancelEdit={() => {
                    setEditingJob(null);
                    setActiveTab('records');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'add-expense' && (
              <motion.div key="add-expense" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ExpenseForm 
                  onAddExpense={handleAddExpense} 
                  initialExpenseToEdit={editingExpense} 
                  onEditComplete={(expense) => {
                    handleEditExpenseComplete(expense);
                    setEditingExpense(null);
                    setActiveTab('records');
                  }}
                  onCancelEdit={() => {
                    setEditingExpense(null);
                    setActiveTab('records');
                  }}
                />
              </motion.div>
            )}
            {activeTab === 'records' && (
              <motion.div key="records" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <RecordsPage 
                  jobs={jobs} 
                  expenses={expenses} 
                  onDeleteJob={handleDeleteJob} 
                  onDeleteExpense={handleDeleteExpense} 
                  onTriggerEditJob={(job) => { setEditingJob(job); setActiveTab('add-job'); }} 
                  onTriggerEditExpense={(expense) => { setEditingExpense(expense); setActiveTab('add-expense'); }} 
                  onViewInvoice={(job) => setSelectedInvoiceJob(job)}
                  settings={settings}
                />
              </motion.div>
            )}
            {activeTab === 'crm' && (
              <motion.div key="crm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CustomerHistory 
                  jobs={jobs} 
                  customerNotes={customerNotes} 
                  onSaveCustomerNotes={(k, v) => saveCustomerNotesToStore(k, v)} 
                  onMarkJobAsPaid={handleMarkJobAsPaid}
                  settings={settings} 
                />
              </motion.div>
            )}
            {activeTab === 'attendance' && (
              <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AttendanceModule 
                  attendanceRecords={attendanceRecords} 
                  settings={settings} 
                  onSaveAttendance={handleSaveAttendance} 
                  onUpdateSettings={saveSettingsToStore} 
                />
              </motion.div>
            )}
            {activeTab === 'appointments' && (
              <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AppointmentsModule 
                  appointments={appointments}
                  attendanceRecords={attendanceRecords} 
                  jobs={jobs}
                  onAddAppointment={handleAddAppointment} 
                  onUpdateStatus={handleUpdateAppointmentStatus}
                  onUpdateAppointmentFields={handleUpdateAppointmentFields}
                  onDeleteAppointment={handleDeleteAppointment} 
                  onCompleteAndLog={handleCompleteAndLogAppointment}
                  settings={settings}
                />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ActivityLogPage 
                  logs={activityLogs} 
                  onClearLogs={handleClearLogs} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 py-1 z-40 pb-safe" id="mobile-bottom-nav">
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('dashboard');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'dashboard' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Home</span>
        </button>
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('add-job');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'add-job' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Job</span>
        </button>
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('add-expense');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'add-expense' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Expense</span>
        </button>
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('records');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'records' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Records</span>
        </button>
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('crm');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'crm' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Clients</span>
        </button>
        {settings.currentUserRole === 'Owner' && (
          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('attendance');
            }}
            className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
              activeTab === 'attendance' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[8px]">Attend</span>
          </button>
        )}
        {settings.currentUserRole === 'Owner' && (
          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('history');
            }}
            className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
              activeTab === 'history' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[8px]">Logs</span>
          </button>
        )}
      </nav>


      {/* Invoice Modal Overlay */}
      {selectedInvoiceJob && (
        <InvoiceModal
          job={selectedInvoiceJob}
          onClose={() => setSelectedInvoiceJob(null)}
          settings={settings}
        />
      )}

      {/* Beautiful Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm px-4"
            id="toast-notification-banner"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl border text-xs font-bold leading-relaxed pointer-events-auto ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              <span className="flex-1">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Sync and Connection Status Informational Modal */}
      <AnimatePresence>
        {showSyncStatusModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="sync-status-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 text-slate-800"
              id="sync-status-modal-box"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${syncStatus.color}`}>
                    {syncStatus.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{syncStatus.text}</h3>
                    <p className="text-[9px] text-slate-500 font-medium">Database Synchronization Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSyncStatusModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  id="sync-status-close-btn"
                >
                  <span className="text-sm font-semibold px-1">✕</span>
                </button>
              </div>

              {/* Description */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-[11px] leading-relaxed text-slate-600">
                {syncStatus.desc}
              </div>

              {/* Status Breakdown Checklist */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sync Status by Collection</h4>
                <div className="grid grid-cols-1 gap-2.5 text-xs font-semibold">
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <span className="text-slate-700">Jobs & Invoice Database</span>
                    <span className="flex items-center gap-1">
                      {pendingWriteCollections.jobs ? (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Syncing
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-500" /> Synced
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <span className="text-slate-700">Expense Logs</span>
                    <span className="flex items-center gap-1">
                      {pendingWriteCollections.expenses ? (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Syncing
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-500" /> Synced
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <span className="text-slate-700">Staff Attendance Logs</span>
                    <span className="flex items-center gap-1">
                      {pendingWriteCollections.attendance ? (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Syncing
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-500" /> Synced
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <span className="text-slate-700">Client Profiles & Notes</span>
                    <span className="flex items-center gap-1">
                      {pendingWriteCollections.customerNotes ? (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Syncing
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-500" /> Synced
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-xs">
                    <span className="text-slate-700">Wages & App Settings</span>
                    <span className="flex items-center gap-1">
                      {pendingWriteCollections.settings ? (
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Syncing
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3 text-emerald-500" /> Synced
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Offline capabilities explainer */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 text-[10px] text-slate-500">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 mt-1"></div>
                  <p className="leading-normal">
                    <strong>PWA Enabled:</strong> This application is fully offline-capable. You can securely add and track jobs even with zero mobile signal. Changes are cached locally on your device and synchronized as soon as signal returns.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowSyncStatusModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer text-center"
                id="sync-status-dismiss-btn"
              >
                Close Status Panel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful Custom Logout Confirm Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="logout-confirm-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center space-y-4"
              id="logout-confirm-box"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Logout / Switch User?</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Are you sure you want to exit your session? You can easily log back in as any Owner or Manager anytime.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 transition-all cursor-pointer"
                  id="logout-cancel-btn"
                >
                  No, Keep Session
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold shadow-md shadow-red-100 transition-all cursor-pointer"
                  id="logout-confirm-btn"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
