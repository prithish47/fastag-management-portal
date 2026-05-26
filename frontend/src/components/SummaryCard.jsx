import React from 'react';

export default function SummaryCard({ title, value, icon: Icon, colorClass, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass.bg}`}>
          <Icon className={`w-5 h-5 ${colorClass.text}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-black text-slate-900">{value}</p>
        {trend && (
          <span className="text-sm font-bold text-green-500 mb-1">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
