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

  const NavContent = ({ showLabels = true }) => (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="px-4 py-6">
          <div className={`flex items-center mb-8 ${showLabels ? 'justify-start' : 'justify-center'}`}>
            {showLabels && (
              <span className="text-lg font-bold text-slate-800">{businessName || 'Techezm'} RMA</span>
            )}
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <LoadingLink
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ${
                  showLabels ? 'px-3 py-3 space-x-3' : 'px-2 py-4 justify-center'
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
        <div className={`flex items-center px-3 py-3 mb-2 ${showLabels ? 'space-x-3' : 'justify-center'}`}>
          <div className={`bg-slate-200 rounded-full flex items-center justify-center ${showLabels ? 'w-8 h-8' : 'w-12 h-12'}`}>
            <User className={`${showLabels ? "h-4 w-4" : "h-8 w-8"} text-slate-600`} />
          </div>
          {showLabels && (
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{user?.username}</p>
              <p className="text-xs text-slate-500">{user?.role.name}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <LoadingLink
            href="/profile"
            className={`flex items-center rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 w-full ${
              showLabels ? 'px-3 py-3 space-x-3' : 'px-2 py-4 justify-center'
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
            className={`flex items-center rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 w-full transition-all duration-200 ${
              showLabels ? 'px-3 py-3 space-x-3 justify-start' : 'px-2 py-4 justify-center'
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
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200 transition-all duration-300 z-50 ${
        isNavCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        {/* Toggle Button inside navbar */}
        <div className="absolute top-4 right-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-2"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        
        <NavContent showLabels={!isNavCollapsed} />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-lg font-bold text-slate-800">{businessName || 'Techezm'} RMA</span>
            </div>
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <NavContent showLabels={true} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Spacer for fixed header */}
        <div className="h-16" />
      </div>
    </>
  );
}