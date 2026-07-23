/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Phone, MessageSquare, MapPin, Calendar, CreditCard, ClipboardList, Info, FileText, CheckCircle, ExternalLink, Users, Droplets } from 'lucide-react';
import { Job, AppSettings } from '../types';
import { formatInRupees, formatWhatsappMessage } from '../utils';

interface CustomerHistoryProps {
  jobs: Job[];
  customerNotes: Record<string, string>; // key: customerName_customerPhone -> notes string
  onSaveCustomerNotes: (key: string, notes: string) => void;
  onMarkJobAsPaid?: (jobId: string) => void;
  settings: AppSettings;
}

export default function CustomerHistory({
  jobs,
  customerNotes,
  onSaveCustomerNotes,
  onMarkJobAsPaid,
  settings,
}: CustomerHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustKey, setSelectedCustKey] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Extract unique customers based on Name + Phone key
  const customersMap: Record<
    string,
    {
      name: string;
      phone: string;
      address: string;
      area: string;
      otherAreaText?: string;
      jobs: Job[];
    }
  > = {};

  jobs.forEach((job) => {
    const key = `${job.customerName.trim()}||${job.customerPhone.trim()}`;
    if (!customersMap[key]) {
      customersMap[key] = {
        name: job.customerName,
        phone: job.customerPhone,
        address: job.customerAddress,
        area: job.area,
        otherAreaText: job.otherAreaText,
        jobs: [],
      };
    }
    customersMap[key].jobs.push(job);
  });

  // Sort customer list alphabetically
  const uniqueCustomers = Object.values(customersMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Search and Location filter
  const filteredCustomers = uniqueCustomers.filter((c) => {
    const loc = c.area === 'Other' && c.otherAreaText ? c.otherAreaText : c.area;
    const finalLoc = loc || 'Unknown';

    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.otherAreaText && c.otherAreaText.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchLocation = selectedLocations.length === 0 || selectedLocations.includes(finalLoc);
      
    return matchSearch && matchLocation;
  });

  const toggleLocationFilter = (loc: string) => {
    setSelectedLocations(prev => 
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const handleSelectCustomer = (key: string, notes: string) => {
    setSelectedCustKey(key);
    setEditingNotesText(notes);
  };

  const handleSaveNotes = (key: string) => {
    onSaveCustomerNotes(key, editingNotesText);
    alert('Customer notes saved!');
  };

  // Quick Action triggers
  const triggerCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const triggerWhatsApp = (phone: string, name: string) => {
    const template = settings?.whatsappTemplates?.due || `Hello {customerName}, this is from {franchiseName}. We are checking in regarding your water tank cleaning service. Regular cleaning ensures clean and safe drinking water. Please let us know when we can schedule your cleaning service. Thank you!`;
    const message = formatWhatsappMessage(template, {
      customerName: name,
      franchiseName: settings?.franchiseName || 'Tankro Erode',
      date: '',
      capacity: '',
      tanksCount: '',
      amount: '',
    });
    window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

    const totalClients = uniqueCustomers.length;
  const totalTanks = jobs.reduce((acc, job) => acc + job.numTanks || 1, 0);
  
  const locationCounts: Record<string, number> = {};
  uniqueCustomers.forEach(c => {
    const loc = c.area === 'Other' && c.otherAreaText ? c.otherAreaText : c.area;
    const finalLoc = loc || 'Unknown';
    if (!locationCounts[finalLoc]) locationCounts[finalLoc] = 0;
    locationCounts[finalLoc]++;
  });

  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-xl mx-auto space-y-4" id="customer-history-wrapper">
      {/* Summary Statistics */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Client Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Clients</p>
              <p className="text-xl font-black text-slate-800">{totalClients}</p>
            </div>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Tanks Serviced</p>
              <p className="text-xl font-black text-slate-800">{totalTanks}</p>
            </div>
          </div>
        </div>
        
        {sortedLocations.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Location Wise Clients</p>
            <div className="flex flex-wrap gap-2">
              {sortedLocations.map(([loc, count]) => {
                const isSelected = selectedLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => toggleLocationFilter(loc)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-100 border-blue-200 text-blue-800' 
                        : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className={`w-3 h-3 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className="font-semibold">{loc}</span>
                    <span className={`${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'} px-1.5 py-0.5 rounded-md font-bold text-[10px]`}>{count}</span>
                  </button>
                );
              })}
              {selectedLocations.length > 0 && (
                <button
                  onClick={() => setSelectedLocations([])}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Search Input Card */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              placeholder="Search customers by name, phone, area..."
              id="customer-search-input"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2.5 rounded-xl hover:bg-blue-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Customer list results */}
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 text-slate-400 text-xs">
            No customers found matching your search term.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const custKey = `${cust.name.trim()}||${cust.phone.trim()}`;
            const isExpanded = selectedCustKey === custKey;

            // Stats computations
            const totalJobs = cust.jobs.length;
            const totalRevenue = cust.jobs.reduce((acc, curr) => acc + curr.grandTotal, 0);
            const pendingJobs = cust.jobs.filter((j) => j.paymentStatus === 'Pending');
            const totalPending = pendingJobs.reduce((acc, curr) => acc + curr.grandTotal, 0);
            const savedNotes = customerNotes[custKey] || '';

            // Check if there's any active subscription
            const subscriptionJobs = cust.jobs.filter((j) => j.jobType === 'Subscription' && j.nextServiceDueDate);
            const latestSubscriptionJob = subscriptionJobs.length > 0
              ? subscriptionJobs.reduce((prev, curr) => {
                  return new Date(curr.date) > new Date(prev.date) ? curr : prev;
                })
              : null;

            return (
              <div
                key={custKey}
                className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                  isExpanded ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-xs'
                }`}
                id={`customer-item-${cust.name.toLowerCase().replace(/\s/g, '-')}`}
              >
                {/* Collapsed view summary */}
                <div
                  onClick={() => handleSelectCustomer(custKey, savedNotes)}
                  className="p-4 flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">{cust.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-0.5">
                        <Phone className="w-3 h-3" />
                        {cust.phone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        {cust.area}{cust.otherAreaText ? ` (${cust.otherAreaText})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{totalJobs} Service(s)</p>
                    <p className="text-[10px] text-blue-600 font-semibold">{formatInRupees(totalRevenue)} Spent</p>
                    {totalPending > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[8px] font-extrabold rounded-full animate-pulse">
                        ₹{totalPending} Due
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded customer profile details */}
                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-4 text-xs text-slate-700">
                    {/* Communication and Basic Info Panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-500 text-[10px] uppercase">Default Address</p>
                        <p className="font-medium text-slate-800 mt-0.5 text-xs">{cust.address}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => triggerCall(cust.phone)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold cursor-pointer transition-colors"
                          id={`call-cust-${cust.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call Client
                        </button>
                        <button
                          onClick={() => triggerWhatsApp(cust.phone, cust.name)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl font-bold cursor-pointer transition-colors"
                          id={`wa-cust-${cust.phone}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Pending dues checker */}
                    {pendingJobs.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl space-y-2">
                        <div className="flex items-center gap-1 text-red-800 font-bold">
                          <CreditCard className="w-4 h-4 text-red-500" />
                          <span>Pending Balance Due: {formatInRupees(totalPending)}</span>
                        </div>
                        <div className="space-y-1.5">
                          {pendingJobs.map((pJob) => (
                            <div key={pJob.id} className="bg-white p-2.5 rounded-xl border border-red-200/50 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-700">{pJob.date}</span>
                                <span className="text-slate-400 ml-1.5">({pJob.tankCapacity}L tank)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{formatInRupees(pJob.grandTotal)}</span>
                                {onMarkJobAsPaid && (
                                  <button
                                    onClick={() => onMarkJobAsPaid(pJob.id)}
                                    className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                                    id={`pay-due-${pJob.id}`}
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subscription status if present */}
                    {latestSubscriptionJob && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-blue-800">Active Subscription Service</p>
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            Interval: {latestSubscriptionJob.subscriptionInterval} | Last cleaned: {latestSubscriptionJob.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Next Service Due</p>
                          <p className="font-bold text-blue-700 font-mono mt-0.5">{latestSubscriptionJob.nextServiceDueDate}</p>
                        </div>
                      </div>
                    )}

                    {/* Customer Specific Notes Form */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Staff Notes for this Customer:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingNotesText}
                          onChange={(e) => setEditingNotesText(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-700"
                          placeholder="e.g. Roof-top tank has lock, sumps are easily accessible, prefers morning only..."
                          id={`notes-input-${custKey}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(custKey)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          id={`notes-save-${custKey}`}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Past Services Listing */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1">
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                        Service History Logs:
                      </h4>
                      <div className="space-y-2 divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl p-3 max-h-48 overflow-y-auto">
                        {cust.jobs
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((pastJob) => (
                            <div key={pastJob.id} className="pt-2 first:pt-0 flex justify-between items-center text-[11px]">
                              <div>
                                <p className="font-bold text-slate-700">{pastJob.date}</p>
                                <p className="text-[10px] text-slate-400">
                                  Tanks: {pastJob.numTanks} × {pastJob.tankCapacity}L | Staff: {pastJob.staffAssigned.join(', ')}
                                </p>
                                {(pastJob.photosBefore && pastJob.photosBefore.length > 0) || (pastJob.photosAfter && pastJob.photosAfter.length > 0) || pastJob.photoBefore || pastJob.photoAfter ? (
                                  <div className="flex flex-wrap gap-2.5 mt-1" id="history-job-photo-proofs">
                                    {/* Before Photos */}
                                    {pastJob.photosBefore && pastJob.photosBefore.length > 0 ? (
                                      pastJob.photosBefore.map((photo, i) => photo && (
                                        <div key={`before-${i}`} className="relative group flex flex-col items-center">
                                          <img
                                            src={photo}
                                            alt={`Tank ${i+1} Before`}
                                            className="w-10 h-7 rounded-sm object-cover border border-slate-200 cursor-zoom-in"
                                            onClick={() => window.open(photo, '_blank')}
                                            referrerPolicy="no-referrer"
                                          />
                                          <span className="text-[7px] text-slate-500 font-bold">T{i+1} Bef</span>
                                        </div>
                                      ))
                                    ) : pastJob.photoBefore ? (
                                      <div className="relative group flex flex-col items-center">
                                        <img
                                          src={pastJob.photoBefore}
                                          alt="Before"
                                          className="w-10 h-7 rounded-sm object-cover border border-slate-200 cursor-zoom-in"
                                          onClick={() => window.open(pastJob.photoBefore, '_blank')}
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="text-[7px] text-slate-500 font-bold">Before</span>
                                      </div>
                                    ) : null}

                                    {/* After Photos */}
                                    {pastJob.photosAfter && pastJob.photosAfter.length > 0 ? (
                                      pastJob.photosAfter.map((photo, i) => photo && (
                                        <div key={`after-${i}`} className="relative group flex flex-col items-center">
                                          <img
                                            src={photo}
                                            alt={`Tank ${i+1} After`}
                                            className="w-10 h-7 rounded-sm object-cover border border-slate-200 cursor-zoom-in"
                                            onClick={() => window.open(photo, '_blank')}
                                            referrerPolicy="no-referrer"
                                          />
                                          <span className="text-[7px] text-slate-500 font-bold">T{i+1} Aft</span>
                                        </div>
                                      ))
                                    ) : pastJob.photoAfter ? (
                                      <div className="relative group flex flex-col items-center">
                                        <img
                                          src={pastJob.photoAfter}
                                          alt="After"
                                          className="w-10 h-7 rounded-sm object-cover border border-slate-200 cursor-zoom-in"
                                          onClick={() => window.open(pastJob.photoAfter, '_blank')}
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="text-[7px] text-slate-500 font-bold">After</span>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <p className="font-extrabold text-slate-800">{formatInRupees(pastJob.grandTotal)}</p>
                                <span className={`text-[9px] font-bold ${
                                  pastJob.paymentStatus === 'Paid' ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                  {pastJob.paymentStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
