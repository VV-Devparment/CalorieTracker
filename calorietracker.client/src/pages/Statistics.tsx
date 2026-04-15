import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';
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

const MACRO_COLORS = {
    protein: '#22c55e',
    fats: '#f59e0b',
    carbs: '#ef4444',
    calories: '#3b82f6',
};

const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
};

// Custom tooltip for calorie line chart
const CaloriesTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} style={{ color: entry.color }}>
                    {entry.name}: <strong>{Math.round(entry.value)}</strong>
                    {entry.dataKey !== 'goal' ? ' ккал' : ' ккал'}
                </p>
            ))}
        </div>
    );
};

// Custom tooltip for macro bar chart
const MacroTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} style={{ color: entry.color }}>
                    {entry.name}: <strong>{Math.round(entry.value)}г</strong>
                </p>
            ))}
        </div>
    );
};

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
        { value: 90, label: '3 місяці' },
    ];

    const calorieGoal = user?.dailyCalorieGoal || 2000;

    // Data for calorie line chart — fill missing days with 0
    const calorieChartData = dailyStats.map(d => ({
        label: formatShortDate(d.date),
        calories: Math.round(d.totalCalories),
        goal: calorieGoal,
    }));

    // Data for macro stacked bar chart
    const macroChartData = dailyStats.map(d => ({
        label: formatShortDate(d.date),
        Білки: Math.round(d.totalProtein),
        Жири: Math.round(d.totalFats),
        Вуглеводи: Math.round(d.totalCarbs),
    }));

    // Data for macro donut (average distribution)
    const totalMacroKcal = userStats
        ? userStats.averageProtein * 4 + userStats.averageFats * 9 + userStats.averageCarbs * 4
        : 0;

    const donutData = userStats && totalMacroKcal > 0
        ? [
            { name: 'Білки', value: Math.round(userStats.averageProtein * 4), grams: Math.round(userStats.averageProtein) },
            { name: 'Жири', value: Math.round(userStats.averageFats * 9), grams: Math.round(userStats.averageFats) },
            { name: 'Вуглеводи', value: Math.round(userStats.averageCarbs * 4), grams: Math.round(userStats.averageCarbs) },
        ]
        : [];
    const donutColors = [MACRO_COLORS.protein, MACRO_COLORS.fats, MACRO_COLORS.carbs];

    const calculateProgress = (current: number, goal: number) => {
        if (!goal) return 0;
        return Math.min((current / goal) * 100, 100);
    };

    const getProgressColor = (progress: number) => {
        if (progress < 50) return 'bg-red-500';
        if (progress < 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-md mx-auto px-4 py-6">

                {/* Header + period selector */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                    <h1 className="text-xl font-bold text-gray-900 text-center mb-4 flex items-center justify-center space-x-2">
                        <Icon name="chart" size={24} color="blue" />
                        <span>Статистика харчування</span>
                    </h1>
                    <div className="flex space-x-2">
                        {periods.map((period) => (
                            <button
                                key={period.value}
                                onClick={() => setSelectedPeriod(period.value)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                    selectedPeriod === period.value
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
                                    <div className="text-xs text-gray-400">ціль: {calorieGoal}</div>
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

                        {/* Calorie Trend Chart */}
                        {calorieChartData.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                    <Icon name="timeline" size={20} color="blue" />
                                    <span>Тренд калорій</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={calorieChartData} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                                            interval={selectedPeriod <= 7 ? 0 : Math.ceil(calorieChartData.length / 6)}
                                        />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <Tooltip content={<CaloriesTooltip />} />
                                        <ReferenceLine
                                            y={calorieGoal}
                                            stroke="#94a3b8"
                                            strokeDasharray="5 5"
                                            label={{ value: 'ціль', position: 'right', fontSize: 10, fill: '#94a3b8' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="calories"
                                            name="Калорії"
                                            stroke={MACRO_COLORS.calories}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: MACRO_COLORS.calories, strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Macro Distribution Donut */}
                        {donutData.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center space-x-2">
                                    <Icon name="protein" size={20} color="green" />
                                    <span>Розподіл макронутрієнтів</span>
                                </h2>
                                <p className="text-xs text-gray-400 mb-4">Середнє за обраний період</p>
                                <div className="flex items-center">
                                    <ResponsiveContainer width="55%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={donutData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={78}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {donutData.map((_, index) => (
                                                    <Cell key={index} fill={donutColors[index]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number, name: string) => [
                                                    `${value} ккал (${Math.round(value / totalMacroKcal * 100)}%)`,
                                                    name
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-3 pl-2">
                                        {donutData.map((item, i) => (
                                            <div key={item.name} className="flex items-center space-x-2">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: donutColors[i] }}
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">{item.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {item.grams}г · {Math.round(item.value / totalMacroKcal * 100)}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Macro Stacked Bar Chart */}
                        {macroChartData.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                    <Icon name="carbs" size={20} color="red" />
                                    <span>Макроси по днях</span>
                                </h2>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={macroChartData} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                                            interval={selectedPeriod <= 7 ? 0 : Math.ceil(macroChartData.length / 6)}
                                        />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="г" />
                                        <Tooltip content={<MacroTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12 }}
                                            iconType="circle"
                                            iconSize={8}
                                        />
                                        <Bar dataKey="Білки" stackId="a" fill={MACRO_COLORS.protein} radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Жири" stackId="a" fill={MACRO_COLORS.fats} />
                                        <Bar dataKey="Вуглеводи" stackId="a" fill={MACRO_COLORS.carbs} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

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
                                            {Math.round(userStats.averageCalories)}/{calorieGoal}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(calculateProgress(userStats.averageCalories, calorieGoal))}`}
                                            style={{ width: `${calculateProgress(userStats.averageCalories, calorieGoal)}%` }}
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
                                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(calculateProgress(userStats.averageProtein, 100))}`}
                                            style={{ width: `${calculateProgress(userStats.averageProtein, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Cards */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Активність</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <Icon name="calendar" size={24} color="purple" />
                                        <div>
                                            <p className="font-medium text-gray-900">Активні дні</p>
                                            <p className="text-sm text-gray-600">Днів з записами</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-purple-600">{userStats.daysWithData}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <Icon name="plate" size={24} color="orange" />
                                        <div>
                                            <p className="font-medium text-gray-900">Всього прийомів</p>
                                            <p className="text-sm text-gray-600">За обраний період</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-orange-600">{userStats.totalMeals}</span>
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
                                            : 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tips and Insights */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                <Icon name="lightbulb" size={20} color="yellow" />
                                <span>Поради</span>
                            </h2>
                            <div className="space-y-3">
                                {userStats.averageCalories < calorieGoal * 0.8 && (
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
                                                Продовжуйте в тому ж дусі!
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {userStats.daysWithData > 0 && userStats.totalMeals / userStats.daysWithData < 3 && (
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
