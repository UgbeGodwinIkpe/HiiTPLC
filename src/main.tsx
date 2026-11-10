import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Attach the short-lived server-issued session token to same-origin API requests.
const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/api/') && !url.startsWith('/api/auth/login')) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token = localStorage.getItem('hiit_auth_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    init = { ...init, headers };
  }
  return nativeFetch(input, init).then((response) => {
    if (response.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/login')) {
      localStorage.removeItem('hiit_auth_token');
      localStorage.removeItem('hiit_auth_user');
      window.dispatchEvent(new Event('hiit:unauthorized'));
    }
    return response;
  });
}) as typeof window.fetch;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
