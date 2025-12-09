import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface SwitcherItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    alertCount?: number;
}

interface VisionCanvasSwitcherProps {
    items: SwitcherItem[];
    activeId: string;
    onChange: (id: string) => void;
    className?: string;
}

export const VisionCanvasSwitcher: React.FC<VisionCanvasSwitcherProps> = ({
    items,
    activeId,
    onChange,
    className
}) => {
    return (
        <div className={cn("glass-panel p-2 flex flex-col gap-1", className)}>
            {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onChange(item.id)}
                        className={cn(
                            "relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-left w-full outline-none",
                            isActive
                                ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {item.icon && (
                                <span className={cn(
                                    "transition-colors",
                                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                )}>
                                    {item.icon}
                                </span>
                            )}
                            <span className="font-medium text-sm">{item.label}</span>
                        </div>

                        {item.alertCount ? (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                                {item.alertCount}
                            </span>
                        ) : isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        )}

                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-blue-500 rounded-r-lg" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
