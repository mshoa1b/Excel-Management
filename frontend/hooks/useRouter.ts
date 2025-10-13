'use client';

import { useRouter as useNextRouter, usePathname } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

export const useRouter = () => {
  const router = useNextRouter();
  const pathname = usePathname();
  const { startNavigation, stopNavigation } = useLoading();

  const push = (href: string) => {
    // Check if we're already on the target page
    if (pathname === href) {
      console.log('Already on target page, skipping navigation loading');
      return;
    }
    
    startNavigation();
    router.push(href);
  };

  const replace = (href: string) => {
    // Check if we're already on the target page
    if (pathname === href) {
      console.log('Already on target page, skipping navigation loading');
      return;
    }
    
    startNavigation();
    router.replace(href);
  };

  const back = () => {
    startNavigation();
    router.back();
  };

  const forward = () => {
    startNavigation();
    router.forward();
  };

  const refresh = () => {
    startNavigation();
    router.refresh();
  };

  return {
    push,
    replace,
    back,
    forward,
    refresh,
    prefetch: router.prefetch,
  };
};