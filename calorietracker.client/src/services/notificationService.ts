// src/services/notificationService.ts
import { getCurrentUser } from '../utils/auth';

export interface Notification {
    id: string;
    type: 'user_action' | 'app_reminder' | 'achievement' | 'warning';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    icon: string;
    userId: number;
}

class NotificationService {
    private storageKey = 'calorietracker_notifications';
    private lastCheckKey = 'calorietracker_last_notification_check';

    // Отримати всі повідомлення користувача
    getNotifications(): Notification[] {
        const user = getCurrentUser();
        if (!user) return [];

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        const allNotifications: Notification[] = JSON.parse(stored);

        // Фільтруємо за користувачем і конвертуємо дати
        return allNotifications
            .filter(n => n.userId === user.id)
            .map(n => ({
                ...n,
                timestamp: new Date(n.timestamp)
            }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // Зберегти повідомлення
    saveNotifications(notifications: Notification[]): void {
        const user = getCurrentUser();
        if (!user) return;

        const stored = localStorage.getItem(this.storageKey);
        const allNotifications: Notification[] = stored ? JSON.parse(stored) : [];

        // Видаляємо старі повідомлення поточного користувача
        const otherUsersNotifications = allNotifications.filter(n => n.userId !== user.id);

        // Додаємо нові повідомлення
        const updatedNotifications = [...otherUsersNotifications, ...notifications];

        localStorage.setItem(this.storageKey, JSON.stringify(updatedNotifications));
    }

    // Додати нове повідомлення
    addNotification(notification: Omit<Notification, 'id' | 'userId' | 'timestamp'>): void {
        const user = getCurrentUser();
        if (!user) return;

        const newNotification: Notification = {
            ...notification,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: user.id,
            timestamp: new Date()
        };

        const existing = this.getNotifications();
        this.saveNotifications([newNotification, ...existing]);
    }

    // Позначити як прочитане
    markAsRead(notificationId: string): void {
        const notifications = this.getNotifications();
        const updated = notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
        );
        this.saveNotifications(updated);
    }

    // Позначити всі як прочитані
    markAllAsRead(): void {
        const notifications = this.getNotifications();
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        this.saveNotifications(updated);
    }

    // Очистити всі повідомлення
    clearAll(): void {
        this.saveNotifications([]);
    }

    // Перевірити чи потрібно додати автоматичні повідомлення
    checkForAutomaticNotifications(): void {
        const now = new Date();
        const lastCheck = localStorage.getItem(this.lastCheckKey);
        const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

        // Перевіряємо тільки раз на день
        if (now.toDateString() === lastCheckDate.toDateString()) {
            return;
        }

        localStorage.setItem(this.lastCheckKey, now.toISOString());

        const currentHour = now.getHours();
        const existing = this.getNotifications();

        // Нагадування про сніданок (9-11 ранку)
        if (currentHour >= 9 && currentHour <= 11) {
            const hasBreakfastReminder = existing.some(n =>
                n.type === 'app_reminder' &&
                n.title.includes('сніданок') &&
                n.timestamp.toDateString() === now.toDateString()
            );

            if (!hasBreakfastReminder) {
                this.addNotification({
                    type: 'app_reminder',
                    title: 'Нагадування про сніданок',
                    message: 'Не забудьте записати ваш сніданок! Це допоможе краще відстежувати калорії.',
                    isRead: false,
                    icon: '🌅'
                });
            }
        }

        // Нагадування про обід (13-15)
        if (currentHour >= 13 && currentHour <= 15) {
            const hasLunchReminder = existing.some(n =>
                n.type === 'app_reminder' &&
                n.title.includes('обід') &&
                n.timestamp.toDateString() === now.toDateString()
            );

            if (!hasLunchReminder) {
                this.addNotification({
                    type: 'app_reminder',
                    title: 'Час для обіду',
                    message: 'Самий час для обіду! Додайте продукти до свого денного раціону.',
                    isRead: false,
                    icon: '☀️'
                });
            }
        }

        // Попередження про пізню вечерю (після 22:00)
        if (currentHour >= 22) {
            const hasLateEatingWarning = existing.some(n =>
                n.type === 'warning' &&
                n.title.includes('Пізня') &&
                n.timestamp.toDateString() === now.toDateString()
            );

            if (!hasLateEatingWarning) {
                this.addNotification({
                    type: 'warning',
                    title: 'Пізня вечеря',
                    message: 'Увага! Зараз пізно для прийому їжі. Це може вплинути на ваші цілі.',
                    isRead: false,
                    icon: '⚠️'
                });
            }
        }
    }

    // Повідомлення про додавання їжі
    onFoodAdded(foodName: string, mealType: number): void {
        const mealNames: { [key: number]: string } = {
            1: 'сніданок',
            2: 'обід',
            3: 'вечерю',
            4: 'перекус'
        };

        this.addNotification({
            type: 'user_action',
            title: 'Продукт додано',
            message: `Ви додали "${foodName}" до ${mealNames[mealType] || 'прийому їжі'}`,
            isRead: false,
            icon: '🍽️'
        });
    }

    // Повідомлення про оновлення ваги
    onWeightUpdated(newWeight: number): void {
        this.addNotification({
            type: 'user_action',
            title: 'Вага оновлена',
            message: `Ви успішно оновили свою вагу. Нова вага: ${newWeight} кг`,
            isRead: false,
            icon: '⚖️'
        });
    }

    // Повідомлення про досягнення
    onAchievement(title: string, message: string): void {
        this.addNotification({
            type: 'achievement',
            title,
            message,
            isRead: false,
            icon: '🏆'
        });
    }

    // Перевірити досягнення (викликати після додавання їжі)
    checkAchievements(): void {
        // Тут можна додати логіку перевірки різних досягнень
        // Наприклад, перевірити кількість днів поспіль з записами

        // Поки що просто приклад
        const notifications = this.getNotifications();
        const userActions = notifications.filter(n => n.type === 'user_action');

        if (userActions.length === 10) {
            this.onAchievement(
                'Перші 10 записів! 🎉',
                'Ви зробили вже 10 записів у додатку! Продовжуйте в тому ж дусі!'
            );
        }
    }

    // Очистити старі повідомлення (старші 30 днів)
    cleanOldNotifications(): void {
        const notifications = this.getNotifications();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const filtered = notifications.filter(n => n.timestamp > thirtyDaysAgo);
        this.saveNotifications(filtered);
    }
}

export const notificationService = new NotificationService();