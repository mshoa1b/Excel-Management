'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface Notification {
  id: number;
  type: 'new_enquiry' | 'status_update';
  order_number: string;
  status: 'Awaiting Business' | 'Awaiting Techezm' | 'Resolved';
  message: string;
  created_at: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  checkForNewNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await apiClient.request('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [user]);

  const checkForNewNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await apiClient.request('/notifications/new');
      if (data.length > 0) {
        // Add new notifications to the existing list
        setNotifications(prev => [...data, ...prev]);
      }
    } catch (error) {
      console.error('Failed to check for new notifications:', error);
    }
  }, [user]);

  const markAsRead = async (notificationId: number) => {
    try {
      await apiClient.request(`/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.request('/notifications/read-all', {
        method: 'POST'
      });
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Check for new notifications every 30 seconds
      const interval = setInterval(checkForNewNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user, loadNotifications, checkForNewNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        checkForNewNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}