/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Job {
  id: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  area: string; // Erode, Gobichettipalayam, Punjai Puliambatti, Other
  otherAreaText?: string;
  tankCapacity: number; // in Liters
  numTanks: number; // default 1
  individualTanks?: number[];
  distance: number; // in KM
  staffAssigned: string[]; // Althaf, Nafees, Prabhu
  jobType: 'One-Time' | 'Subscription';
  subscriptionInterval?: '3 months' | '6 months' | 'Custom';
  customIntervalMonths?: number;
  gstApplicable: boolean;
  paymentStatus: 'Paid' | 'Pending';
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  notes?: string;
  isSlabOverridden?: boolean;
  manualSlabRate?: number;
  individualTanksManualRates?: number[];
  isDistanceOverridden?: boolean;
  manualDistanceCharge?: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  nextServiceDueDate?: string; // YYYY-MM-DD
  googleLocation?: string; // Google Maps share link or coordinates
  qualityChecklist?: string[]; // Checklist verified tasks
  photoBefore?: string; // URL or mock key for Before cleaning photo
  photoAfter?: string; // URL or mock key for After cleaning photo
  photosBefore?: string[]; // Array of before cleaning photos for multiple tanks
  photosAfter?: string[]; // Array of after cleaning photos for multiple tanks
  isFranchiseReferral?: boolean;
  isFranchiseRoyaltyPaid?: boolean;
}

export type ExpenseCategory =
  | 'Petrol/Fuel'
  | 'Gloves'
  | 'Masks'
  | 'Chlorine Tablets'
  | 'Cleaning Supplies'
  | 'Vehicle Maintenance'
  | 'Food/Refreshments'
  | 'Staff Salary'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  paidBy: 'Kiruthika' | 'Karthick';
  notes?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day' | 'Leave';

export interface DailyAttendance {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // staffName -> AttendanceStatus
  wages: Record<string, number>; // staffName -> wage amount paid/payable for this day
}

export interface CustomerNotes {
  id: string;
  text: string;
  date: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
}

export interface AppSettings {
  staffList?: string[]; // Array of staff names (e.g. ['Althaf', 'Nafees', 'Prabhu'])
  dailyWages: Record<string, number>; // Staff name -> standard wage
  currentOwner: 'Kiruthika' | 'Karthick' | 'Prabhu' | null;
  currentUserRole?: 'Owner' | 'Manager' | null;
  franchiseName?: string; // Custom branding name (e.g. "Tankro Erode")
  customSlabRates?: Record<string, number>; // Capacity (L) string -> Rate (₹) number
  whatsappTemplates?: Record<string, string>; // Template key -> template string text
  license?: {
    status: 'trial' | 'active' | 'expired';
    trialStartDate: string; // YYYY-MM-DD
    activationKey?: string;
  };
}

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  timeslot: string; // e.g. "08:00 AM - 10:00 AM"
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  area: string;
  otherAreaText?: string;
  tankCapacity: number;
  numTanks: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  staffAssigned: string[];
  notes?: string;
  googleLocation?: string; // Google Maps share link or coordinates
  createdAt: string;
  qualityChecklist?: string[]; // Checklist verified tasks
  routeSequence?: number; // Sorting order of stops for the day
  photoBefore?: string; // URL or mock key for Before cleaning photo
  photoAfter?: string; // URL or mock key for After cleaning photo
  photosBefore?: string[]; // Array of before cleaning photos for multiple tanks
  photosAfter?: string[]; // Array of after cleaning photos for multiple tanks
  isFranchiseReferral?: boolean;
}


export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}
