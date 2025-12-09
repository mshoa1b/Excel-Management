import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface VisionKpiOrbitProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
    trend?: {
        value?: number;
        direction: 'up' | 'down' | 'neutral';
    };
    className?: string;
}

export const VisionKpiOrbit: React.FC<VisionKpiOrbitProps> = ({
    label,
    value,
    subValue,
    icon,
    trend,
    className
}) => {
    return (
        <div className={cn("kpi-orbit kpi-orbit-ring p-5 flex flex-col justify-between h-full min-h-[140px]", className)}>
            <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                    {icon && <div className="text-slate-500 dark:text-slate-400">{icon}</div>}
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {label}
                    </span>
                </div>
            </div>

            <div className="relative z-10 mt-4">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {value}
                </div>

                {(subValue || trend) && (
                    <div className="flex items-center gap-2 mt-1">
                        {trend && (
                            <div className={cn(
                                "flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-md",
                                trend.direction === 'up' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                    trend.direction === 'down' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                        "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            )}>
                                {trend.direction === 'up' && <ArrowUp className="w-3 h-3 mr-1" />}
                                {trend.direction === 'down' && <ArrowDown className="w-3 h-3 mr-1" />}
                                {trend.direction === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
                                {trend.value && `${Math.abs(trend.value)}%`}
                            </div>
                        )}
                        {subValue && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                {subValue}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
