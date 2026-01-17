/**
 * Service Worker Registration and Management
 * Handles PWA offline support and caching strategies
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported in this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    console.log('✅ Service Worker registered successfully:', registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, notify user
            console.log('✅ New Service Worker available - update pending');
            notifyUpdate();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
  }
}

/**
 * Unregister service worker (for cleanup)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('✅ Service Workers unregistered');
  } catch (error) {
    console.error('❌ Failed to unregister Service Worker:', error);
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

/**
 * Notify user about service worker update
 */
function notifyUpdate() {
  // Check if there's a message handler in the service worker controller
  if (navigator.serviceWorker.controller) {
    // Dispatch a custom event that UI components can listen to
    window.dispatchEvent(
      new CustomEvent('sw-update-available', {
        detail: { message: 'A new version is available. Please refresh.' }
      })
    );
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipServiceWorkerWaiting() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}
