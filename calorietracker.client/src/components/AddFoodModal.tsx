import React, { useState, useEffect } from 'react';
import { externalFoodsApi, foodsApi, mealsApi } from '../services/api';
import { notificationService } from '../services/notificationService';
import Icon from '../components/Icon';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import type { ExternalFood, AddFoodToMeal } from '../types';

interface LocalFood {
    id: number;
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
}

interface SelectedFood {
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    externalId?: string;
    source?: string;
}

interface AddFoodModalProps {
    date: string;
    mealType: number;
    onClose: () => void;
    onFoodAdded: () => void;
}

type SearchTab = 'external' | 'my-foods';

const AddFoodModal = ({ date, mealType, onClose, onFoodAdded }: AddFoodModalProps) => {
    const [activeTab, setActiveTab] = useState<SearchTab>('external');

    // External search
    const [extQuery, setExtQuery] = useState('');
    const [extResults, setExtResults] = useState<ExternalFood[]>([]);
    const [extLoading, setExtLoading] = useState(false);
    const [extError, setExtError] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [barcodeLoading, setBarcodeLoading] = useState(false);

    // My foods
    const [myFoods, setMyFoods] = useState<LocalFood[]>([]);
    const [myFoodsLoading, setMyFoodsLoading] = useState(false);
    const [myFoodsQuery, setMyFoodsQuery] = useState('');

    // Selection & add
    const [selectedFood, setSelectedFood] = useState<SelectedFood | null>(null);
    const [quantity, setQuantity] = useState('100');
    const [addingFood, setAddingFood] = useState(false);

    useEffect(() => {
        if (activeTab === 'my-foods') loadMyFoods();
    }, [activeTab]);

    // Debounced external search
    useEffect(() => {
        if (!extQuery.trim()) { setExtResults([]); setExtError(null); return; }
        const currentQuery = extQuery;
        const t = setTimeout(() => searchExternal(currentQuery), 800);
        return () => clearTimeout(t);
    }, [extQuery]);

    const searchExternal = async (query: string) => {
        if (!query.trim()) return;
        setExtLoading(true);
        setExtError(null);
        try {
            const res = await externalFoodsApi.searchByName(query, 'ukraine');
            setExtResults(res.data);
        } catch (err: any) {
            setExtResults([]);
            const msg = err?.response?.data?.message || err?.message || 'Невідома помилка';
            setExtError(`Помилка пошуку: ${msg}`);
        } finally {
            setExtLoading(false);
        }
    };

    const handleBarcodeDetected = async (barcode: string) => {
        setShowScanner(false);
        setBarcodeLoading(true);
        setExtError(null);
        try {
            const res = await externalFoodsApi.searchByBarcode(barcode);
            if (res.data) {
                selectExternal(res.data as any);
                setExtQuery('');
                setExtResults([]);
            } else {
                setExtError(`Продукт зі штрих-кодом «${barcode}» не знайдено в базі.`);
            }
        } catch {
            setExtError(`Продукт зі штрих-кодом «${barcode}» не знайдено в базі.`);
        } finally {
            setBarcodeLoading(false);
        }
    };

    const loadMyFoods = async () => {
        setMyFoodsLoading(true);
        try {
            const res = await foodsApi.getFoods({ customOnly: true, pageSize: 100 });
            setMyFoods(res.data as any);
        } catch {
            setMyFoods([]);
        } finally {
            setMyFoodsLoading(false);
        }
    };

    const selectExternal = (food: ExternalFood) => {
        setSelectedFood({
            name: food.name,
            brand: food.brand,
            caloriesPer100g: food.caloriesPer100g,
            proteinPer100g: food.proteinPer100g,
            fatsPer100g: food.fatsPer100g,
            carbsPer100g: food.carbsPer100g,
            fiberPer100g: food.fiberPer100g,
            externalId: food.externalId,
            source: food.source,
        });
    };

    const selectLocal = (food: LocalFood) => {
        setSelectedFood({
            name: food.name,
            brand: food.brand,
            caloriesPer100g: food.caloriesPer100g,
            proteinPer100g: food.proteinPer100g,
            fatsPer100g: food.fatsPer100g,
            carbsPer100g: food.carbsPer100g,
            fiberPer100g: food.fiberPer100g,
            source: 'Custom',
        });
    };

    const handleAddFood = async () => {
        if (!selectedFood || !quantity) return;
        setAddingFood(true);

        const payload: AddFoodToMeal = {
            foodName:       selectedFood.name,
            foodBrand:      selectedFood.brand,
            caloriesPer100g: selectedFood.caloriesPer100g,
            proteinPer100g:  selectedFood.proteinPer100g,
            fatsPer100g:     selectedFood.fatsPer100g,
            carbsPer100g:    selectedFood.carbsPer100g,
            fiberPer100g:    selectedFood.fiberPer100g,
            quantity:        parseFloat(quantity),
            externalId:      selectedFood.externalId,
            source:          selectedFood.source,
        };

        try {
            const dailyRes = await mealsApi.getDailyMeals(date);
            const existingMeal = dailyRes.data.meals.find((m: any) => m.mealType === mealType);

            if (existingMeal) {
                await mealsApi.addFoodToMeal(existingMeal.id, payload);
            } else {
                await mealsApi.createMeal({ date, mealType, items: [payload] });
            }

            notificationService.onFoodAdded(selectedFood.name, mealType);
            notificationService.checkAchievements();
            onFoodAdded();
        } catch {
            try {
                await mealsApi.createMeal({ date, mealType, items: [payload] });
                notificationService.onFoodAdded(selectedFood.name, mealType);
                onFoodAdded();
            } catch (err: any) {
                alert('Помилка при додаванні продукту: ' + (err?.response?.data?.message || 'Невідома помилка'));
            }
        } finally {
            setAddingFood(false);
        }
    };

    const getMealTypeName = (t: number) =>
        ({ 1: 'Сніданок', 2: 'Обід', 3: 'Вечеря', 4: 'Перекус' } as any)[t] ?? 'Прийом їжі';

    const qty = parseFloat(quantity) || 0;
    const nutrition = selectedFood ? {
        calories: Math.round(selectedFood.caloriesPer100g * qty / 100),
        protein:  Math.round(selectedFood.proteinPer100g  * qty / 100),
        fats:     Math.round(selectedFood.fatsPer100g     * qty / 100),
        carbs:    Math.round(selectedFood.carbsPer100g    * qty / 100),
    } : null;

    const filteredMyFoods = myFoods.filter(f =>
        f.name.toLowerCase().includes(myFoodsQuery.toLowerCase())
    );

    const FoodRow = ({ food, isSelected, onClick, badge }: { food: SelectedFood & { id?: number }, isSelected: boolean, onClick: () => void, badge?: React.ReactNode }) => (
        <button
            type="button"
            onClick={onClick}
            className={`relative w-full text-left px-3.5 py-3 rounded-2xl border transition-all ${
                isSelected
                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100'
                    : 'border-cream-200 bg-white hover:border-brand-300 hover:bg-cream-50'
            }`}
        >
            <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm leading-tight truncate">{food.name}</div>
                    {food.brand && <div className="text-xs text-gray-500 mt-0.5 truncate">{food.brand}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900 text-sm">{food.caloriesPer100g}<span className="text-[10px] font-medium text-gray-500"> ккал/100г</span></div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                        Б {food.proteinPer100g} · Ж {food.fatsPer100g} · В {food.carbsPer100g}
                    </div>
                </div>
            </div>
            {badge}
        </button>
    );

    const inputCls = "w-full px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all";

    return (
        <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-lifted w-full sm:max-w-xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-cream-200 bg-gradient-to-r from-cream-50 to-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-1 h-5 rounded-full bg-brand-gradient flex-shrink-0" />
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            Додати до: <span className="text-gradient-brand">{getMealTypeName(mealType)}</span>
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-cream-100 transition-colors flex-shrink-0"
                        aria-label="Закрити"
                    >
                        <Icon name="close" size={18} color="gray" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pt-3 pb-2 border-b border-cream-200 flex gap-2 flex-shrink-0">
                    {(['external', 'my-foods'] as SearchTab[]).map(tab => {
                        const active = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-brand-gradient text-white shadow-pop'
                                        : 'bg-cream-100 text-gray-600 hover:bg-cream-200'
                                }`}
                            >
                                <Icon name={tab === 'external' ? 'search' : 'profile'} size={14} color={active ? 'white' : 'gray'} />
                                <span>{tab === 'external' ? 'Пошук у базі' : 'Мої продукти'}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-4">

                    {/* ── External search ── */}
                    {activeTab === 'external' && (
                        <div>
                            <div className="flex gap-2 mb-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Icon name="search" size={16} color="gray" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Введіть назву продукту..."
                                        value={extQuery}
                                        onChange={e => { setExtQuery(e.target.value); setSelectedFood(null); }}
                                        className={`${inputCls} pl-10`}
                                    />
                                </div>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    title="Сканувати штрих-код"
                                    className="px-3.5 py-2.5 bg-white border border-cream-200 rounded-xl shadow-sm hover:border-brand-300 hover:bg-cream-50 transition-all flex items-center justify-center flex-shrink-0"
                                    aria-label="Сканувати штрих-код"
                                >
                                    <Icon name="barcode" size={20} color="gray" />
                                </button>
                            </div>
                            {barcodeLoading && (
                                <div className="text-center py-3 text-gray-500 text-sm flex items-center justify-center gap-2">
                                    <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
                                    Шукаємо продукт за штрих-кодом...
                                </div>
                            )}
                            <p className="text-[11px] text-gray-400 mb-3 leading-snug">
                                Наприклад: «milk», «apple», «chicken», «oatmeal». Локальних укр. брендів поки немає — додавайте їх вручну у вкладці «Мої продукти».
                            </p>

                            {extLoading ? (
                                <div className="text-center py-8 text-gray-500 text-sm flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
                                    Пошук...
                                </div>
                            ) : extError ? (
                                <div className="px-4 py-3 text-red-700 text-sm bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                    <Icon name="warning" size={16} color="red" />
                                    <span>{extError}</span>
                                </div>
                            ) : extResults.length > 0 ? (
                                <div className="space-y-2">
                                    {extResults.map(food => (
                                        <FoodRow
                                            key={`${food.source}:${food.externalId}`}
                                            food={food as any}
                                            isSelected={selectedFood?.externalId === food.externalId && selectedFood?.source === food.source}
                                            onClick={() => selectExternal(food)}
                                        />
                                    ))}
                                </div>
                            ) : extQuery && !extLoading ? (
                                <div className="text-center py-10 text-gray-500 text-sm">
                                    Нічого не знайдено. Спробуйте іншу назву.
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <div className="mb-2 flex justify-center opacity-60">
                                        <Icon name="search" size={40} color="gray" />
                                    </div>
                                    Введіть назву продукту для пошуку
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── My foods ── */}
                    {activeTab === 'my-foods' && (
                        <div>
                            <p className="text-[11px] text-gray-400 mb-3 leading-snug">
                                Власні продукти — видимі тільки вам. Створити можна у розділі «Мої продукти».
                            </p>
                            <input
                                type="text"
                                placeholder="Пошук серед моїх продуктів..."
                                value={myFoodsQuery}
                                onChange={e => setMyFoodsQuery(e.target.value)}
                                className={`${inputCls} mb-3`}
                            />
                            {myFoodsLoading ? (
                                <div className="text-center py-8 text-gray-500 text-sm flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" />
                                    Завантаження...
                                </div>
                            ) : filteredMyFoods.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredMyFoods.map(food => (
                                        <FoodRow
                                            key={food.id}
                                            food={food as any}
                                            isSelected={selectedFood?.name === food.name && selectedFood?.source === 'Custom'}
                                            onClick={() => selectLocal(food)}
                                            badge={
                                                <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
                                                    Мій
                                                </span>
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <div className="mb-2 flex justify-center opacity-60">
                                        <Icon name="empty-plate" size={40} color="gray" />
                                    </div>
                                    {myFoods.length === 0 ? 'У вас ще немає власних продуктів.' : 'Нічого не знайдено.'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Selected food + quantity ── */}
                    {selectedFood && (
                        <div className="mt-5 pt-5 border-t border-cream-200">
                            <div className="bg-gradient-to-br from-brand-50 to-cream-50 border border-brand-200 rounded-2xl px-4 py-3 mb-4">
                                <div className="font-bold text-brand-700">{selectedFood.name}</div>
                                {selectedFood.brand && <div className="text-xs text-gray-500 mt-0.5">{selectedFood.brand}</div>}
                                <div className="text-xs text-gray-700 mt-1">{selectedFood.caloriesPer100g} ккал на 100г</div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">
                                    Кількість (грам)
                                </label>
                                <input
                                    type="number" min="1" step="0.1" value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className={inputCls}
                                />
                            </div>

                            {nutrition && (
                                <div className="bg-cream-50 border border-cream-200 rounded-2xl p-3">
                                    <div className="text-xs font-semibold text-gray-600 mb-2 tracking-wide uppercase">
                                        Харчова цінність ({quantity}г)
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        {[
                                            { label: 'Калорії', value: nutrition.calories, unit: 'ккал', tone: 'text-gray-900' },
                                            { label: 'Білки',   value: nutrition.protein,  unit: 'г',    tone: 'text-fresh-600' },
                                            { label: 'Жири',    value: nutrition.fats,     unit: 'г',    tone: 'text-sun-600' },
                                            { label: 'Вугл.',   value: nutrition.carbs,    unit: 'г',    tone: 'text-berry-600' },
                                        ].map(({ label, value, unit, tone }) => (
                                            <div key={label} className="text-center bg-white rounded-xl px-1.5 py-2 shadow-sm">
                                                <div className="text-[10px] text-gray-500">{label}</div>
                                                <div className={`font-bold mt-0.5 ${tone}`}>{value}<span className="text-[9px] font-medium ml-0.5">{unit}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer — sticky */}
                <div className="px-5 py-3 border-t border-cream-200 bg-cream-50/80 backdrop-blur flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 bg-white border border-cream-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-cream-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Icon name="cancel" size={16} color="gray" />
                        <span>Скасувати</span>
                    </button>
                    <button
                        onClick={handleAddFood}
                        disabled={!selectedFood || !quantity || addingFood}
                        className="px-5 py-2.5 bg-brand-gradient text-white rounded-xl font-semibold text-sm shadow-pop hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2"
                    >
                        {addingFood ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Додавання...
                            </>
                        ) : (
                            <>
                                <Icon name="add" size={16} color="white" />
                                Додати продукт
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {showScanner && (
            <BarcodeScannerModal
                onDetected={handleBarcodeDetected}
                onClose={() => setShowScanner(false)}
            />
        )}
        </>
    );
};

export default AddFoodModal;
