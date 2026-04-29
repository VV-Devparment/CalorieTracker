import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from './utils/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Foods from './pages/Foods';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics';
import Achievements from './pages/Achievements';
import Admin from './pages/Admin';
import TopHeader from './components/TopHeader';
import MobileBottomNavbar from './components/MobileBottomNavbar';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) return <Navigate to="/login" />;
    if (!isAdmin()) return <Navigate to="/dashboard" />;
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" />;
};

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-app-gradient bg-fixed relative">
                {/* Decorative ambient blobs (behind everything) */}
                <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                    <div className="blob blob--orange" style={{ width: 360, height: 360, top: -120, left: -100 }} />
                    <div className="blob blob--mint" style={{ width: 320, height: 320, top: 80, right: -120, animationDelay: '4s' }} />
                    <div className="blob blob--berry" style={{ width: 280, height: 280, bottom: -100, left: '40%', animationDelay: '8s' }} />
                    <div className="blob blob--sun" style={{ width: 220, height: 220, top: '45%', left: -80, animationDelay: '12s' }} />
                </div>
                <Routes>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <TopHeader />
                                <Dashboard />
                                <MobileBottomNavbar />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/foods"
                        element={
                            <ProtectedRoute>
                                <TopHeader />
                                <Foods />
                                <MobileBottomNavbar />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/statistics"
                        element={
                            <ProtectedRoute>
                                <TopHeader />
                                <Statistics />
                                <MobileBottomNavbar />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <TopHeader />
                                <Profile />
                                <MobileBottomNavbar />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/achievements"
                        element={
                            <ProtectedRoute>
                                <TopHeader />
                                <Achievements />
                                <MobileBottomNavbar />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <TopHeader />
                                <Admin />
                                <MobileBottomNavbar />
                            </AdminRoute>
                        }
                    />

                    <Route path="/" element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;