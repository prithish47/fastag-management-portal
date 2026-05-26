import React, { useState } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import {
  BookOpen, CheckCircle2, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp,
  CreditCard, ShieldCheck, Car, HelpCircle, Eye, RefreshCw, FileText
} from 'lucide-react';

const usageRules = [
  {
    icon: Car,
    title: 'One FASTag Per Vehicle',
    desc: 'Each vehicle must have a unique tag linked to its registration number. Using a single tag on multiple vehicles is illegal and leads to blacklist status.'
  },
  {
    icon: CreditCard,
    title: 'Maintain Minimum Wallet Balance',
    desc: 'Keep a minimum balance of ₹100 in your wallet before traveling. Low balances will result in status degradation and delays at toll plazas.'
  },
  {
    icon: RefreshCw,
    title: 'Keep Vehicle Details Updated',
    desc: 'Any change in vehicle ownership, registration status, class, or license plate must be reported immediately to prevent account suspension.'
  },
  {
    icon: BookOpen,
    title: 'Use Only NETC-Enabled Lanes',
    desc: 'Ensure you enter dedicated electronic toll lanes marked with the FASTag logo. Entering cash/hybrid lanes may cause manual processing charges.'
  }
];

const docGuidelines = [
  {
    title: 'RC Book Upload',
    desc: 'Upload a clear, legible color scan of both front and back pages of your original Registration Certificate. Cropped, blurry, or black-and-white copies will be rejected.'
  },
  {
    title: 'Engine & Chassis Validation',
    desc: 'The engine and chassis numbers entered during registration must match the uploaded RC book scan character-for-character. Missing characters will delay processing.'
  },
  {
    title: 'Pending Review Workflow',
    desc: 'Upon registration, the vehicle is placed in "PENDING" review status. Verification usually takes 2 to 24 hours. You will receive real-time notifications on status changes.'
  },
  {
    title: 'Rejected Verification Cases',
    desc: 'If verification fails, you will see a "REJECTED" status chip on your dashboard. You must re-upload the correct documents with matched details to activate the tag.'
  }
];

const securityAlerts = [
  {
    icon: ShieldAlert,
    title: 'Beware of Phishing Sites',
    desc: 'Only recharge your wallet via official GI Technology FASTag channels or authorized banking apps. Never visit unauthorized third-party links.',
    type: 'warn'
  },
  {
    icon: ShieldCheck,
    title: 'Keep Credentials Secure',
    desc: 'GI Technology employees will never ask for your account password, security PIN, or transaction OTPs. Do not share these with anyone.',
    type: 'safe'
  },
  {
    icon: ShieldAlert,
    title: 'Transaction Alerts',
    desc: 'Enable SMS and email notifications. Immediately report any unauthorized toll charge or balance discrepancy to our grievance cell.',
    type: 'info'
  }
];

const bestPractices = [
  { title: 'Windshield Placement', desc: 'Affix the tag inside your vehicle’s windshield behind the rearview mirror. Ensure it is clean and visible from the outside.' },
  { title: 'Maintain Distance', desc: 'Maintain a minimum distance of one vehicle length (approx 4 meters) from the gate sensor to ensure seamless scanning.' },
  { title: 'Toll Speed Limit', desc: 'Slow down to 10 km/h when entering the scanning zone. Do not tail closely behind the preceding vehicle.' }
];

const faqs = [
  {
    q: 'Can one user own and manage multiple vehicles?',
    a: 'Yes. You can register and manage an unlimited number of vehicles under a single corporate or individual wallet account. Each vehicle will have its own individual FASTag assigned.'
  },
  {
    q: 'What happens if my wallet balance falls below the minimum threshold?',
    a: 'If your wallet balance is below ₹100, your tag status will turn to "INACTIVE" or "LOW_BALANCE". You must recharge your wallet instantly via UPI, Cards, or Net Banking to reactivate it before crossing the next toll.'
  },
  {
    q: 'Can FASTag be transferred to another vehicle?',
    a: 'No. Once a FASTag is assigned and glued to a specific vehicle’s windshield, it cannot be peeled off and applied to another vehicle. Doing so will damage the RFID chip inside and void the tag.'
  },
  {
    q: 'Why was my vehicle registration or verification rejected?',
    a: 'The most common reasons for rejection include blurry or unreadable RC book uploads, mismatched engine/chassis numbers, or registering a vehicle under an incorrect vehicle class (e.g. VC4 instead of VC7).'
  },
  {
    q: 'How long does it take for my uploaded documents to be verified?',
    a: 'Our operations team reviews and validates all submitted registration certificates within 2 to 24 hours. The verification status chip on your dashboard will update in real time.'
  }
];

