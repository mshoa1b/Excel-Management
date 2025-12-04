'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, CheckCheck, Bell } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
    const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const router = useRouter();

    const handleItemClick = (notification: any) => {
        markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    return (
        <ProtectedRoute requiredRole="User">
            <DashboardLayout>
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => markAllAsRead()}
                                disabled={notifications.length === 0 || notifications.every(n => n.read)}
                            >
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark all read
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('Are you sure you want to clear all notifications?')) {
                                        clearNotifications();
                                    }
                                }}
                                disabled={notifications.length === 0}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear history
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Bell className="h-5 w-5" />
                                <span>All Notifications</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {notifications.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No notifications found</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-4 ${!notification.read ? 'bg-blue-50/50' : ''
                                                }`}
                                            onClick={() => handleItemClick(notification)}
                                        >
                                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-blue-600' : 'bg-transparent'
                                                }`} />

                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-base ${!notification.read ? 'font-semibold' : 'font-medium'} text-slate-900`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
