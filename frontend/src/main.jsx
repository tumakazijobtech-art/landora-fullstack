import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { applyFavicon, getBranding, subscribeToBranding } from './branding.js';
import './styles.css';

// Point the browser tab icon at whatever app icon URL is currently configured (a
// saved admin override, or the deploy-time default), and keep it in sync if the
// Branding tab changes it later in this session.
applyFavicon(getBranding().appIconUrl);
subscribeToBranding((next) => applyFavicon(next.appIconUrl));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
