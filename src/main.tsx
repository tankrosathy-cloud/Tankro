import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global interceptor for alert inside sandboxed iframe
if (typeof window !== 'undefined') {
  window.alert = (message: any) => {
    const event = new CustomEvent('show-toast', {
      detail: { message: String(message) }
    });
    window.dispatchEvent(event);
  };
}

// Unregister any active service worker to prevent aggressive caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Successfully unregistered service worker to fetch latest app assets.');
        }
      });
    }
  }).catch((err) => {
    console.warn('Error unregistering service worker:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

