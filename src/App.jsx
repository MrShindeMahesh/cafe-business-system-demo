import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';

import Landing from './pages/Landing';
import CustomerMenu from './pages/CustomerMenu';
import CustomerTracking from './pages/CustomerTracking';
import AdminLayout from './pages/admin/AdminLayout';
import LiveOrders from './pages/admin/LiveOrders';
import TablesManagement from './pages/admin/TablesManagement';
import MenuManagement from './pages/admin/MenuManagement';
import Settings from './pages/admin/Settings';
import Customers from './pages/admin/Customers';
import Analytics from './pages/admin/Analytics';
import OrderHistory from './pages/admin/OrderHistory';
import TodaysOrders from './pages/admin/TodaysOrders';
import Inventory from './pages/admin/Inventory';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/order" element={<CustomerMenu />} />
          <Route path="/track/:orderId" element={<CustomerTracking />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<LiveOrders />} />
            <Route path="tables" element={<TablesManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="customers" element={<Customers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="history" element={<OrderHistory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="todays-orders" element={<TodaysOrders />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}