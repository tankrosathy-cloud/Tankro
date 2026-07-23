/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, Info, DollarSign, Calendar, User, FileText } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { getTodayDateString } from '../utils';

interface ExpenseFormProps {
  onAddExpense: (expense: Expense) => void;
  initialExpenseToEdit?: Expense | null;
  onEditComplete?: (expense: Expense) => void;
  onCancelEdit?: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Petrol/Fuel',
  'Gloves',
  'Masks',
  'Chlorine Tablets',
  'Cleaning Supplies',
  'Vehicle Maintenance',
  'Food/Refreshments',
  'Staff Salary',
  'Miscellaneous',
];

export default function ExpenseForm({
  onAddExpense,
  initialExpenseToEdit,
  onEditComplete,
  onCancelEdit,
}: ExpenseFormProps) {
  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState<ExpenseCategory>('Petrol/Fuel');
  const [amount, setAmount] = useState<number>(0);
  const [paidBy, setPaidBy] = useState<'Yuvaraj' | 'Nadeem'>('Yuvaraj');
  const [notes, setNotes] = useState('');

  // Populate form if we are editing an existing expense
  useEffect(() => {
    if (initialExpenseToEdit) {
      setDate(initialExpenseToEdit.date);
      setCategory(initialExpenseToEdit.category);
      setAmount(initialExpenseToEdit.amount);
      setPaidBy(initialExpenseToEdit.paidBy);
      setNotes(initialExpenseToEdit.notes || '');
    }
  }, [initialExpenseToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('Please enter a valid expense amount greater than ₹0');
      return;
    }

    const expenseData: Expense = {
      id: initialExpenseToEdit ? initialExpenseToEdit.id : `exp-${Date.now()}`,
      date,
      category,
      amount: Number(amount) || 0,
      paidBy,
      notes: notes.trim() || undefined,
    };

    if (initialExpenseToEdit && onEditComplete) {
      onEditComplete(expenseData);
    } else {
      onAddExpense(expenseData);
      // Reset form on success (except date, paidBy)
      setAmount(0);
      setNotes('');
      setCategory('Petrol/Fuel');
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden" id="expense-form-wrapper">
      <div className="p-5 bg-gradient-to-r from-red-500 to-red-600 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Wallet className="w-5 h-5 animate-pulse" />
            {initialExpenseToEdit ? 'Edit Expense' : 'New Expense Entry'}
          </h2>
          <p className="text-xs text-red-100 mt-0.5">
            Record business costs & supplies purchased
          </p>
        </div>
        {initialExpenseToEdit && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            id="cancel-edit-expense"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Field */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Expense Date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-800"
              id="expense-date"
              required
            />
          </div>

          {/* Paid By Field */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Paid By:
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value as 'Yuvaraj' | 'Nadeem')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-slate-800 cursor-pointer"
              id="expense-paid-by"
            >
              <option value="Yuvaraj">Yuvaraj</option>
              <option value="Nadeem">Nadeem</option>
            </select>
          </div>
        </div>

        {/* Category Field */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1">
            Expense Category:
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-slate-800 cursor-pointer"
            id="expense-category-select"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Field */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1">
            Amount (₹):
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 font-semibold text-slate-400 text-sm">
              ₹
            </span>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 focus:outline-none focus:ring-1 focus:ring-red-500 font-bold text-slate-800 text-sm"
              placeholder="Enter amount in Rupees"
              id="expense-amount-input"
              required
            />
          </div>
        </div>

        {/* Notes (Optional) */}
        <div>
          <label className="block text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Notes (optional):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-800"
            placeholder="e.g. Purchased from shop, vehicle service description, tea bill..."
            rows={3}
            id="expense-notes"
          />
        </div>

        {/* Information Callout */}
        <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 flex items-start gap-2">
          <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed">
            Logging this expense will deduct from today's and monthly net profit values automatically. Staff Salary category payments are compiled separately for staff wage calculations.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-100 transition-all cursor-pointer"
          id="submit-expense-btn"
        >
          {initialExpenseToEdit ? 'Update Expense Entry' : 'Log Expense and Save'}
        </button>
      </form>
    </div>
  );
}
