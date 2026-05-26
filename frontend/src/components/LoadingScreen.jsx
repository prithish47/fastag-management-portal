import React from 'react';

export default function LoadingScreen({ message = "Preparing Your Dashboard..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 transition-opacity duration-500 ease-in-out">
      <div className="flex flex-col items-center space-y-8 p-12 bg-white rounded-3xl shadow-2xl border-t-4 border-[#00478F] max-w-sm w-full animate-in fade-in zoom-in duration-500">
        
        {/* Branding */}
        <div className="flex flex-col items-center space-y-4">
          <div>
            <img src="/Fastag_logo.png" alt="FASTag" className="h-8 object-contain" />
          </div>
        </div>

        {/* Custom Spinner */}
        <div className="relative flex justify-center items-center w-20 h-20">
          <svg className="animate-spin absolute w-full h-full text-[#00478F]" viewBox="0 0 50 50">
            <circle 
              className="path" 
              cx="25" cy="25" r="20" 
              fill="none" strokeWidth="4" 
              stroke="currentColor" 
              strokeLinecap="round"
              strokeDasharray="90 150"
              strokeDashoffset="0"
            ></circle>
          </svg>
          <div className="absolute w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-[#f39c12] rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-1">{message}</h3>
          <p className="text-sm text-slate-500 font-medium animate-pulse">Securely authenticating connection</p>
        </div>
      </div>
    </div>
  );
}
