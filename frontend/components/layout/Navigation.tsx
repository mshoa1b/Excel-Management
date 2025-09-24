'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { clearAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  BarChart3, 
  Users, 
  Building2, 
  User, 
  LogOut, 
  Menu 
} from 'lucide-react';

export default function Navigation() {
  const { user } = useAuth();
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
          { href: '/businesses', label: 'Businesses', icon: Building2 },
          { href: '/users', label: 'Users', icon: Users },
        ];
      case 'Business Admin':
        return [
          ...baseItems,
          { href: `/sheets/${user.business_id}`, label: 'Sheets', icon: FileSpreadsheet },
          { href: `/stats/${user.business_id}`, label: 'Analytics', icon: BarChart3 },
        ];
      case 'User':
        return [
          ...baseItems,
          { href: `/sheets/${user.business_id}`, label: 'My Sheets', icon: FileSpreadsheet },
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="px-4 py-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">SaaS Manager</span>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{user?.username}</p>
            <p className="text-xs text-slate-500">{user?.role.name}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Link
            href="/profile"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 w-full"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Profile</span>
          </Link>
          
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 w-full justify-start transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-slate-200">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800">SaaS Manager</span>
            </div>
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <NavContent />
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