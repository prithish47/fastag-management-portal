import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import AboutFastag from './pages/AboutFastag';
import ApplyNow from './pages/ApplyNow';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Guidelines from './pages/Guidelines';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import Transactions from './pages/Transactions';
import Support from './pages/Support';
import SimulateTollCrossing from './pages/SimulateTollCrossing';
import { WalletProvider } from './context/WalletContext';

// Admin imports
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error.toString()}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <AdminAuthProvider>
          <Router>
            <div className="font-sans text-slate-900 bg-slate-50 min-h-screen flex flex-col">
              <Routes>
                <Route path="/" element={<><Navbar /><Home /><Footer /></>} />
                <Route path="/about" element={<><Navbar /><AboutFastag /><Footer /></>} />
                <Route path="/register" element={<><Navbar /><ApplyNow /><Footer /></>} />
                <Route path="/forgot-password" element={<><Navbar /><ForgotPassword /><Footer /></>} />
                <Route path="/reset-password" element={<><Navbar /><ResetPassword /><Footer /></>} />
                <Route path="/reset-password/:token" element={<><Navbar /><ResetPassword /><Footer /></>} />
                <Route path="/guidelines" element={<><Navbar /><Guidelines /><Footer /></>} />
                
                {/* Dashboard Route (No standard Navbar/Footer) */}
                <Route path="/dashboard/*" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/simulate-toll-crossing" element={
                  <ProtectedRoute>
                    <SimulateTollCrossing />
                  </ProtectedRoute>
                } />
                <Route path="/vehicles" element={
                  <ProtectedRoute>
                    <Vehicles />
                  </ProtectedRoute>
                } />
                <Route path="/vehicle/:vehicleId" element={
                  <ProtectedRoute>
                    <VehicleDetails />
                  </ProtectedRoute>
                } />
                <Route path="/transactions" element={
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                } />
                <Route path="/support" element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/admin/*" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
              </Routes>
            </div>
          </Router>
        </AdminAuthProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default App;

