import './index.css';
import './utils/api.js';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Google Translate DOM mutation monkey-patch for React removeChild / insertBefore
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      if (console) console.warn('Google Translate React Fix: Cannot remove a child from a different parent.');
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('Google Translate React Fix: Cannot insert before a reference node from a different parent.');
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

// Register Service Worker for Offline Shell & PWA Resilience with immediate update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Check for updates on every page load
        registration.update().catch(() => {});

        // Listen for new worker installed
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version detected and ready to activate.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[SW REGISTRATION WARNING]', err);
      });

    // Seamlessly reload to serve the freshest live assets when a new worker takes control
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
