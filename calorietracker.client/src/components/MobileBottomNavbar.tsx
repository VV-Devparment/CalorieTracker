import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';

const MobileBottomNavbar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Головна', icon: 'home' },
        { path: '/foods', label: 'Продукти', icon: 'plate' },
        { path: '/statistics', label: 'Статистика', icon: 'chart' },
        { path: '/achievements', label: 'Досягнення', icon: 'trophy' },
    ];

    return (
        <>
            {/* Spacer so content isn't hidden behind the fixed nav */}
            <div className="h-20"></div>
            <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-2 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <div className="nav-glass rounded-3xl px-2 py-1.5">
                        <div className="grid grid-cols-4 gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className="relative flex flex-col items-center justify-center py-2 rounded-2xl transition-all group"
                                    >
                                        <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${isActive ? 'nav-pill-active scale-110' : 'group-hover:bg-cream-100'}`}>
                                            <Icon
                                                name={item.icon}
                                                size={22}
                                                color={isActive ? 'white' : 'gray'}
                                            />
                                        </div>
                                        <span className={`text-[10px] mt-1 transition-colors ${isActive ? 'font-bold text-brand-600' : 'font-medium text-gray-500'}`}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileBottomNavbar;
