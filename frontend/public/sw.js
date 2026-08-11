// ProjectFlow Service Worker - handles push notification clicks

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const link = event.notification.data && event.notification.data.link
        ? event.notification.data.link
        : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // If a tab is already open, focus it and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    client.focus();
                    client.navigate(link);
                    return;
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(link);
            }
        })
    );
});
