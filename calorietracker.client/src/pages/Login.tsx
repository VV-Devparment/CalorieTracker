import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setAuthToken, setCurrentUser } from '../utils/auth';
import Icon from '../components/Icon';
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
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await authApi.login(formData);
            const { token, user } = response.data;
            setAuthToken(token);
            setCurrentUser(user);
            navigate('/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Помилка при авторизації';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-auth-gradient overflow-hidden px-4 py-10">
            {/* Animated decorative blobs */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="blob blob--orange" style={{ width: 420, height: 420, top: -120, left: -120 }} />
                <div className="blob blob--berry" style={{ width: 380, height: 380, bottom: -140, right: -120, animationDelay: '5s' }} />
                <div className="blob blob--mint" style={{ width: 280, height: 280, top: '40%', right: '-80px', animationDelay: '10s' }} />
                <div className="blob blob--sun" style={{ width: 220, height: 220, bottom: 60, left: 40, animationDelay: '15s' }} />
            </div>

            {/* Subtle noise overlay */}
            <div aria-hidden className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Logo + heading */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-lifted mb-5 relative">
                        <img src="/logo.png" alt="CalorieTracker" className="w-12 h-12 object-contain drop-shadow-lg" />
                        <span className="absolute -inset-1 rounded-3xl bg-brand-gradient blur-xl opacity-50 -z-10" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow flex items-center justify-center gap-2.5">
                        <span>З поверненням</span>
                        <Icon name="wave" size={32} color="white" />
                    </h1>
                    <p className="text-white/80 text-sm">
                        Увійди до{' '}
                        <span className="font-bold bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent">
                            CalorieTracker
                        </span>
                    </p>
                </div>

                {/* Glass card form */}
                <form onSubmit={handleSubmit}>
                    <div className="relative bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-7 shadow-glass">
                        {/* Top inner highlight */}
                        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                        {error && (
                            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/20 border border-red-300/40 text-red-50 text-sm flex items-start gap-2">
                                <Icon name="warning" size={18} color="white" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-white/85 mb-2 tracking-wide uppercase">
                                    Email
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="example@gmail.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="block w-full px-4 py-3 bg-white/15 backdrop-blur border border-white/30 rounded-2xl text-white placeholder-white/50 text-sm shadow-inner-glow transition-all focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-300/30 focus:bg-white/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-white/85 mb-2 tracking-wide uppercase">
                                    Пароль
                                </label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        placeholder="Введіть пароль"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="block w-full pl-4 pr-12 py-3 bg-white/15 backdrop-blur border border-white/30 rounded-2xl text-white placeholder-white/50 text-sm shadow-inner-glow transition-all focus:outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-300/30 focus:bg-white/20"
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
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-7 w-full py-3.5 rounded-2xl bg-brand-gradient text-white font-bold text-base shadow-pop hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Вхід...
                                </>
                            ) : (
                                <>
                                    Увійти
                                    <Icon name="arrow-right" size={18} color="white" />
                                </>
                            )}
                        </button>

                        <div className="mt-5 text-center text-sm text-white/70">
                            Ще немає акаунту?{' '}
                            <Link
                                to="/register"
                                className="font-bold text-amber-300 hover:text-amber-200 transition-colors"
                            >
                                Зареєструватися
                            </Link>
                        </div>
                    </div>
                </form>

                {/* Footer mini-tagline */}
                <p className="mt-6 text-center text-xs text-white/50">
                    смачно · свідомо · щодня
                </p>
            </div>
        </div>
    );
};

export default Login;
