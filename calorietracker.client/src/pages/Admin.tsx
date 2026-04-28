import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../services/api';
import type {
    AdminUserListItem,
    AdminUserDetails,
    AdminFood,
    AdminStats,
    AdminAchievementDefinition,
    AdminAuditLog,
} from '../types';
import Icon from '../components/Icon';

type Tab = 'overview' | 'users' | 'foods' | 'achievements' | 'logs';

const INPUT_CLS = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500';

const Admin: React.FC = () => {
    const [tab, setTab] = useState<Tab>('overview');

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Hero */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-lime-500 text-white">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                            <Icon name="settings" size={22} color="white" />
                        </span>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Адмін-панель</h1>
                            <p className="text-xs sm:text-sm text-white/80">
                                Користувачі, статистика, модерація продуктів і досягнень
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-[57px] z-30 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-2 sm:px-4 overflow-x-auto">
                    <div className="flex gap-1 sm:gap-2 min-w-max">
                        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon="chart" label="Огляд" />
                        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon="profile" label="Користувачі" />
                        <TabButton active={tab === 'foods'} onClick={() => setTab('foods')} icon="plate" label="Продукти" />
                        <TabButton active={tab === 'achievements'} onClick={() => setTab('achievements')} icon="medal" label="Досягнення" />
                        <TabButton active={tab === 'logs'} onClick={() => setTab('logs')} icon="history" label="Логи" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5">
                {tab === 'overview' && <OverviewTab />}
                {tab === 'users' && <UsersTab />}
                {tab === 'foods' && <FoodsTab />}
                {tab === 'achievements' && <AchievementsTab />}
                {tab === 'logs' && <LogsTab />}
            </div>
        </div>
    );
};

const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: string;
    label: string;
}> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            active
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
    >
        <Icon name={icon} size={16} color={active ? 'orange' : 'gray'} />
        <span>{label}</span>
    </button>
);

// ───────────────────────────────────────────────── Overview ──

