import React from 'react';
import { Link } from 'react-router-dom';
import { Car, MoreVertical, CreditCard, FileCheck } from 'lucide-react';

const FASTAG_BADGE = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  BLOCKED:  'bg-red-50 text-red-600 ring-1 ring-red-200',
  default:  'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const RC_BADGE = {
  VERIFIED: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  PENDING:  'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  REJECTED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  default:  'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

function Badge({ label, map, value }) {
  const cls = map[value] || map.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${cls}`}>
      {label}: {(value || '—').replace(/_/g, ' ')}
    </span>
  );
}

export default function VehicleCard({ vehicle }) {
  const fastagStatus       = vehicle.fastag_status || 'INACTIVE';
  const verificationStatus = vehicle.rc_verification_status || vehicle.rc_status || vehicle.verification_status || 'PENDING';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150 group">

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-[#00478F]/20 group-hover:bg-blue-50/50 transition-colors">
            <Car className="w-4 h-4 text-slate-400 group-hover:text-[#00478F] transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight font-mono leading-none">
              {vehicle.vehicle_number}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-none">
              {vehicle.vehicle_type || 'Vehicle'} &middot; {vehicle.vehicle_class}
            </p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge label="FASTag" map={FASTAG_BADGE} value={fastagStatus} />
        <Badge label="RC"     map={RC_BADGE}     value={verificationStatus} />
      </div>

      {/* Actions */}
      <div className="flex">
        <Link to={`/vehicle/${vehicle.vehicle_id}`} className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:border-[#00478F]/30 hover:text-[#00478F] hover:bg-blue-50/50 transition-colors">
          <FileCheck className="w-3.5 h-3.5" />
          Details
        </Link>
      </div>
    </div>
  );
}
