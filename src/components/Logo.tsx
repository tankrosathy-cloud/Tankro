import React from 'react';

export default function Logo({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
      <defs>
        <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="logo-drop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      {/* Protective Crest / Shield Shape (Background) */}
      <rect width="512" height="512" rx="128" fill="url(#logo-bg-grad)" />
      
      {/* Outer Water wave element */}
      <path d="M 0 380 Q 128 320 256 380 T 512 380 L 512 512 L 0 512 Z" fill="#0ea5e9" opacity="0.3" />
      <path d="M 0 420 Q 128 360 256 420 T 512 420 L 512 512 L 0 512 Z" fill="#38bdf8" opacity="0.4" />

      {/* Main Droplet Visual representation */}
      <path d="M256 120 C256 120 356 240 356 320 C356 375 311 420 256 420 C201 420 156 375 156 320 C156 240 256 120 256 120 Z" fill="url(#logo-drop-grad)" />
      
      {/* Droplet Highlight/Reflection */}
      <path d="M210 240 C190 270 190 310 210 340" fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
      
      {/* Sparkles indicating clean */}
      <path d="M340 180 L350 200 L370 210 L350 220 L340 240 L330 220 L310 210 L330 200 Z" fill="#ffffff" opacity="0.9" />
      <path d="M160 190 L165 205 L180 210 L165 215 L160 230 L155 215 L140 210 L155 205 Z" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
