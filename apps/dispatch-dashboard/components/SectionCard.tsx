import React from 'react';

const SectionCard: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-bottom border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default SectionCard;
