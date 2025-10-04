/// <reference lib="webworker" />
// Basic service worker to be used by VitePWA (if using injectManifest mode in future)
// Currently unused because we rely on generateSW. Keeping for future customizations.
export { }; // make this a module

self.addEventListener('message', (event) => {
    // Allow page to trigger immediate activation
    if (event.data && event.data.type === 'SKIP_WAITING') {
        // @ts-ignore
        self.skipWaiting?.();
    }
});

self.addEventListener('install', () => {
    // no-op: GenerateSW will handle precache
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // @ts-ignore
        await self.clients?.claim?.();
    })());
});
