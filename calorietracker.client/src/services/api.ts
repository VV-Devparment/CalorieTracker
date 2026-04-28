import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
    User,
    UserRegistration,
    UserLogin,
    AuthResponse,
    Food,
    FoodCreate,
    FoodSearchParams,
    ExternalFood,
    DailyMeals,
    Meal,
    AddFoodToMeal,
    MealType,
    AchievementDto,
    AdminUserListItem,
    AdminUserDetails,
    AdminFood,
    AdminStats,
    AdminAchievementDefinition,
    AdminAuditLog,
    PagedResult,
} from '../types';

// Base API configuration
const API_BASE_URL = import.meta.env.DEV ? 'https://localhost:7100/api' : '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: async (data: UserRegistration): Promise<AxiosResponse<AuthResponse>> => {
        console.log('API: Відправляємо запит реєстрації на:', `${API_BASE_URL}/auth/register`);
        console.log('API: Дані для реєстрації:', data);
        try {
            const response = await api.post('/auth/register', data);
            console.log('API: Успішна реєстрація:', response.data);
            return response;
        } catch (error) {
            console.error('API: Помилка реєстрації:', error);
            throw error;
        }
    },

    login: async (data: UserLogin): Promise<AxiosResponse<AuthResponse>> => {
        console.log('API: Відправляємо запит логіну на:', `${API_BASE_URL}/auth/login`);
        try {
            const response = await api.post('/auth/login', data);
            console.log('API: Успішний логін:', response.data);
            return response;
        } catch (error) {
            console.error('API: Помилка логіну:', error);
            throw error;
        }
    },
};

// Foods API


export const foodsApi = {
    getFoods: (params?: FoodSearchParams): Promise<AxiosResponse<Food[]>> =>
        api.get('/foods', { params }),

    getFood: (id: number): Promise<AxiosResponse<Food>> =>
        api.get(`/foods/${id}`),

    createFood: (data: FoodCreate): Promise<AxiosResponse<Food>> =>
        api.post('/foods', data),

    // ⭐ ДОДАЙ ЦІ ДВА МЕТОДИ:
    updateFood: (id: number, data: FoodCreate): Promise<AxiosResponse<Food>> =>
        api.put(`/foods/${id}`, data),

    deleteFood: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(`/foods/${id}`),

    searchFoods: (query: string): Promise<AxiosResponse<Food[]>> =>
        api.get(`/foods/search/${encodeURIComponent(query)}`),

    getCategories: (): Promise<AxiosResponse<string[]>> =>
        api.get('/foods/categories'),
};

// External Foods API (FatSecret Platform — Premier Free, US data set)
export const externalFoodsApi = {
    searchByName: (query: string, source: 'off' | 'ukraine' = 'ukraine'): Promise<AxiosResponse<ExternalFood[]>> =>
        api.get('/foods/external/search', { params: { query, source } }),

    searchByBarcode: (barcode: string): Promise<AxiosResponse<ExternalFood>> =>
        api.get(`/foods/external/barcode/${encodeURIComponent(barcode)}`),
};

// Meals API
export const mealsApi = {
    getDailyMeals: (date: string): Promise<AxiosResponse<DailyMeals>> =>
        api.get(`/meals/daily/${date}`),

    createMeal: (data: {
        date: string;
        mealType: MealType;
        items: AddFoodToMeal[];
    }): Promise<AxiosResponse<Meal>> =>
        api.post('/meals', data),

    getMeal: (id: number): Promise<AxiosResponse<Meal>> =>
        api.get(`/meals/${id}`),

    addFoodToMeal: (mealId: number, data: AddFoodToMeal): Promise<AxiosResponse<any>> =>
        api.post(`/meals/${mealId}/items`, data),

    updateMealItemQuantity: async (itemId: number, quantity: number): Promise<AxiosResponse<void>> => {
        console.log(`API: Оновлення кількості для item ${itemId} на ${quantity}г`);
        console.log(`API URL: ${API_BASE_URL}/meals/items/${itemId}/quantity`);
        try {
            const response = await api.put(`/meals/items/${itemId}/quantity`, { quantity });
            console.log('API: Кількість успішно оновлена', response);
            return response;
        } catch (error) {
            console.error('API: Помилка оновлення кількості:', error);
            throw error;
        }
    },

    removeFoodFromMeal: async (itemId: number): Promise<AxiosResponse<void>> => {
        console.log(`API: Видалення item ${itemId}`);
        console.log(`API URL: ${API_BASE_URL}/meals/items/${itemId}`);
        try {
            const response = await api.delete(`/meals/items/${itemId}`);
            console.log('API: Продукт успішно видалено', response);
            return response;
        } catch (error) {
            console.error('API: Помилка видалення:', error);
            throw error;
        }
    },

    deleteMeal: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(`/meals/${id}`),
};

