import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Key, AlertTriangle, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { AppSettings } from '../types';

interface LicenseManagerProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  children: React.ReactNode;
}

export default function LicenseManager({ settings, updateSettings, children }: LicenseManagerProps) {
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [error, setError] = useState('');
  
  // Calculate trial days remaining
  const trialDays = 14;
  const trialStart = settings.license?.trialStartDate ? new Date(settings.license.trialStartDate) : new Date();
  const today = new Date();
  
  // Strip time for accurate day calculation
  trialStart.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today.getTime() - trialStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = trialDays - diffDays;
  
  const isExpired = settings.license?.status === 'trial' && daysRemaining <= 0;
  
  // Auto-expire if needed (without triggering infinite re-renders)
  useEffect(() => {
    if (settings.license?.status === 'trial' && isExpired) {
      updateSettings({
        license: { ...settings.license, status: 'expired' }
      });
    }
  }, [settings.license, isExpired, updateSettings]);

  const handleActivate = () => {
    // A simple hardcoded activation key mechanism. You can change this to anything you want.
    if (activationKeyInput.trim().toUpperCase() === 'TANKRO-ERODE-PRO') {
      updateSettings({
        license: {
          ...settings.license!,
          status: 'active',
          activationKey: activationKeyInput.trim().toUpperCase()
        }
      });
      setError('');
    } else {
      setError('Invalid Activation Key. Please contact the administrator.');
    }
  };

  // If active, just render the app
  if (settings.license?.status === 'active') {
    return <>{children}</>;
  }

  // If expired, show the lock screen
  if (settings.license?.status === 'expired') {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-zinc-900 z-[9999] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-100 dark:border-zinc-700"
        >
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
            <Lock size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 mb-2">Trial Expired</h2>
          <p className="text-slate-500 dark:text-zinc-400 mb-8">
            Your 14-day free trial has ended. Please purchase a license to continue using {settings.franchiseName || 'Tankro'}.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-left">
                Enter Activation Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value)}
                  placeholder="e.g. TANKRO-ERODE-PRO"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase transition-all"
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-2 text-left">{error}</p>}
            </div>
            
            <button
              onClick={handleActivate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm"
            >
              Activate License
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // If still in trial, show banner + children
  return (
    <>
      <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center text-amber-800 dark:text-amber-200 text-sm font-medium sticky top-0 z-[100]">
        <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
        <span>Trial Mode: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining.</span>
        <button 
          onClick={() => {
            const key = prompt('Enter activation key to unlock permanently:');
            if (key?.trim().toUpperCase() === 'TANKRO-ERODE-PRO') {
              updateSettings({
                license: {
                  ...settings.license!,
                  status: 'active',
                  activationKey: key.trim().toUpperCase()
                }
              });
              alert('License Activated Successfully!');
            } else if (key) {
              alert('Invalid Activation Key');
            }
          }}
          className="ml-3 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 px-3 py-1 rounded-full text-xs transition-colors"
        >
          Activate Now
        </button>
      </div>
      {children}
    </>
  );
}
