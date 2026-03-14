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
        const t = setTimeout(searchExternal, 400);
        return () => clearTimeout(t);
    }, [extQuery]);

    const searchExternal = async () => {
        if (!extQuery.trim()) return;
        setExtLoading(true);
        setExtError(null);
        try {
            const res = await externalFoodsApi.searchByName(extQuery, 'ukraine');
            setExtResults(res.data);
            if (res.data.length === 0) setExtError(null); // just empty, not an error
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

    const FoodRow = ({ food, isSelected, onClick }: { food: SelectedFood & { id?: number }, isSelected: boolean, onClick: () => void }) => (
        <div
            onClick={onClick}
            style={{
                padding: '12px 16px',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                marginBottom: '8px',
                transition: 'all 0.15s'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>{food.name}</div>
                    {food.brand && <div style={{ fontSize: '12px', color: '#6b7280' }}>{food.brand}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: '#6b7280', marginLeft: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{food.caloriesPer100g} ккал/100г</div>
                    <div style={{ fontSize: '11px' }}>
                        Б:{food.proteinPer100g}г Ж:{food.fatsPer100g}г В:{food.carbsPer100g}г
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', width: '100%',
                maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                        Додати до: {getMealTypeName(mealType)}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Icon name="close" size={20} color="gray" />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', padding: '12px 24px 0', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {(['external', 'my-foods'] as SearchTab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
                            fontSize: '13px', fontWeight: '500',
                            backgroundColor: activeTab === tab ? '#3b82f6' : '#f3f4f6',
                            color: activeTab === tab ? 'white' : '#6b7280',
                        }}>
                            {tab === 'external' ? '🌐 Open Food Facts' : '👤 Мої продукти'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {/* ── External search ── */}
                    {activeTab === 'external' && (
                        <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                        <Icon name="search" size={16} color="gray" />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Введіть назву (українською або англійською)..."
                                        value={extQuery}
                                        onChange={e => { setExtQuery(e.target.value); setSelectedFood(null); }}
                                        style={{
                                            width: '100%', paddingLeft: '36px', padding: '10px 10px 10px 36px',
                                            border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px',
                                            boxSizing: 'border-box', outline: 'none'
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                        onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                                    />
                                </div>
                                <button
                                    onClick={() => setShowScanner(true)}
                                    title="Сканувати штрих-код"
                                    style={{
                                        padding: '10px 14px', backgroundColor: '#f3f4f6',
                                        border: '1px solid #d1d5db', borderRadius: '8px',
                                        cursor: 'pointer', fontSize: '20px', lineHeight: 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    📷
                                </button>
                            </div>
                            {barcodeLoading && (
                                <div style={{ textAlign: 'center', padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>
                                    Шукаємо продукт за штрих-кодом...
                                </div>
                            )}
                            <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
                                Пошук у Open Food Facts. Наприклад: «молоко», «яблуко», «chicken», «oatmeal»
                            </p>

                            {extLoading ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>Пошук...</div>
                            ) : extError ? (
                                <div style={{ textAlign: 'center', padding: '16px', color: '#dc2626', fontSize: '13px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                                    {extError}
                                </div>
                            ) : extResults.length > 0 ? (
                                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
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
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: '14px' }}>
                                    Нічого не знайдено. Спробуйте іншу назву.
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '14px' }}>
                                    Введіть назву продукту для пошуку
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── My foods ── */}
                    {activeTab === 'my-foods' && (
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
                                Власні продукти — видимі тільки вам. Створити можна у розділі «Мої продукти».
                            </p>
                            <input
                                type="text"
                                placeholder="Пошук серед моїх продуктів..."
                                value={myFoodsQuery}
                                onChange={e => setMyFoodsQuery(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                                    borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                                    outline: 'none', marginBottom: '12px'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                            />
                            {myFoodsLoading ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>Завантаження...</div>
                            ) : filteredMyFoods.length > 0 ? (
                                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                                    {filteredMyFoods.map(food => (
                                        <div key={food.id} style={{ position: 'relative' }}>
                                            <FoodRow
                                                food={food as any}
                                                isSelected={selectedFood?.name === food.name && selectedFood?.source === 'Custom'}
                                                onClick={() => selectLocal(food)}
                                            />
                                            <span style={{
                                                position: 'absolute', top: '8px', right: '8px',
                                                fontSize: '10px', padding: '2px 6px', borderRadius: '999px',
                                                backgroundColor: '#f3e8ff', color: '#7e22ce', fontWeight: 600
                                            }}>
                                                Мій продукт
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '14px' }}>
                                    {myFoods.length === 0 ? 'У вас ще немає власних продуктів.' : 'Нічого не знайдено.'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Selected food + quantity ── */}
                    {selectedFood && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                                <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '2px' }}>{selectedFood.name}</div>
                                {selectedFood.brand && <div style={{ fontSize: '12px', color: '#6b7280' }}>{selectedFood.brand}</div>}
                                <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>{selectedFood.caloriesPer100g} ккал на 100г</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                    Кількість (грам)
                                </label>
                                <input
                                    type="number" min="1" step="0.1" value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                                        borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            {nutrition && (
                                <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>
                                        Харчова цінність ({quantity}г)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '13px' }}>
                                        {[
                                            { label: 'Калорії', value: nutrition.calories, unit: 'ккал', color: '#1f2937' },
                                            { label: 'Білки',   value: nutrition.protein,  unit: 'г',    color: '#059669' },
                                            { label: 'Жири',    value: nutrition.fats,     unit: 'г',    color: '#d97706' },
                                            { label: 'Вуглев.', value: nutrition.carbs,    unit: 'г',    color: '#dc2626' },
                                        ].map(({ label, value, unit, color }) => (
                                            <div key={label} style={{ textAlign: 'center', backgroundColor: 'white', borderRadius: '6px', padding: '8px 4px' }}>
                                                <div style={{ color: '#6b7280', fontSize: '11px' }}>{label}</div>
                                                <div style={{ fontWeight: '600', color }}>{value}{unit}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <button onClick={onClose} style={{
                        padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
                        fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <Icon name="cancel" size={16} color="gray" />
                        Скасувати
                    </button>
                    <button
                        onClick={handleAddFood}
                        disabled={!selectedFood || !quantity || addingFood}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: (!selectedFood || !quantity || addingFood) ? '#9ca3af' : '#3b82f6',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: (!selectedFood || !quantity || addingFood) ? 'not-allowed' : 'pointer',
                            fontSize: '14px', fontWeight: '500',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {addingFood ? (
                            <>
                                <div style={{ width: '14px', height: '14px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
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

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
