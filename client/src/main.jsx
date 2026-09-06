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

// Register Service Worker for Offline Shell & PWA Resilience
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW REGISTRATION WARNING]', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
