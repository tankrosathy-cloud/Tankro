/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Info, User, Phone, MapPin, Compass, Calculator, HelpCircle, Users, CheckSquare, Check, Settings, Camera, Image as ImageIcon, Upload, Trash2, Sparkles } from 'lucide-react';
import { Job, AppSettings, DailyAttendance } from '../types';
import { STANDARD_CHECKLIST_STEPS } from './AppointmentsModule';
import { CollapsibleSection } from './CollapsibleSection';
import { calculateJobPrice, getTodayDateString, addMonths, formatInRupees, getSlabRate, getDistanceSurcharge, compressImage } from '../utils';

interface JobFormProps {
  onAddJob: (job: Job) => void;
  existingJobs: Job[];
  initialJobToEdit?: Job | null;
  onEditComplete?: (job: Job) => void;
  onCancelEdit?: () => void;
  settings?: AppSettings;
  attendanceRecords?: DailyAttendance[];
}

export default function JobForm({
  onAddJob,
  existingJobs,
  initialJobToEdit,
  onEditComplete,
  onCancelEdit,
  settings,
  attendanceRecords,
}: JobFormProps) {
  // Local pricing rate helper utilizing custom franchise settings if loaded
  const getSlabRateWithSettings = (cap: number) => getSlabRate(cap, settings?.customSlabRates);

  // Local form states
  const ALL_STAFF = ['Althaf', 'Nafees', 'Akram'];
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

  const [date, setDate] = useState(getTodayDateString());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [area, setArea] = useState('Sathyamangalam');
  const [otherAreaText, setOtherAreaText] = useState('');
  const [tankCapacity, setTankCapacity] = useState<number | ''>(1000);
  const [numTanks, setNumTanks] = useState<number | ''>(1);
  const [distance, setDistance] = useState<number | ''>(0);
  const [staffAssigned, setStaffAssigned] = useState<string[]>(() => getAvailableStaff(getTodayDateString()));
  const [jobType, setJobType] = useState<'One-Time' | 'Subscription'>('One-Time');
  const [subscriptionInterval, setSubscriptionInterval] = useState<'3 months' | '6 months' | 'Custom'>('3 months');
  const [customIntervalMonths, setCustomIntervalMonths] = useState<number | ''>(1);
  const [gstApplicable, setGstApplicable] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('UPI');
  const [notes, setNotes] = useState('');
  const [googleLocation, setGoogleLocation] = useState('');
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [isSlabOverridden, setIsSlabOverridden] = useState<boolean>(false);
  const [manualSlabRate, setManualSlabRate] = useState<number | ''>(800);
  const [isFranchiseReferral, setIsFranchiseReferral] = useState<boolean>(false);

  // States for individual tank capacities
  const [useIndividualTanks, setUseIndividualTanks] = useState<boolean>(false);
  const [individualTanks, setIndividualTanks] = useState<(number | '')[]>([]);
  const [individualTanksManualRates, setIndividualTanksManualRates] = useState<(number | '')[]>([]);

  // States for travel expense override
  const [isDistanceOverridden, setIsDistanceOverridden] = useState<boolean>(false);
  const [manualDistanceCharge, setManualDistanceCharge] = useState<number | ''>(0);

  // Sync individual tanks array with numTanks and tankCapacity
  // Update staff available based on date
  useEffect(() => {
    if (!initialJobToEdit) {
      const available = getAvailableStaff(date);
      setStaffAssigned(prev => {
        // Only keep available staff, but if nothing selected, use all available
        const filtered = prev.filter(s => available.includes(s));
        return filtered.length > 0 ? filtered : available;
      });
    }
  }, [date, attendanceRecords]);

  useEffect(() => {
    const tanksCount = Number(numTanks) || 0;
    const capacityValue = Number(tankCapacity) || 0;
    setIndividualTanks((prev) => {
      const next = [...prev];
      if (next.length < tanksCount) {
        while (next.length < tanksCount) {
          next.push(capacityValue);
        }
      } else if (next.length > tanksCount) {
        next.splice(tanksCount);
      }
      return next;
    });
  }, [numTanks, tankCapacity]);

  // Sync individual manual rates array with numTanks
  useEffect(() => {
    const tanksCount = Number(numTanks) || 0;
    const capacityValue = Number(tankCapacity) || 0;
    setIndividualTanksManualRates((prev) => {
      const next = [...prev];
      if (next.length < tanksCount) {
        while (next.length < tanksCount) {
          const rawCap = useIndividualTanks ? (individualTanks[next.length] || capacityValue) : capacityValue;
          const cap = Number(rawCap) || 0;
          const defaultRate = getSlabRateWithSettings(cap);
          next.push(manualSlabRate !== '' && manualSlabRate !== undefined ? manualSlabRate : defaultRate);
        }
      } else if (next.length > tanksCount) {
        next.splice(tanksCount);
      }
      return next;
    });
  }, [numTanks, useIndividualTanks, individualTanks, tankCapacity, manualSlabRate]);

  // Keep manual slab rate in sync with capacity's default rate if override is off
  useEffect(() => {
    if (!isSlabOverridden) {
      setManualSlabRate(getSlabRateWithSettings(Number(tankCapacity) || 0));
    }
  }, [tankCapacity, isSlabOverridden]);

  // Auto-complete suggestion state
  const [suggestions, setSuggestions] = useState<{ name: string; phone: string; address: string; area: string; otherAreaText?: string; googleLocation?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load existing customers for autocomplete
  const getUniqueCustomers = () => {
    const clients: Record<string, { name: string; phone: string; address: string; area: string; otherAreaText?: string; googleLocation?: string }> = {};
    existingJobs.forEach((j) => {
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
  };

  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  
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

  // Populate form if we are editing an existing job
  useEffect(() => {
    if (initialJobToEdit) {
      setDate(initialJobToEdit.date);
      setCustomerName(initialJobToEdit.customerName);
      setCustomerPhone(initialJobToEdit.customerPhone);
      setCustomerAddress(initialJobToEdit.customerAddress);
      setArea(initialJobToEdit.area);
      setOtherAreaText(initialJobToEdit.otherAreaText || '');
      setGoogleLocation(initialJobToEdit.googleLocation || '');
      setTankCapacity(initialJobToEdit.tankCapacity);
      setNumTanks(initialJobToEdit.numTanks);
      setDistance(initialJobToEdit.distance);
      setStaffAssigned(initialJobToEdit.staffAssigned);
      setJobType(initialJobToEdit.jobType);
      
      const initialTicks: Record<string, boolean> = {};
      STANDARD_CHECKLIST_STEPS.forEach((step) => {
        initialTicks[step] = initialJobToEdit.qualityChecklist?.includes(step) || false;
      });
      setChecklistItems(initialTicks);

      if (initialJobToEdit.subscriptionInterval) {
        setSubscriptionInterval(initialJobToEdit.subscriptionInterval);
      }
      if (initialJobToEdit.customIntervalMonths) {
        setCustomIntervalMonths(initialJobToEdit.customIntervalMonths);
      }
      setGstApplicable(initialJobToEdit.gstApplicable);
      setPaymentStatus(initialJobToEdit.paymentStatus);
      setPaymentMode(initialJobToEdit.paymentMode);
      setNotes(initialJobToEdit.notes || '');
      if (initialJobToEdit.photosBefore && initialJobToEdit.photosBefore.length > 0) {
        setPhotosBefore(initialJobToEdit.photosBefore);
      } else {
        setPhotosBefore(initialJobToEdit.photoBefore ? [initialJobToEdit.photoBefore] : []);
      }
      if (initialJobToEdit.photosAfter && initialJobToEdit.photosAfter.length > 0) {
        setPhotosAfter(initialJobToEdit.photosAfter);
      } else {
        setPhotosAfter(initialJobToEdit.photoAfter ? [initialJobToEdit.photoAfter] : []);
      }
      setIsSlabOverridden(initialJobToEdit.isSlabOverridden || false);
      setManualSlabRate(initialJobToEdit.manualSlabRate !== undefined ? initialJobToEdit.manualSlabRate : getSlabRateWithSettings(initialJobToEdit.tankCapacity));
      
      if (initialJobToEdit.individualTanks && initialJobToEdit.individualTanks.length > 0) {
        setIndividualTanks(initialJobToEdit.individualTanks);
        setUseIndividualTanks(true);
      } else {
        setUseIndividualTanks(false);
        setIndividualTanks([]);
      }

      if (initialJobToEdit.individualTanksManualRates && initialJobToEdit.individualTanksManualRates.length > 0) {
        setIndividualTanksManualRates(initialJobToEdit.individualTanksManualRates);
      } else {
        const defaultRates = Array.from({ length: initialJobToEdit.numTanks }).map((_, idx) => {
          const cap = (initialJobToEdit.individualTanks && initialJobToEdit.individualTanks[idx]) || initialJobToEdit.tankCapacity;
          return initialJobToEdit.manualSlabRate !== undefined ? initialJobToEdit.manualSlabRate : getSlabRateWithSettings(cap);
        });
        setIndividualTanksManualRates(defaultRates);
      }

      setIsDistanceOverridden(initialJobToEdit.isDistanceOverridden || false);
      setManualDistanceCharge(initialJobToEdit.manualDistanceCharge !== undefined ? initialJobToEdit.manualDistanceCharge : 0);
      setIsFranchiseReferral(initialJobToEdit.isFranchiseReferral || false);
    }
  }, [initialJobToEdit]);

  // Handle autocomplete name search
  const handleNameChange = (val: string) => {
    setCustomerName(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const allClients = getUniqueCustomers();
    const filtered = allClients.filter((c) =>
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

  const handleStaffToggle = (staffName: string) => {
    if (staffAssigned.includes(staffName)) {
      setStaffAssigned(staffAssigned.filter((s) => s !== staffName));
    } else {
      setStaffAssigned([...staffAssigned, staffName]);
    }
  };

  // Perform price breakdown calculations dynamically
  const breakdown = calculateJobPrice(
    Number(tankCapacity) || 0,
    Number(numTanks) || 1,
    Number(distance) || 0,
    gstApplicable,
    isSlabOverridden,
    Number(manualSlabRate) || 0,
    useIndividualTanks ? individualTanks : undefined,
    isDistanceOverridden,
    Number(manualDistanceCharge) !== undefined && !isNaN(manualDistanceCharge) ? Number(manualDistanceCharge) : 0,
    isSlabOverridden ? individualTanksManualRates : undefined,
    settings?.customSlabRates
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter a Customer Name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      alert('Please enter a valid 10-digit Phone Number');
      return;
    }
    if (!customerAddress.trim()) {
      alert('Please enter an Address');
      return;
    }
    if (staffAssigned.length === 0) {
      alert('Please assign at least one staff member');
      return;
    }

    // Auto calculate subscription next service due date
    let nextServiceDueDate: string | undefined = undefined;
    if (jobType === 'Subscription') {
      let monthsToAdd = 3;
      if (subscriptionInterval === '6 months') monthsToAdd = 6;
      else if (subscriptionInterval === 'Custom') monthsToAdd = Number(customIntervalMonths) || 1;
      nextServiceDueDate = addMonths(date, monthsToAdd);
    }

    const jobData: Job = {
      id: (initialJobToEdit && !initialJobToEdit.id.startsWith('TEMP-')) ? initialJobToEdit.id : `job-${Date.now()}`,
      date,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      area,
      otherAreaText: area === 'Other' ? otherAreaText.trim() : undefined,
      tankCapacity: Number(tankCapacity) || 0,
      numTanks: Number(numTanks) || 1,
      individualTanks: useIndividualTanks ? individualTanks.map((val) => Number(val) || 0) : undefined,
      distance: Number(distance) || 0,
      staffAssigned,
      jobType,
      subscriptionInterval: jobType === 'Subscription' ? subscriptionInterval : undefined,
      customIntervalMonths: jobType === 'Subscription' && subscriptionInterval === 'Custom' ? Number(customIntervalMonths) : undefined,
      gstApplicable,
      paymentStatus,
      paymentMode,
      notes: notes.trim() || undefined,
      googleLocation: googleLocation.trim() || undefined,
      isSlabOverridden,
      manualSlabRate: isSlabOverridden ? Number(manualSlabRate) : undefined,
      individualTanksManualRates: isSlabOverridden ? individualTanksManualRates.map((val) => Number(val) || 0) : undefined,
      isDistanceOverridden,
      manualDistanceCharge: isDistanceOverridden ? Number(manualDistanceCharge) : undefined,
      subtotal: breakdown.subtotal,
      gstAmount: breakdown.gstAmount,
      grandTotal: breakdown.grandTotal,
      nextServiceDueDate,
      qualityChecklist: Object.keys(checklistItems).filter((step) => checklistItems[step]).length > 0 ? Object.keys(checklistItems).filter((step) => checklistItems[step]) : undefined,
      photosBefore: photosBefore,
      photosAfter: photosAfter,
      photoBefore: photosBefore.find(p => !!p) || undefined,
      photoAfter: photosAfter.find(p => !!p) || undefined,
      isFranchiseReferral,
      isFranchiseRoyaltyPaid: initialJobToEdit?.isFranchiseRoyaltyPaid || false,
    };

    if (initialJobToEdit && !initialJobToEdit.id.startsWith('TEMP-') && onEditComplete) {
      onEditComplete(jobData);
    } else {
      onAddJob(jobData);
      // Reset form on success (except date, staff, area)
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setTankCapacity(1000);
      setNumTanks(1);
      setDistance(0);
      setNotes('');
      setGoogleLocation('');
      setPhotosBefore([]);
      setPhotosAfter([]);
      setJobType('One-Time');
      setGstApplicable(false);
      setIsSlabOverridden(false);
      setManualSlabRate(800);
      setUseIndividualTanks(false);
      setIndividualTanks([]);
      setIndividualTanksManualRates([]);
      setIsDistanceOverridden(false);
      setManualDistanceCharge(0);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden" id="job-form-wrapper">
      <div className="p-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            {initialJobToEdit ? 'Edit Job Entry' : 'New Job Entry'}
          </h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Log water tank cleaning work
          </p>
        </div>
        {initialJobToEdit && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            id="cancel-edit-job"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
        {/* Date Field */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1">
            Job Date:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
            id="job-date-input"
            required
          />
        </div>

        <CollapsibleSection title="Client Details" icon={<User className="w-4 h-4 text-blue-500" />} defaultOpen={true}>
        {/* Customer Section */}
        <div className="relative">
          <label className="block text-slate-500 font-semibold mb-1">
            Customer Name:
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
              placeholder="Enter customer name..."
              id="job-cust-name"
              autoComplete="off"
              required
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left p-3 hover:bg-blue-50/50 transition-colors cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.phone} | {s.area}</p>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">Saved</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone Field */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Customer Phone Number:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                placeholder="10-digit mobile number"
                id="job-cust-phone"
                required
              />
            </div>
          </div>

          {/* Area Dropdown */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Service Area:
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 cursor-pointer"
              id="job-cust-area"
            >
              <option value="Sathyamangalam">Sathyamangalam</option>
              <option value="Gobichettipalayam">Gobichettipalayam</option>
              <option value="Punjai Puliambatti">Punjai Puliambatti</option>
              <option value="Erode">Erode</option>
              <option value="Other">Other Area</option>
            </select>
          </div>
        </div>

        {/* Other Area Text Input (conditional) */}
        {area === 'Other' && (
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <label className="block text-blue-700 font-semibold mb-1">
              Specify Area Name:
            </label>
            <input
              type="text"
              value={otherAreaText}
              onChange={(e) => setOtherAreaText(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
              placeholder="e.g. Bhavanisagar, Bannari"
              id="job-other-area-text"
              required
            />
          </div>
        )}

        {/* Address */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1">
            Customer Address:
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
              placeholder="Door no, street, landmark..."
              id="job-cust-address"
              required
            />
          </div>
        </div>

        {/* Site Location (Optional) */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
            Site Location / Google Maps Link <span className="text-xs font-normal text-slate-400">(Optional)</span>:
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <Compass className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={googleLocation}
              onChange={(e) => setGoogleLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-9 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 text-xs sm:text-sm"
              placeholder="e.g. https://maps.app.goo.gl/... or Lat, Lng coordinates"
              id="job-google-location"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Paste a Google Maps share link or GPS coordinates. Clicking on client maps links lets you open their location instantly.
          </p>
        </div>

        </CollapsibleSection>
        <CollapsibleSection title="Tank & Distance Specifications" icon={<MapPin className="w-4 h-4 text-emerald-500" />}>
        {/* Tank & Distance Slabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Tank Capacity (Liters):
            </label>
            <div className="relative">
              <input
                type="number"
                value={tankCapacity || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setTankCapacity(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                placeholder="Liters"
                id="job-tank-capacity"
                required
              />
              <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">Liters</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              No. of Tanks:
            </label>
            <input
              type="number"
              value={numTanks || ''}
              onChange={(e) => {
                const val = e.target.value;
                setNumTanks(val === '' ? '' : Math.max(1, parseInt(val) || 1));
              }}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
              placeholder="Tanks"
              id="job-num-tanks"
              required
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Distance (KM) <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>:
            </label>
            <div className="relative">
              <input
                type="number"
                value={distance || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistance(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                placeholder="KM (Optional)"
                id="job-distance-km"
              />
              <span className="absolute right-2 top-2.5 text-[10px] text-slate-400 font-bold">KM</span>
            </div>
          </div>
        </div>

        {/* Individual Tank Capacities Toggle */}
        {numTanks > 1 && (
          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100/60 space-y-2" id="individual-tanks-toggle-block">
            <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useIndividualTanks}
                onChange={(e) => setUseIndividualTanks(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                id="use-individual-tanks-checkbox"
              />
              <span>Enter different capacity for each tank</span>
            </label>

            {useIndividualTanks && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {Array.from({ length: numTanks }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">Tank {idx + 1} (L):</span>
                    <div className="relative">
                      <input
                        type="number"
                        value={individualTanks[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsed = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                          const updated = [...individualTanks];
                          updated[idx] = parsed;
                          setIndividualTanks(updated);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder={`Tank ${idx + 1}`}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slab Rate Override Section */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/60 space-y-3" id="slab-override-section">
          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSlabOverridden}
              onChange={(e) => {
                setIsSlabOverridden(e.target.checked);
                if (!e.target.checked) {
                  setManualSlabRate(getSlabRateWithSettings(tankCapacity));
                }
              }}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              id="override-slab-checkbox"
            />
            <span>Manual Price Override</span>
          </label>

          {isSlabOverridden && (
            <div className="space-y-3 pt-1 animate-fade-in">
              {numTanks === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                      Manual Rate per Tank (₹):
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        value={manualSlabRate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsed = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                          setManualSlabRate(parsed);
                          // Propagate to the single individualTanksManualRates element too
                          setIndividualTanksManualRates([parsed]);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pl-7 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Rate per tank"
                        id="manual-slab-rate-input"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Default slab rate is <strong className="text-slate-700">{formatInRupees(getSlabRateWithSettings(tankCapacity))}</strong> for {tankCapacity} Liters. Your manual rate overrides this.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-600">Enter Individual Tank Prices:</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Apply a flat rate to all tanks
                        const flatRate = prompt("Enter flat rate to apply to all tanks:", String(manualSlabRate));
                        if (flatRate !== null) {
                          const val = Math.max(0, parseInt(flatRate) || 0);
                          setManualSlabRate(val);
                          setIndividualTanksManualRates(Array.from({ length: numTanks }).map(() => val));
                        }
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      id="apply-flat-rate-btn"
                    >
                      Apply flat rate to all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: numTanks }).map((_, idx) => {
                      const capacityLabel = useIndividualTanks ? `${individualTanks[idx] || tankCapacity}L` : `${tankCapacity}L`;
                      const defaultRate = getSlabRateWithSettings(useIndividualTanks ? (individualTanks[idx] || tankCapacity) : tankCapacity);

                      return (
                        <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-semibold block leading-tight">
                            Tank {idx + 1} ({capacityLabel}):
                          </span>
                          <span className="text-[9px] text-slate-400 block pb-0.5 leading-none">
                            Default: ₹{defaultRate}
                          </span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-[10px]">₹</span>
                            <input
                              type="number"
                              value={individualTanksManualRates[idx] !== undefined ? individualTanksManualRates[idx] : defaultRate}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                                const updated = [...individualTanksManualRates];
                                updated[idx] = parsed;
                                setIndividualTanksManualRates(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-6 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`Price ${idx + 1}`}
                              required
                            />
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

        {/* Distance Travel Override Section */}
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/60 space-y-3" id="distance-override-section">
          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDistanceOverridden}
              onChange={(e) => {
                setIsDistanceOverridden(e.target.checked);
                if (!e.target.checked) {
                  setManualDistanceCharge(0);
                } else {
                  setManualDistanceCharge(getDistanceSurcharge(distance));
                }
              }}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              id="override-distance-checkbox"
            />
            <span>Manual Travel Surcharge</span>
          </label>

          {isDistanceOverridden && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1 animate-fade-in">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                  Manual Travel Charge (₹):
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={manualDistanceCharge}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualDistanceCharge(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pl-7 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Travel Surcharge"
                    id="manual-distance-charge-input"
                    required
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Standard auto surcharge is <strong className="text-slate-700">{formatInRupees(getDistanceSurcharge(distance))}</strong> for {distance} KM (₹10/KM above 8 KM). Your manual charge overrides this entirely.
              </p>
            </div>
          )}
        </div>

        </CollapsibleSection>
        <CollapsibleSection title="Staff & Job Type" icon={<Users className="w-4 h-4 text-purple-500" />}>
        {/* Staff Assignment */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Users className="w-4 h-4 text-slate-400" />
            Staff Assigned:
          </label>
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            {ALL_STAFF.map((staff) => {
              const isAvailable = getAvailableStaff(date).includes(staff);
              return (
              <label
                key={staff}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${
                  staffAssigned.includes(staff)
                    ? 'bg-blue-500 border-blue-500 text-white shadow-xs shadow-blue-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                id={`label-staff-${staff.toLowerCase()}`}
              >
                <input
                  type="checkbox"
                  checked={staffAssigned.includes(staff)}
                  onChange={() => handleStaffToggle(staff)}
                  className="sr-only"
                />
                <CheckSquare className={`w-4 h-4 ${staffAssigned.includes(staff) ? 'opacity-100' : 'opacity-40'}`} />
                {staff}
                {!isAvailable && <span className="ml-auto text-[8px] uppercase tracking-wider">Absent</span>}
              </label>
            )
            })}
          </div>
        </div>

        {/* Job Type & Subscription Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Job Type:
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value as 'One-Time' | 'Subscription')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 cursor-pointer"
              id="job-type-select"
            >
              <option value="One-Time">One-Time Service</option>
              <option value="Subscription">Subscription Service</option>
            </select>
          </div>

          {jobType === 'Subscription' && (
            <div>
              <label className="block text-blue-700 font-semibold mb-1">
                Interval:
              </label>
              <select
                value={subscriptionInterval}
                onChange={(e) => setSubscriptionInterval(e.target.value as '3 months' | '6 months' | 'Custom')}
                className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-blue-800 cursor-pointer"
                id="subscription-interval-select"
              >
                <option value="3 months">Every 3 Months</option>
                <option value="6 months">Every 6 Months</option>
                <option value="Custom">Custom Months</option>
              </select>
            </div>
          )}
        </div>

        {jobType === 'Subscription' && subscriptionInterval === 'Custom' && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
            <label className="font-semibold text-blue-800 text-xs">
              Custom Interval (Months):
            </label>
            <input
              type="number"
              min={1}
              value={customIntervalMonths || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCustomIntervalMonths(val === '' ? '' : Math.max(1, parseInt(val) || 1));
              }}
              className="w-24 bg-white border border-blue-200 rounded-lg p-2 font-bold text-center text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="custom-interval-months"
              required
            />
          </div>
        )}

        </CollapsibleSection>
        <CollapsibleSection title="Billing & Payment" icon={<Calculator className="w-4 h-4 text-amber-500" />}>
        {/* GST Toggle & Payments */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Franchise Referral?
            </label>
            <div className="flex items-center h-10">
              <button
                type="button"
                onClick={() => setIsFranchiseReferral(!isFranchiseReferral)}
                className={`w-full py-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer select-none ${
                  isFranchiseReferral
                    ? 'bg-purple-500 border-purple-500 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                id="job-franchise-toggle"
              >
                {isFranchiseReferral ? 'YES (10% Royalty)' : 'NO'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              GST Applicable? (GST 18%):
            </label>
            <div className="flex items-center h-10">
              <button
                type="button"
                onClick={() => setGstApplicable(!gstApplicable)}
                className={`w-full py-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer select-none ${
                  gstApplicable
                    ? 'bg-blue-500 border-blue-500 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                id="job-gst-toggle"
              >
                {gstApplicable ? 'GST (18% ON)' : 'No GST (OFF)'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Payment Status:
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Pending')}
              className={`w-full border rounded-xl p-3 focus:outline-none h-10 font-bold cursor-pointer ${
                paymentStatus === 'Paid'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              id="job-payment-status"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              Payment Mode:
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as 'Cash' | 'UPI' | 'Bank Transfer')}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:outline-none h-10 font-semibold text-slate-800 cursor-pointer"
              id="job-payment-mode"
            >
              <option value="UPI">UPI (GPay/PhonePe)</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        </CollapsibleSection>
        <CollapsibleSection title="Notes & Additional Details" icon={<Info className="w-4 h-4 text-slate-500" />}>
        {/* Notes (Optional) */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1">
            Notes / Special Requests:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
            placeholder="e.g. Roof-top tank, extra chlorine tablet, prefers morning service..."
            rows={2}
            id="job-notes-textarea"
          />
        </div>

        </CollapsibleSection>
        <CollapsibleSection title="Service Execution Proof" icon={<Camera className="w-4 h-4 text-indigo-500" />}>
        {/* Before / After Photo Mockups Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3" id="photo-mockup-section">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              📸 Before/After Photo Proofs
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
              SOP Proof
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Attach before and after photo proofs of the cleaning service for each tank to verify quality.
          </p>

          <div className="space-y-3">
            {Array.from({ length: Number(numTanks) || 1 }).map((_, idx) => {
              const beforeImg = photosBefore[idx] || '';
              const afterImg = photosAfter[idx] || '';
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
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
                                const updated = [...photosBefore];
                                updated[idx] = '';
                                setPhotosBefore(updated);
                              }}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500">
                            <Camera className="w-5 h-5 text-slate-400" />
                            <span className="text-[8px] font-bold uppercase tracking-wider text-center">Upload Before</span>
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
                                      const updated = [...photosBefore];
                                      updated[idx] = compressed;
                                      setPhotosBefore(updated);
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
                                const updated = [...photosAfter];
                                updated[idx] = '';
                                setPhotosAfter(updated);
                              }}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500">
                            <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-wider text-center">Upload After</span>
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
                                      const updated = [...photosAfter];
                                      updated[idx] = compressed;
                                      setPhotosAfter(updated);
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

        {/* Execution Checklist */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3" id="job-form-execution-checklist">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Execution Steps (6/6 Required)
            </span>
            <button
              type="button"
              onClick={handleCheckAllSteps}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Complete All
            </button>
          </div>
          <div className="space-y-2.5">
            {STANDARD_CHECKLIST_STEPS.map((step) => {
              const isChecked = !!checklistItems[step];
              return (
                <div
                  key={step}
                  onClick={() => handleToggleChecklistStep(step)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-emerald-50/40 border-emerald-200 text-emerald-800'
                      : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-slate-300 text-transparent'
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

        </CollapsibleSection>
        {/* Live pricing breakdown box */}
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-1 text-blue-900" id="live-pricing-breakdown">
          <div className="flex items-center gap-1.5 text-blue-800 font-bold mb-1">
            <Calculator className="w-4 h-4" />
            <span>Live Price Calculator:</span>
          </div>
          <div className="space-y-1 font-medium leading-relaxed">
            <p>
              • Base Charge: {useIndividualTanks && !isSlabOverridden ? (
                <>
                  <span className="font-bold">
                    {individualTanks.map((cap) => formatInRupees(getSlabRateWithSettings(Number(cap) || 0))).join(' + ')}
                  </span> = <span className="font-bold">{formatInRupees(breakdown.baseCharge)}</span>
                </>
              ) : (
                <>
                  <span className="font-bold">{formatInRupees(breakdown.slabRate)}</span> × {numTanks} tank(s) ={' '}
                  <span className="font-bold">{formatInRupees(breakdown.baseCharge)}</span>
                </>
              )}
            </p>
            {breakdown.distanceSurcharge > 0 && (
              <p>
                • {isDistanceOverridden ? 'Manual Travel Charge' : 'Distance Surcharge (>8 KM)'}:{' '}
                <span className="font-bold">{formatInRupees(breakdown.distanceSurcharge)}</span> ({distance} KM)
              </p>
            )}
            <p>
              • Subtotal: <span className="font-bold">{formatInRupees(breakdown.subtotal)}</span>
            </p>
            {gstApplicable && (
              <p>
                • GST (18%): <span className="font-bold">{formatInRupees(breakdown.gstAmount)}</span>
              </p>
            )}
            <div className="h-px bg-blue-200/50 my-1"></div>
            <p className="text-sm font-bold text-blue-950 flex justify-between">
              <span>Grand Total:</span>
              <span className="text-blue-700 text-lg font-extrabold">{formatInRupees(breakdown.grandTotal)}</span>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2"
          id="submit-job-form-btn"
        >
          {initialJobToEdit ? 'Update Job Entry' : 'Log Job and Save'}
        </button>
      </form>
    </div>
  );
}
