import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setAuthToken, setCurrentUser } from '../utils/auth';
import type { UserLogin } from '../types';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UserLogin>({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await authApi.login(formData);
            const { token, user } = response.data;

            // Save auth data
            setAuthToken(token);
            setCurrentUser(user);

            // Redirect to dashboard
            navigate('/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Помилка при авторизації';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom right, #f0f9ff, #e0f2fe)',
            padding: '20px'
        }}>
            <div style={{ maxWidth: '400px', width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>🍎</div>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                        Увійти в CalorieTracker
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Або{' '}
                        <Link
                            to="/register"
                            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                        >
                            створити новий акаунт
                        </Link>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '24px'
                    }}>
                        {error && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '12px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="example@gmail.com"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Пароль
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px 40px 8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="Введіть пароль"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button
                                    type="button"
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#6b7280'
                                    }}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: loading ? '#9ca3af' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '16px',
                                fontWeight: '500',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {loading ? 'Вхід...' : 'Увійти'}
                        </button>
                    </div>
                </form>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        Для тестування можна використати будь-який email та пароль від 6 символів
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;