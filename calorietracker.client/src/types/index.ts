// User types
export interface User {
    id: number;
    email: string;
    name: string;
    dateOfBirth?: string; // ISO date string: "YYYY-MM-DD"
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel: number;
    dailyCalorieGoal?: number;
    createdAt: string;
}

export interface UserRegistration {
    email: string;
    password: string;
    name: string;
    dateOfBirth?: string; // ISO date string: "YYYY-MM-DD"
    weight?: number;
    height?: number;
    gender?: string;
    activityLevel: number;
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}


// Food types
export interface Food {
    id: number;
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    sugarPer100g: number;
    sodiumPer100g: number;
    category?: string;
    barcode?: string;
    isCustom: boolean;
    // ⭐ ДОДАЄМО ЦІ ДВА НОВИХ ПОЛЯ:
    isUserGenerated: boolean;
    createdByName?: string;
}

export interface FoodCreate {
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    sugarPer100g: number;
    sodiumPer100g: number;
    category?: string;
    barcode?: string;
}

// Meal types
export enum MealType {
    Breakfast = 1,
    Lunch = 2,
    Dinner = 3,
    Snack = 4
}

export interface MealItem {
    id: number;
    mealId: number;
    foodName: string;
    foodBrand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    quantity: number;
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
    externalId?: string;
    source?: string;
}

export interface Meal {
    id: number;
    userId: number;
    date: string;
    mealType: MealType;
    mealTypeName: string;
    items: MealItem[];
    totalCalories: number;
    totalProtein: number;
    totalFats: number;
    totalCarbs: number;
    createdAt: string;
}

export interface DailyNutritionSummary {
    totalCalories: number;
    totalProtein: number;
    totalFats: number;
    totalCarbs: number;
    totalFiber: number;
    dailyCalorieGoal?: number;
    caloriesRemaining: number;
    caloriesProgress: number;
}

export interface DailyMeals {
    date: string;
    meals: Meal[];
    summary: DailyNutritionSummary;
}

export interface AddFoodToMeal {
    foodName: string;
    foodBrand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    quantity: number;
    externalId?: string;
    source?: string;
}

// API response types
export interface ApiError {
    message: string;
    error?: string;
}

export interface FoodSearchParams {
    query?: string;
    category?: string;
    page?: number;
    pageSize?: number;
    customOnly?: boolean;
}

export interface ExternalFood {
    externalId: string;
    source: 'USDA' | 'OpenFoodFacts';
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatsPer100g: number;
    carbsPer100g: number;
    fiberPer100g: number;
    sugarPer100g: number;
    sodiumPer100g: number;
    category?: string;
    barcode?: string;
}