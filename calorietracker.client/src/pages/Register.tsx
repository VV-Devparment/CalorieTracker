import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setAuthToken, setCurrentUser } from '../utils/auth';
import Icon from '../components/Icon';
import type { UserRegistration } from '../types';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<UserRegistration>({
        email: '',
        password: '',
        name: '',
        dateOfBirth: undefined,
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
            [name]: name === 'weight' || name === 'height' || name === 'activityLevel'
                ? value ? Number(value) : undefined
                : value || undefined,
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Введіть коректний email адрес');
            setLoading(false);
            return;
        }

        try {
            const response = await authApi.register(formData);
            const { token, user } = response.data;
            setAuthToken(token);
            setCurrentUser(user);
            navigate('/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Помилка при реєстрації';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const fieldLabel = "block text-xs font-semibold text-white/85 mb-2 tracking-wide uppercase";
    const fieldInput = "block w-full px-4 py-3 bg-white/15 backdrop-blur border border-white/30 rounded-2xl text-white placeholder-white/50 text-sm shadow-inner-glow transition-all focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-300/30 focus:bg-white/20";
    const fieldSelect = `${fieldInput} appearance-none cursor-pointer pr-10`;

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-auth-gradient overflow-hidden px-4 py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="blob blob--orange" style={{ width: 420, height: 420, top: -140, right: -140 }} />
                <div className="blob blob--mint" style={{ width: 380, height: 380, bottom: -160, left: -120, animationDelay: '5s' }} />
                <div className="blob blob--berry" style={{ width: 260, height: 260, top: '50%', left: '-60px', animationDelay: '10s' }} />
                <div className="blob blob--sun" style={{ width: 240, height: 240, top: 80, left: '40%', animationDelay: '15s' }} />
            </div>
            <div aria-hidden className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

            <div className="relative w-full max-w-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-lifted mb-5 relative">
                        <img src="/logo.png" alt="CalorieTracker" className="w-12 h-12 object-contain drop-shadow-lg" />
                        <span className="absolute -inset-1 rounded-3xl bg-brand-gradient blur-xl opacity-50 -z-10" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow flex items-center justify-center gap-2.5">
                        <span>Створи акаунт</span>
                        <Icon name="sparkles" size={32} color="white" />
                    </h1>
                    <p className="text-white/80 text-sm">
                        Розпочни шлях до{' '}
                        <span className="font-bold bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">
                            свідомого харчування
                        </span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="relative bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-7 shadow-glass">
                        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                        {error && (
                            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/20 border border-red-300/40 text-red-50 text-sm flex items-start gap-2">
                                <Icon name="warning" size={18} color="white" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className={fieldLabel}>Email *</label>
                                <input
                                    name="email" type="email" autoComplete="email" required
                                    placeholder="example@gmail.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={fieldInput}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className={fieldLabel}>Пароль * (мінімум 6 символів)</label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required minLength={6}
                                        placeholder="Створіть пароль"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`${fieldInput} pr-12`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:scale-110 transition-transform"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                                    >
                                        <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="white" />
                                    </button>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className={fieldLabel}>Ім'я *</label>
                                <input
                                    name="name" type="text" autoComplete="name" required
                                    placeholder="Ваше ім'я"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={fieldInput}
                                />
                            </div>

                            {/* DateOfBirth + Gender */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={fieldLabel}>Дата народження</label>
                                    <input
                                        name="dateOfBirth" type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        value={formData.dateOfBirth || ''}
                                        onChange={handleInputChange}
                                        className={`${fieldInput} [color-scheme:dark]`}
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabel}>Стать</label>
                                    <div className="relative">
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                            className={fieldSelect}
                                        >
                                            <option value="" className="text-gray-800">Оберіть стать</option>
                                            <option value="male" className="text-gray-800">Чоловіча</option>
                                            <option value="female" className="text-gray-800">Жіноча</option>
                                        </select>
                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60">▾</span>
                                    </div>
                                </div>
                            </div>

                            {/* Weight + Height */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={fieldLabel}>Вага (кг)</label>
                                    <input
                                        name="weight" type="number"
                                        min="1" max="999" step="0.1"
                                        placeholder="70"
                                        value={formData.weight || ''}
                                        onChange={handleInputChange}
                                        className={fieldInput}
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabel}>Зріст (см)</label>
                                    <input
                                        name="height" type="number"
                                        min="1" max="300"
                                        placeholder="175"
                                        value={formData.height || ''}
                                        onChange={handleInputChange}
                                        className={fieldInput}
                                    />
                                </div>
                            </div>

                            {/* Activity */}
                            <div>
                                <label className={fieldLabel}>Рівень активності</label>
                                <div className="relative">
                                    <select
                                        name="activityLevel"
                                        value={formData.activityLevel}
                                        onChange={handleInputChange}
                                        className={fieldSelect}
                                    >
                                        <option value={1} className="text-gray-800">Сидячий спосіб життя</option>
                                        <option value={2} className="text-gray-800">Легка активність (1-3 рази на тиждень)</option>
                                        <option value={3} className="text-gray-800">Помірна активність (3-5 разів на тиждень)</option>
                                        <option value={4} className="text-gray-800">Висока активність (6-7 разів на тиждень)</option>
                                        <option value={5} className="text-gray-800">Дуже висока активність (2 рази на день)</option>
                                    </select>
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60">▾</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-7 w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold text-base shadow-pop hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Реєстрація...
                                </>
                            ) : (
                                <>
                                    Створити акаунт
                                    <Icon name="arrow-right" size={18} color="white" />
                                </>
                            )}
                        </button>

                        <div className="mt-5 text-center text-sm text-white/70">
                            Вже маєш акаунт?{' '}
                            <Link
                                to="/login"
                                className="font-bold text-amber-300 hover:text-amber-200 transition-colors"
                            >
                                Увійти
                            </Link>
                        </div>
                    </div>
                </form>

                <p className="mt-6 text-center text-xs text-white/50">
                    смачно · свідомо · щодня
                </p>
            </div>
        </div>
    );
};

export default Register;
