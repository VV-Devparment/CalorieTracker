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

    const getMealCardClass = (mealType: number): string => {
        switch (mealType) {
            case 1: return 'meal-card meal-card-breakfast';
            case 2: return 'meal-card meal-card-lunch';
            case 3: return 'meal-card meal-card-dinner';
            case 4: return 'meal-card meal-card-snack';
            default: return 'meal-card';
        }
    };

    const getMealIconBgClass = (mealType: number): string => {
        switch (mealType) {
            case 1: return 'meal-icon-breakfast';
            case 2: return 'meal-icon-lunch';
            case 3: return 'meal-icon-dinner';
            case 4: return 'meal-icon-snack';
            default: return 'meal-icon-lunch';
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

    const goalKcal = dailyMeals?.summary.dailyCalorieGoal || user?.dailyCalorieGoal || 2000;
    const consumedKcal = Math.round(dailyMeals?.summary.totalCalories || 0);
    const remainingKcal = Math.max(goalKcal - consumedKcal, 0);
    const progressPct = Math.min((consumedKcal / Math.max(goalKcal, 1)) * 100, 100);

    return (
        <div className="min-h-screen pb-24">
            <div className="max-w-md mx-auto px-4 py-5">
                {/* Hero card — greeting + date + ring */}
                <div className="hero-card p-5 mb-4 animate-fade-in-up">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                                    {isToday(selectedDate) ? 'Сьогодні' : selectedDate.toLocaleDateString('uk-UA', { weekday: 'long' })}
                                </p>
                                <h1 className="text-2xl font-extrabold text-white drop-shadow leading-tight flex items-center gap-2">
                                    <span>Привіт, {user?.name?.split(' ')[0] || 'друже'}!</span>
                                    <Icon name="wave" size={26} color="white" />
                                </h1>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => changeDateBy(-1)}
                                    className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition-all active:scale-95 flex items-center justify-center"
                                    aria-label="Попередній день"
                                >
                                    <Icon name="chevron-left" size={18} color="white" />
                                </button>
                                <button
                                    onClick={() => changeDateBy(1)}
                                    disabled={isToday(selectedDate)}
                                    className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                    aria-label="Наступний день"
                                >
                                    <Icon name="chevron-right" size={18} color="white" />
                                </button>
                            </div>
                        </div>

                        {/* Calorie ring */}
                        <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                                <div
                                    className="w-28 h-28 rounded-full p-1.5"
                                    style={{
                                        background: `conic-gradient(#FFFFFF ${progressPct * 3.6}deg, rgba(255,255,255,0.2) ${progressPct * 3.6}deg)`
                                    }}
                                >
                                    <div className="w-full h-full rounded-full bg-brand-700/80 backdrop-blur flex flex-col items-center justify-center">
                                        <div className="text-2xl font-extrabold text-white leading-none">{consumedKcal}</div>
                                        <div className="text-[10px] text-white/80 font-semibold uppercase tracking-wider mt-0.5">з {goalKcal}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2.5 text-white">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Залишилось</div>
                                    <div className="text-xl font-extrabold leading-tight">{remainingKcal} <span className="text-sm font-semibold text-white/80">ккал</span></div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Прогрес</div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 rounded-full bg-white/25 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-200 to-white transition-all duration-500"
                                                style={{ width: `${progressPct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold">{Math.round(progressPct)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Summary — colorful gradient tiles */}
                {!loading && dailyMeals && (
                    <div className="grid grid-cols-3 gap-3 mb-4 animate-fade-in-up">
                        <div className="tile-protein">
                            <div className="relative z-10">
                                <Icon name="protein" size={22} color="white" />
                                <div className="text-[10px] uppercase tracking-wider text-white/85 font-bold mt-1.5">Білки</div>
                                <div className="text-xl font-extrabold leading-none mt-0.5">
                                    {Math.round(dailyMeals.summary.totalProtein)}<span className="text-xs font-semibold text-white/80 ml-0.5">г</span>
                                </div>
                            </div>
                        </div>
                        <div className="tile-fats">
                            <div className="relative z-10">
                                <Icon name="fats" size={22} color="white" />
                                <div className="text-[10px] uppercase tracking-wider text-white/85 font-bold mt-1.5">Жири</div>
                                <div className="text-xl font-extrabold leading-none mt-0.5">
                                    {Math.round(dailyMeals.summary.totalFats)}<span className="text-xs font-semibold text-white/80 ml-0.5">г</span>
                                </div>
                            </div>
                        </div>
                        <div className="tile-carbs">
                            <div className="relative z-10">
                                <Icon name="carbs" size={22} color="white" />
                                <div className="text-[10px] uppercase tracking-wider text-white/85 font-bold mt-1.5">Вугл.</div>
                                <div className="text-xl font-extrabold leading-none mt-0.5">
                                    {Math.round(dailyMeals.summary.totalCarbs)}<span className="text-xs font-semibold text-white/80 ml-0.5">г</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* Meals */}
                {!loading && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider px-1 flex items-center gap-2">
                            <span className="inline-block w-1 h-4 rounded-full bg-brand-gradient" />
                            Прийоми їжі
                        </h2>
                        {[1, 2, 3, 4].map((mealType) => {
                            const meal = getMealByType(mealType);
                            const isExpanded = expandedMeals[mealType];
                            const hasItems = meal && meal.items && meal.items.length > 0;

                            return (
                                <div
                                    key={mealType}
                                    className={getMealCardClass(mealType)}
                                >
                                    {/* Meal Header */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${getMealIconBgClass(mealType)}`}>
                                                    <Icon name={getMealTypeIcon(mealType)} size={22} color="white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                                                        {getMealTypeName(mealType)}
                                                    </h3>
                                                    {hasItems && (
                                                        <p className="text-xs text-gray-500">
                                                            {meal.items.length} продукт{meal.items.length > 1 ? 'и' : ''} · {Math.round(meal.totalCalories)} ккал
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAddFood(mealType)}
                                                className="px-3 py-2 bg-brand-gradient text-white rounded-full text-sm font-bold shadow-pop hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1"
                                            >
                                                <Icon name="add" size={16} color="white" />
                                                <span className="hidden xs:inline">Додати</span>
                                            </button>
                                        </div>

                                        {/* Meal Summary */}
                                        {hasItems && (
                                            <button
                                                onClick={() => toggleMealExpansion(mealType)}
                                                className="w-full flex justify-between items-center p-3 bg-white/70 backdrop-blur rounded-2xl border border-white/80 hover:bg-white transition-all"
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-fresh-500" />
                                                        <span className="font-semibold text-gray-700">{Math.round(meal.totalProtein || 0)}г</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-sun-500" />
                                                        <span className="font-semibold text-gray-700">{Math.round(meal.totalFats || 0)}г</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-berry-500" />
                                                        <span className="font-semibold text-gray-700">{Math.round(meal.totalCarbs || 0)}г</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-extrabold text-gradient-brand">
                                                        {Math.round(meal.totalCalories)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">ккал</span>
                                                    <Icon
                                                        name={isExpanded ? "expand-less" : "expand-more"}
                                                        size={20}
                                                        color="gray"
                                                    />
                                                </div>
                                            </button>
                                        )}

                                        {/* Empty State */}
                                        {!hasItems && (
                                            <div className="text-center py-4 text-gray-500">
                                                <div className="mb-1.5 flex justify-center opacity-60">
                                                    <Icon name="empty-plate" size={40} color="gray" />
                                                </div>
                                                <p className="text-xs">Поки що нічого не додано</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expandable Food List */}
                                    {hasItems && isExpanded && (
                                        <div className="border-t border-white/80 bg-white/50 backdrop-blur p-3 space-y-2 animate-fade-in-up">
                                            {meal.items.map((item: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="p-3 bg-white rounded-2xl shadow-sm border border-cream-100 hover:shadow-soft transition-shadow"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-900 text-sm truncate">
                                                                {item.foodName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                                <span>{item.quantity}г</span>
                                                                <span className="text-gray-300">·</span>
                                                                <span className="font-bold text-brand-600">{Math.round(item.calories)} ккал</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button
                                                                onClick={() => handleEditQuantity(item.id, item.quantity)}
                                                                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                                                                title="Змінити кількість"
                                                            >
                                                                <Icon name="edit" size={16} color="blue" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id, item.foodName)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                                title="Видалити"
                                                            >
                                                                <Icon name="delete" size={16} color="red" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-fresh-500" />
                                                            <span className="text-gray-600">Б {Math.round(item.protein)}г</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-sun-500" />
                                                            <span className="text-gray-600">Ж {Math.round(item.fats)}г</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-berry-500" />
                                                            <span className="text-gray-600">В {Math.round(item.carbs)}г</span>
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
                        <div className="spinner"></div>
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