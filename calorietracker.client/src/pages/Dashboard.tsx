import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';
import { mealsApi } from '../services/api';
import AddFoodModal from '../components/AddFoodModal';
import Icon from '../components/Icon';

interface DailyMeals {
    date: string;
    meals: any[];
    summary: {
        totalCalories: number;
        totalProtein: number;
        totalFats: number;
        totalCarbs: number;
        dailyCalorieGoal?: number;
    };
}

const Dashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyMeals, setDailyMeals] = useState<DailyMeals | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAddFoodModal, setShowAddFoodModal] = useState(false);
    const [selectedMealType, setSelectedMealType] = useState<number>(1);
    const [expandedMeals, setExpandedMeals] = useState<{ [key: number]: boolean }>({});
    const user = getCurrentUser();

    // Завантаження даних про прийоми їжі
    const loadDailyMeals = async (date: Date) => {
        try {
            setLoading(true);
            const dateStr = date.toISOString().split('T')[0];
            const response = await mealsApi.getDailyMeals(dateStr);
            setDailyMeals(response.data);
        } catch (error) {
            console.error('Error loading daily meals:', error);
            setDailyMeals({
                date: date.toISOString().split('T')[0],
                meals: [],
                summary: {
                    totalCalories: 0,
                    totalProtein: 0,
                    totalFats: 0,
                    totalCarbs: 0,
                    dailyCalorieGoal: user?.dailyCalorieGoal
                }
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDailyMeals(selectedDate);
    }, [selectedDate]);

    // Функції для редагування та видалення
    const handleEditQuantity = async (itemId: number, currentQuantity: number) => {
        const newQuantityStr = prompt(`Введіть нову кількість (грам):`, currentQuantity.toString());

        if (newQuantityStr === null) return;

        const newQuantity = parseFloat(newQuantityStr);

        if (isNaN(newQuantity) || newQuantity <= 0) {
            alert('Введіть коректну кількість більше 0');
            return;
        }

        try {
            await mealsApi.updateMealItemQuantity(itemId, newQuantity);
            await loadDailyMeals(selectedDate);
            alert('Кількість успішно оновлена!');
        } catch (error: any) {
            console.error('Помилка при оновленні:', error);
            alert('Помилка при оновленні кількості: ' + (error?.response?.data?.message || error?.message || 'Невідома помилка'));
        }
    };

    const handleDeleteItem = async (itemId: number, foodName: string) => {
        const confirmed = confirm(`Видалити "${foodName}" з прийому їжі?`);

        if (!confirmed) return;

        try {
            await mealsApi.removeFoodFromMeal(itemId);
            await loadDailyMeals(selectedDate);
            alert('Продукт успішно видалено!');
        } catch (error: any) {
            console.error('Помилка при видаленні:', error);
            alert('Помилка при видаленні продукту: ' + (error?.response?.data?.message || error?.message || 'Невідома помилка'));
        }
    };

    const handleAddFood = (mealType: number) => {
        setSelectedMealType(mealType);
        setShowAddFoodModal(true);
    };

    const handleFoodAdded = () => {
        setShowAddFoodModal(false);
        loadDailyMeals(selectedDate);
    };

    const toggleMealExpansion = (mealType: number) => {
        setExpandedMeals(prev => ({
            ...prev,
            [mealType]: !prev[mealType]
        }));
    };

    const getMealTypeName = (mealType: number): string => {
        switch (mealType) {
            case 1: return 'Сніданок';
            case 2: return 'Обід';
            case 3: return 'Вечеря';
            case 4: return 'Перекус';
            default: return 'Прийом їжі';
        }
    };

    const getMealTypeIcon = (mealType: number): string => {
        switch (mealType) {
            case 1: return 'breakfast';
            case 2: return 'lunch';
            case 3: return 'dinner';
            case 4: return 'snack';
            default: return 'plate';
        }
    };

    const getMealByType = (mealType: number) => {
        return dailyMeals?.meals.find(meal => meal.mealType === mealType);
    };

    const changeDateBy = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-md mx-auto px-4 py-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">
                            Привіт, {user?.name}! 👋
                        </h1>

                        {/* Date Navigation */}
                        <div className="flex items-center justify-center space-x-4 mt-4">
                            <button
                                onClick={() => changeDateBy(-1)}
                                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <span className="text-xl">←</span>
                            </button>
                            <div className="text-center min-w-[120px]">
                                <div className="text-lg font-semibold text-gray-900">
                                    {selectedDate.toLocaleDateString('uk-UA', {
                                        day: 'numeric',
                                        month: 'short'
                                    })}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {isToday(selectedDate) ? 'Сьогодні' : selectedDate.toLocaleDateString('uk-UA', { weekday: 'short' })}
                                </div>
                            </div>
                            <button
                                onClick={() => changeDateBy(1)}
                                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                disabled={isToday(selectedDate)}
                            >
                                <span className="text-xl">→</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Daily Summary */}
                {!loading && dailyMeals && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Денна статистика</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-xl">
                                <div className="mb-1 flex justify-center">
                                    <Icon name="calories" size={32} color="blue" />
                                </div>
                                <div className="text-sm text-gray-600">Калорії</div>
                                <div className="text-lg font-bold text-blue-600">
                                    {Math.round(dailyMeals.summary.totalCalories)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    / {dailyMeals.summary.dailyCalorieGoal || 2000}
                                </div>
                            </div>

                            <div className="text-center p-4 bg-green-50 rounded-xl">
                                <div className="mb-1 flex justify-center">
                                    <Icon name="protein" size={32} color="green" />
                                </div>
                                <div className="text-sm text-gray-600">Білки</div>
                                <div className="text-lg font-bold text-green-600">
                                    {Math.round(dailyMeals.summary.totalProtein)}г
                                </div>
                            </div>

                            <div className="text-center p-4 bg-yellow-50 rounded-xl">
                                <div className="mb-1 flex justify-center">
                                    <Icon name="fats" size={32} color="orange" />
                                </div>
                                <div className="text-sm text-gray-600">Жири</div>
                                <div className="text-lg font-bold text-yellow-600">
                                    {Math.round(dailyMeals.summary.totalFats)}г
                                </div>
                            </div>

                            <div className="text-center p-4 bg-red-50 rounded-xl">
                                <div className="mb-1 flex justify-center">
                                    <Icon name="carbs" size={32} color="red" />
                                </div>
                                <div className="text-sm text-gray-600">Вуглеводи</div>
                                <div className="text-lg font-bold text-red-600">
                                    {Math.round(dailyMeals.summary.totalCarbs)}г
                                </div>
                            </div>
                        </div>
                    </div>
                )}

               

                {/* Meals */}
                {!loading && (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((mealType) => {
                            const meal = getMealByType(mealType);
                            const isExpanded = expandedMeals[mealType];
                            const hasItems = meal && meal.items && meal.items.length > 0;

                            return (
                                <div
                                    key={mealType}
                                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                                >
                                    {/* Meal Header */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center space-x-2">
                                                <Icon name={getMealTypeIcon(mealType)} size={24} color="gray" />
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {getMealTypeName(mealType)}
                                                </h3>
                                            </div>

                                            <button
                                                onClick={() => handleAddFood(mealType)}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                            >
                                                <Icon name="add" size={16} color="white" />
                                                <span>Додати</span>
                                            </button>
                                        </div>

                                        {/* Meal Summary */}
                                        {hasItems && (
                                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                                <div className="text-sm text-gray-600 flex items-center space-x-2">
                                                    <Icon name="plate" size={16} color="gray" />
                                                    <span>{meal.items.length} продукт{meal.items.length > 1 ? 'и' : ''}</span>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-sm font-semibold text-blue-600 flex items-center space-x-1">
                                                        <Icon name="calories" size={14} color="blue" />
                                                        <span>{Math.round(meal.totalCalories)} ккал</span>
                                                    </span>
                                                    <button
                                                        onClick={() => toggleMealExpansion(mealType)}
                                                        className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                                                    >
                                                        <Icon
                                                            name={isExpanded ? "expand-less" : "expand-more"}
                                                            size={20}
                                                            color="gray"
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {!hasItems && (
                                            <div className="text-center py-6 text-gray-500">
                                                <div className="mb-2 flex justify-center">
                                                    <Icon name="empty-plate" size={48} color="gray" />
                                                </div>
                                                <p className="text-sm">Продукти не додано</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expandable Food List */}
                                    {hasItems && isExpanded && (
                                        <div className="border-t border-gray-100 p-4 space-y-3">
                                            {meal.items.map((item: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-gray-50 rounded-xl"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 text-sm">
                                                                {item.foodName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                                                                <div className="flex items-center space-x-1">
                                                                    <Icon name="weight" size={12} color="gray" />
                                                                    <span>{item.quantity}г</span>
                                                                </div>
                                                                <span>•</span>
                                                                <div className="flex items-center space-x-1">
                                                                    <Icon name="calories" size={12} color="gray" />
                                                                    <span>{Math.round(item.calories)} ккал</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-2 ml-2">
                                                            <button
                                                                onClick={() => handleEditQuantity(item.id, item.quantity)}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded-full text-xs"
                                                                title="Змінити кількість"
                                                            >
                                                                <Icon name="edit" size={16} color="blue" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id, item.foodName)}
                                                                className="p-1 text-red-500 hover:bg-red-100 rounded-full text-xs"
                                                                title="Видалити"
                                                            >
                                                                <Icon name="delete" size={16} color="red" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <div className="flex items-center space-x-1">
                                                            <Icon name="protein" size={12} color="green" />
                                                            <span>Б: {Math.round(item.protein)}г</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Icon name="fats" size={12} color="orange" />
                                                            <span>Ж: {Math.round(item.fats)}г</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Icon name="carbs" size={12} color="red" />
                                                            <span>В: {Math.round(item.carbs)}г</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
            </div>

            {/* Add Food Modal */}
            {showAddFoodModal && (
                <AddFoodModal
                    date={selectedDate.toISOString().split('T')[0]}
                    mealType={selectedMealType}
                    onClose={() => setShowAddFoodModal(false)}
                    onFoodAdded={handleFoodAdded}
                />
            )}
        </div>
    );
};

export default Dashboard;