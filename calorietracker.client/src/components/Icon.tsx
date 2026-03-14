// src/components/Icon.tsx
import React from 'react';

interface IconProps {
    name: string;
    size?: number;
    className?: string;
    color?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', color }) => {
    return (
        <img
            src={`/icons/${name}.svg`}
            alt={name}
            width={size}
            height={size}
            className={className}
            style={{
                filter: color ? getColorFilter(color) : undefined,
                display: 'inline-block'
            }}
        />
    );
};

// Функція для конвертації кольорів в CSS filter
const getColorFilter = (color: string): string => {
    const colorFilters: { [key: string]: string } = {
        'blue': 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)',
        'green': 'invert(64%) sepia(98%) saturate(3207%) hue-rotate(130deg) brightness(119%) contrast(119%)',
        'yellow': 'invert(78%) sepia(61%) saturate(1919%) hue-rotate(3deg) brightness(119%) contrast(119%)',
        'red': 'invert(17%) sepia(80%) saturate(2514%) hue-rotate(8deg) brightness(95%) contrast(95%)',
        'orange': 'invert(60%) sepia(100%) saturate(1352%) hue-rotate(1deg) brightness(119%) contrast(119%)',
        'purple': 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(251deg) brightness(104%) contrast(97%)',
        'gray': 'invert(60%) sepia(18%) saturate(52%) hue-rotate(169deg) brightness(95%) contrast(85%)',
        'white': 'invert(100%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)'
    };

    return colorFilters[color] || '';
};

export default Icon;