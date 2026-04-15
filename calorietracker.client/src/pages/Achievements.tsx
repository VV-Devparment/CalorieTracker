import React, { useState, useEffect, useCallback } from 'react';
import { achievementsApi } from '../services/api';
import type { AchievementDto } from '../types';

const Achievements: React.FC = () => {
    const [achievements, setAchievements] = useState<AchievementDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDto[]>([]);

    const load = useCallback(async () => {
        try {
            const res = await achievementsApi.getAll();
            setAchievements(res.data);
        } catch (e) {
            console.error('Failed to load achievements', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCheck = async () => {
        setChecking(true);
        try {
            const res = await achievementsApi.check();
            if (res.data.length > 0) {
                setNewlyUnlocked(res.data);
                await load();
            }
        } catch (e) {
            console.error('Failed to check achievements', e);
        } finally {
            setChecking(false);
        }
    };

    const unlockedCount = achievements.filter(a => a.isUnlocked).length;
    const totalCount = achievements.length;

    // Group by category
    const categories = Array.from(new Set(achievements.map(a => a.category)));

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('uk-UA', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-md mx-auto px-4 py-6">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                    <h1 className="text-xl font-bold text-gray-900 text-center mb-4">
                        🏆 Досягнення
                    </h1>

                    {/* Progress bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Прогрес</span>
                            <span className="font-semibold text-blue-600">{unlockedCount} / {totalCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                style={{ width: totalCount > 0 ? `${(unlockedCount / totalCount) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>

                    {/* Check button */}
                    <button
                        onClick={handleCheck}
                        disabled={checking}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                        {checking ? 'Перевіряємо...' : '🔄 Перевірити нові досягнення'}
                    </button>
                </div>

                {/* Newly unlocked banner */}
                {newlyUnlocked.length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl shadow-sm p-4 mb-4">
                        <p className="text-white font-bold text-center mb-2">🎉 Нові досягнення розблоковано!</p>
                        <div className="space-y-2">
                            {newlyUnlocked.map(a => (
                                <div key={a.code} className="bg-white bg-opacity-20 rounded-xl p-3 flex items-center space-x-3">
                                    <span className="text-2xl">{a.emoji}</span>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{a.title}</p>
                                        <p className="text-white text-xs opacity-80">{a.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setNewlyUnlocked([])}
                            className="w-full mt-3 py-1.5 bg-white bg-opacity-20 text-white text-sm rounded-lg hover:bg-opacity-30 transition"
                        >
                            Закрити
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : (
                    categories.map(category => {
                        const items = achievements.filter(a => a.category === category);
                        const catUnlocked = items.filter(a => a.isUnlocked).length;

                        return (
                            <div key={category} className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-gray-900">{category}</h2>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {catUnlocked}/{items.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {items.map(achievement => (
                                        <div
                                            key={achievement.code}
                                            className={`flex items-center space-x-4 p-3 rounded-xl transition-all ${
                                                achievement.isUnlocked
                                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100'
                                                    : 'bg-gray-50 opacity-60'
                                            }`}
                                        >
                                            {/* Emoji */}
                                            <div className={`text-3xl flex-shrink-0 ${achievement.isUnlocked ? '' : 'grayscale opacity-40'}`}
                                                style={{ filter: achievement.isUnlocked ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                                                {achievement.isUnlocked ? achievement.emoji : '🔒'}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {achievement.title}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{achievement.description}</p>
                                                {achievement.isUnlocked && achievement.unlockedAt && (
                                                    <p className="text-xs text-blue-500 mt-0.5">
                                                        {formatDate(achievement.unlockedAt)}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Badge */}
                                            {achievement.isUnlocked && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Achievements;
