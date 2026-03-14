import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';
import { usersApi } from '../services/api';
import Icon from '../components/Icon';

interface UserStats {
    averageCalories: number;
    averageProtein: number;
    averageFats: number;
    averageCarbs: number;
    totalMeals: number;
    daysWithData: number;
}

interface DailyStats {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalFats: number;
    totalCarbs: number;
    mealsCount: number;
}

const Statistics = () => {
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState(7);
    const [loading, setLoading] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        loadStatistics();
    }, [selectedPeriod]);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            const response = await usersApi.getStatistics(selectedPeriod);
            setUserStats(response.data.summary);
            setDailyStats(response.data.dailyStats || []);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const periods = [
        { value: 7, label: '7 днів' },
        { value: 14, label: '14 днів' },
        { value: 30, label: '30 днів' },
        { value: 90, label: '3 місяці' }
    ];

    const calculateProgress = (current: number, goal: number) => {
        if (!goal) return 0;
        return Math.min((current / goal) * 100, 100);
    };

    const getProgressColor = (progress: number) => {
        if (progress < 50) return 'bg-red-500';
        if (progress < 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'short'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-md mx-auto px-4 py-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                    <h1 className="text-xl font-bold text-gray-900 text-center mb-4 flex items-center justify-center space-x-2">
                        <Icon name="chart" size={24} color="blue" />
                        <span>Статистика харчування</span>
                    </h1>

                    {/* Period Selection */}
                    <div className="flex space-x-2 mb-4">
                        {periods.map((period) => (
                            <button
                                key={period.value}
                                onClick={() => setSelectedPeriod(period.value)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === period.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : userStats ? (
                    <>
                        {/* Summary Cards */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Середні показники</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <div className="mb-1 flex justify-center">
                                        <Icon name="calories" size={32} color="blue" />
                                    </div>
                                    <div className="text-sm text-gray-600">Калорії/день</div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {Math.round(userStats.averageCalories)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        ціль: {user?.dailyCalorieGoal || 2000}
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-green-50 rounded-xl">
                                    <div className="mb-1 flex justify-center">
                                        <Icon name="protein" size={32} color="green" />
                                    </div>
                                    <div className="text-sm text-gray-600">Білки/день</div>
                                    <div className="text-lg font-bold text-green-600">
                                        {Math.round(userStats.averageProtein)}г
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                                    <div className="mb-1 flex justify-center">
                                        <Icon name="fats" size={32} color="orange" />
                                    </div>
                                    <div className="text-sm text-gray-600">Жири/день</div>
                                    <div className="text-lg font-bold text-yellow-600">
                                        {Math.round(userStats.averageFats)}г
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-red-50 rounded-xl">
                                    <div className="mb-1 flex justify-center">
                                        <Icon name="carbs" size={32} color="red" />
                                    </div>
                                    <div className="text-sm text-gray-600">Вуглеводи/день</div>
                                    <div className="text-lg font-bold text-red-600">
                                        {Math.round(userStats.averageCarbs)}г
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Achievement Cards */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Досягнення</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <Icon name="calendar" size={24} color="purple" />
                                        <div>
                                            <p className="font-medium text-gray-900">Активні дні</p>
                                            <p className="text-sm text-gray-600">Днів з записами</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-purple-600">
                                        {userStats.daysWithData}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <Icon name="plate" size={24} color="orange" />
                                        <div>
                                            <p className="font-medium text-gray-900">Всього прийомів</p>
                                            <p className="text-sm text-gray-600">За обраний період</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-orange-600">
                                        {userStats.totalMeals}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <Icon name="average" size={24} color="blue" />
                                        <div>
                                            <p className="font-medium text-gray-900">Середньо прийомів/день</p>
                                            <p className="text-sm text-gray-600">Регулярність харчування</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-indigo-600">
                                        {userStats.daysWithData > 0
                                            ? Math.round((userStats.totalMeals / userStats.daysWithData) * 10) / 10
                                            : 0
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Tracking */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                <Icon name="progress" size={20} color="blue" />
                                <span>Прогрес до цілей</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Icon name="calories" size={16} color="blue" />
                                            <span className="text-sm font-medium text-gray-700">Калорії</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {Math.round(userStats.averageCalories)}/{user?.dailyCalorieGoal || 2000}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(calculateProgress(userStats.averageCalories, user?.dailyCalorieGoal || 2000))
                                                }`}
                                            style={{
                                                width: `${calculateProgress(userStats.averageCalories, user?.dailyCalorieGoal || 2000)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Icon name="protein" size={16} color="green" />
                                            <span className="text-sm font-medium text-gray-700">Білки (рекомендовано: 100г)</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {Math.round(userStats.averageProtein)}/100г
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(calculateProgress(userStats.averageProtein, 100))
                                                }`}
                                            style={{
                                                width: `${calculateProgress(userStats.averageProtein, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Breakdown */}
                        {dailyStats.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                    <Icon name="timeline" size={20} color="blue" />
                                    <span>Денна динаміка</span>
                                </h2>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {dailyStats.slice(-14).map((day, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center space-x-3">
                                                <Icon name="calendar" size={16} color="gray" />
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatDate(day.date)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center space-x-1">
                                                        <Icon name="plate" size={12} color="gray" />
                                                        <span>{day.mealsCount} прийоми</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-blue-600 flex items-center space-x-1">
                                                    <Icon name="calories" size={14} color="blue" />
                                                    <span>{Math.round(day.totalCalories)} ккал</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Б:{Math.round(day.totalProtein)}
                                                    Ж:{Math.round(day.totalFats)}
                                                    В:{Math.round(day.totalCarbs)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips and Insights */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                <Icon name="lightbulb" size={20} color="yellow" />
                                <span>Поради</span>
                            </h2>
                            <div className="space-y-3">
                                {userStats.averageCalories < (user?.dailyCalorieGoal || 2000) * 0.8 && (
                                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <Icon name="warning" size={16} color="yellow" />
                                            <p className="text-sm text-yellow-800">
                                                <strong>Недостатньо калорій:</strong> Ви споживаєте менше калорій ніж потрібно.
                                                Спробуйте додати більше поживних продуктів.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {userStats.averageProtein < 80 && (
                                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <Icon name="protein" size={16} color="blue" />
                                            <p className="text-sm text-blue-800">
                                                <strong>Більше білка:</strong> Додайте в раціон м'ясо, рибу, яйця або бобові
                                                для досягнення рекомендованої норми білка.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {userStats.daysWithData / selectedPeriod > 0.8 && (
                                    <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <Icon name="success" size={16} color="green" />
                                            <p className="text-sm text-green-800">
                                                <strong>Відмінно!</strong> Ви регулярно відстежуєте своє харчування.
                                                Продовжуйте в тому ж дусі! 🎉
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {userStats.totalMeals / userStats.daysWithData < 3 && (
                                    <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <Icon name="clock" size={16} color="orange" />
                                            <p className="text-sm text-orange-800">
                                                <strong>Регулярність:</strong> Спробуйте їсти 3-4 рази на день для
                                                кращого метаболізму та контролю голоду.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <div className="mb-4 flex justify-center">
                            <Icon name="chart" size={96} color="gray" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Статистика недоступна</h3>
                        <p className="text-gray-600">Почніть відстежувати харчування для перегляду статистики</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Statistics;