import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface VisionInsightCanvasProps {
    title: string;
    description?: string;
    toolbar?: React.ReactNode;
    children: React.ReactNode;
    loading?: boolean;
    className?: string;
    contentClassName?: string;
}

export const VisionInsightCanvas: React.FC<VisionInsightCanvasProps> = ({
    title,
    description,
    toolbar,
    children,
    loading,
    className,
    contentClassName
}) => {
    return (
        <section className={cn("glass-panel p-5 flex flex-col h-full", className)}>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                <div>
                    <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
                {toolbar && (
                    <div className="flex items-center gap-2">
                        {toolbar}
                    </div>
                )}
            </header>

            <div className={cn("relative flex-1 min-h-[300px] w-full", contentClassName)}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm rounded-xl z-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    children
                )}
            </div>
        </section>
    );
};
