import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface InteractiveCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'glow';
  hoverEffect?: boolean;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className,
  variant = 'glass',
  hoverEffect = true,
  ...props
}) => {
  const variantStyles = {
    glass:
      'bg-zinc-900/70 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]',
    solid:
      'bg-zinc-900 border border-zinc-800 shadow-xl',
    glow:
      'bg-zinc-900/80 backdrop-blur-2xl border border-emerald-500/20 shadow-[0_0_35px_-5px_rgba(16,185,129,0.15)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={
        hoverEffect
          ? {
              y: -2,
              borderColor: 'rgba(255, 255, 255, 0.16)',
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={cn(
        'rounded-3xl p-6 relative overflow-hidden transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Subtle top reflection highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};
