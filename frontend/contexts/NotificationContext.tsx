'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { showBrowserNotification, requestNotificationPermission } from '@/lib/browserNotification';
import { useRouter } from 'next/navigation';

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
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastPolledAt = useRef<Date>(new Date());
    const previousNotifications = useRef<NotificationItem[]>([]);

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
        requestNotificationPermission();
    }, []);

    // Save to local storage and update tab title whenever notifications change
    useEffect(() => {
        localStorage.setItem('enquiry_notifications', JSON.stringify(notifications));
        const unread = notifications.filter(n => !n.read).length;
        setUnreadCount(unread);

        // Update browser tab title with notification count
        if (unread > 0) {
            document.title = `(${unread}) Techezm RMA`;
        } else {
            document.title = 'Techezm RMA';
        }
    }, [notifications]);

    // Load from API on mount and poll every minute
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            try {
                const data = await apiClient.getNotifications();

                // Detect new notifications by comparing with previous state
                if (previousNotifications.current.length > 0) {
                    const previousIds = new Set(previousNotifications.current.map(n => n.id));
                    const newNotifications = data.filter((n: NotificationItem) =>
                        !previousIds.has(n.id) && !n.read
                    );

                    console.log('🔔 Checking for new notifications...', {
                        previousCount: previousNotifications.current.length,
                        currentCount: data.length,
                        newCount: newNotifications.length
                    });

                    // Show browser notifications for new unread notifications
                    for (const notification of newNotifications) {
                        console.log('🔔 Triggering browser notification:', notification.title);
                        showBrowserNotification({
                            title: notification.title,
                            body: notification.message,
                            tag: notification.id,
                            data: { link: notification.link },
                            onClick: () => {
                                if (notification.link) {
                                    router.push(notification.link);
                                }
                            }
                        });
                    }
                } else {
                    console.log('🔔 First notification fetch - no browser notifications triggered');
                }

                // Update state
                previousNotifications.current = data;
                setNotifications(data);
                setUnreadCount(data.filter((n: NotificationItem) => !n.read).length);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000); // 30 seconds

        return () => clearInterval(intervalId);
    }, [user, router]);

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
