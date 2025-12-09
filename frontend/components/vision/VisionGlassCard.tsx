import React from 'react';
import { cn } from '@/lib/utils';

interface VisionGlassCardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'interactive';
    accent?: 'primary' | 'danger' | 'warning' | 'none';
    onClick?: () => void;
}

export const VisionGlassCard: React.FC<VisionGlassCardProps> = ({
    children,
    className,
    variant = 'default',
    accent = 'none',
    onClick
}) => {
    const variantStyles = {
        default: 'glass-panel',
        elevated: 'glass-panel shadow-glass-elevated',
        interactive: 'glass-panel glass-panel-hover'
    };

    const accentStyles = {
        none: '',
        primary: 'border-l-4 border-l-blue-500/80',
        danger: 'border-l-4 border-l-red-500/80',
        warning: 'border-l-4 border-l-amber-500/80'
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative overflow-hidden p-5 transition-all duration-300',
                variantStyles[variant],
                accentStyles[accent],
                className
            )}
        >
            {/* Optional gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
};
