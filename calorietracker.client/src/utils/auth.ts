import type { User } from '../types';

export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
    localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
};

export const setCurrentUser = (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-user-changed'));
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken() && !!getCurrentUser();
};

// UI guard. Реальна авторизація — на бекенді через [Authorize(Roles="Admin")];
// тут лише визначаємо, чи показувати лінк "Адмін-панель".
export const isAdmin = (): boolean => {
    const u = getCurrentUser();
    return u?.role === 'Admin';
};

export const logout = (): void => {
    removeAuthToken();
    window.location.href = '/login';
};