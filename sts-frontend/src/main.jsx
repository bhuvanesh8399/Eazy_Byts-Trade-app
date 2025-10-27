import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import { AuthProvider } from './components/AuthProvider.jsx';
import { TradeProvider } from './context/TradeProvider.jsx';
import { OrdersProvider } from './context/OrdersProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TradeProvider>
          <OrdersProvider>
            <App />
          </OrdersProvider>
        </TradeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
