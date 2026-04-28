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
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
               

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Профіль користувача</h1>
                            <p className="text-gray-600 mt-1">Керуйте своїми даними та налаштуваннями</p>
                        </div>
                        <div className="flex flex-col items-center space-y-2">
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
                                className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                title={user?.avatarUrl ? 'Змінити аватар' : 'Додати аватар'}
                            >
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt="Аватар"
                                        className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                                        <Icon name="user-profile" size={48} color="blue" />
                                    </div>
                                )}
                                <span className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition">
                                    {avatarUploading ? '...' : 'Змінити'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleAvatarPick}
                                disabled={avatarUploading}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                Змінити аватар
                            </button>
                            {user?.avatarUrl && (
                                <button
                                    type="button"
                                    onClick={handleAvatarRemove}
                                    disabled={avatarUploading}
                                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                    Видалити
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <div className="flex space-x-8 px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Icon name={tab.icon} size={18} color={activeTab === tab.id ? 'blue' : 'gray'} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Personal Info */}
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Особиста інформація</h3>
                                        {!editing ? (
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                                            >
                                                <Icon name="edit" size={16} color="white" />
                                                <span>Редагувати</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={() => setEditing(false)}
                                                    className="flex-1 sm:flex-none sm:w-36 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-1.5 text-sm"
                                                >
                                                    <Icon name="close" size={16} color="gray" />
                                                    <span>Скасувати</span>
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={loading}
                                                    className="flex-1 sm:flex-none sm:w-36 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
                                                >
                                                    <Icon name="save" size={16} color="white" />
                                                    <span>{loading ? 'Збереження...' : 'Зберегти'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Ім'я</label>
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                            <p className="text-gray-900 font-medium">{user?.email}</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата народження</label>
                                            {editing ? (
                                                <input
                                                    type="date"
                                                    name="dateOfBirth"
                                                    value={formData.dateOfBirth}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Стать</label>
                                            {editing ? (
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Вага (кг)</label>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    name="weight"
                                                    value={formData.weight}
                                                    onChange={handleInputChange}
                                                    step="0.1"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.weight ? `${user.weight} кг` : 'Не вказано'}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Зріст (см)</label>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    name="height"
                                                    value={formData.height}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.height ? `${user.height} см` : 'Не вказано'}</p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Рівень активності</label>
                                            {editing ? (
                                                <select
                                                    name="activityLevel"
                                                    value={formData.activityLevel}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Денна норма калорій</label>
                                            <p className="text-gray-900 font-medium text-blue-600">
                                                {user?.dailyCalorieGoal ? `${user.dailyCalorieGoal} ккал` : 'Не розраховано (вкажіть вік, вагу, зріст та стать)'}
                                            </p>
                                            {editing && <p className="text-xs text-gray-400 mt-1">Розраховується автоматично з ваших параметрів</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* BMI Card */}
                                {bmi && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Індекс маси тіла (BMI)</h3>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-3xl font-bold text-blue-600">{bmi}</div>
                                                <div className={`text-sm font-medium ${bmiCategory?.color}`}>
                                                    {bmiCategory?.text}
                                                </div>
                                            </div>
                                            <div className="flex justify-center">
                                                <Icon name="weight" size={48} color="blue" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Weight Tab */}
                        {activeTab === 'weight' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Відстеження ваги</h3>

                                {/* Add Weight */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                                        <Icon name="add" size={20} color="gray" />
                                        <span>Додати нову вагу</span>
                                    </h4>
                                    <div className="flex space-x-3">
                                        <input
                                            type="number"
                                            value={newWeight}
                                            onChange={(e) => setNewWeight(e.target.value)}
                                            placeholder="Введіть вагу в кг"
                                            step="0.1"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            onClick={handleAddWeight}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                        >
                                            <Icon name="save" size={16} color="white" />
                                            <span>Додати</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Weight History */}
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                                        <Icon name="history" size={20} color="gray" />
                                        <span>Історія змін ваги</span>
                                    </h4>
                                    {weightHistory.length > 0 ? (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {weightHistory.map((record, index) => (
                                                <div key={index} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <Icon name="calendar" size={16} color="gray" />
                                                        <span className="text-gray-600">{formatDate(record.date)}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Icon name="weight" size={16} color="blue" />
                                                        <span className="font-semibold text-gray-900">{record.weight} кг</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="mb-3 flex justify-center">
                                                <Icon name="weight" size={64} color="gray" />
                                            </div>
                                            <p>Історія ваги порожня</p>
                                            <p className="text-sm mt-1">Додайте перший запис ваги</p>
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