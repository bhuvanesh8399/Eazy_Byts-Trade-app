// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthProvider from './components/AuthProvider';    // ✅ default import (no braces)
import TradeProvider from './context/TradeProvider';     
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TradeProvider>
          <App />
        </TradeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
