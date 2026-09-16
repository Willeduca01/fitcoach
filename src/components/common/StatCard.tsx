import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'emerald' | 'blue' | 'amber' | 'rose' | 'default';
  onClick?: () => void;
  sparkline?: number[]; // Array de números para mini-gráfico integrado
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
  sparkline,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-md p-5 border border-white/[0.06] shadow-soft-card transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-white/15 hover:-translate-y-0.5 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-400 mb-1.5">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              {value}
            </h3>
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Minimalist Icon without garish loud colored box */}
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {trend && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs relative z-10">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-zinc-500">desde o ciclo anterior</span>
        </div>
      )}

      {/* Mini sparkline decorativa no fundo do card (estilo Apple Fitness / Linear) */}
      {sparkline && sparkline.length > 1 && (
        <div className="absolute right-0 bottom-0 left-0 h-10 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 30">
            <path
              d={`M 0,${30 - ((sparkline[0] - Math.min(...sparkline)) / (Math.max(...sparkline) - Math.min(...sparkline) || 1)) * 25} ${sparkline
                .map((val, idx) => {
                  const x = (idx / (sparkline.length - 1)) * 100;
                  const y = 30 - ((val - Math.min(...sparkline)) / (Math.max(...sparkline) - Math.min(...sparkline) || 1)) * 24;
                  return `L ${x},${y}`;
                })
                .join(' ')}`}
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