const OverviewTab: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.getStats();
                if (!cancelled) setStats(res.data);
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <Loader />;
    if (error) return <ErrorBox message={error} />;
    if (!stats) return null;

    const maxSignup = Math.max(1, ...stats.signupsLast30Days.map(s => s.count));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Всього користувачів" value={stats.totalUsers} accent="blue" icon="profile" />
                <StatCard label="Адміни" value={stats.admins} accent="purple" icon="settings" />
                <StatCard label="Заблоковані" value={stats.blockedUsers} accent="red" icon="cancel" />
                <StatCard label="Помилки 24г" value={stats.apiErrors24h} accent="orange" icon="lightbulb" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="Активні за 24г" value={stats.activeDay} accent="green" icon="lightning" />
                <StatCard label="Активні за тиждень" value={stats.activeWeek} accent="green" icon="calendar" />
                <StatCard label="MAU (30 днів)" value={stats.activeMonth} accent="green" icon="calendar-month" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Нових за тиждень" value={stats.newUsersWeek} accent="blue" icon="add" />
                <StatCard label="Нових за місяць" value={stats.newUsersMonth} accent="blue" icon="add" />
                <StatCard label="Прийомів їжі" value={stats.totalMeals} accent="gray" icon="plate" />
                <StatCard label="Custom продуктів" value={stats.totalCustomFoods} accent="gray" icon="chef" />
            </div>

            {/* Signups chart */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">Реєстрації за 30 днів</h2>
                {stats.signupsLast30Days.length === 0 ? (
                    <p className="text-sm text-gray-500">Немає нових реєстрацій</p>
                ) : (
                    <div className="flex items-end gap-1 h-40">
                        {stats.signupsLast30Days.map(s => (
                            <div
                                key={s.date}
                                className="flex-1 bg-gradient-to-t from-orange-500 to-lime-500 rounded-t hover:opacity-80 transition-opacity relative group"
                                style={{ height: `${(s.count / maxSignup) * 100}%`, minHeight: '4px' }}
                                title={`${s.date}: ${s.count}`}
                            >
                                <span className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                    {s.date}: {s.count}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{
    label: string;
    value: number;
    accent: 'blue' | 'purple' | 'red' | 'green' | 'orange' | 'gray';
    icon: string;
}> = ({ label, value, accent, icon }) => {
    const accentBg: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-orange-500 to-lime-500',
        red: 'from-red-500 to-rose-600',
        green: 'from-emerald-500 to-green-600',
        orange: 'from-orange-500 to-amber-600',
        gray: 'from-gray-500 to-slate-600',
    };
    return (
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentBg[accent]} flex items-center justify-center shadow-sm`}>
                <Icon name={icon} size={20} color="white" />
            </span>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value.toLocaleString('uk-UA')}</p>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────── Users ──

const UsersTab: React.FC = () => {
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [blockedFilter, setBlockedFilter] = useState<'' | 'true' | 'false'>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [debounced, roleFilter, blockedFilter]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.listUsers({
                    search: debounced || undefined,
                    role: roleFilter || undefined,
                    blocked: blockedFilter === '' ? undefined : blockedFilter === 'true',
                    page,
                    pageSize,
                });
                if (!cancelled) {
                    setItems(res.data.items);
                    setTotal(res.data.total);
                }
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [debounced, roleFilter, blockedFilter, page, pageSize, refreshKey]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Icon name="search" size={16} color="gray" />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Пошук за email або іменем"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="">Усі ролі</option>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                </select>
                <select
                    value={blockedFilter}
                    onChange={e => setBlockedFilter(e.target.value as any)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="">Усі</option>
                    <option value="false">Активні</option>
                    <option value="true">Заблоковані</option>
                </select>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <Loader />
                ) : items.length === 0 ? (
                    <EmptyState text="Користувачів не знайдено" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="py-3 px-4">Користувач</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Роль</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Зареєстр.</th>
                                    <th className="py-3 px-4 hidden lg:table-cell">Активність</th>
                                    <th className="py-3 px-4 hidden sm:table-cell">Прийоми</th>
                                    <th className="py-3 px-4">Статус</th>
                                    <th className="py-3 px-4 text-right">Дії</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-lime-500 text-white flex items-center justify-center font-semibold text-sm">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{u.name}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            {u.role === 'Admin' ? (
                                                <span className="inline-block text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-lime-500 text-white">
                                                    ADMIN
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">User</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell text-xs text-gray-600">{formatDate(u.createdAt)}</td>
                                        <td className="py-3 px-4 hidden lg:table-cell text-xs text-gray-600">
                                            {u.lastActivityAt ? formatDate(u.lastActivityAt) : '—'}
                                        </td>
                                        <td className="py-3 px-4 hidden sm:table-cell text-xs text-gray-600">{u.mealsCount}</td>
                                        <td className="py-3 px-4">
                                            {u.isBlocked ? (
                                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                    Заблокований
                                                </span>
                                            ) : (
                                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    Активний
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setSelected(u.id)}
                                                className="text-xs font-medium text-orange-600 hover:text-orange-800 px-3 py-1 rounded-lg hover:bg-orange-50"
                                            >
                                                Перегляд
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} pageSize={pageSize} />

            {selected !== null && (
                <UserDetailsModal
                    userId={selected}
                    onClose={() => setSelected(null)}
                    onChanged={() => { setSelected(null); setRefreshKey(k => k + 1); }}
                />
            )}
        </div>
    );
};

const UserDetailsModal: React.FC<{
    userId: number;
    onClose: () => void;
    onChanged: () => void;
}> = ({ userId, onClose, onChanged }) => {
    const [user, setUser] = useState<AdminUserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.getUser(userId);
                if (!cancelled) setUser(res.data);
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const handleBlock = async () => {
        if (!user) return;
        setBusy(true);
        try {
            await adminApi.blockUser(user.id, reason || undefined);
            onChanged();
        } catch (e: any) {
            setError(extractError(e));
        } finally {
            setBusy(false);
        }
    };

    const handleUnblock = async () => {
        if (!user) return;
        setBusy(true);
        try {
            await adminApi.unblockUser(user.id);
            onChanged();
        } catch (e: any) {
            setError(extractError(e));
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        if (!window.confirm(`Видалити користувача ${user.email}? Дані прийомів і ваги будуть втрачені.`)) return;
        setBusy(true);
        try {
            await adminApi.deleteUser(user.id);
            onChanged();
        } catch (e: any) {
            setError(extractError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal onClose={onClose} title="Користувач">
            {loading ? (
                <Loader />
            ) : error ? (
                <ErrorBox message={error} />
            ) : user ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                        ) : (
                            <span className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-lime-500 text-white flex items-center justify-center font-semibold text-xl">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {user.role === 'Admin' && (
                                    <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-lime-500 text-white">
                                        ADMIN
                                    </span>
                                )}
                                {user.isBlocked ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                        Заблокований
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                        Активний
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <Info label="Зареєстрований" value={formatDate(user.createdAt)} />
                        <Info label="Остання активність" value={user.lastActivityAt ? formatDate(user.lastActivityAt) : '—'} />
                        <Info label="Стать" value={user.gender ?? '—'} />
                        <Info label="Прийоми" value={String(user.mealsCount)} />
                        <Info label="Custom-продукти" value={String(user.customFoodsCount)} />
                        <Info label="Записи ваги" value={String(user.weightRecordsCount)} />
                        <Info label="Досягнення" value={String(user.achievementsCount)} />
                        <Info label="Активність" value={String(user.activityLevel)} />
                    </div>

                    {user.isBlocked && user.blockedReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                            <p className="font-semibold mb-1">Причина блокування:</p>
                            <p>{user.blockedReason}</p>
                            {user.blockedAt && <p className="text-xs mt-1 text-red-600">{formatDate(user.blockedAt)}</p>}
                        </div>
                    )}

                    {!user.isBlocked && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Причина блокування (необов'язково)</label>
                            <input
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Спам, порушення правил..."
                                maxLength={500}
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        {user.isBlocked ? (
                            <button
                                onClick={handleUnblock}
                                disabled={busy}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Розблокувати
                            </button>
                        ) : (
                            <button
                                onClick={handleBlock}
                                disabled={busy}
                                className="flex-1 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
                            >
                                Заблокувати
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            Видалити
                        </button>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
};

// ──────────────────────────────────────────────── Foods ──

const FoodsTab: React.FC = () => {
    const [items, setItems] = useState<AdminFood[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<AdminFood | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [debounced]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.listFoods({
                    search: debounced || undefined,
                    page,
                    pageSize,
                });
                if (!cancelled) {
                    setItems(res.data.items);
                    setTotal(res.data.total);
                }
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [debounced, page, pageSize, refreshKey]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleDelete = async (food: AdminFood) => {
        if (!window.confirm(`Видалити продукт "${food.name}"?`)) return;
        try {
            await adminApi.deleteFood(food.id);
            setRefreshKey(k => k + 1);
        } catch (e: any) {
            setError(extractError(e));
        }
    };

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Icon name="search" size={16} color="gray" />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Пошук за назвою або брендом"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <Loader />
                ) : items.length === 0 ? (
                    <EmptyState text="Custom-продуктів не знайдено" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="py-3 px-4">Продукт</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Автор</th>
                                    <th className="py-3 px-4 hidden sm:table-cell">Калорії/100г</th>
                                    <th className="py-3 px-4 hidden lg:table-cell">Б / Ж / В</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Дата</th>
                                    <th className="py-3 px-4 text-right">Дії</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map(f => (
                                    <tr key={f.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-900">{f.name}</p>
                                            {f.brand && <p className="text-xs text-gray-500">{f.brand}</p>}
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell text-xs text-gray-600">
                                            {f.createdByName ?? <span className="italic text-gray-400">видалений</span>}
                                            {f.createdByEmail && <span className="block text-[11px] text-gray-400">{f.createdByEmail}</span>}
                                        </td>
                                        <td className="py-3 px-4 hidden sm:table-cell font-semibold text-gray-900">
                                            {Number(f.caloriesPer100g).toFixed(0)}
                                        </td>
                                        <td className="py-3 px-4 hidden lg:table-cell text-xs text-gray-600">
                                            {Number(f.proteinPer100g).toFixed(1)} / {Number(f.fatsPer100g).toFixed(1)} / {Number(f.carbsPer100g).toFixed(1)}
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell text-xs text-gray-600">{formatDate(f.createdAt)}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setEditing(f)}
                                                className="text-xs font-medium text-orange-600 hover:text-orange-800 px-2 py-1 rounded-lg hover:bg-orange-50 mr-1"
                                            >
                                                Редаг.
                                            </button>
                                            <button
                                                onClick={() => handleDelete(f)}
                                                className="text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50"
                                            >
                                                Видалити
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} pageSize={pageSize} />

            {editing && (
                <FoodEditModal
                    food={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); setRefreshKey(k => k + 1); }}
                />
            )}
        </div>
    );
};

const FoodEditModal: React.FC<{
    food: AdminFood;
    onClose: () => void;
    onSaved: () => void;
}> = ({ food, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: food.name,
        brand: food.brand ?? '',
        caloriesPer100g: Number(food.caloriesPer100g),
        proteinPer100g: Number(food.proteinPer100g),
        fatsPer100g: Number(food.fatsPer100g),
        carbsPer100g: Number(food.carbsPer100g),
        fiberPer100g: Number(food.fiberPer100g),
        sugarPer100g: Number(food.sugarPer100g),
        sodiumPer100g: Number(food.sodiumPer100g),
        category: food.category ?? '',
        barcode: food.barcode ?? '',
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setBusy(true);
        setError(null);
        try {
            await adminApi.updateFood(food.id, {
                name: form.name,
                brand: form.brand || undefined,
                caloriesPer100g: form.caloriesPer100g,
                proteinPer100g: form.proteinPer100g,
                fatsPer100g: form.fatsPer100g,
                carbsPer100g: form.carbsPer100g,
                fiberPer100g: form.fiberPer100g,
                sugarPer100g: form.sugarPer100g,
                sodiumPer100g: form.sodiumPer100g,
                category: form.category || undefined,
                barcode: form.barcode || undefined,
            });
            onSaved();
        } catch (e: any) {
            setError(extractError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal onClose={onClose} title="Редагувати продукт">
            <div className="space-y-3">
                {error && <ErrorBox message={error} />}
                <Field label="Назва"><input className={INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Бренд"><input className={INPUT_CLS} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Калорії /100г"><input type="number" className={INPUT_CLS} value={form.caloriesPer100g} onChange={e => setForm({ ...form, caloriesPer100g: +e.target.value })} /></Field>
                    <Field label="Білки"><input type="number" step="0.1" className={INPUT_CLS} value={form.proteinPer100g} onChange={e => setForm({ ...form, proteinPer100g: +e.target.value })} /></Field>
                    <Field label="Жири"><input type="number" step="0.1" className={INPUT_CLS} value={form.fatsPer100g} onChange={e => setForm({ ...form, fatsPer100g: +e.target.value })} /></Field>
                    <Field label="Вуглеводи"><input type="number" step="0.1" className={INPUT_CLS} value={form.carbsPer100g} onChange={e => setForm({ ...form, carbsPer100g: +e.target.value })} /></Field>
                    <Field label="Клітковина"><input type="number" step="0.1" className={INPUT_CLS} value={form.fiberPer100g} onChange={e => setForm({ ...form, fiberPer100g: +e.target.value })} /></Field>
                    <Field label="Цукор"><input type="number" step="0.1" className={INPUT_CLS} value={form.sugarPer100g} onChange={e => setForm({ ...form, sugarPer100g: +e.target.value })} /></Field>
                </div>
                <Field label="Категорія"><input className={INPUT_CLS} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></Field>
                <Field label="Штрих-код"><input className={INPUT_CLS} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></Field>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Скасувати</button>
                    <button onClick={handleSave} disabled={busy} className="flex-1 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50">
                        {busy ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ──────────────────────────────────────────── Achievements ──

const AchievementsTab: React.FC = () => {
    const [defs, setDefs] = useState<AdminAchievementDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [awarding, setAwarding] = useState<AdminAchievementDefinition | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.getAchievementDefinitions();
                if (!cancelled) setDefs(res.data);
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey]);

    if (loading) return <Loader />;

    return (
        <div className="space-y-3">
            {error && <ErrorBox message={error} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {defs.map(d => (
                    <div key={d.code} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                                <Icon name={d.iconName} size={22} color="white" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{d.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        {d.category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Отримали: <span className="font-semibold text-gray-900">{d.unlockedByUsers}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setAwarding(d)}
                            className="mt-3 w-full text-xs font-medium text-orange-600 hover:text-orange-800 py-2 rounded-lg hover:bg-orange-50"
                        >
                            Нагородити вручну
                        </button>
                    </div>
                ))}
            </div>

            {awarding && (
                <AwardModal
                    def={awarding}
                    onClose={() => setAwarding(null)}
                    onAwarded={() => { setAwarding(null); setRefreshKey(k => k + 1); }}
                />
            )}
        </div>
    );
};

const AwardModal: React.FC<{
    def: AdminAchievementDefinition;
    onClose: () => void;
    onAwarded: () => void;
}> = ({ def, onClose, onAwarded }) => {
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [users, setUsers] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        if (!debounced) {
            setUsers([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.listUsers({ search: debounced, pageSize: 10 });
                if (!cancelled) setUsers(res.data.items);
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [debounced]);

    const handleAward = async (u: AdminUserListItem) => {
        setBusy(true);
        setError(null);
        try {
            await adminApi.awardAchievement(u.id, def.code);
            onAwarded();
        } catch (e: any) {
            setError(extractError(e));
            setBusy(false);
        }
    };

    return (
        <Modal onClose={onClose} title={`Нагородити: ${def.title}`}>
            <div className="space-y-3">
                {error && <ErrorBox message={error} />}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2"><Icon name="search" size={16} color="gray" /></span>
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Пошук користувача..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                {loading ? <Loader /> : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                        {users.length === 0 && debounced && (
                            <p className="text-sm text-gray-500 py-3">Нічого не знайдено</p>
                        )}
                        {users.map(u => (
                            <button
                                key={u.id}
                                disabled={busy}
                                onClick={() => handleAward(u)}
                                className="w-full flex items-center gap-3 py-2 px-1 hover:bg-orange-50 rounded-lg disabled:opacity-50 text-left"
                            >
                                {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-lime-500 text-white flex items-center justify-center text-xs font-semibold">
                                        {u.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

// ──────────────────────────────────────────────── Logs ──

const LogsTab: React.FC = () => {
    const [items, setItems] = useState<AdminAuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [level, setLevel] = useState('');
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setPage(1); }, [level, action]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await adminApi.listLogs({
                    level: level || undefined,
                    action: action || undefined,
                    page,
                    pageSize,
                });
                if (!cancelled) {
                    setItems(res.data.items);
                    setTotal(res.data.total);
                }
            } catch (e: any) {
                if (!cancelled) setError(extractError(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [level, action, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const knownActions = useMemo(() => Array.from(new Set(items.map(i => i.action))).sort(), [items]);

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
                <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="">Усі рівні</option>
                    <option value="Info">Info</option>
                    <option value="Warning">Warning</option>
                    <option value="Error">Error</option>
                </select>
                <select
                    value={action}
                    onChange={e => setAction(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="">Усі дії</option>
                    {knownActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <Loader />
                ) : items.length === 0 ? (
                    <EmptyState text="Записів немає" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="py-3 px-4">Час</th>
                                    <th className="py-3 px-4">Рівень</th>
                                    <th className="py-3 px-4">Дія</th>
                                    <th className="py-3 px-4 hidden md:table-cell">Актор</th>
                                    <th className="py-3 px-4 hidden lg:table-cell">Сутність</th>
                                    <th className="py-3 px-4">Деталі</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 text-xs text-gray-600 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                                        <td className="py-2 px-4">
                                            <LevelBadge level={l.level} />
                                        </td>
                                        <td className="py-2 px-4 font-mono text-xs text-gray-800">{l.action}</td>
                                        <td className="py-2 px-4 hidden md:table-cell text-xs text-gray-600">
                                            {l.actorEmail ?? <span className="italic text-gray-400">система</span>}
                                        </td>
                                        <td className="py-2 px-4 hidden lg:table-cell text-xs text-gray-600">
                                            {l.entityType ? `${l.entityType}#${l.entityId ?? '?'}` : '—'}
                                        </td>
                                        <td className="py-2 px-4 text-xs text-gray-700 max-w-xs truncate" title={l.details ?? ''}>
                                            {l.details ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} pageSize={pageSize} />
        </div>
    );
};

const LevelBadge: React.FC<{ level: string }> = ({ level }) => {
    const cls =
        level === 'Error' ? 'bg-red-100 text-red-700'
            : level === 'Warning' ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{level.toUpperCase()}</span>;
};

// ───────────────────────────────────── Shared utils ──

const Modal: React.FC<{
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ title, onClose, children }) => {
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
                        <Icon name="close" size={18} color="gray" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block">
        <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
        {children}
    </label>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
);

const Loader: React.FC = () => (
    <div className="py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
    </div>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
    <div className="py-12 text-center text-sm text-gray-500">{text}</div>
);

const Pagination: React.FC<{
    page: number;
    totalPages: number;
    onChange: (p: number) => void;
    total: number;
    pageSize: number;
}> = ({ page, totalPages, onChange, total, pageSize }) => {
    if (total === 0) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return (
        <div className="flex items-center justify-between text-xs text-gray-600 px-1">
            <span>{from}–{to} з {total}</span>
            <div className="flex items-center gap-2">
                <button
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                    ‹
                </button>
                <span className="text-gray-700 font-medium">{page} / {totalPages}</span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => onChange(page + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                    ›
                </button>
            </div>
        </div>
    );
};

const formatDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

const formatDateTime = (iso: string): string => {
    try {
        return new Date(iso).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

const extractError = (e: any): string => {
    return e?.response?.data?.message || e?.message || 'Сталася помилка';
};

export default Admin;
