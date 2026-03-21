import React, { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser } from '../utils/auth';
import { usersApi } from '../services/api';
import { notificationService } from '../services/notificationService';
import Icon from '../components/Icon';

interface User {
    id: number;
    email: string;
    name: string;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel: number;
    dailyCalorieGoal?: number;
    createdAt: string;
}

interface WeightRecord {
    date: string;
    weight: number;
}

interface UserStats {
    averageCalories: number;
    averageProtein: number;
    averageFats: number;
    averageCarbs: number;
    totalMeals: number;
    daysWithData: number;
}

const Profile = () => {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [newWeight, setNewWeight] = useState('');
    const [activeTab, setActiveTab] = useState('profile');

    const [formData, setFormData] = useState({
        name: user?.name || '',
        age: user?.age || '',
        weight: user?.weight || '',
        height: user?.height || '',
        gender: user?.gender || '',
        activityLevel: user?.activityLevel || 2,
    });

    useEffect(() => {
        loadUserStats();
        loadWeightHistory();
    }, []);

    const loadUserStats = async () => {
        try {
            const response = await usersApi.getStatistics(30);
            setUserStats(response.data.summary);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

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
            [name]: name === 'age' || name === 'weight' || name === 'height' || name === 'activityLevel' || name === 'dailyCalorieGoal'
                ? value ? Number(value) : ''
                : value
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            const newWeightVal = formData.weight ? Number(formData.weight) : undefined;
            const oldWeight = user?.weight;

            // Weight is stored only in WeightRecords (3NF) — update it separately if changed
            if (newWeightVal && newWeightVal !== oldWeight) {
                await usersApi.addWeightRecord(newWeightVal);
                notificationService.onWeightUpdated(newWeightVal);
            }

            // Update profile fields (weight and dailyCalorieGoal are excluded — handled by 3NF design)
            const updateData = {
                name: formData.name,
                age: formData.age ? Number(formData.age) : undefined,
                height: formData.height ? Number(formData.height) : undefined,
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
            loadUserStats();
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
        { id: 'stats', label: 'Статистика', icon: 'chart' },
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
                        <div className="flex justify-center">
                            <Icon name="user-profile" size={64} color="blue" />
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
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Особиста інформація</h3>
                                        {!editing ? (
                                            <button
                                                onClick={() => setEditing(true)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                            >
                                                <Icon name="edit" size={16} color="white" />
                                                <span>Редагувати</span>
                                            </button>
                                        ) : (
                                            <div className="space-x-2">
                                                <button
                                                    onClick={() => setEditing(false)}
                                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center space-x-2"
                                                >
                                                    <Icon name="close" size={16} color="gray" />
                                                    <span>Скасувати</span>
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Вік</label>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    name="age"
                                                    value={formData.age}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            ) : (
                                                <p className="text-gray-900 font-medium">{user?.age || 'Не вказано'}</p>
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

                        {/* Stats Tab */}
                        {activeTab === 'stats' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900">Статистика за останні 30 днів</h3>

                                {userStats ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="bg-blue-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-blue-600 font-medium">Середні калорії</p>
                                                    <p className="text-2xl font-bold text-blue-900">
                                                        {Math.round(userStats.averageCalories)}
                                                    </p>
                                                </div>
                                                <Icon name="calories" size={32} color="blue" />
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-green-600 font-medium">Середні білки</p>
                                                    <p className="text-2xl font-bold text-green-900">
                                                        {Math.round(userStats.averageProtein)}г
                                                    </p>
                                                </div>
                                                <Icon name="protein" size={32} color="green" />
                                            </div>
                                        </div>

                                        <div className="bg-yellow-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-yellow-600 font-medium">Всього прийомів</p>
                                                    <p className="text-2xl font-bold text-yellow-900">
                                                        {userStats.totalMeals}
                                                    </p>
                                                </div>
                                                <Icon name="plate" size={32} color="orange" />
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-purple-600 font-medium">Днів з даними</p>
                                                    <p className="text-2xl font-bold text-purple-900">
                                                        {userStats.daysWithData}
                                                    </p>
                                                </div>
                                                <Icon name="calendar" size={32} color="purple" />
                                            </div>
                                        </div>

                                        <div className="bg-orange-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-orange-600 font-medium">Середні жири</p>
                                                    <p className="text-2xl font-bold text-orange-900">
                                                        {Math.round(userStats.averageFats)}г
                                                    </p>
                                                </div>
                                                <Icon name="fats" size={32} color="orange" />
                                            </div>
                                        </div>

                                        <div className="bg-red-50 p-6 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-red-600 font-medium">Середні вуглеводи</p>
                                                    <p className="text-2xl font-bold text-red-900">
                                                        {Math.round(userStats.averageCarbs)}г
                                                    </p>
                                                </div>
                                                <Icon name="carbs" size={32} color="red" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="mb-3 flex justify-center">
                                            <Icon name="chart" size={64} color="gray" />
                                        </div>
                                        <p>Статистика буде доступна після додавання прийомів їжі</p>
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