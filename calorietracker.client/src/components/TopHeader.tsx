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

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'user_action': return 'border-l-blue-500 bg-blue-50';
            case 'app_reminder': return 'border-l-green-500 bg-green-50';
            case 'achievement': return 'border-l-yellow-500 bg-yellow-50';
            case 'warning': return 'border-l-red-500 bg-red-50';
            default: return 'border-l-gray-500 bg-gray-50';
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
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-md mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* App Logo/Title */}
                    <div className="flex items-center space-x-2">
                        <img src="/logo.png" alt="CalorieTracker" className="w-8 h-8 object-contain" />
                        <h1 className="text-lg font-bold text-gray-900">CalorieTracker</h1>
                    </div>

                    {/* Right side buttons */}
                    <div className="flex items-center space-x-3">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                className="notifications-button relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Icon name="notification" size={20} color="gray" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="notifications-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden z-50">
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">Повідомлення</h3>
                                            <div className="flex space-x-2">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                    >
                                                        Позначити всі як прочитані
                                                    </button>
                                                )}
                                                {notifications.length > 0 && (
                                                    <button
                                                        onClick={clearAllNotifications}
                                                        className="text-xs text-red-600 hover:text-red-800"
                                                    >
                                                        Очистити всі
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 border-l-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${getNotificationColor(notification.type)} ${!notification.isRead ? 'bg-opacity-100' : 'bg-opacity-50'
                                                        }`}
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <span className="text-xl">{notification.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                                                    {notification.title}
                                                                </p>
                                                                {!notification.isRead && (
                                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-2">
                                                                {formatTimeAgo(notification.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                <div className="mb-2 flex justify-center">
                                                    <Icon name="notification" size={48} color="gray" />
                                                </div>
                                                <p className="text-sm">Повідомлень немає</p>
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
                                <div className="profile-dropdown absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-900">{user?.name}</p>
                                            {isAdmin() && (
                                                <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-lime-500 text-white">
                                                    ADMIN
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{user?.email}</p>
                                    </div>

                                    <div className="p-2">
                                        {isAdmin() && (
                                            <button
                                                onClick={handleAdminClick}
                                                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 transition-colors text-left group"
                                            >
                                                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-lime-500 flex items-center justify-center text-white shadow-sm">
                                                    <Icon name="settings" size={18} color="white" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-700">Адмін-панель</p>
                                                    <p className="text-xs text-gray-500">Користувачі, статистика, модерація</p>
                                                </div>
                                            </button>
                                        )}

                                        <button
                                            onClick={handleProfileClick}
                                            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <Icon name="settings" size={18} color="gray" />
                                            <span className="text-sm font-medium text-gray-700">Налаштування профілю</span>
                                        </button>

                                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <Icon name="goal" size={18} color="gray" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Денна ціль</p>
                                                <p className="text-xs text-gray-500">{user?.dailyCalorieGoal || 2000} ккал</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <Icon name="weight" size={18} color="gray" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Поточна вага</p>
                                                <p className="text-xs text-gray-500">{user?.weight ? `${user.weight} кг` : 'Не вказано'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-2 border-t border-gray-100">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                                        >
                                            <Icon name="logout" size={18} color="red" />
                                            <span className="text-sm font-medium">Вийти з акаунту</span>
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