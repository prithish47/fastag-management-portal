import React, { useState, useEffect } from 'react';
import axios from 'axios';
import usePageTitle from '../hooks/usePageTitle';
import {
  Info, CheckCircle2, ListChecks, HelpCircle, Activity,
  Clock, MessageSquare, CreditCard, Wallet, Monitor, Loader2
} from 'lucide-react';

export default function AboutFastag() {
  usePageTitle('About FASTag');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/info/about-fastag');
        setData(response.data);
      } catch (err) {
        setError("Failed to load FASTag information. Please check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getBenefitIcon = (index) => {
    const icons = [Clock, MessageSquare, CreditCard, Wallet, Monitor];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-4.5 h-4.5 text-[#f39c12]" />;
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-slate-50 min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#00478F] animate-spin" />
          <span className="text-slate-500 font-medium text-sm">Loading Information…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex items-center justify-center bg-slate-50 min-h-[70vh]">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-md">
          <HelpCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Oops!</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-[#f8fafc] font-sans pb-16">

      {/* ── Banner matching Home Hero style ─────────────────────────────── */}
      <div className="bg-[#00478F] pt-16 pb-24 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ab-g" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ab-g)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6 shadow-sm">
            <Info className="w-3.5 h-3.5 text-[#f39c12]" />
            Information Center
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            {data.title}
          </h1>
          <p className="text-blue-100 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
            Everything you need to know about making your toll payments faster, easier, and completely digital.
          </p>
        </div>
      </div>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 relative z-20 -mt-10">

        {/* Overview Section */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm mb-10">
          <h2 className="text-base font-bold text-[#00478F] mb-4 flex items-center gap-2.5">
            <Activity className="w-4.5 h-4.5 text-[#f39c12] shrink-0" />
            What is FASTag?
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed font-medium">
            {data.description}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="mb-12">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Benefits</p>
            <h2 className="text-xl font-bold text-slate-900">How it helps you</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-full group hover:border-[#00478F]/30 transition-colors">
                <div className="w-9 h-9 bg-slate-50 group-hover:bg-[#00478F]/10 rounded-lg flex items-center justify-center mb-4 transition-colors shrink-0">
                  {getBenefitIcon(index)}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed flex-grow">
                  {benefit.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works Timeline */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Process</p>
              <h2 className="text-xl font-bold text-slate-900">How it works</h2>
            </div>
            <ListChecks className="w-6 h-6 text-slate-200" />
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-3.5 bottom-3.5 w-0.5 bg-slate-100 rounded-full" />

            <div className="space-y-8 relative z-10">
              {data.how_it_works.map((step, index) => (
                <div key={index} className="flex items-start gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00478F] flex items-center justify-center text-[#00478F] font-bold text-xs shadow-sm group-hover:bg-[#00478F] group-hover:text-white transition-colors duration-150 shrink-0 z-10">
                    {index + 1}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
