import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAdmin } from '../utils/auth';
import { notificationService, type Notification } from '../services/notificationService';
import Icon from '../components/Icon';

const TopHeader = () => {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [user, setUser] = useState(getCurrentUser());

    useEffect(() => {
        const refresh = () => setUser(getCurrentUser());
        window.addEventListener('auth-user-changed', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('auth-user-changed', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    // Завантаження повідомлень при монтуванні компонента
    useEffect(() => {
        loadNotifications();

        // Перевіряємо автоматичні повідомлення
        notificationService.checkForAutomaticNotifications();

        // Очищуємо старі повідомлення
        notificationService.cleanOldNotifications();

        // Оновлюємо список після перевірок
        loadNotifications();

        // Періодично перевіряємо нові повідомлення (кожні 5 хвилин)
        const interval = setInterval(() => {
            notificationService.checkForAutomaticNotifications();
            loadNotifications();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const loadNotifications = () => {
        const userNotifications = notificationService.getNotifications();
        setNotifications(userNotifications);
    };

    const markAsRead = (id: string) => {
        notificationService.markAsRead(id);
        loadNotifications();
    };

    const markAllAsRead = () => {
        notificationService.markAllAsRead();
        loadNotifications();
    };

    const clearAllNotifications = () => {
        notificationService.clearAll();
        loadNotifications();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleProfileClick = () => {
        setShowProfile(false);
        navigate('/profile');
    };

    const handleAdminClick = () => {
        setShowProfile(false);
        navigate('/admin');
    };

    // Закриваємо дропдауни при кліку поза ними
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.notifications-dropdown') && !target.closest('.notifications-button')) {
                setShowNotifications(false);
            }
            if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
                setShowProfile(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNotificationStyle = (type: Notification['type']) => {
        switch (type) {
            case 'user_action': return { border: 'border-l-blue-500', accent: 'from-blue-400 to-blue-500', color: 'blue' as const };
            case 'app_reminder': return { border: 'border-l-fresh-500', accent: 'from-fresh-400 to-fresh-600', color: 'green' as const };
            case 'achievement': return { border: 'border-l-sun-500', accent: 'from-sun-400 to-sun-600', color: 'yellow' as const };
            case 'warning': return { border: 'border-l-red-500', accent: 'from-red-400 to-rose-500', color: 'red' as const };
            default: return { border: 'border-l-gray-400', accent: 'from-gray-400 to-gray-500', color: 'gray' as const };
        }
    };

    const formatTimeAgo = (timestamp: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'щойно';
        if (diffInMinutes < 60) return `${diffInMinutes} хв тому`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} год тому`;

        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} дн тому`;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-white/60 shadow-soft">
            <div className="max-w-md mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* App Logo/Title */}
                    <div className="flex items-center space-x-2.5">
                        <div className="relative w-10 h-10 rounded-2xl bg-brand-gradient shadow-pop flex items-center justify-center">
                            <img src="/logo.png" alt="CalorieTracker" className="w-7 h-7 object-contain drop-shadow" />
                            <span className="absolute -inset-0.5 rounded-2xl bg-brand-gradient blur opacity-40 -z-10"></span>
                        </div>
                        <div className="leading-tight">
                            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
                                Calorie<span className="text-gradient-brand">Tracker</span>
                            </h1>
                            <p className="text-[10px] text-gray-500 -mt-0.5 font-medium">смачно. свідомо. щодня.</p>
                        </div>
                    </div>

                    {/* Right side buttons */}
                    <div className="flex items-center space-x-3">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                className="notifications-button relative p-2.5 rounded-2xl bg-white/80 border border-cream-200 hover:border-brand-300 hover:bg-white transition-all shadow-sm"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Icon name="notification" size={20} color="gray" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md ring-2 ring-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="notifications-dropdown absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-xl rounded-3xl shadow-lifted border border-cream-200 overflow-hidden z-50">
                                    <div className="px-4 py-3 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1 h-4 rounded-full bg-brand-gradient" />
                                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Повідомлення</h3>
                                                {unreadCount > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gradient text-white">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {(unreadCount > 0 || notifications.length > 0) && (
                                            <div className="flex gap-2 mt-2">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                                                    >
                                                        Прочитати всі
                                                    </button>
                                                )}
                                                {notifications.length > 0 && (
                                                    <button
                                                        onClick={clearAllNotifications}
                                                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        Очистити
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            <ul className="divide-y divide-cream-100">
                                                {notifications.map((notification) => {
                                                    const style = getNotificationStyle(notification.type);
                                                    return (
                                                        <li
                                                            key={notification.id}
                                                            className={`p-3 border-l-4 ${style.border} cursor-pointer hover:bg-cream-50 transition-colors ${!notification.isRead ? 'bg-white' : 'bg-cream-50/30'}`}
                                                            onClick={() => markAsRead(notification.id)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <span className={`flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br ${style.accent} flex items-center justify-center shadow-sm`}>
                                                                    <Icon name={notification.icon || 'notification'} size={18} color="white" />
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-500'} truncate`}>
                                                                            {notification.title}
                                                                        </p>
                                                                        {!notification.isRead && (
                                                                            <span className="flex-shrink-0 w-2 h-2 bg-brand-500 rounded-full" />
                                                                        )}
                                                                    </div>
                                                                    <p className={`text-xs mt-0.5 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'} leading-snug`}>
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                                        {formatTimeAgo(notification.timestamp)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div className="px-6 py-10 text-center">
                                                <div className="mb-3 flex justify-center opacity-60">
                                                    <Icon name="notification" size={56} color="gray" />
                                                </div>
                                                <p className="text-sm font-semibold text-gray-700">Поки тиша</p>
                                                <p className="text-xs text-gray-500 mt-1">Як з'являться нові повідомлення — побачиш їх тут</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="relative">
                            <button
                                className="profile-button rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                                onClick={() => setShowProfile(!showProfile)}
                                aria-label="Профіль"
                            >
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt="Аватар"
                                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                    />
                                ) : (
                                    <span className="p-2 inline-flex">
                                        <Icon name="profile" size={20} color="gray" />
                                    </span>
                                )}
                            </button>

                            {/* Profile Dropdown */}
                            {showProfile && (
                                <div className="profile-dropdown absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-xl rounded-3xl shadow-lifted border border-cream-200 overflow-hidden z-50">
                                    <div className="p-4 bg-gradient-to-br from-cream-50 via-white to-cream-50 border-b border-cream-200">
                                        <div className="flex items-center gap-3">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                                                    {isAdmin() && (
                                                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-lime-500 text-white shadow-sm">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-2">
                                        {isAdmin() && (
                                            <button
                                                onClick={handleAdminClick}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-orange-50 transition-colors text-left group"
                                            >
                                                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-lime-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                    <Icon name="settings" size={18} color="white" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-700">Адмін-панель</p>
                                                    <p className="text-xs text-gray-500 truncate">Користувачі та модерація</p>
                                                </div>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleProfileClick}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-cream-50 transition-colors text-left"
                                        >
                                            <span className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center flex-shrink-0">
                                                <Icon name="settings" size={18} color="gray" />
                                            </span>
                                            <span className="text-sm font-semibold text-gray-700">Налаштування профілю</span>
                                        </button>

                                        <div className="flex items-center gap-3 p-2.5 rounded-2xl">
                                            <span className="w-9 h-9 rounded-xl bg-fresh-50 flex items-center justify-center flex-shrink-0">
                                                <Icon name="goal" size={18} color="green" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-700">Денна ціль</p>
                                                <p className="text-xs text-gray-500">{user?.dailyCalorieGoal || 2000} ккал</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-2.5 rounded-2xl">
                                            <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <Icon name="weight" size={18} color="blue" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-700">Поточна вага</p>
                                                <p className="text-xs text-gray-500">{user?.weight ? `${user.weight} кг` : 'Не вказано'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-2 border-t border-cream-200">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-red-50 transition-colors text-red-600"
                                        >
                                            <span className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                                <Icon name="logout" size={18} color="red" />
                                            </span>
                                            <span className="text-sm font-semibold">Вийти з акаунту</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopHeader;