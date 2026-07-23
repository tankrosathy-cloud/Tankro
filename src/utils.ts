/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, Expense, DailyAttendance, AppSettings } from './types';

// Slabs pricing per tank
export function getSlabRate(capacity: number, customRates?: Record<string, number>): number {
  if (capacity <= 0) return 0;
  
  // Use custom settings-defined rates if they exist, otherwise fallback to baseline rates
  const rates: Record<string, number> = customRates || {
    '1000': 800,
    '3000': 950,
    '5000': 1250,
    '7500': 1850,
    '10000': 2350,
    '15000': 2950,
    '20000': 3550,
    '30000': 4000,
  };

  const sortedCapacities = Object.keys(rates)
    .map(Number)
    .sort((a, b) => a - b);

  for (const limit of sortedCapacities) {
    if (capacity <= limit) {
      return rates[String(limit)];
    }
  }

  // If capacity is above the highest limit, scale dynamically or use custom rate if available
  const highestLimit = sortedCapacities[sortedCapacities.length - 1] || 30000;
  const highestRate = rates[String(highestLimit)] || 4000;
  
  if (capacity > highestLimit) {
    // Above the maximum specified slab size: base rate + ₹0.12 per additional liter
    const additionalLiters = capacity - highestLimit;
    return highestRate + Math.round(additionalLiters * 0.12);
  }
  return highestRate;
}

// Distance surcharge: If distance > 8 km, add ₹10 × (distance − 8) km
export function getDistanceSurcharge(distance: number): number {
  if (distance <= 8) return 0;
  return Math.round((distance - 8) * 10);
}

// Full calculation helper
export interface PriceBreakdown {
  slabRate: number;
  baseCharge: number;
  distanceSurcharge: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export function calculateJobPrice(
  capacity: number,
  numTanks: number,
  distance: number,
  gstApplicable: boolean,
  isSlabOverridden?: boolean,
  manualSlabRate?: number,
  individualTanks?: number[],
  isDistanceOverridden?: boolean,
  manualDistanceCharge?: number,
  individualTanksManualRates?: number[],
  customSlabRates?: Record<string, number>
): PriceBreakdown {
  let baseCharge = 0;
  let slabRate = 0;

  if (isSlabOverridden) {
    if (individualTanksManualRates && individualTanksManualRates.length > 0) {
      baseCharge = individualTanksManualRates.reduce((sum, rate) => sum + rate, 0);
      slabRate = Math.round(baseCharge / numTanks);
    } else if (typeof manualSlabRate === 'number') {
      slabRate = manualSlabRate;
      baseCharge = slabRate * numTanks;
    }
  } else if (individualTanks && individualTanks.length > 0) {
    baseCharge = individualTanks.reduce((sum, cap) => sum + getSlabRate(cap, customSlabRates), 0);
    slabRate = Math.round(baseCharge / individualTanks.length);
  } else {
    slabRate = getSlabRate(capacity, customSlabRates);
    baseCharge = slabRate * numTanks;
  }

  const distanceSurcharge = isDistanceOverridden && typeof manualDistanceCharge === 'number'
    ? manualDistanceCharge
    : getDistanceSurcharge(distance);

  const subtotal = baseCharge + distanceSurcharge;
  const gstAmount = gstApplicable ? Math.round(subtotal * 0.18) : 0;
  const grandTotal = subtotal + gstAmount;

  return {
    slabRate,
    baseCharge,
    distanceSurcharge,
    subtotal,
    gstAmount,
    grandTotal,
  };
}

// Date helpers
export function getTodayDateString(): string {
  // Returns date in YYYY-MM-DD local timezone format
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatInRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate days remaining between today and due date
export function getDaysRemaining(dueDateStr: string): number {
  const today = new Date(getTodayDateString());
  const due = new Date(dueDateStr);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Sample Data Generators
const todayStr = getTodayDateString();
const yesterdayStr = addMonths(todayStr, 0).replace(/-\d\d$/, (match) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return '-' + String(yesterday.getDate()).padStart(2, '0');
});

// A few sample customers and jobs
export const SAMPLE_JOBS: Job[] = [
  {
    id: 'job-1',
    date: yesterdayStr,
    customerName: 'Karthik Raja',
    customerPhone: '9842512345',
    customerAddress: '12, Sathy Main Road, near Bus Stand',
    area: 'Sathyamangalam',
    tankCapacity: 2000,
    numTanks: 2,
    distance: 5,
    staffAssigned: ['Althaf', 'Nafees'],
    jobType: 'One-Time',
    gstApplicable: false,
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    notes: 'Ground level sump and overhead tank',
    subtotal: 1900, // 950 * 2 + 0
    gstAmount: 0,
    grandTotal: 1900,
  },
  {
    id: 'job-2',
    date: yesterdayStr,
    customerName: 'Senthil Kumar',
    customerPhone: '9786432101',
    customerAddress: '45B, Gobi High School St',
    area: 'Gobichettipalayam',
    tankCapacity: 5000,
    numTanks: 1,
    distance: 12, // >8km -> 4 * 10 = 40 surcharge
    staffAssigned: ['Althaf', 'Akram'],
    jobType: 'Subscription',
    subscriptionInterval: '6 months',
    gstApplicable: true,
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    notes: 'Premium commercial building. Wants periodic cleaning.',
    subtotal: 1290, // 1250 * 1 + 40
    gstAmount: 232, // 1290 * 0.18
    grandTotal: 1522,
    nextServiceDueDate: addMonths(yesterdayStr, 6),
  },
  {
    id: 'job-3',
    date: todayStr,
    customerName: 'Anitha Srinivasan',
    customerPhone: '9443212345',
    customerAddress: '7/2, Puliampatti Road, near Temple',
    area: 'Punjai Puliambatti',
    tankCapacity: 8000,
    numTanks: 1,
    distance: 15, // >8km -> 7 * 10 = 70 surcharge
    staffAssigned: ['Nafees', 'Akram'],
    jobType: 'Subscription',
    subscriptionInterval: '3 months',
    gstApplicable: false,
    paymentStatus: 'Pending',
    paymentMode: 'Cash',
    notes: 'Prefer morning services always',
    subtotal: 2420, // 2350 * 1 + 70
    gstAmount: 0,
    grandTotal: 2420,
    nextServiceDueDate: addMonths(todayStr, 3),
  },
  {
    id: 'job-4',
    date: addMonths(todayStr, 0).replace(/-\d\d$/, '-05'), // Hardcoded 5th of this month
    customerName: 'Sathy Textiles',
    customerPhone: '9944112233',
    customerAddress: '102, Kamarajar Street',
    area: 'Sathyamangalam',
    tankCapacity: 15000,
    numTanks: 1,
    distance: 3,
    staffAssigned: ['Althaf', 'Nafees', 'Akram'],
    jobType: 'One-Time',
    gstApplicable: true,
    paymentStatus: 'Paid',
    paymentMode: 'Bank Transfer',
    notes: 'Sump tank, big cleaning job',
    subtotal: 2950,
    gstAmount: 531,
    grandTotal: 3481,
  },
  {
    id: 'job-5',
    date: addMonths(todayStr, 0).replace(/-\d\d$/, '-03'), // Hardcoded 3rd of this month
    customerName: 'Banu Priya',
    customerPhone: '9566234567',
    customerAddress: '32, Bhavanisagar Dam Quarters',
    area: 'Other',
    otherAreaText: 'Bhavanisagar',
    tankCapacity: 1000,
    numTanks: 3,
    distance: 18, // >8km -> 10 * 10 = 100 surcharge
    staffAssigned: ['Althaf'],
    jobType: 'Subscription',
    subscriptionInterval: '3 months',
    gstApplicable: false,
    paymentStatus: 'Paid',
    paymentMode: 'Cash',
    notes: 'Very friendly customer. Has small kids so pristine cleaning needed.',
    subtotal: 2500, // 800 * 3 + 100
    gstAmount: 0,
    grandTotal: 2500,
    nextServiceDueDate: addMonths(addMonths(todayStr, 0).replace(/-\d\d$/, '-03'), 3),
  }
];

export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: yesterdayStr,
    category: 'Petrol/Fuel',
    amount: 350,
    paidBy: 'Yuvaraj',
    notes: 'TVS XL petrol for field team',
  },
  {
    id: 'exp-2',
    date: yesterdayStr,
    category: 'Chlorine Tablets',
    amount: 450,
    paidBy: 'Nadeem',
    notes: 'Packet of 100 tablets from Sathy Chemicals',
  },
  {
    id: 'exp-3',
    date: todayStr,
    category: 'Food/Refreshments',
    amount: 220,
    paidBy: 'Yuvaraj',
    notes: 'Tea & snacks for team at Sathy bus stand',
  },
  {
    id: 'exp-4',
    date: addMonths(todayStr, 0).replace(/-\d\d$/, '-05'),
    category: 'Gloves',
    amount: 300,
    paidBy: 'Nadeem',
    notes: 'Rubber gloves 3 pairs',
  }
];

