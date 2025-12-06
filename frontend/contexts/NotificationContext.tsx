'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link: string;
    type: 'info' | 'warning' | 'success';
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastPolledAt = useRef<Date>(new Date());

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('enquiry_notifications');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed);
                setUnreadCount(parsed.filter((n: NotificationItem) => !n.read).length);
            } catch (e) {
                console.error('Failed to parse notifications', e);
            }
        }

        // Request notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    // Save to local storage whenever notifications change
    useEffect(() => {
        localStorage.setItem('enquiry_notifications', JSON.stringify(notifications));
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    // Load from API on mount and poll every minute
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            try {
                const data = await apiClient.getNotifications();
                // Merge with local state to avoid flickering if possible, or just replace
                // For simplicity, replacing:
                setNotifications(data);
                setUnreadCount(data.filter((n: NotificationItem) => !n.read).length);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 60000); // 60 seconds

        return () => clearInterval(intervalId);
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            await apiClient.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            clearNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
