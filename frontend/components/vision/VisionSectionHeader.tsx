import React from 'react';
import { cn } from '@/lib/utils';

interface VisionSectionHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const VisionSectionHeader: React.FC<VisionSectionHeaderProps> = ({
    title,
    description,
    actions,
    className
}) => {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white glow-sm">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
};
