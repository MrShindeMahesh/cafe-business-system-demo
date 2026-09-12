import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccess } from './lib/roles';

import RoleLogin from './pages/RoleLogin';
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
import Kitchen from './pages/admin/Kitchen';
import TakeOrder from './pages/admin/TakeOrder';

// Blocks unauthenticated users, and hides pages the role can't access.
const Protected = ({ authKey, children }) => {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (authKey && !canAccess(role, authKey)) return <Navigate to="/admin" replace />;
  return children;
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleLogin />} />
            <Route path="/login" element={<RoleLogin />} />
            <Route path="/order" element={<CustomerMenu />} />
            <Route path="/track/:orderId" element={<CustomerTracking />} />

            <Route
              path="/admin"
              element={
                <Protected>
                  <AdminLayout />
                </Protected>
              }
            >
              <Route index element={<Protected authKey="index"><LiveOrders /></Protected>} />
              <Route path="take-order" element={<Protected authKey="take-order"><TakeOrder /></Protected>} />
              <Route path="kitchen" element={<Protected authKey="kitchen"><Kitchen /></Protected>} />
              <Route path="tables" element={<Protected authKey="tables"><TablesManagement /></Protected>} />
              <Route path="menu" element={<Protected authKey="menu"><MenuManagement /></Protected>} />
              <Route path="inventory" element={<Protected authKey="inventory"><Inventory /></Protected>} />
              <Route path="customers" element={<Protected authKey="customers"><Customers /></Protected>} />
              <Route path="analytics" element={<Protected authKey="analytics"><Analytics /></Protected>} />
              <Route path="history" element={<Protected authKey="history"><OrderHistory /></Protected>} />
              <Route path="settings" element={<Protected authKey="settings"><Settings /></Protected>} />
              <Route path="todays-orders" element={<Protected authKey="todays-orders"><TodaysOrders /></Protected>} />
            </Route>

            {/* Unknown URLs → login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  );
}
