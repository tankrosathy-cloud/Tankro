/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, User, ArrowRight, Shield, Lock, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const logoImg = "/tankro_logo_new.svg";

interface OwnerSelectorProps {
  onSelect: (username: 'Kiruthika' | 'Karthick' | 'Prabhu', role: 'Owner' | 'Manager') => void;
}

export default function OwnerSelector({ onSelect }: OwnerSelectorProps) {
  const [selectedUser, setSelectedUser] = useState<'Kiruthika' | 'Karthick' | 'Prabhu'>('Karthick');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const userRef = doc(db, 'users', selectedUser);
      const userSnap = await getDoc(userRef);
      
      let expectedPassword = selectedUser.toLowerCase();
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data && data.password) {
          expectedPassword = data.password;
        }
      }
      
      if (password === expectedPassword) {
        const role = selectedUser === 'Prabhu' ? 'Manager' : 'Owner';
        onSelect(selectedUser, role);
      } else {
        setError('Incorrect password!');
      }
    } catch (err) {
      console.error(err);
      setError('Error verifying password. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!oldPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser);
      const userSnap = await getDoc(userRef);
      
      let expectedPassword = selectedUser.toLowerCase();
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data && data.password) {
          expectedPassword = data.password;
        }
      }
      
      if (oldPassword !== expectedPassword) {
        setError('Incorrect current password.');
        setIsLoading(false);
        return;
      }

      await setDoc(userRef, { password: newPassword }, { merge: true });
      setIsResetting(false);
      setPassword(newPassword);
      setNewPassword('');
      setOldPassword('');
      setError('Password reset successfully! Please log in.');
    } catch (err) {
      console.error(err);
      setError('Error resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-100 p-8 border border-slate-100 text-center space-y-6"
        id="owner-selector-card"
      >
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center">
          <div className="w-48 h-28 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden p-2 mb-4">
            <img
              src={logoImg}
              alt="Tankro Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 font-display tracking-tight leading-none">
            Tankro Erode
          </h1>
          <p className="text-xs text-blue-600 font-bold mt-1.5 uppercase tracking-wider">
            Tankro Erode (Erode)
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-normal">
            Secure multi-role payroll, jobs, and customer tracker
          </p>
        </div>

        <div className="h-px bg-slate-100 my-2"></div>

        {/* Credentials Form */}
        {isResetting ? (
          <form onSubmit={handleResetPassword} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Reset Password for {selectedUser}
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-10 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-10 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-2 text-[11px] font-semibold animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetting(false);
                  setError(null);
                  setNewPassword('');
                  setOldPassword('');
                }}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-amber-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? 'Saving...' : 'Save Password'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
          {/* User Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Account
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Karthick', 'Kiruthika', 'Prabhu'] as const).map((user) => {
                const isSelected = selectedUser === user;
                const role = user === 'Prabhu' ? 'Manager' : 'Owner';
                return (
                  <button
                    key={user}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setPassword('');
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-100'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    id={`login-select-${user.toLowerCase()}`}
                  >
                    <User className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs">{user}</span>
                    <span className={`text-[9px] block mt-0.5 font-medium ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
              <span>Password</span>
              
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-10 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter password for ${selectedUser}`}
                id="login-password-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                id="login-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-2 text-[11px] font-semibold animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            id="login-submit-btn"
          >
            <span>{isLoading ? 'Loading...' : `Log In securely (${selectedUser === 'Prabhu' ? 'Manager Login' : 'Owner Login'})`}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
          
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsResetting(true);
                setError(null);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-amber-500 transition-colors"
            >
              Reset / Change Password
            </button>
          </div>
        </form>
        )}

        <div className="h-px bg-slate-100"></div>

        <div className="text-[10px] text-slate-400 leading-normal">
          Owners (<strong className="text-slate-600">Karthick & Kiruthika</strong>) hold full system control. Managers (<strong className="text-slate-600">Prabhu</strong>) have read-only limits on transaction deletions.
        </div>
      </motion.div>
    </div>
  );
}
