import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { Student } from '../../types';
import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  CreditCard,
  MessageSquare,
  LogOut,
  Flame,
  ChevronRight
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { sanitizeUrl } from '../../lib/security';

export type StudentTab = 'home' | 'workout' | 'evolution' | 'payment' | 'contact';

interface StudentLayoutProps {
  currentTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { logout, currentStudentId } = useAuth();
  const { students, personal, getUnreadCountForStudent } = useAppData();

  const activeStudent: Student =
    students.find((s) => s.id === currentStudentId) || students[0];

  const unreadCount = activeStudent ? getUnreadCountForStudent(activeStudent.id) : 0;

  const navItems = [
    { id: 'home' as StudentTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workout' as StudentTab, label: 'Meus Treinos', icon: Dumbbell, badge: activeStudent?.workouts?.length },
    { id: 'evolution' as StudentTab, label: 'Evolução Física', icon: Activity },
    { id: 'payment' as StudentTab, label: 'Mensalidade & PIX', icon: CreditCard },
    { id: 'contact' as StudentTab, label: 'Chat com Treinador', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined, badgeColor: 'bg-emerald-400 text-zinc-950' },
  ];

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col md:flex-row pb-20 md:pb-0 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Desktop Left Sidebar (Design refinado estilo Linear / Raycast) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#0c1615]/85 backdrop-blur-2xl border-r border-white/[0.06] shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-zinc-100 shadow-subtle">
            <Dumbbell className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold tracking-tight text-zinc-100 text-base">FitCoach</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 border border-white/[0.08] px-1.5 py-0.2 rounded-md bg-white/[0.02]">
              Portal
            </span>
          </div>
        </div>

        {/* Student Profile Card in Sidebar */}
        <div className="p-3.5 mx-3 my-4 rounded-2xl bg-zinc-900/50 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={sanitizeUrl(activeStudent?.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
                alt={activeStudent?.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#09090b] rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-zinc-100 text-sm truncate">{activeStudent?.name}</h4>
              <p className="text-xs text-zinc-400 truncate">
                Coach {personal.name.split(' ')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
            <span className="text-zinc-400 text-[11px]">Consistência</span>
            <span className="flex items-center gap-1 font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px]">
              <Flame className="w-3 h-3 fill-amber-300" />
              {activeStudent?.streakDays} dias
            </span>
          </div>
        </div>

        {/* Navigation Items (Discretos e elegantes) */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all relative ${
                  isActive
                    ? 'bg-zinc-800/80 text-zinc-100 font-medium border border-white/[0.08] shadow-subtle'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-zinc-800 text-zinc-300 border border-white/[0.06]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer & Logout */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-zinc-400">Sincronizado</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={logout}
                title="Sair da conta"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0c1615]/90 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img
            src={sanitizeUrl(activeStudent?.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
            alt={activeStudent?.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-100 text-sm">{activeStudent?.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-medium flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 fill-amber-300" />
                {activeStudent?.streakDays}d
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Coach {personal.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle size="sm" />
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c1615]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 py-1.5 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] transition-all relative ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
              {item.badge !== undefined && (
                <span
                  className={`absolute top-1 right-2 w-1.5 h-1.5 rounded-full ${
                    item.badgeColor ? 'bg-emerald-400' : 'bg-zinc-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
};
