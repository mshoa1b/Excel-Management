'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart3,
    MessageSquare,
    FileSpreadsheet,
    Settings2,
    Menu,
    LogOut,
    User,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { VisionNavTab } from './VisionNavTab';
import { VisionBusinessSelector } from './VisionBusinessSelector';
import { VisionNotificationBell } from './VisionNotificationBell';

export const VisionTopNav: React.FC = () => {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const handleLogout = () => {
        clearAuth();
        router.push('/login');
    };

    const businessId = user.business_id;

    // Define navigation items based on Role
    const getNavItems = () => {
        const baseItems = [];

        // 1. Dashboard Logic
        // Redirects to role-specific dashboard
        const dashboardLink = `/dashboard/${user.role.name.toLowerCase().replace(' ', '-')}`;
        baseItems.push({ href: dashboardLink, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> });

        // 2. Role Specifics
        switch (user.role.name) {
            case 'Superadmin':
                return [
                    ...baseItems,
                    { href: '/enquiries', label: 'Enquiries', icon: <MessageSquare className="w-4 h-4" /> },
                    { href: '/manage', label: 'Platform Admin', icon: <Settings2 className="w-4 h-4" /> },
                ];
            case 'Business Admin':
                return [
                    ...baseItems,
                    { href: `/stats/${businessId}`, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
                    { href: `/sheets/${businessId}`, label: 'RMA Sheets', icon: <FileSpreadsheet className="w-4 h-4" /> },
                    { href: '/enquiries', label: 'Enquiries', icon: <MessageSquare className="w-4 h-4" /> },
                    { href: '/manage', label: 'Business Settings', icon: <Settings2 className="w-4 h-4" /> }
                ];
            case 'User':
                return [
                    ...baseItems,
                    { href: `/sheets/${businessId}`, label: 'My Returns', icon: <FileSpreadsheet className="w-4 h-4" /> },
                    { href: '/enquiries', label: 'Support', icon: <MessageSquare className="w-4 h-4" /> },
                ];
            default:
                return baseItems;
        }
    };

    const navItems = getNavItems();
    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    return (
        <>
            <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 lg:px-8 border-b border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-glass-sm transition-all duration-300">

                {/* LEFT: Logo & Business */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
                            T
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Techezm RMA</h1>
                            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">{user.role.name}</span>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                    <VisionBusinessSelector />
                </div>

                {/* CENTER: Navigation Tabs (Desktop) */}
                <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {navItems.map((item) => (
                        <VisionNavTab
                            key={item.href}
                            {...item}
                            active={isActive(item.href)}
                        />
                    ))}
                </nav>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-3">
                    <VisionNotificationBell count={0} />

                    <div className="hidden md:flex items-center gap-2">
                        {/* New Sheet Button - Only if allowed */}


                        <Button variant="ghost" size="icon" className="rounded-full w-9 h-9" title="Profile">
                            <User className="w-5 h-5 text-slate-500" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full w-9 h-9 hover:text-red-500" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Mobile Menu Trigger */}
                    <div className="lg:hidden">
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] border-l border-white/20 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl p-0">
                                <div className="p-6 space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Navigation</h3>
                                        <p className="text-xs text-slate-500">Welcome, {user.username}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {navItems.map((item) => (
                                            <VisionNavTab
                                                key={item.href}
                                                {...item}
                                                active={isActive(item.href)}
                                            />
                                        ))}
                                    </div>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

                                    <div className="space-y-2">
                                        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Logout
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

            </header>

            {/* Spacer to prevent content overlap */}
            <div className="h-16 w-full" />
        </>
    );
};
