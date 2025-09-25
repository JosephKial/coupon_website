import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import CouponsPage from '@/pages/CouponsPage';
import CreateCouponPage from '@/pages/CreateCouponPage';
import EditCouponPage from '@/pages/EditCouponPage';
import ProfilePage from '@/pages/ProfilePage';

// Components
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/coupons" element={
            <ProtectedRoute>
              <Layout>
                <CouponsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/coupons/new" element={
            <ProtectedRoute>
              <Layout>
                <CreateCouponPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/coupons/:id/edit" element={
            <ProtectedRoute>
              <Layout>
                <EditCouponPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Redirect root to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App