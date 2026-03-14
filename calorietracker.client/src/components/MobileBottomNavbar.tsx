import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';

const MobileBottomNavbar = () => {
    const location = useLocation();

    const navItems = [
        {
            path: '/dashboard',
            label: 'Головна',
            icon: 'home',
            activeIcon: 'home'
        },
        {
            path: '/foods',
            label: 'Продукти',
            icon: 'plate',
            activeIcon: 'plate'
        },
        {
            path: '/statistics',
            label: 'Статистика',
            icon: 'chart',
            activeIcon: 'chart'
        }
    ];

    return (
        <>
            <div className="h-16"></div>
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
                <div className="grid grid-cols-3 h-16">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${isActive
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                                    <Icon
                                        name={isActive ? item.activeIcon : item.icon}
                                        size={24}
                                        color={isActive ? 'blue' : 'gray'}
                                    />
                                </div>
                                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full"></div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default MobileBottomNavbar;