export default function Guidelines() {
  usePageTitle('Guidelines');
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex-grow bg-[#f8fafc] font-sans pb-16">

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <div className="bg-[#00478F] pt-16 pb-24 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="gd-g" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gd-g)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-[#f39c12]" />
            Regulatory Rules
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            FASTag Usage Guidelines
          </h1>
          <p className="text-blue-100 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
            Important operational rules, security protocols, and vehicle verification guidelines for GI Technology FASTag users.
          </p>
        </div>
      </div>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 relative z-20 -mt-10 space-y-10">

        {/* ── 1. Usage Rules ────────────────────────────────────────────── */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Standard Rules</p>
            <h2 className="text-xl font-bold text-slate-900">FASTag Usage Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {usageRules.map((rule, index) => (
              <div key={index} className="flex flex-col h-full bg-slate-50/50 p-5 rounded-xl border border-slate-200/60">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-4 shrink-0">
                  <rule.icon className="w-4.5 h-4.5 text-[#00478F]" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{rule.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Document Verification ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-4 bg-[#00478F] rounded-xl p-8 relative overflow-hidden flex flex-col justify-between">
            {/* Subtle grid */}
            <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="gd-p" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.75" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gd-p)" />
              </svg>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-[#f39c12]" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                Document<br />Verification
              </h2>
              <p className="text-blue-100 text-xs leading-relaxed">
                Our verification process links your vehicle's physical Registration Certificate to the National Electronic Toll Collection system securely.
              </p>
            </div>

            <div className="relative z-10 pt-8 border-t border-white/10 mt-8 text-[11px] text-blue-200 font-semibold uppercase tracking-wider">
              GI Technology Operations Center
            </div>
          </div>

          <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {docGuidelines.map((guideline, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">{guideline.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{guideline.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Security & Fraud Prevention ────────────────────────────── */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Security Alert</p>
              <h2 className="text-xl font-bold text-slate-900">Security &amp; Fraud Prevention</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {securityAlerts.map((alert, index) => {
              const bg = alert.type === 'warn' ? 'bg-amber-50/50 border-amber-200/70' : alert.type === 'safe' ? 'bg-emerald-50/30 border-emerald-200/50' : 'bg-blue-50/30 border-blue-200/50';
              const text = alert.type === 'warn' ? 'text-amber-700' : alert.type === 'safe' ? 'text-emerald-700' : 'text-[#00478F]';
              return (
                <div key={index} className={`p-5 rounded-xl border ${bg} flex flex-col justify-between`}>
                  <div className="space-y-3">
                    <alert.icon className={`w-5 h-5 ${text} shrink-0`} />
                    <h3 className="text-sm font-bold text-slate-900 leading-none">{alert.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{alert.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Toll Plaza Best Practices ────────────────────────────── */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Toll Gate Protocol</p>
            <h2 className="text-xl font-bold text-slate-900">Toll Plaza Best Practices</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bestPractices.map((practice, index) => (
              <div key={index} className="flex gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200/60">
                <div className="w-8 h-8 rounded-full bg-[#00478F] flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{practice.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{practice.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. FAQs Accordion ─────────────────────────────────────────── */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-1">Support</p>
            <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-slate-100 max-w-3xl">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex justify-between items-center w-full text-left font-semibold text-slate-800 text-sm hover:text-[#00478F] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-4" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-4" />}
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isOpen ? 'max-h-40 opacity-100 mt-2.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>



      </div>
    </div>
  );
}
