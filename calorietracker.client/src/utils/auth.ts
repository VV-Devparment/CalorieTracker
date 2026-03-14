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
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken() && !!getCurrentUser();
};

export const logout = (): void => {
    removeAuthToken();
    window.location.href = '/login';
};