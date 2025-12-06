/**
 * Browser Notification Utility
 * Handles browser push notifications with permission management and click handling
 */

export interface BrowserNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
}

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) {
        console.warn('Browser notifications are not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
}

/**
 * Show a browser notification
 */
export async function showBrowserNotification(
    options: BrowserNotificationOptions
): Promise<Notification | null> {
    if (!isNotificationSupported()) {
        console.warn('Browser notifications are not supported');
        return null;
    }

    // Check permission
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            tag: options.tag,
            data: options.data,
            badge: options.icon || '/favicon.ico',
            requireInteraction: false,
        });

        console.log('✅ Browser notification displayed:', options.title);

        // Handle click event
        if (options.onClick) {
            notification.onclick = () => {
                window.focus();
                options.onClick?.();
                notification.close();
            };
        }

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    } catch (error) {
        console.error('Error showing browser notification:', error);
        return null;
    }
}

/**
 * Check if we should show browser notifications
 * (permission granted)
 */
export function shouldShowBrowserNotification(): boolean {
    return (
        isNotificationSupported() &&
        getNotificationPermission() === 'granted'
    );
}
