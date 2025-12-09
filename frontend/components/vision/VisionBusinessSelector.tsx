'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { apiClient } from '@/lib/api';
import { ChevronDown, Building2, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const VisionBusinessSelector: React.FC = () => {
    const { user } = useAuth();
    const { businessName, updateBusinessName, business } = useBusiness();
    const [businesses, setBusinesses] = useState<{ id: number, name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const canSwitch = user?.role?.name === 'Superadmin';

    useEffect(() => {
        if (canSwitch) {
            const fetchBiz = async () => {
                try {
                    const res = await apiClient.getBusinesses();
                    setBusinesses(res || []);
                } catch (e) {
                    console.error(e);
                }
            };
            fetchBiz();
        }
    }, [canSwitch]);

    if (!user) return null;

    const displayName = businessName || business?.name || 'Techezm RMA';

    if (!canSwitch) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 dark:bg-slate-800/30 border border-white/10 dark:border-slate-700/30">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayName}</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 dark:bg-slate-800/40 border border-white/20 dark:border-slate-700/50 hover:bg-white/20 transition-colors cursor-pointer group">
                    <Building2 className="w-4 h-4 text-blue-500 group-hover:text-blue-400 transition-colors" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{displayName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-white/20 dark:border-slate-800">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Select Business
                </div>
                {businesses.map((b) => (
                    <DropdownMenuItem
                        key={b.id}
                        className="flex items-center justify-between cursor-pointer focus:bg-blue-500/10 focus:text-blue-500"
                        onClick={() => {
                            // In a real app, this would trigger a context switch or navigation.
                            // For now, let's just update the local context name (simulated switch)
                            // or reload the page with new business params if we were on a generic page.
                            // We'll leave it as a UI demo for Superadmin for now.
                            console.log('Switching to', b.name);
                        }}
                    >
                        <span>{b.name}</span>
                        {b.name === displayName && <Check className="w-3 h-3 text-blue-500" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
