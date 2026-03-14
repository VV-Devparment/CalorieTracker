import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setAuthToken, setCurrentUser } from '../utils/auth';
import type { UserRegistration } from '../types';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UserRegistration>({
        email: '',
        password: '',
        name: '',
        age: undefined,
        weight: undefined,
        height: undefined,
        gender: '',
        activityLevel: 2,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'age' || name === 'weight' || name === 'height' || name === 'activityLevel'
                ? value ? Number(value) : undefined
                : value,
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Валідація обов'язкових полів
        if (!formData.email.trim()) {
            setError('Email є обов\'язковим');
            setLoading(false);
            return;
        }

        if (!formData.password || formData.password.length < 6) {
            setError('Пароль повинен містити мінімум 6 символів');
            setLoading(false);
            return;
        }

        if (!formData.name.trim()) {
            setError('Ім\'я є обов\'язковим');
            setLoading(false);
            return;
        }

        // Валідація email формату
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Введіть коректний email адрес');
            setLoading(false);
            return;
        }

        try {
            console.log('Відправляємо дані реєстрації:', formData);
            const response = await authApi.register(formData);
            console.log('Відповідь сервера:', response.data);

            const { token, user } = response.data;

            // Save auth data
            setAuthToken(token);
            setCurrentUser(user);

            // Redirect to dashboard
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Помилка реєстрації:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Помилка при реєстрації';
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
            <div style={{ maxWidth: '500px', width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '24px' }}>🍎</div>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                        Реєстрація в CalorieTracker
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Або{' '}
                        <Link
                            to="/login"
                            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
                        >
                            увійти в існуючий акаунт
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                            {/* Email */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Email *
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

                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Пароль * (мінімум 6 символів)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 40px 8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder="Створіть пароль"
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

                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Ім'я *
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    autoComplete="name"
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
                                    placeholder="Ваше ім'я"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            {/* Age and Gender */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Вік
                                    </label>
                                    <input
                                        name="age"
                                        type="number"
                                        min="1"
                                        max="120"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder="25"
                                        value={formData.age || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Стать
                                    </label>
                                    <select
                                        name="gender"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            background: 'white'
                                        }}
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Оберіть стать</option>
                                        <option value="male">Чоловіча</option>
                                        <option value="female">Жіноча</option>
                                    </select>
                                </div>
                            </div>

                            {/* Weight and Height */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Вага (кг)
                                    </label>
                                    <input
                                        name="weight"
                                        type="number"
                                        min="1"
                                        max="999"
                                        step="0.1"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder="70"
                                        value={formData.weight || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Зріст (см)
                                    </label>
                                    <input
                                        name="height"
                                        type="number"
                                        min="1"
                                        max="300"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder="175"
                                        value={formData.height || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Activity Level */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Рівень активності
                                </label>
                                <select
                                    name="activityLevel"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        background: 'white'
                                    }}
                                    value={formData.activityLevel}
                                    onChange={handleInputChange}
                                >
                                    <option value={1}>Сидячий спосіб життя</option>
                                    <option value={2}>Легка активність (1-3 рази на тиждень)</option>
                                    <option value={3}>Помірна активність (3-5 разів на тиждень)</option>
                                    <option value={4}>Висока активність (6-7 разів на тиждень)</option>
                                    <option value={5}>Дуже висока активність (2 рази на день)</option>
                                </select>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div style={{ marginTop: '24px' }}>
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
                                {loading ? 'Реєстрація...' : 'Створити акаунт'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;