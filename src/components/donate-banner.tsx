"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function DonateBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = window.localStorage.getItem('donate_banner_dismissed') === '1';
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    window.localStorage.setItem('donate_banner_dismissed', '1');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative z-40 w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-2 pl-4 pr-12 text-center text-sm font-medium text-white shadow-md">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Close donate banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-white/90 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-4 w-4" />
      </button>
      <span>
        This project is free to use and open source—no obligations, no fees, just goodwill! If you find it helpful, consider supporting the developer: 
        <a href="https://ko-fi.com/toaa00" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-yellow-300 ml-1">Ko-fi.com/toaa00</a>
      </span>
    </div>
  );
}
