import React, { useState, useEffect } from 'react';
import { foodsApi } from '../services/api';
import type { Food, FoodCreate } from '../types';

const FOOD_CATEGORIES = [
    'Fruits', 'Vegetables', 'Meat', 'Fish', 'Dairy', 'Grains',
    'Nuts', 'Beverages', 'Sweets', 'Spices', 'Oils', 'Other'
];

const EMPTY_FOOD: FoodCreate = {
    name: '', brand: '', caloriesPer100g: 0, proteinPer100g: 0,
    fatsPer100g: 0, carbsPer100g: 0, fiberPer100g: 0,
    sugarPer100g: 0, sodiumPer100g: 0, category: '', barcode: ''
};

// ── Nutrient card ─────────────────────────────────────────────────────────────

interface NutrientCardProps {
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    actions?: React.ReactNode;
}

const NutrientCard: React.FC<NutrientCardProps> = ({
    name, brand, caloriesPer100g, proteinPer100g, fatsPer100g, carbsPer100g, fiberPer100g, actions
}) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col">
        <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1 mr-2">{name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium whitespace-nowrap">
                Мій
            </span>
        </div>
        {brand && <p className="text-xs text-gray-400 mb-2">{brand}</p>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs flex-1">
            <div className="flex justify-between">
                <span className="text-gray-500">Калорії:</span>
                <span className="font-semibold">{caloriesPer100g}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Білки:</span>
                <span className="font-semibold text-green-600">{proteinPer100g}г</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Жири:</span>
                <span className="font-semibold text-yellow-600">{fatsPer100g}г</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Вуглеводи:</span>
                <span className="font-semibold text-red-600">{carbsPer100g}г</span>
            </div>
            {fiberPer100g > 0 && (
                <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">Клітковина:</span>
                    <span className="font-semibold text-blue-600">{fiberPer100g}г</span>
                </div>
            )}
        </div>
        {actions && <div className="mt-3">{actions}</div>}
    </div>
);

// ── Food form modal ───────────────────────────────────────────────────────────

interface FoodFormModalProps {
    title: string;
    food: FoodCreate;
    onChange: (food: FoodCreate) => void;
    onSave: () => void;
    onClose: () => void;
}

const FoodFormModal: React.FC<FoodFormModalProps> = ({ title, food, onChange, onSave, onClose }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onChange({
            ...food,
            [name]: name.includes('Per100g') || name === 'caloriesPer100g' ? parseFloat(value) || 0 : value
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Назва *</label>
                            <input name="name" value={food.name} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Назва продукту" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                            <input name="brand" value={food.brand || ''} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Категорія</label>
                            <select name="category" value={food.category || ''} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Без категорії</option>
                                {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {[
                            { name: 'caloriesPer100g', label: 'Калорії/100г *' },
                            { name: 'proteinPer100g',  label: 'Білки/100г' },
                            { name: 'fatsPer100g',     label: 'Жири/100г' },
                            { name: 'carbsPer100g',    label: 'Вуглеводи/100г' },
                            { name: 'fiberPer100g',    label: 'Клітковина/100г' },
                            { name: 'sugarPer100g',    label: 'Цукор/100г' },
                            { name: 'sodiumPer100g',   label: 'Натрій/100г (мг)' },
                        ].map(({ name, label }) => (
                            <div key={name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                <input type="number" name={name}
                                    value={(food as any)[name]} onChange={handleChange} step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Штрих-код</label>
                            <input name="barcode" value={food.barcode || ''} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="12345678901234" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            Скасувати
                        </button>
                        <button onClick={onSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Зберегти
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const Foods: React.FC = () => {
    const [foods, setFoods] = useState<Food[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingFood, setEditingFood] = useState<Food | null>(null);
    const [newFood, setNewFood] = useState<FoodCreate>({ ...EMPTY_FOOD });

    useEffect(() => { loadFoods(); }, []);

    const loadFoods = async () => {
        setLoading(true);
        try {
            const res = await foodsApi.getFoods({ customOnly: true, pageSize: 200 });
            setFoods(res.data);
        } catch (e) {
            console.error('Error loading foods:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFood = async () => {
        if (!newFood.name.trim()) { alert('Введіть назву продукту'); return; }
        if (newFood.caloriesPer100g <= 0) { alert('Введіть калорійність більше 0'); return; }
        try {
            await foodsApi.createFood(newFood);
            setShowAddModal(false);
            setNewFood({ ...EMPTY_FOOD });
            loadFoods();
        } catch (e: any) {
            alert('Помилка: ' + (e?.response?.data?.message || 'Невідома'));
        }
    };

    const handleEditFood = async () => {
        if (!editingFood) return;
        if (!editingFood.name.trim()) { alert('Введіть назву продукту'); return; }
        try {
            const data: FoodCreate = {
                name: editingFood.name, brand: editingFood.brand,
                caloriesPer100g: editingFood.caloriesPer100g, proteinPer100g: editingFood.proteinPer100g,
                fatsPer100g: editingFood.fatsPer100g, carbsPer100g: editingFood.carbsPer100g,
                fiberPer100g: editingFood.fiberPer100g, sugarPer100g: editingFood.sugarPer100g,
                sodiumPer100g: editingFood.sodiumPer100g, category: editingFood.category,
                barcode: editingFood.barcode
            };
            await foodsApi.updateFood(editingFood.id, data);
            setShowEditModal(false);
            setEditingFood(null);
            loadFoods();
        } catch (e: any) {
            alert('Помилка: ' + (e?.response?.data?.message || 'Невідома'));
        }
    };

    const handleDeleteFood = async (food: Food) => {
        if (!confirm(`Видалити продукт "${food.name}"?`)) return;
        try {
            await foodsApi.deleteFood(food.id);
            loadFoods();
        } catch (e: any) {
            alert('Помилка: ' + (e?.response?.data?.message || 'Невідома'));
        }
    };

    const filtered = foods.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.brand ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Мої продукти</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Власні продукти видимі тільки вам. Їх можна додавати до прийомів їжі.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    <input
                        type="text"
                        placeholder="Пошук серед моїх продуктів..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 min-w-48 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm whitespace-nowrap"
                    >
                        + Додати продукт
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filtered.length > 0 ? (
                    <>
                        <p className="text-sm text-gray-500 mb-3">{filtered.length} продукт(ів)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filtered.map(food => (
                                <NutrientCard
                                    key={food.id}
                                    {...food}
                                    actions={
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingFood({ ...food }); setShowEditModal(true); }}
                                                className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                ✏️ Редагувати
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFood(food)}
                                                className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                🗑️ Видалити
                                            </button>
                                        </div>
                                    }
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <div className="text-5xl mb-4">🍎</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {searchQuery ? 'Нічого не знайдено' : 'Поки немає власних продуктів'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {searchQuery
                                ? 'Спробуйте інший запит або додайте новий продукт.'
                                : 'Натисніть «+ Додати продукт» щоб створити власний продукт.'}
                        </p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <FoodFormModal
                    title="Додати власний продукт"
                    food={newFood}
                    onChange={setNewFood}
                    onSave={handleAddFood}
                    onClose={() => { setShowAddModal(false); setNewFood({ ...EMPTY_FOOD }); }}
                />
            )}

            {showEditModal && editingFood && (
                <FoodFormModal
                    title="Редагувати продукт"
                    food={editingFood}
                    onChange={f => setEditingFood(f as Food)}
                    onSave={handleEditFood}
                    onClose={() => { setShowEditModal(false); setEditingFood(null); }}
                />
            )}
        </div>
    );
};

export default Foods;
