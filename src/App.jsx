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
import CustomerLogin from './pages/CustomerLogin';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/check-in" element={<CustomerLogin />} />  {/* Add this line */}
          <Route path="/order" element={<CustomerMenu />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route path="customers" element={<Customers />} />
            <Route index element={<LiveOrders />} />
            <Route path="tables" element={<TablesManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="settings" element={<Settings />} />
            {/* Other admin routes can be added here */}
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
