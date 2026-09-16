import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    info: 'bg-zinc-800/60 text-zinc-300 border-white/[0.08]',
    neutral: 'bg-zinc-800/40 text-zinc-400 border-white/[0.06]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 tracking-tight',
    md: 'text-xs px-3 py-1 tracking-tight',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-sm ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
