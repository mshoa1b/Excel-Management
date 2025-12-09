import React from 'react';
import Link from 'next/link';

interface VisionNavTabProps {
    label: string;
    href: string;
    active: boolean;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export const VisionNavTab: React.FC<VisionNavTabProps> = ({
    label,
    href,
    active,
    icon,
    disabled
}) => {
    if (disabled) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50">
                {icon && <span className="w-4 h-4">{icon}</span>}
                <span className="text-sm font-medium">{label}</span>
            </div>
        );
    }

    return (
        <Link
            href={href}
            className={`
        relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ease-out
        ${active
                    ? 'bg-white/20 dark:bg-slate-800/40 backdrop-blur-md text-slate-900 dark:text-white shadow-lg shadow-black/5 ring-1 ring-white/20 dark:ring-slate-700/50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/10 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-slate-200'
                }
      `}
        >
            {active && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            )}
            {icon && <span className={`w-4 h-4 ${active ? 'text-blue-500 dark:text-blue-400' : 'opacity-70'}`}>{icon}</span>}
            <span className="text-sm font-medium tracking-wide">{label}</span>

            {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-500/50 rounded-full blur-[1px]" />
            )}
        </Link>
    );
};
