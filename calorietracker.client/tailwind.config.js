/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
                display: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#FFF4EE',
                    100: '#FFE4D6',
                    200: '#FFC4A8',
                    300: '#FFA178',
                    400: '#FF8253',
                    500: '#FF6B47',
                    600: '#F0501E',
                    700: '#C73D14',
                    800: '#9C3215',
                    900: '#7A2A14',
                },
                fresh: {
                    50: '#ECFDF5',
                    100: '#D1FAE5',
                    300: '#6EE7B7',
                    500: '#10B981',
                    600: '#059669',
                    700: '#047857',
                },
                sun: {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    300: '#FCD34D',
                    500: '#F59E0B',
                    600: '#D97706',
                },
                berry: {
                    50: '#FDF2F8',
                    100: '#FCE7F3',
                    400: '#F472B6',
                    500: '#EC4899',
                    600: '#DB2777',
                },
                cream: {
                    50: '#FFFBF6',
                    100: '#FFF6EC',
                    200: '#FBEFDF',
                },
            },
            backgroundImage: {
                'app-gradient': 'radial-gradient(at 0% 0%, #FFE4D6 0%, transparent 50%), radial-gradient(at 100% 0%, #D1FAE5 0%, transparent 50%), radial-gradient(at 50% 100%, #FCE7F3 0%, transparent 50%), linear-gradient(180deg, #FFFBF6 0%, #FFF6EC 100%)',
                'auth-gradient': 'radial-gradient(circle at 20% 20%, #FF8253 0%, transparent 35%), radial-gradient(circle at 80% 30%, #FBBF24 0%, transparent 35%), radial-gradient(circle at 70% 80%, #EC4899 0%, transparent 30%), radial-gradient(circle at 20% 80%, #10B981 0%, transparent 30%), linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                'brand-gradient': 'linear-gradient(135deg, #FF8253 0%, #F0501E 100%)',
                'fresh-gradient': 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                'sun-gradient': 'linear-gradient(135deg, #FCD34D 0%, #D97706 100%)',
                'berry-gradient': 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
                'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(255, 107, 71, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                'lifted': '0 12px 40px -8px rgba(255, 107, 71, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.06)',
                'pop': '0 20px 60px -12px rgba(240, 80, 30, 0.25)',
                'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            },
            keyframes: {
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-in-up': 'fade-in-up 0.4s ease-out',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
        },
    },
    plugins: [],
}
