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
    avatarUrl?: string | null; // backend URL (`/api/users/{id}/avatar?v=...`) or null
    createdAt: string;
    role?: string; // "User" | "Admin"; визначає, чи показувати лінк "Адмін-панель"
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

// Achievement types
export interface AchievementDto {
    code: string;
    title: string;
    description: string;
    iconName: string;
    category: string;
    isUnlocked: boolean;
    unlockedAt?: string;
}

export interface ExternalFood {
    externalId: string;
    source: string; // "FatSecret" | "Custom" | ...
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

// ── Admin types ─────────────────────────────────────────────────────────

export interface AdminUserListItem {
    id: number;
    email: string;
    name: string;
    role: string;
    isBlocked: boolean;
    blockedAt?: string | null;
    createdAt: string;
    lastActivityAt?: string | null;
    mealsCount: number;
    customFoodsCount: number;
    avatarUrl?: string | null;
}

export interface AdminUserDetails extends AdminUserListItem {
    dateOfBirth?: string | null;
    gender?: string | null;
    activityLevel: number;
    blockedReason?: string | null;
    weightRecordsCount: number;
    achievementsCount: number;
}

export interface AdminFood {
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
    createdAt: string;
    createdBy?: number | null;
    createdByEmail?: string | null;
    createdByName?: string | null;
}

export interface AdminStats {
    totalUsers: number;
    blockedUsers: number;
    admins: number;
    activeDay: number;
    activeWeek: number;
    activeMonth: number;
    newUsersWeek: number;
    newUsersMonth: number;
    totalMeals: number;
    totalCustomFoods: number;
    totalAchievements: number;
    apiErrors24h: number;
    signupsLast30Days: { date: string; count: number }[];
}

export interface AdminAchievementDefinition {
    code: string;
    title: string;
    description: string;
    iconName: string;
    category: string;
    unlockedByUsers: number;
}

export interface AdminAuditLog {
    id: number;
    timestamp: string;
    level: string;
    action: string;
    actorUserId?: number | null;
    actorEmail?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    details?: string | null;
    ipAddress?: string | null;
    path?: string | null;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}