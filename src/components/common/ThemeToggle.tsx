import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', size = 'md' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-1.5';
  const iconSizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Modo Escuro (Clique para alternar para Modo Claro)' : 'Modo Claro (Clique para alternar para Modo Escuro)'}
      aria-label="Alternar tema claro/escuro"
      className={`${sizeClasses} rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-200 active:scale-95 flex items-center justify-center ${className}`}
    >
      {isDark ? (
        <Moon className={`${iconSizeClasses} text-zinc-400 hover:text-amber-300 transition-transform duration-300 hover:-rotate-12`} />
      ) : (
        <Sun className={`${iconSizeClasses} text-amber-500 hover:text-amber-600 transition-transform duration-300 hover:rotate-45`} />
      )}
    </button>
  );
};
