import { Trash2 } from 'lucide-react';
import { mealsApi } from '../services/api';
import type { Meal } from '../types';

interface MealCardProps {
    meal: Meal;
    onUpdate: () => void;
}

const MealCard = ({ meal, onUpdate }: MealCardProps) => {
    const handleRemoveItem = async (itemId: number) => {
        if (!confirm('Видалити цей продукт з прийому їжі?')) {
            return;
        }

        try {
            await mealsApi.removeFoodFromMeal(itemId);
            onUpdate();
        } catch (error) {
            console.error('Error removing item:', error);
            alert('Помилка при видаленні продукту');
        }
    };

    if (!meal.items.length) {
        return (
            <div className="text-center py-4 text-gray-500">
                <p>Продукти не додано</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Food Items */}
            {meal.items.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{item.foodName}</h4>
                            <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Видалити продукт"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                            Кількість: {item.quantity}г
                        </div>

                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Калорії:</span>
                                <span className="ml-1 font-medium">{Math.round(item.calories)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Білки:</span>
                                <span className="ml-1 font-medium text-green-600">{Math.round(item.protein)}г</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Жири:</span>
                                <span className="ml-1 font-medium text-yellow-600">{Math.round(item.fats)}г</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Вуглеводи:</span>
                                <span className="ml-1 font-medium text-orange-600">{Math.round(item.carbs)}г</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Meal Totals */}
            <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium">
                    <div className="text-center">
                        <div className="text-gray-500">Всього калорій</div>
                        <div className="text-lg text-blue-600">{Math.round(meal.totalCalories)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-500">Білки</div>
                        <div className="text-lg text-green-600">{Math.round(meal.totalProtein)}г</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-500">Жири</div>
                        <div className="text-lg text-yellow-600">{Math.round(meal.totalFats)}г</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-500">Вуглеводи</div>
                        <div className="text-lg text-orange-600">{Math.round(meal.totalCarbs)}г</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MealCard;