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

    // Polling logic
    useEffect(() => {
        if (!user) return;

        const isTechezm = user.username?.toLowerCase().startsWith('cs');
        const myTeamStatus = isTechezm ? 'Awaiting Techezm' : 'Awaiting Business';
        const myTeamName = isTechezm ? 'Techezm Team' : 'Business Team';

        const pollEnquiries = async () => {
            try {
                const enquiries = await apiClient.request('/enquiries');

                const now = new Date();
                const newNotifications: NotificationItem[] = [];

                enquiries.forEach((enquiry: any) => {
                    const updatedAt = new Date(enquiry.updated_at);
                    const createdAt = new Date(enquiry.created_at);

                    // Check if enquiry was updated AFTER our last poll
                    if (updatedAt > lastPolledAt.current) {
                        // Check if it's waiting for MY team
                        if (enquiry.status === myTeamStatus) {
                            // Check for silent creation
                            const isCreation = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 2000; // 2 seconds tolerance
                            const isSilent = enquiry.description?.startsWith('[SILENT]');

                            if (isCreation && isSilent) {
                                return; // Skip notification
                            }

                            const notification: NotificationItem = {
                                id: `${enquiry.id}-${updatedAt.getTime()}`,
                                title: 'Action Required',
                                message: `Enquiry #${enquiry.order_number} is awaiting ${myTeamName}.`,
                                timestamp: now.toISOString(),
                                read: false,
                                link: `/enquiries/${enquiry.id}`,
                                type: 'warning'
                            };
                            newNotifications.push(notification);

                            // Send browser notification
                            if (Notification.permission === 'granted') {
                                new Notification(notification.title, {
                                    body: notification.message,
                                    icon: '/favicon.ico'
                                });
                            }
                        }
                    }
                });

                if (newNotifications.length > 0) {
                    setNotifications(prev => [...newNotifications, ...prev]);
                }

                lastPolledAt.current = now;
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        const intervalId = setInterval(pollEnquiries, 60000); // 60 seconds

        return () => clearInterval(intervalId);
    }, [user]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
