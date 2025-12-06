// Test Browser Notifications
// Run this in the browser console after logging in

// 1. Check if notifications are supported
console.log('Notification supported:', 'Notification' in window);

// 2. Check permission status
console.log('Permission status:', Notification.permission);

// 3. Request permission if needed
if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
        console.log('Permission granted:', permission);
    });
}

// 4. Test notification (will only show if page is not visible)
// Open this in console, then switch tabs
setTimeout(() => {
    if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
            body: 'This is a test from the console!',
            icon: '/favicon.ico'
        });
        console.log('Test notification sent!');
    } else {
        console.log('Permission not granted');
    }
}, 5000); // 5 second delay - switch tabs after running this

console.log('Test scheduled - switch to another tab in 5 seconds!');
