import React from 'react';

export default function DonateBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 text-center text-sm font-medium shadow-md z-40">
      <span>
        This project is free to use and open source—no obligations, no fees, just goodwill! If you find it helpful, consider supporting the developer: 
        <a href="https://ko-fi.com/toaa00" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-yellow-300 ml-1">Ko-fi.com/toaa00</a>
      </span>
    </div>
  );
}
