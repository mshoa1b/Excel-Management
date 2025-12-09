import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface Anomaly {
    id: string;
    type: string;
    label: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
}

interface VisionAnomalyPulseProps {
    anomalies: Anomaly[];
    className?: string;
}

export const VisionAnomalyPulse: React.FC<VisionAnomalyPulseProps> = ({
    anomalies,
    className
}) => {
    if (!anomalies.length) return null;

    const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;

    return (
        <div className={cn("fixed bottom-6 right-6 z-50", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <button className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95">
                        <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
                        <AlertTriangle className={cn("w-6 h-6", highSeverityCount > 0 ? "text-rose-500" : "text-amber-500")} />

                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm">
                            {anomalies.length}
                        </span>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 mr-6 mb-2 border-none shadow-2xl bg-transparent" side="top" align="end">
                    <div className="glass-panel overflow-hidden">
                        <div className="bg-rose-500/10 p-3 border-b border-rose-500/20 flex items-center justify-between">
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <AlertOctagon className="w-4 h-4" />
                                System Anomalies Detected
                            </span>
                            <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded-md font-mono">{anomalies.length}</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                            {anomalies.map((anomaly) => (
                                <div key={anomaly.id} className="p-3 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50">
                                    <div className="flex items-start justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{anomaly.label}</span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 rounded uppercase font-bold tracking-wider",
                                            anomaly.severity === 'high' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" :
                                                anomaly.severity === 'medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        )}>
                                            {anomaly.severity}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {anomaly.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
