import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  DollarSign,
  TrendingUp,
  LogOut,
  Dumbbell,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

export type PersonalTab = 'overview' | 'schedule' | 'students' | 'messages' | 'finances' | 'growth';

interface PersonalLayoutProps {
  currentTab: PersonalTab;
  onTabChange: (tab: PersonalTab) => void;
  children: React.ReactNode;
}

export const PersonalLayout: React.FC<PersonalLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { logout } = useAuth();
  const { personal, students, invoices, getUnreadCountForPersonal, isDemoMode } = useAppData();

  const overdueInvoicesCount = invoices.filter((i) => i.status === 'ATRASADO').length;
  const activeStudentsCount = students.filter((s) => s.status === 'ATIVO').length;
  const unreadMessagesCount = getUnreadCountForPersonal();

  const navItems = [
    { id: 'overview' as PersonalTab, label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'schedule' as PersonalTab, label: 'Agenda Semanal', icon: Calendar },
    { id: 'students' as PersonalTab, label: 'Alunos & CRM', icon: Users, badge: activeStudentsCount },
    { id: 'messages' as PersonalTab, label: 'Mensagens', icon: MessageSquare, badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'finances' as PersonalTab, label: 'Financeiro', icon: DollarSign, badge: overdueInvoicesCount > 0 ? overdueInvoicesCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'growth' as PersonalTab, label: 'Hub de Crescimento', icon: TrendingUp },
  ];


  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-zinc-950/80 border-r border-white/[0.06] backdrop-blur-xl shrink-0 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Dumbbell className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tracking-tight text-zinc-100 text-lg">FitCoach</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Plataforma do Treinador</p>
          </div>
        </div>

        {/* Coach Profile Card */}
        <div className="p-3.5 mx-3.5 my-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center gap-3">
          <img
            src={personal.avatarUrl}
            alt={personal.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h4 className="font-medium text-zinc-100 text-sm truncate">{personal.name}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">CREF: {personal.cref}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800/80 text-zinc-100 border border-white/[0.08] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      item.badgeColor
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-zinc-800 text-zinc-300 border-white/[0.06]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-zinc-400">{isDemoMode ? 'Modo Demonstração' : 'Treinador Conectado'}</span>
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
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-100 text-sm">FitCoach PRO</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">ADMIN</span>
            </div>
            <p className="text-[10px] text-zinc-400">Coach {personal.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <img
            src={personal.avatarUrl}
            alt={personal.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/30"
          />
          <div className="flex items-center gap-1">
            <ThemeToggle size="sm" />
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.06] px-2 py-1.5 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-medium transition-all relative ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
              {item.badge !== undefined && (
                <span
                  className={`absolute top-1 right-2 w-2 h-2 rounded-full ${
                    item.badgeColor || 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
