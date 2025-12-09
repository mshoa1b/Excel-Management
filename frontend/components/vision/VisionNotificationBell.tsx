'use client';
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VisionGlassCard } from './VisionGlassCard';
import { apiClient } from '@/lib/api';

// Using a simplified version of existing notification logic but with Vision UI
export const VisionNotificationBell: React.FC<{
    count?: number;
}> = ({ count = 0 }) => {
    const [unreadCount, setUnreadCount] = useState(count);

    // In a real implementation we would fetch notifications here or receive them via props
    // For now, preserving the "bell" UI and dropdown slot

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none relative group">
                <div className={`
          p-2 rounded-full transition-all duration-300
          ${unreadCount > 0
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
        `}>
                    <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce-subtle' : ''}`} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                    )}
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 p-0 border-none bg-transparent shadow-none">
                <VisionGlassCard className="flex flex-col max-h-[400px]">
                    <div className="p-3 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Notifications</h4>
                        {unreadCount > 0 && (
                            <button className="text-xs text-blue-500 hover:text-blue-600">Mark all read</button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-slate-500 min-h-[150px]">
                        {unreadCount === 0 ? (
                            <>
                                <Bell className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-xs opacity-70">No new notifications</p>
                            </>
                        ) : (
                            <p className="text-xs">You have updates.</p>
                        )}
                    </div>
                </VisionGlassCard>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
