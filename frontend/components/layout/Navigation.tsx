'use client';

import { useState } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { LoadingLink } from '@/components/ui/loading-link';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { clearAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Users,
  User,
  LogOut,
  Menu,
  Settings,
  Settings2,
  MessageSquare
} from 'lucide-react';

import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function Navigation() {
  const { user } = useAuth();
  const { businessName } = useBusiness();
  const { isNavCollapsed, setIsNavCollapsed } = useNavigation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      {
        href: `/dashboard/${user.role.name.toLowerCase().replace(' ', '-')}`,
        label: 'Dashboard',
        icon: LayoutDashboard
      },
    ];

    switch (user.role.name) {
      case 'Superadmin':
        return [
          ...baseItems,
          { href: '/enquiries', label: 'Enquiries', icon: MessageSquare },
          { href: '/manage', label: 'Manage', icon: Settings2 },
        ];
      case 'Business Admin':
        return [
          ...baseItems,
          { href: `/sheets/${user.business_id}`, label: 'Returns', icon: FileSpreadsheet },
          { href: `/stats/${user.business_id}`, label: 'Analytics', icon: BarChart3 },
          { href: '/enquiries', label: 'Enquiries', icon: MessageSquare },
          { href: '/manage', label: 'Manage', icon: Settings2 }
        ];
      case 'User':
        return [
          ...baseItems,
          { href: `/sheets/${user.business_id}`, label: 'Returns', icon: FileSpreadsheet },
          { href: '/enquiries', label: 'Enquiries', icon: MessageSquare },
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  const NavContent = ({ showLabels = true, isMobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6">
          <div className={`flex items-center mb-8 ${showLabels ? 'justify-between' : 'flex-col justify-center gap-4'}`}>
            {showLabels && (
              <span className="text-lg font-bold text-slate-800 truncate max-w-[140px]">{businessName || 'Techezm'} RMA</span>
            )}

            {!isMobile && (
              <div className={`flex items-center ${showLabels ? 'gap-2' : 'flex-col-reverse gap-4'}`}>
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                  className="h-8 w-8"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <LoadingLink
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ${showLabels ? 'px-3 py-3 space-x-3' : 'px-2 py-4 justify-center'
                  }`}
                onClick={() => {
                  setIsOpen(false);
                  // Auto-collapse navbar after navigation (with small delay to show the loading state)
                  setTimeout(() => {
                    setIsNavCollapsed(true);
                  }, 500);
                }}
                title={!showLabels ? item.label : undefined}
              >
                <item.icon className={showLabels ? "h-5 w-5" : "h-10 w-10"} />
                {showLabels && <span className="font-medium">{item.label}</span>}
              </LoadingLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="space-y-2">
          <LoadingLink
            href="/profile"
            className={`flex items-center rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 w-full ${showLabels ? 'px-3 py-3 space-x-3' : 'px-2 py-4 justify-center'
              }`}
            onClick={() => {
              setIsOpen(false);
              // Auto-collapse navbar after navigation
              setTimeout(() => {
                setIsNavCollapsed(true);
              }, 500);
            }}
            title={!showLabels ? 'Profile' : undefined}
          >
            <User className={showLabels ? "h-4 w-4" : "h-8 w-8"} />
            {showLabels && <span className="text-sm font-medium">Profile</span>}
          </LoadingLink>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`flex items-center rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 w-full transition-all duration-200 ${showLabels ? 'px-3 py-3 space-x-3 justify-start' : 'px-2 py-4 justify-center'
              }`}
            title={!showLabels ? 'Logout' : undefined}
          >
            <LogOut className={showLabels ? "h-4 w-4" : "h-8 w-8"} />
            {showLabels && <span className="text-sm font-medium">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200 transition-all duration-300 z-50 ${isNavCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}>
        <NavContent showLabels={!isNavCollapsed} />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-lg font-bold text-slate-800">{businessName || 'Techezm'} RMA</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <NavContent showLabels={true} isMobile={true} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div className="h-16" />
      </div>
    </>
  );
}