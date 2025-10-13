'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLoading } from '@/contexts/LoadingContext';

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  showGlobalLoader?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  children, 
  onClick, 
  showGlobalLoader = false,
  disabled,
  ...props 
}) => {
  const { setLoading } = useLoading();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (showGlobalLoader) {
      setLoading(true);
    }
    
    try {
      if (onClick) {
        await onClick(e);
      }
    } finally {
      if (showGlobalLoader) {
        // Small delay to ensure navigation has started
        setTimeout(() => setLoading(false), 100);
      }
    }
  };

  return (
    <Button {...props} onClick={handleClick} disabled={disabled}>
      {children}
    </Button>
  );
};