export const SAMPLE_ATTENDANCE: DailyAttendance[] = [
  {
    id: yesterdayStr,
    date: yesterdayStr,
    records: {
      Althaf: 'Present',
      Nafees: 'Present',
      Akram: 'Present',
    },
    wages: {
      Althaf: 500,
      Nafees: 500,
      Akram: 500,
    },
  },
  {
    id: todayStr,
    date: todayStr,
    records: {
      Althaf: 'Present',
      Nafees: 'Present',
      Akram: 'Absent',
    },
    wages: {
      Althaf: 500,
      Nafees: 500,
      Akram: 0,
    },
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  dailyWages: {
    Althaf: 300,
    Nafees: 400,
    Akram: 500,
  },
  currentOwner: null, // Selectable at first launch
  franchiseName: 'Tankro Sathyamangalam',
  customSlabRates: {
    '1000': 800,
    '3000': 950,
    '5000': 1250,
    '7500': 1850,
    '10000': 2350,
    '15000': 2950,
    '20000': 3550,
    '30000': 4000,
  },
  whatsappTemplates: {
    reminder: 'Hello {customerName}, this is a gentle reminder from {franchiseName}. Your scheduled water tank cleaning ({tanksCount} tank of {capacity}L) is scheduled on {date} during {timeslot}. Site Location: {googleLocation}. Thank you!',
    invoice: 'Hello {customerName}, your water tank cleaning service of {capacity}L has been completed successfully by {staffNames}. Sincere thanks from {franchiseName}. Total paid: {amount}. Next service recommended on: {nextDueDate}. Thank you!',
    due: 'Hello {customerName}, this is from {franchiseName}. Your water tank cleaning service is due! Regular cleaning ensures clean and safe drinking water. Please let us know when we can schedule your cleaning service. Thank you!',
  }
};

/**
 * Substitutes dynamic values inside a customizable WhatsApp template.
 */
export function formatWhatsappMessage(
  template: string,
  data: {
    customerName: string;
    franchiseName: string;
    date: string;
    timeslot?: string;
    capacity: string | number;
    tanksCount: string | number;
    amount: string | number;
    nextDueDate?: string;
    googleLocation?: string;
    staffNames?: string;
  }
): string {
  let message = template;
  message = message.replace(/{customerName}/g, data.customerName || '');
  message = message.replace(/{franchiseName}/g, data.franchiseName || '');
  message = message.replace(/{date}/g, data.date || '');
  message = message.replace(/{timeslot}/g, data.timeslot || 'any time');
  message = message.replace(/{capacity}/g, String(data.capacity || ''));
  message = message.replace(/{tanksCount}/g, String(data.tanksCount || '1'));
  message = message.replace(/{amount}/g, String(data.amount || ''));
  message = message.replace(/{nextDueDate}/g, data.nextDueDate || '');
  message = message.replace(/{googleLocation}/g, data.googleLocation || 'not provided');
  message = message.replace(/{staffNames}/g, data.staffNames || 'Staff');
  return message;
}

/**
 * Compresses an image in base64/DataURL format using HTML5 Canvas to stay well within Firestore's 1MB limit.
 */
export function compressImage(base64Str: string, maxWidth = 800, maxHeight = 600, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error('Error compressing image:', err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

