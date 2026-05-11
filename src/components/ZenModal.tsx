import React from 'react';
import { X } from 'lucide-react';

interface ZenModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-md', 'max-w-lg'
}

export function ZenModal({
  isOpen,
  onClose,
  theme,
  title,
  description,
  icon,
  children,
  maxWidthClass = 'max-w-md'
}: ZenModalProps) {
  if (!isOpen) return null;

  const themeClass = (dark: string, light: string) => theme === 'dark' ? dark : light;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/50 dark:bg-slate-955/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full border rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col transition-colors duration-300 ${maxWidthClass} ${
          themeClass('bg-slate-900 border-slate-800 text-slate-100', 'bg-white border-slate-200 text-slate-800')
        }`}
      >
        {/* Absolute Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-xl transition active:scale-90 cursor-pointer z-20 ${
            themeClass('text-slate-400 hover:text-white hover:bg-white/5', 'text-slate-505 hover:text-slate-900 hover:bg-black/5')
          }`}
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Header Title */}
        <div className="flex items-start gap-3 mb-5 text-left shrink-0">
          {icon && (
            <div className={`p-2 rounded-lg shrink-0 ${
              themeClass('bg-purple-500/10 text-purple-400', 'bg-purple-50 text-purple-600 shadow-sm')
            }`}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className={`text-sm font-black truncate ${themeClass('text-white', 'text-slate-900')}`}>{title}</h3>
            {description && (
              <p className={`text-[10px] font-medium mt-0.5 leading-normal ${themeClass('text-slate-400', 'text-slate-505')}`}>{description}</p>
            )}
          </div>
        </div>

        {/* Modal Content Body */}
        {children}
      </div>
    </div>
  );
}
