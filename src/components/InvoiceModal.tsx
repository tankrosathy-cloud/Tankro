/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, ClipboardCheck, Phone, CheckCircle, Star, MessageSquare, Image } from 'lucide-react';
import { Job, AppSettings } from '../types';
import { formatInRupees, calculateJobPrice, formatWhatsappMessage, getSlabRate } from '../utils';

const STANDARD_CHECKLIST_STEPS = [
  'Dewatering & Mud Draining',
  'Wall & Floor Pressure Scrubbing',
  'Sludge Extraction & Vacuuming',
  'Antibacterial Spray / UV Disinfection',
  'Secure Tank Lid Lock Check',
  'Completion Site Cleanup & Photos',
];

interface InvoiceModalProps {
  job: Job | null;
  onClose: () => void;
  settings: AppSettings;
}

export default function InvoiceModal({ job, onClose, settings }: InvoiceModalProps) {
  const [gstin, setGstin] = useState('33ABCDE1234F1Z5'); // Default dummy TN GSTIN
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  // Re-calculate or use stored values
  const breakdown = calculateJobPrice(
    job.tankCapacity,
    job.numTanks,
    job.distance,
    job.gstApplicable,
    job.isSlabOverridden,
    job.manualSlabRate,
    job.individualTanks,
    job.isDistanceOverridden,
    job.manualDistanceCharge,
    job.individualTanksManualRates
  );

  const invoiceNo = `TS-${job.date.replace(/-/g, '')}-${job.id.slice(-4).toUpperCase()}`;

  // Determine individual tank capacities and costs for detailed breakup
  const tankDetails: { description: string; capacity: string; rate: number; amount: number }[] = [];
  
  if (job.individualTanks && job.individualTanks.length > 0) {
    job.individualTanks.forEach((cap, idx) => {
      let rate = 0;
      if (job.isSlabOverridden) {
        if (job.individualTanksManualRates && job.individualTanksManualRates[idx] !== undefined) {
          rate = job.individualTanksManualRates[idx];
        } else if (typeof job.manualSlabRate === 'number') {
          rate = job.manualSlabRate;
        } else {
          rate = breakdown.slabRate;
        }
      } else {
        rate = getSlabRate(cap, settings?.customSlabRates);
      }
      tankDetails.push({
        description: `Tank ${idx + 1} Cleaning (${cap}L)`,
        capacity: `${cap} L`,
        rate,
        amount: rate
      });
    });
  } else {
    const totalTanks = job.numTanks || 1;
    const cap = job.tankCapacity;
    for (let i = 0; i < totalTanks; i++) {
      let rate = 0;
      if (job.isSlabOverridden) {
        if (job.individualTanksManualRates && job.individualTanksManualRates[i] !== undefined) {
          rate = job.individualTanksManualRates[i];
        } else if (typeof job.manualSlabRate === 'number') {
          rate = job.manualSlabRate;
        } else {
          rate = breakdown.slabRate;
        }
      } else {
        rate = breakdown.slabRate;
      }
      tankDetails.push({
        description: totalTanks > 1 ? `Tank ${i + 1} Cleaning (${cap}L)` : `Water Tank Cleaning (${cap}L)`,
        capacity: `${cap} L`,
        rate,
        amount: rate
      });
    }
  }

  const tankBreakdownText = tankDetails.map(t => `  • ${t.description}: ${formatInRupees(t.rate)}`).join('\n');

  // Pre-filled WhatsApp message
  const handleWhatsAppShare = () => {
    const bizName = (settings?.franchiseName || 'Tankro Sathyamangalam').toUpperCase();
    
    const formattedDate = new Date(job.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const staffNames = job.staffAssigned.join(', ').replace(/, ([^,]*)$/, ' & $1');

    const normalBaseCharge = job.individualTanks && job.individualTanks.length > 0
      ? job.individualTanks.reduce((sum, cap) => sum + getSlabRate(cap, settings?.customSlabRates), 0)
      : getSlabRate(job.tankCapacity, settings?.customSlabRates) * (job.numTanks || 1);
    
    const discountAmount = job.isSlabOverridden && normalBaseCharge > breakdown.baseCharge 
      ? normalBaseCharge - breakdown.baseCharge 
      : 0;

    let tankBreakdownStr = tankDetails.map(t => `• ${t.description}: ${formatInRupees(t.rate)}`).join('\n');
    
    let priceDetailsStr = `*Service Details:*\n${tankBreakdownStr}`;
    
    if (breakdown.distanceSurcharge > 0) {
      priceDetailsStr += `\n• Travel Surcharge: ${formatInRupees(breakdown.distanceSurcharge)}`;
    }
    
    if (discountAmount > 0) {
      priceDetailsStr += `\n• Discount: -${formatInRupees(discountAmount)}`;
    }
    
    if (breakdown.gstAmount > 0) {
      priceDetailsStr += `\n• GST (18%): ${formatInRupees(breakdown.gstAmount)}`;
    }

    const message = `Hello ${job.customerName},

Thank you for choosing ${bizName}.

✅ Your water tank cleaning has been completed successfully by ${staffNames}.

*Invoice:* ${invoiceNo}
*Date:* ${formattedDate}

${priceDetailsStr}
------------------------
*Total Amount: ${formatInRupees(breakdown.grandTotal)}* (${job.paymentStatus})

We appreciate your trust in our service. Please take a moment to rate us on Google:
👉 https://maps.app.goo.gl/XZq9xzPSpANVDiSL8?g_st=ic

Thank you! We look forward to serving you again.
${bizName}`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${job.customerPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFeedbackRequest = () => {
    const bizName = (settings?.franchiseName || 'Tankro Sathyamangalam').toUpperCase();
    const text = `Dear ${job.customerName}, thank you for choosing *${bizName}* for your water tank cleaning service. We hope you enjoyed our service!

Please take 30 seconds to share your valuable feedback and rate us on Google Maps. It helps our local team grow:
👉 https://maps.app.goo.gl/XZq9xzPSpANVDiSL8?g_st=ic`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${job.customerPhone}&text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSharePhotos = async () => {
    try {
      const files: File[] = [];
      let shareText = `📸 Service Proof Photos for ${job.customerName}\n\n`;
      
      const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      const maxTanks = Math.max(job.numTanks || 1, job.photosBefore?.length || 0, job.photosAfter?.length || 0);

      for (let idx = 0; idx < maxTanks; idx++) {
        const beforeImg = job.photosBefore?.[idx] || (idx === 0 ? job.photoBefore : '') || '';
        const afterImg = job.photosAfter?.[idx] || (idx === 0 ? job.photoAfter : '') || '';
        
        if (beforeImg || afterImg) {
          shareText += `*Tank ${idx + 1}*\n`;
        }
        
        if (beforeImg) {
          files.push(dataURLtoFile(beforeImg, `Tank ${idx + 1} - Before Cleaning.jpg`));
          shareText += `• Before Cleaning\n`;
        }
        if (afterImg) {
          files.push(dataURLtoFile(afterImg, `Tank ${idx + 1} - After Cleaning.jpg`));
          shareText += `• After Cleaning\n`;
        }
        
        if (beforeImg || afterImg) {
          shareText += `\n`;
        }
      }

      if (files.length === 0) {
        alert('No photos available to share.');
        return;
      }

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: 'Service Proof Photos',
          text: shareText.trim(),
        });
      } else {
        alert('Sharing files is not supported on this device/browser. Please download them instead.');
      }
    } catch (error) {
      console.error('Error sharing photos:', error);
      alert('Could not share photos.');
    }
  };

  const handleCopyText = () => {
    const bizName = (settings?.franchiseName || 'Tankro Sathyamangalam').toUpperCase();
    const text = `${bizName}
Water Tank Cleaning Service

Invoice No: ${invoiceNo}
Date: ${job.date}
Customer: ${job.customerName}
Phone: ${job.customerPhone}
Address: ${job.customerAddress}, ${job.area}${job.otherAreaText ? ` (${job.otherAreaText})` : ''}

Tanks Breakdown:
${tankBreakdownText}
Base Cost Total: ${formatInRupees(breakdown.baseCharge)}
Surcharge: ${formatInRupees(breakdown.distanceSurcharge)}
Subtotal: ${formatInRupees(breakdown.subtotal)}
GST: ${job.gstApplicable ? formatInRupees(breakdown.gstAmount) : 'N/A'}
Grand Total: ${formatInRupees(breakdown.grandTotal)}
Payment Status: ${job.paymentStatus}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:static print:block print:h-auto print:overflow-visible print:bg-white print:p-0 backdrop-filter-none print:backdrop-blur-none print:backdrop-filter-none" id="invoice-modal-wrapper">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:overflow-visible print:block print:max-h-none print:shadow-none print:m-0"
          id="invoice-modal-container"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-500 text-white print:hidden">
            <div>
              <h3 className="font-semibold text-lg">Job Invoice</h3>
              <p className="text-xs text-blue-100">{invoiceNo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              id="close-invoice-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Printable Content */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 print:block print:overflow-visible print:p-0" id="printable-invoice">
            {/* Invoice Design */}
            <div className="text-center mb-6">
              <span className="text-blue-500 font-bold tracking-widest text-xs uppercase block">Professional Water Tank Cleaners</span>
              <h1 className="text-2xl font-bold text-slate-800 font-display">Tankro Sathyamangalam</h1>
              <p className="text-xs text-slate-500">Sathyamangalam, Gobichettipalayam, Punjai Puliambatti and surrounding areas</p>
              <p className="text-xs text-slate-400 mt-1">Mobile: 96293 35542</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Billed To:</h4>
                <p className="font-bold text-slate-800 text-sm">{job.customerName}</p>
                <p className="text-slate-600 mt-0.5">{job.customerPhone}</p>
                <p className="text-slate-600 leading-relaxed mt-0.5">{job.customerAddress}, {job.area}{job.otherAreaText ? ` (${job.otherAreaText})` : ''}</p>
              </div>
              <div className="text-right">
                <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Invoice Details:</h4>
                <p className="font-semibold text-slate-700">No: <span className="font-mono">{invoiceNo}</span></p>
                <p className="text-slate-600">Date: {job.date}</p>
                <p className="text-slate-600">Type: {job.jobType}</p>
                <p className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    job.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.paymentStatus} ({job.paymentMode})
                  </span>
                </p>
              </div>
            </div>

            <div>
              {/* GST Field on Invoice (Editable if applicable) */}
              {job.gstApplicable && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl flex flex-col gap-1 text-xs border border-slate-100 print:bg-white print:border-none print:p-0">
                <label className="font-semibold text-slate-600 ">Business GSTIN:</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 print:border-none print:p-0 print:font-bold"
                  placeholder="Enter GSTIN"
                  id="invoice-gstin-input"
                />
              </div>
            )}

            {/* Service Items Table */}
            <div className="mb-6">
              <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Service Summary:</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden print:overflow-visible print:border-slate-300">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 print:bg-white">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Tanks</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tankDetails.map((tank, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <p className="font-semibold">{tank.description}</p>
                        </td>
                        <td className="p-3 text-center font-semibold">1</td>
                        <td className="p-3 text-right">{formatInRupees(tank.rate)}</td>
                        <td className="p-3 text-right font-semibold">{formatInRupees(tank.amount)}</td>
                      </tr>
                    ))}
                    {breakdown.distanceSurcharge > 0 && (
                      <tr>
                        <td className="p-3" colSpan={2}>
                          <p className="font-semibold">Distance Surcharge</p>
                          <p className="text-[10px] text-slate-400">{job.distance} KM from base (&gt;8 KM)</p>
                        </td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-semibold">{formatInRupees(breakdown.distanceSurcharge)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Totals */}
            <div className="w-full max-w-[240px] ml-auto mb-6 text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatInRupees(breakdown.subtotal)}</span>
              </div>
              {job.gstApplicable && (
                <div className="flex justify-between text-slate-600">
                  <span>GST 18%:</span>
                  <span className="font-semibold">{formatInRupees(breakdown.gstAmount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-1"></div>
              <div className="flex justify-between text-sm font-bold text-slate-950">
                <span>Total Amount:</span>
                <span className="text-blue-600">{formatInRupees(breakdown.grandTotal)}</span>
              </div>
            </div>

            {/* Checklist of Services Done */}
            <div className="mb-6 border border-emerald-100 rounded-2xl p-4 bg-emerald-50/25  space-y-3">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-1">
                ✓ Completed Services Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700">
                {STANDARD_CHECKLIST_STEPS.map((step, idx) => {
                  const isDone = !job.qualityChecklist || job.qualityChecklist.length === 0 || job.qualityChecklist.includes(step);
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`font-bold ${isDone ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {isDone ? '✓' : '○'}
                      </span>
                      <span className={isDone ? 'font-medium text-slate-800' : 'text-slate-400 line-through text-[11px]'}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

            {/* Before / After Photo Proof inside Invoice */}
            {((job.photosBefore && job.photosBefore.length > 0) || (job.photosAfter && job.photosAfter.length > 0) || job.photoBefore || job.photoAfter) && (
              <div className="mt-8 border border-slate-100 rounded-3xl p-6 bg-slate-50 space-y-4 print:block print:bg-white print:border-none print:p-2 print:space-y-6 print:mt-0" id="invoice-photo-proofs">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block mb-2 border-b border-slate-200 pb-2 print:text-lg print:border-b-2 print:pb-4 print:mb-6">
                  📸 Service Proof (Before vs After)
                </span>
                
                <div className="space-y-6 print:space-y-12">
                  {Array.from({
                    length: Math.max(
                      job.numTanks || 1,
                      job.photosBefore?.length || 0,
                      job.photosAfter?.length || 0
                    )
                  }).map((_, idx) => {
                    const beforeImg = job.photosBefore?.[idx] || (idx === 0 ? job.photoBefore : '') || '';
                    const afterImg = job.photosAfter?.[idx] || (idx === 0 ? job.photoAfter : '') || '';
                    
                    return (
                      <div key={idx} className={`space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5 first:border-0 first:pt-0`}>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block print:text-lg print:mb-4">
                          Tank {idx + 1}
                        </span>
                        <div className="grid grid-cols-2 gap-4 print:gap-8">
                          {beforeImg ? (
                            <div className="space-y-1.5 print:space-y-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center print:text-sm">Before Cleaning</span>
                              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs w-full aspect-[4/3] print:rounded-3xl print:border-2 flex items-center justify-center">
                                <img src={beforeImg} alt={`Tank ${idx + 1} Before`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 w-full aspect-[4/3] flex items-center justify-center bg-slate-100/50 print:border-2 print:rounded-3xl">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider print:text-sm">Before Image Pending</span>
                            </div>
                          )}
                          {afterImg ? (
                            <div className="space-y-1.5 print:space-y-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center print:text-sm">After Cleaning</span>
                              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs w-full aspect-[4/3] print:rounded-3xl print:border-2 flex items-center justify-center">
                                <img src={afterImg} alt={`Tank ${idx + 1} After`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 w-full aspect-[4/3] flex items-center justify-center bg-slate-100/50 print:border-2 print:rounded-3xl">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider print:text-sm">After Image Pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              {/* Feedback & Review Callout Banner inside Invoice */}
              <div className="mb-6 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-slate-800 text-xs leading-normal flex flex-col gap-2 print:hidden" id="invoice-feedback-callout">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>We value your feedback!</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Please leave a quick 5-star Google review. It takes 10 seconds and supports our local cleaners!
              </p>
              <a
                href="https://maps.app.goo.gl/XZq9xzPSpANVDiSL8?g_st=ic"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-center text-[11px] font-black uppercase tracking-wider block transition-all print:bg-amber-500 print:text-white"
              >
                Write Google Review 👉 maps.app.goo.gl/XZq9xzPSpANVDiSL8
              </a>
            </div>

            {/* Footer Notes */}
            <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4 space-y-1">
              <p><span className="font-semibold text-slate-500">Service Staff:</span> {job.staffAssigned.join(', ')}</p>
              {job.notes && <p><span className="font-semibold text-slate-500">Notes:</span> {job.notes}</p>}
              {job.qualityChecklist && job.qualityChecklist.length > 0 && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[9px] flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-600">✓ SOP QUALITY STANDARDS MET</span>
                  </div>
                  <span className="font-bold bg-emerald-200/50 px-2 py-0.5 rounded-full text-[8px] text-emerald-700">
                    {job.qualityChecklist.length} / {job.qualityChecklist.length} STEPS VERIFIED
                  </span>
                </div>
              )}
              <p className="text-center mt-6 text-slate-400 font-medium">Thank you for your business! Clean water, healthy life!</p>
              <p className="text-center text-[8px] text-slate-300">Generated via Tankro Sathyamangalam Tracker App</p>
            </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end print:hidden flex-wrap">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              id="whatsapp-invoice-btn"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              id="print-full-btn"
            >
              <Printer className="w-4 h-4" />
              Print Invoice & Photos
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
