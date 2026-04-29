import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser, setCurrentUser } from '../utils/auth';
import { usersApi } from '../services/api';
import { notificationService } from '../services/notificationService';
import Icon from '../components/Icon';

interface User {
    id: number;
    email: string;
    name: string;
    dateOfBirth?: string; // ISO date string: "YYYY-MM-DD"
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel: number;
    dailyCalorieGoal?: number;
    avatarUrl?: string | null;
    createdAt: string;
}

// Resize image to a square thumbnail and return JPEG Blob
const resizeImageToBlob = (file: File, size = 256, quality = 0.85): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas не підтримується'));
                // Center-crop to square
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('Не вдалося створити blob')),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
            img.src = reader.result as string;
        };
        reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
        reader.readAsDataURL(file);
    });

interface WeightRecord {
    date: string;
    weight: number;
}

const Profile = () => {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
    const [newWeight, setNewWeight] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: user?.name || '',
        dateOfBirth: user?.dateOfBirth || '',
        weight: user?.weight || '',
        height: user?.height || '',
        gender: user?.gender || '',
        activityLevel: user?.activityLevel || 2,
    });

    useEffect(() => {
        loadWeightHistory();
    }, []);

    const loadWeightHistory = async () => {
        try {
            const response = await usersApi.getWeightHistory(30);
            setWeightHistory(response.data);
        } catch (error) {
            console.error('Error loading weight history:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'weight' || name === 'height' || name === 'activityLevel'
                ? value ? Number(value) : ''
                : value
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            const newWeightVal = formData.weight ? Number(formData.weight) : undefined;
            const oldWeight = user?.weight;

            // Weight and Height are stored only in WeightRecords (3NF)
            const newHeightVal = formData.height ? Number(formData.height) : undefined;
            if (newWeightVal && newWeightVal !== oldWeight) {
                await usersApi.addWeightRecord(newWeightVal, newHeightVal);
                notificationService.onWeightUpdated(newWeightVal);
            } else if (newHeightVal && newHeightVal !== user?.height) {
                // Height changed but weight didn't — still need to record height
                await usersApi.addWeightRecord(newWeightVal || user?.weight || 0, newHeightVal);
            }

            // Update profile fields (weight/height/dailyCalorieGoal excluded — handled by 3NF design)
            const updateData = {
                name: formData.name,
                dateOfBirth: formData.dateOfBirth || undefined,
                gender: formData.gender || undefined,
                activityLevel: Number(formData.activityLevel),
            };

            const response = await usersApi.updateProfile(updateData);
            setUser(response.data);
            setCurrentUser(response.data);

            setEditing(false);
            alert('Профіль успішно оновлено!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Помилка при оновленні профілю: ' + (error?.response?.data?.message || 'Невідома помилка'));
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarPick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Оберіть файл зображення');
            return;
        }
        try {
            setAvatarUploading(true);
            const blob = await resizeImageToBlob(file);
            const response = await usersApi.updateAvatar(blob);
            const updated = { ...(user as User), avatarUrl: response.data.avatarUrl };
            setUser(updated);
            setCurrentUser(updated);
        } catch (err: any) {
            console.error('Avatar upload failed:', err);
            alert('Не вдалося завантажити аватар: ' + (err?.response?.data?.message || err?.message || 'Невідома помилка'));
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleAvatarRemove = async () => {
        if (!confirm('Видалити аватар?')) return;
        try {
            setAvatarUploading(true);
            await usersApi.deleteAvatar();
            const updated = { ...(user as User), avatarUrl: null };
            setUser(updated);
            setCurrentUser(updated);
        } catch (err: any) {
            console.error('Avatar delete failed:', err);
            alert('Не вдалося видалити аватар');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleAddWeight = async () => {
        if (!newWeight || isNaN(Number(newWeight))) {
            alert('Введіть коректну вагу');
            return;
        }

        try {
            await usersApi.addWeightRecord(Number(newWeight));

            // Додаємо повідомлення про запис ваги
            notificationService.onWeightUpdated(Number(newWeight));

            // ⭐ ДОДАЄМО: Оновлюємо профіль користувача
            const updatedProfile = await usersApi.getProfile();
            setUser(updatedProfile.data);
            setCurrentUser(updatedProfile.data); // Оновлюємо в localStorage

            // ⭐ ДОДАЄМО: Оновлюємо form data теж
            setFormData(prev => ({
                ...prev,
                weight: updatedProfile.data.weight || ''
            }));

            setNewWeight('');
            loadWeightHistory();
            alert('Вага успішно записана!');
        } catch (error: any) {
            console.error('Error adding weight:', error);
            alert('Помилка при записі ваги');
        }
    };

    const calculateBMI = () => {
        if (user?.weight && user?.height) {
            const heightInMeters = user.height / 100;
            return (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
        }
        return null;
    };

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return { text: 'Недостатня вага', color: 'text-blue-600' };
        if (bmi < 25) return { text: 'Нормальна вага', color: 'text-green-600' };
        if (bmi < 30) return { text: 'Зайва вага', color: 'text-yellow-600' };
        return { text: 'Ожиріння', color: 'text-red-600' };
    };

    const getActivityLevelText = (level: number) => {
        switch (level) {
            case 1: return 'Сидячий спосіб життя';
            case 2: return 'Легка активність';
            case 3: return 'Помірна активність';
            case 4: return 'Висока активність';
            case 5: return 'Дуже висока активність';
            default: return 'Невідомо';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uk-UA');
    };

    const tabs = [
        { id: 'profile', label: 'Профіль', icon: 'profile' },
        { id: 'weight', label: 'Вага', icon: 'weight' }
    ];

    const bmi = calculateBMI();
    const bmiCategory = bmi ? getBMICategory(Number(bmi)) : null;

    return (
        <div className="min-h-screen py-5 pb-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Hero Header */}
                <div className="hero-card p-5 sm:p-6 mb-4 animate-fade-in-up">
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="flex flex-col items-center gap-2 mx-auto sm:mx-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <button
                                type="button"
                                onClick={handleAvatarPick}
                                disabled={avatarUploading}
                                className="relative group rounded-2xl focus:outline-none focus:ring-4 focus:ring-white/30 disabled:opacity-50"
                                title={user?.avatarUrl ? 'Змінити аватар' : 'Додати аватар'}
                            >
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt="Аватар"
                                        className="w-20 h-20 rounded-2xl object-cover border-2 border-white/60 shadow-lifted"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lifted">
                                        <Icon name="user-profile" size={48} color="white" />
                                    </div>
                                )}
                                <span className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition">
                                    {avatarUploading ? (
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : 'Змінити'}
                                </span>
                            </button>
                            <div className="flex gap-2 text-[11px] font-semibold">
                                <button
                                    type="button"
                                    onClick={handleAvatarPick}
                                    disabled={avatarUploading}
                                    className="text-white/80 hover:text-white disabled:opacity-50 underline-offset-2 hover:underline"
                                >
                                    Змінити
                                </button>
                                {user?.avatarUrl && (
                                    <>
                                        <span className="text-white/40">·</span>
                                        <button
                                            type="button"
                                            onClick={handleAvatarRemove}
                                            disabled={avatarUploading}
                                            className="text-rose-100 hover:text-white disabled:opacity-50 underline-offset-2 hover:underline"
                                        >
                                            Видалити
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                            <p className="text-white/80 text-xs font-semibold tracking-wide uppercase">Особистий кабінет</p>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow leading-tight mt-0.5">{user?.name}</h1>
                            <p className="text-white/80 text-sm mt-1 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="card-glass mb-4 overflow-hidden">
                    <div className="border-b border-cream-200 bg-cream-50/40">
                        <div className="flex gap-1 px-2 sm:px-4 overflow-x-auto">
                            {tabs.map((tab) => {
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                                            active
                                                ? 'border-brand-500 text-brand-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Icon name={tab.icon} size={18} color={active ? 'orange' : 'gray'} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-5 sm:p-6">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Personal Info */}
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <span className="w-1 h-5 rounded-full bg-brand-gradient" />
                                            Особиста інформація
                                        </h3>
                                        {!editing ? (
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="w-full sm:w-auto px-4 py-2.5 bg-brand-gradient text-white rounded-xl shadow-pop hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                                            >
                                                <Icon name="edit" size={16} color="white" />
                                                <span>Редагувати</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={() => setEditing(false)}
                                                    className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 bg-white border border-cream-300 text-gray-700 rounded-xl hover:bg-cream-50 transition-colors flex items-center justify-center gap-1.5 text-sm font-semibold"
                                                >
                                                    <Icon name="close" size={16} color="gray" />
                                                    <span>Скасувати</span>
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={loading}
                                                    className="flex-1 sm:flex-none sm:w-36 px-3 py-2.5 btn-fresh rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm font-semibold"
                                                >
                                                    <Icon name="save" size={16} color="white" />
                                                    <span>{loading ? 'Збереження...' : 'Зберегти'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Ім'я</label>
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Email</label>
                                            <p className="text-gray-900 font-medium">{user?.email}</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Дата народження</label>
                                            {editing ? (
                                                <input
                                                    type="date"
                                                    name="dateOfBirth"
                                                    value={formData.dateOfBirth}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">
                                                    {user?.dateOfBirth
                                                        ? new Date(user.dateOfBirth).toLocaleDateString('uk-UA')
                                                        : 'Не вказано'}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Стать</label>
                                            {editing ? (
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                >
                                                    <option value="">Оберіть стать</option>
                                                    <option value="male">Чоловіча</option>
                                                    <option value="female">Жіноча</option>
                                                </select>
                                            ) : (
                                                <p className="text-gray-900 font-medium">
                                                    {user?.gender === 'male' ? 'Чоловіча' :
                                                        user?.gender === 'female' ? 'Жіноча' : 'Не вказано'}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Вага (кг)</label>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    name="weight"
                                                    value={formData.weight}
                                                    onChange={handleInputChange}
                                                    step="0.1"
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.weight ? `${user.weight} кг` : 'Не вказано'}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Зріст (см)</label>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    name="height"
                                                    value={formData.height}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.height ? `${user.height} см` : 'Не вказано'}</p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Рівень активності</label>
                                            {editing ? (
                                                <select
                                                    name="activityLevel"
                                                    value={formData.activityLevel}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                                >
                                                    <option value={1}>Сидячий спосіб життя</option>
                                                    <option value={2}>Легка активність (1-3 рази на тиждень)</option>
                                                    <option value={3}>Помірна активність (3-5 разів на тиждень)</option>
                                                    <option value={4}>Висока активність (6-7 разів на тиждень)</option>
                                                    <option value={5}>Дуже висока активність (2 рази на день)</option>
                                                </select>
                                            ) : (
                                                <p className="text-gray-900 font-medium">{getActivityLevelText(user?.activityLevel || 1)}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">Денна норма калорій</label>
                                            <p className="text-gray-900 font-medium text-blue-600">
                                                {user?.dailyCalorieGoal ? `${user.dailyCalorieGoal} ккал` : 'Не розраховано (вкажіть вік, вагу, зріст та стать)'}
                                            </p>
                                            {editing && <p className="text-xs text-gray-400 mt-1">Розраховується автоматично з ваших параметрів</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* BMI Card */}
                                {bmi && (
                                    <div className="relative overflow-hidden rounded-3xl p-5 shadow-soft border border-cream-200 bg-gradient-to-br from-blue-50 via-white to-cream-50">
                                        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <span className="w-1 h-4 rounded-full bg-blue-500" />
                                            Індекс маси тіла (BMI)
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-4xl font-extrabold text-blue-600 leading-none">{bmi}</div>
                                                <div className={`text-sm font-semibold mt-1.5 ${bmiCategory?.color}`}>
                                                    {bmiCategory?.text}
                                                </div>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-pop">
                                                <Icon name="weight" size={28} color="white" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Weight Tab */}
                        {activeTab === 'weight' && (
                            <div className="space-y-5">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span className="w-1 h-5 rounded-full bg-brand-gradient" />
                                    Відстеження ваги
                                </h3>

                                {/* Add Weight */}
                                <div className="bg-gradient-to-br from-fresh-50 via-white to-cream-50 border border-fresh-200/60 rounded-2xl p-4">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                        <span className="w-8 h-8 rounded-xl bg-fresh-gradient flex items-center justify-center shadow-sm">
                                            <Icon name="add" size={16} color="white" />
                                        </span>
                                        <span>Додати нову вагу</span>
                                    </h4>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="number"
                                            value={newWeight}
                                            onChange={(e) => setNewWeight(e.target.value)}
                                            placeholder="Введіть вагу в кг"
                                            step="0.1"
                                            className="flex-1 px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all"
                                        />
                                        <button
                                            onClick={handleAddWeight}
                                            className="px-5 py-2.5 btn-fresh rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                                        >
                                            <Icon name="save" size={16} color="white" />
                                            <span>Додати</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Weight History */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                                        <span className="w-8 h-8 rounded-xl bg-cream-100 flex items-center justify-center">
                                            <Icon name="history" size={16} color="gray" />
                                        </span>
                                        <span>Історія змін ваги</span>
                                    </h4>
                                    {weightHistory.length > 0 ? (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {weightHistory.map((record, index) => (
                                                <div key={index} className="flex justify-between items-center p-3 bg-white border border-cream-200 rounded-2xl shadow-sm hover:shadow-soft transition-shadow">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-8 h-8 rounded-xl bg-cream-100 flex items-center justify-center">
                                                            <Icon name="calendar" size={14} color="gray" />
                                                        </span>
                                                        <span className="text-sm text-gray-600">{formatDate(record.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="weight" size={16} color="blue" />
                                                        <span className="font-bold text-gray-900">{record.weight} <span className="text-xs font-medium text-gray-500">кг</span></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-500 bg-cream-50/40 rounded-2xl border border-dashed border-cream-300">
                                            <div className="mb-3 flex justify-center opacity-60">
                                                <Icon name="weight" size={56} color="gray" />
                                            </div>
                                            <p className="font-semibold text-gray-700">Історія ваги порожня</p>
                                            <p className="text-xs mt-1">Додайте перший запис ваги</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;