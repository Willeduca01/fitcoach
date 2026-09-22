import React from 'react';
import { Dumbbell, HeartPulse, Timer, Activity, Flame } from 'lucide-react';

export interface FitnessBackgroundProps {
  className?: string;
}

/**
 * Componente de fundo temático Fitness para a plataforma FitCoach Pro.
 * Oferece suporte nativo com harmonização automática entre Dark Mode e Light Mode:
 * - Dark Mode: Fundo ardósia/esmeralda profundo (#0a1312) com marcas d'água esmeralda e glow radial.
 * - Light Mode: Fundo neutro suave anti-reflexo (#f0f4f2) com marcas d'água em tom sálvia/menta e iluminação difusa.
 */
export const FitnessBackground: React.FC<FitnessBackgroundProps> = ({ className = '' }) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Soft radial emerald ambient glow centered */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] bg-emerald-500/[0.07] dark:bg-emerald-500/[0.07] rounded-full blur-[140px]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-teal-500/[0.05] dark:bg-teal-400/[0.05] rounded-full blur-[120px]" />

      {/* Scattered fitness outline watermark icons */}
      <div className="absolute top-[8%] left-[8%] text-emerald-700/[0.12] dark:text-emerald-400/20 rotate-12 drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]">
        <Dumbbell className="w-20 h-20 stroke-[1.6]" />
      </div>
      <div className="absolute top-[14%] right-[8%] text-teal-800/[0.12] dark:text-teal-300/20 -rotate-12 drop-shadow-[0_0_12px_rgba(45,212,191,0.15)]">
        <HeartPulse className="w-18 h-18 stroke-[1.6]" />
      </div>
      <div className="absolute top-[45%] left-[4%] text-emerald-700/[0.11] dark:text-emerald-400/18 -rotate-45">
        <Timer className="w-20 h-20 stroke-[1.6]" />
      </div>
      <div className="absolute top-[42%] right-[5%] text-teal-800/[0.11] dark:text-teal-300/18 rotate-45">
        <Dumbbell className="w-22 h-22 stroke-[1.6]" />
      </div>
      <div className="absolute bottom-[16%] left-[10%] text-emerald-700/[0.12] dark:text-emerald-400/20 rotate-6">
        <Activity className="w-18 h-18 stroke-[1.6]" />
      </div>
      <div className="absolute bottom-[10%] right-[8%] text-teal-800/[0.12] dark:text-teal-300/20 -rotate-12">
        <Dumbbell className="w-20 h-20 stroke-[1.6]" />
      </div>
      <div className="absolute top-[28%] left-[20%] text-emerald-700/[0.09] dark:text-emerald-400/15 rotate-45">
        <Dumbbell className="w-14 h-14 stroke-[1.6]" />
      </div>
      <div className="absolute bottom-[28%] right-[18%] text-teal-800/[0.09] dark:text-teal-300/15 -rotate-45">
        <Timer className="w-16 h-16 stroke-[1.6]" />
      </div>
      <div className="absolute top-[8%] left-[44%] text-emerald-700/[0.09] dark:text-emerald-400/15">
        <Flame className="w-14 h-14 stroke-[1.6]" />
      </div>
      <div className="absolute bottom-[6%] left-[46%] text-teal-800/[0.09] dark:text-teal-300/15">
        <HeartPulse className="w-14 h-14 stroke-[1.6]" />
      </div>
      <div className="absolute top-[68%] left-[2%] text-emerald-700/[0.09] dark:text-emerald-400/14 rotate-12">
        <Flame className="w-16 h-16 stroke-[1.5]" />
      </div>
      <div className="absolute top-[70%] right-[3%] text-teal-800/[0.09] dark:text-teal-300/14 -rotate-12">
        <Activity className="w-16 h-16 stroke-[1.5]" />
      </div>
    </div>
  );
};
