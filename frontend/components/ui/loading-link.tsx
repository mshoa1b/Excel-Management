'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

interface LoadingLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
}

export const LoadingLink: React.FC<LoadingLinkProps> = ({ 
  children, 
  onClick, 
  ...props 
}) => {
  const { startNavigation } = useLoading();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only trigger loading for internal navigation (not external links)
    if (props.href && typeof props.href === 'string' && props.href.startsWith('/')) {
      // Check if we're already on the target page
      if (pathname === props.href) {
        console.log('Already on target page, skipping navigation loading');
        // Still call the original onClick if provided
        if (onClick) {
          onClick(e);
        }
        return;
      }
      
      startNavigation();
    }
    
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
};