// Users API
export const usersApi = {
    getProfile: (): Promise<AxiosResponse<User>> =>
        api.get('/users/profile'),

    updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
        api.put('/users/profile', data),

    updateAvatar: (file: Blob, filename = 'avatar.jpg'): Promise<AxiosResponse<{ avatarUrl: string }>> => {
        const formData = new FormData();
        formData.append('file', file, filename);
        return api.put('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    deleteAvatar: (): Promise<AxiosResponse<{ avatarUrl: null }>> =>
        api.delete('/users/avatar'),

    addWeightRecord: (weight: number, height?: number): Promise<AxiosResponse<any>> =>
        api.post('/users/weight', { weight, height }),

    getWeightHistory: (days = 30): Promise<AxiosResponse<{ date: string; weight: number }[]>> =>
        api.get('/users/weight-history', { params: { days } }),

    getStatistics: (days = 7): Promise<AxiosResponse<any>> =>
        api.get('/users/statistics', { params: { days } }),
};

// Achievements API
export const achievementsApi = {
    getAll: (): Promise<AxiosResponse<AchievementDto[]>> =>
        api.get('/achievements'),

    check: (): Promise<AxiosResponse<AchievementDto[]>> =>
        api.post('/achievements/check'),
};

// Admin API — усі endpoint-и захищені [Authorize(Roles="Admin")] на бекенді.
export const adminApi = {
    // Stats
    getStats: (): Promise<AxiosResponse<AdminStats>> =>
        api.get('/admin/stats'),

    // Users
    listUsers: (params: {
        search?: string;
        role?: string;
        blocked?: boolean;
        page?: number;
        pageSize?: number;
    }): Promise<AxiosResponse<PagedResult<AdminUserListItem>>> =>
        api.get('/admin/users', { params }),

    getUser: (id: number): Promise<AxiosResponse<AdminUserDetails>> =>
        api.get(`/admin/users/${id}`),

    blockUser: (id: number, reason?: string): Promise<AxiosResponse<void>> =>
        api.post(`/admin/users/${id}/block`, { reason }),

    unblockUser: (id: number): Promise<AxiosResponse<void>> =>
        api.post(`/admin/users/${id}/unblock`),

    deleteUser: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(`/admin/users/${id}`),

    // Foods (custom-foods moderation)
    listFoods: (params: {
        search?: string;
        userId?: number;
        page?: number;
        pageSize?: number;
    }): Promise<AxiosResponse<PagedResult<AdminFood>>> =>
        api.get('/admin/foods', { params }),

    updateFood: (id: number, data: FoodCreate): Promise<AxiosResponse<void>> =>
        api.put(`/admin/foods/${id}`, data),

    deleteFood: (id: number): Promise<AxiosResponse<void>> =>
        api.delete(`/admin/foods/${id}`),

    // Achievements
    getAchievementDefinitions: (): Promise<AxiosResponse<AdminAchievementDefinition[]>> =>
        api.get('/admin/achievements/definitions'),

    getUserAchievements: (userId: number): Promise<AxiosResponse<{ code: string; unlockedAt: string }[]>> =>
        api.get(`/admin/achievements/user/${userId}`),

    awardAchievement: (userId: number, code: string): Promise<AxiosResponse<void>> =>
        api.post('/admin/achievements/award', { userId, code }),

    revokeAchievement: (userId: number, code: string): Promise<AxiosResponse<void>> =>
        api.delete(`/admin/achievements/revoke/${userId}/${encodeURIComponent(code)}`),

    // Audit logs
    listLogs: (params: {
        level?: string;
        action?: string;
        actorUserId?: number;
        page?: number;
        pageSize?: number;
    }): Promise<AxiosResponse<PagedResult<AdminAuditLog>>> =>
        api.get('/admin/logs', { params }),
};

export default api;