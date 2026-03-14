import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Foods from './pages/Foods';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics'; // Додайте цей import
import TopHeader from './components/TopHeader';
import MobileBottomNavbar from './components/MobileBottomNavbar';
import './App.css';

// ... решта коду App.tsx

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" />;
};

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50">
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

                    <Route path="/" element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;