/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthUser } from './lib/useAuthUser';
import { Activity } from './types';
import LoginGate from './components/LoginGate';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import ChatSystem from './components/ChatSystem';
import EduMindAiTutor from './components/EduMindAiTutor';
import AnnouncementsSystem from './components/AnnouncementsSystem';
import SchedulesSystem from './components/SchedulesSystem';
import AuthSystem, { UserProfile } from './components/AuthSystem';
import RealtimeNotificationSystem from './components/RealtimeNotificationSystem';
import { 
  GraduationCap, 
  LayoutDashboard, 
  MessageSquare, 
  Sparkles, 
  Search, 
  Bell, 
  BookOpen, 
  ShieldCheck, 
  Shield,
  Lock,
  RefreshCw,
  HelpCircle,
  Clock,
  ArrowRight,
  Megaphone,
  Calendar,
  User,
  LogOut,
  X,
  ArrowLeft,
  Menu,
  Award,
  FileText,
  KeyRound,
  UserCheck,
  Smartphone,
  Download,
  Camera,
  Upload,
  Sun,
  Moon,
  Type,
  Eye,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('educonnect_theme') : null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'light'; // Default to clean light mode as requested
  });

  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('educonnect_fontsize') : null;
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge') return saved;
    } catch (e) {}
    return 'normal';
  });

  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('educonnect_theme', theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (fontSize === 'xlarge') {
      root.style.fontSize = '18px';
    } else if (fontSize === 'large') {
      root.style.fontSize = '16.5px';
    } else {
      root.style.fontSize = '15px';
    }
    try {
      localStorage.setItem('educonnect_fontsize', fontSize);
    } catch (e) {}
  }, [fontSize]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'chat' | 'announcements' | 'edumind' | 'auth'>('dashboard');
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  // Authenticated User profile — reconciled against the real Firebase session (see useAuthUser)
  const [currentUser, setCurrentUser] = useAuthUser();

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('educonnect_user', JSON.stringify(user));
    } catch (e) {}
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    signOut(auth).catch((e) => console.error('Erro ao sair da conta:', e));
  };
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isIosInstallHelpOpen, setIsIosInstallHelpOpen] = useState(false);

  // Detect whether the app is already running as an installed PWA (standalone display mode)
  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const checkInstalled = () => {
      setIsAppInstalled(standaloneQuery.matches || (window.navigator as any).standalone === true);
    };
    checkInstalled();
    standaloneQuery.addEventListener('change', checkInstalled);
    return () => standaloneQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Silently capture the native install prompt so it can be triggered later by the Install button.
  // Never auto-opens any UI on its own — the user must tap "Instalar App".
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const isIosSafari = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } else if (isIosSafari) {
      // iOS Safari has no native install prompt API; show short manual instructions instead.
      setIsIosInstallHelpOpen(true);
    } else {
      alert('Para instalar, use o menu do seu navegador (⋮ ou •••) e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  };

  // High fidelity quick communication link between student dashboard and chat channels
  const [selectedChatChannelId, setSelectedChatChannelId] = useState<string | null>(null);
  
  // Pre-filled question when typing in the quick AI card on the dashboard
  const [prefilledAiQuestion, setPrefilledAiQuestion] = useState<string | null>(null);
  const [prefilledAiPhoto, setPrefilledAiPhoto] = useState<string | null>(null);
  const [prefilledCameraOpen, setPrefilledCameraOpen] = useState<boolean>(false);
  const [dashboardAiInput, setDashboardAiInput] = useState('');
  const [studentActiveMode, setStudentActiveMode] = useState<'activities' | 'boletim' | 'justificar' | 'flashcards'>('activities');
  const [schedulesActiveDay, setSchedulesActiveDay] = useState<string>('Segunda-feira');
  
  // Auth state defaults for direct navigation to professor login/register
  const [authInitialRole, setAuthInitialRole] = useState<'aluno' | 'professor'>('professor');
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  const handleNavigateToAuth = (role: 'aluno' | 'professor' = 'professor', tab: 'login' | 'register' = 'login') => {
    setAuthInitialRole(role);
    setAuthInitialTab(tab);
    setActiveTab('auth');
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activities');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [refreshCount]);

  const handleRefreshAll = () => {
    setRefreshCount(prev => prev + 1);
  };

  const navigateToChat = (channelId: string) => {
    setSelectedChatChannelId(channelId);
    setActiveTab('chat');
  };

  const handleQuickAiAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardAiInput.trim()) return;
    setPrefilledAiQuestion(dashboardAiInput.trim());
    setDashboardAiInput('');
    setActiveTab('edumind');
  };

  const handleQuickPresetAsk = (questionText: string) => {
    setPrefilledAiQuestion(questionText);
    setActiveTab('edumind');
  };

  const handleDashboardPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrefilledAiPhoto(reader.result as string);
        setActiveTab('edumind');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAiCameraDirectly = () => {
    setPrefilledCameraOpen(true);
    setActiveTab('edumind');
  };

  // Safe pending homework count for current student
  const getPendingHomeworkCount = () => {
    const studentName = currentUser ? currentUser.name : 'Estudante';
    return activities.filter(act =>
      !act.submissions.some(sub => sub.studentName === studentName)
    ).length;
  };

  // Login is mandatory: nothing below this point renders until a real account is authenticated.
  if (!currentUser) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  const currentRole = currentUser.role;

  return (
    <div id="edu-app-root" className={`h-screen w-screen font-sans overflow-hidden transition-colors duration-200 flex flex-col md:flex-row ${theme === 'dark' ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* Sidebar Navigation - Desktop Styled - Oculto em Celulares */}
      <aside className="hidden md:flex md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col flex-shrink-0 z-10">
        
        {/* Brand Header */}
        <div className="p-5 md:p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-150">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-indigo-900 block leading-tight">EduConnect</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md mt-0.5 w-max">v2.0 Estudo Seguro</span>
            </div>
          </div>
          
          {/* Quick Refresh Icon */}
          <button 
            type="button" 
            onClick={handleRefreshAll}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent md:hidden"
            title="Sincronizar dados"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full ${
              activeTab === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            <span>Atividades Escolares</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full ${
              activeTab === 'schedules'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <span>Horários de Aula</span>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-auto uppercase tracking-wide">
              Novo
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full relative ${
              activeTab === 'chat'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>Chat Professores</span>
            {currentRole === 'aluno' && getPendingHomeworkCount() > 0 && (
              <span className="md:ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {getPendingHomeworkCount()} a fazer
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full relative ${
              activeTab === 'announcements'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Megaphone className="h-4 w-4 flex-shrink-0" />
            <span>Mural de Avisos</span>
            <span className="bg-purple-600 text-white dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-md ml-auto uppercase tracking-widest shadow-2xs">
              Gestão
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full relative ${
              activeTab === 'auth'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <KeyRound className="h-4 w-4 flex-shrink-0" />
            <span>Minha Conta</span>
            <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-auto uppercase tracking-wide">
              Firebase
            </span>
          </button>

          <div className="hidden md:block pt-4 pb-1.5 px-4">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Inteligência Artificial</p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('edumind')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all flex-shrink-0 md:w-full ${
              activeTab === 'edumind'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span>EduMind AI Tutor</span>
          </button>
        </nav>

        {/* Profile Details Switcher at Bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-2 shadow-2xs">
            <div 
              onClick={() => setActiveTab('auth')}
              className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
              title="Clique para gerenciar login e conta"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Matrícula: {currentUser.matricula}
                </p>
              </div>
              <KeyRound className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header (Fixed) - Somente Visível em Celular */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 flex items-center justify-between flex-shrink-0 z-30 md:hidden sticky top-0 shadow-2xs gap-1.5">
          {/* Left: Hamburger Menu + User Profile */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 focus:outline-hidden transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
              title="Menu Principal"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsProfileDrawerOpen(true)}
              className="relative focus:outline-hidden transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] text-white border-2 border-white dark:border-slate-800 shadow-xs ${
                currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-slate-850"></span>
            </button>

            <div className="text-left min-w-0 hidden sm:block">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 block leading-tight truncate max-w-[90px] lg:max-w-[110px]">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block uppercase tracking-wide truncate max-w-[90px] lg:max-w-[110px]">
                Matrícula: {currentUser.matricula}
              </span>
            </div>
          </div>

          {/* Center: Active Screen Badge (e.g. Tutor IA) */}
          <div className="flex items-center justify-center shrink-0">
            <span className="text-[10px] sm:text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/80 px-2 sm:px-2.5 py-1 rounded-lg tracking-wider border border-indigo-100/50 dark:border-indigo-900/40 shadow-3xs whitespace-nowrap">
              {activeTab === 'dashboard' && 'Estudos'}
              {activeTab === 'schedules' && 'Horários'}
              {activeTab === 'chat' && 'Chat'}
              {activeTab === 'announcements' && 'Avisos'}
              {activeTab === 'edumind' && 'Tutor IA'}
            </span>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Theme selector (Modo Claro / Modo Escuro) */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-700 shrink-0"
              title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              type="button"
            >
              {theme === 'light' ? <Moon className="h-4 w-4 text-slate-800" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>

            {/* Accessibility & Font Size toggle button */}
            <button
              onClick={() => setIsAccessibilityModalOpen(true)}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer active:scale-95 border border-indigo-100 dark:border-indigo-900/40 shrink-0 flex items-center gap-0.5"
              title="Acessibilidade e Tamanho da Fonte"
              type="button"
            >
              <Type className="h-4 w-4 shrink-0" />
            </button>

            {/* Install App Button (Mobile Header) */}
            {!isAppInstalled && (
              <button
                onClick={handleInstallClick}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-3xs cursor-pointer active:scale-95 shrink-0"
                title="Instalar Aplicativo"
                type="button"
              >
                <Download className="h-4 w-4 shrink-0" />
              </button>
            )}

            <RealtimeNotificationSystem
              onNavigateTab={(tab) => setActiveTab(tab)}
              unreadCount={unreadNotifCount}
              setUnreadCount={setUnreadNotifCount}
            />
          </div>
        </header>

        {/* Mobile bottom-sheet Drawer with simulation controls */}
        <AnimatePresence>
          {isProfileDrawerOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                key="profile-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProfileDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs md:hidden"
              />
              {/* Sheet container */}
              <motion.div
                key="profile-drawer-content"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-6 z-51 shadow-2xl md:hidden max-h-[85vh] overflow-y-auto"
              >
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Minha Conta</h3>
                  <button
                    type="button"
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="p-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-black text-xs uppercase"
                  >
                    Fechar
                  </button>
                </div>

                {/* Profile Card inside bottom sheet */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3.5 mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm ${
                    currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {currentUser.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Matrícula: {currentUser.matricula}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleRefreshAll();
                      setIsProfileDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 dark:bg-slate-850 dark:border-slate-750 dark:text-indigo-400 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Sincronizar Dados / Refresh
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">EduConnect - Mobile Suite</p>
                </div>
              </motion.div>
            </>
          )}

          {isMobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                key="mobile-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs md:hidden"
              />
              {/* Drawer Container (slides from left) */}
              <motion.div
                key="mobile-menu-content"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                className="fixed top-0 bottom-0 left-0 w-[285px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-51 shadow-2xl md:hidden flex flex-col justify-between"
              >
                <div>
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-base font-extrabold tracking-tight text-indigo-900 dark:text-indigo-400 block leading-none">EduConnect</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block mt-1 uppercase tracking-wider">Menu Principal</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-650 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-6 space-y-2">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 pl-2">
                      Navegação
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <LayoutDashboard className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>Estudos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('schedules');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeTab === 'schedules'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Calendar className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>Aulas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('chat');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all relative cursor-pointer ${
                        activeTab === 'chat'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <MessageSquare className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>Chat</span>
                      {currentRole === 'aluno' && getPendingHomeworkCount() > 0 && (
                        <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {getPendingHomeworkCount()}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('announcements');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all relative cursor-pointer ${
                        activeTab === 'announcements'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Megaphone className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>Mural</span>
                    </button>

                    <div className="pt-4 pb-1 pl-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Inteligência Artificial
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('edumind');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeTab === 'edumind'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm font-extrabold'
                          : 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-100/30'
                      }`}
                    >
                      <Sparkles className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>Tutor IA</span>
                    </button>
                  </div>
                </div>

                {/* Profile Link and simulation dashboard inside sidebar */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                      currentRole === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
                    }`}>
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
                        Matrícula: {currentUser.matricula}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileDrawerOpen(true);
                    }}
                    className="w-full text-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/65 hover:bg-indigo-50 dark:bg-slate-850 dark:hover:bg-slate-800 border border-indigo-100/50 dark:border-slate-750 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Minha Conta
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Sub-Navigation bar for Student Dashboard (Atividades Escolares) */}
        {activeTab === 'dashboard' && currentRole === 'aluno' && (
          <div className="fixed bottom-0 left-0 right-0 h-14 pb-safe bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-2 flex items-center justify-between z-40 md:hidden shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setStudentActiveMode('activities')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-bold transition-all cursor-pointer relative ${
                studentActiveMode === 'activities'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-650'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="whitespace-nowrap">Atividades</span>
              {studentActiveMode === 'activities' && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStudentActiveMode('boletim')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-bold transition-all cursor-pointer relative ${
                studentActiveMode === 'boletim'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-650'
              }`}
            >
              <Award className="h-4 w-4" />
              <span className="whitespace-nowrap">Boletim</span>
              {studentActiveMode === 'boletim' && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStudentActiveMode('justificar')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-bold transition-all cursor-pointer relative ${
                studentActiveMode === 'justificar'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-650'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="whitespace-nowrap">Faltas</span>
              {studentActiveMode === 'justificar' && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStudentActiveMode('flashcards')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-bold transition-all cursor-pointer relative ${
                studentActiveMode === 'flashcards'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-650'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="whitespace-nowrap">Estudo Ativo</span>
              {studentActiveMode === 'flashcards' && (
                <span className="absolute bottom-0 h-0.5 w-12 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
              )}
            </button>
          </div>
        )}

        {/* Mobile Sub-Navigation bar for Schedules System (Dias de Aula) */}
        {activeTab === 'schedules' && (
          <div className="fixed bottom-0 left-0 right-0 h-14 pb-safe bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-2 flex items-center justify-between z-40 md:hidden shadow-lg backdrop-blur-md">
            {[
              { label: 'Seg', full: 'Segunda-feira' },
              { label: 'Ter', full: 'Terça-feira' },
              { label: 'Qua', full: 'Quarta-feira' },
              { label: 'Qui', full: 'Quinta-feira' },
              { label: 'Sex', full: 'Sexta-feira' }
            ].map((dayObj) => (
              <button
                key={dayObj.full}
                type="button"
                onClick={() => setSchedulesActiveDay(dayObj.full)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer relative ${
                  schedulesActiveDay === dayObj.full
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-655'
                }`}
              >
                <span className="uppercase tracking-wide">{dayObj.label}</span>
                {schedulesActiveDay === dayObj.full && (
                  <span className="absolute bottom-0 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Header - Somente em telas maiores/Desktop e Tablet */}
        <header className="hidden md:flex h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-805 px-4 sm:px-6 lg:px-8 items-center justify-between flex-shrink-0 z-5 gap-3">
          <div className="flex-1 min-w-0 mr-2 sm:mr-4">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Olá, {currentUser.name}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden lg:block truncate">
              {currentRole === 'professor' 
                ? 'Bem-vindo ao seu painel docente de postagens didáticas.' 
                : 'Pronto(a) para decolar nos seus estudos hoje?'
              }
            </p>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            
            {/* Authenticated User Quick Info & Logout Button */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 pl-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsProfileDrawerOpen(true)}
                className="flex items-center gap-2 text-left cursor-pointer group hover:opacity-90 transition-opacity"
                title="Ver detalhes da conta"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white ${
                  currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}>
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:block pr-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate max-w-[110px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {currentUser.role === 'professor' ? 'Professor' : `Matrícula: ${currentUser.matricula}`}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-extrabold text-[11px] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200/60 dark:border-rose-900/40 active:scale-95"
                title="Sair da sua conta escolar"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Sair</span>
              </button>
            </div>

            {/* Theme Toggle Button (Modo Claro / Modo Escuro) */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-amber-400 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              type="button"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4 text-slate-800" />
                  <span className="hidden xl:inline text-xs font-black text-slate-800">Modo Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="hidden xl:inline text-xs font-black text-amber-400">Modo Claro</span>
                </>
              )}
            </button>

            {/* Accessibility / Vision Font Size Modal Button */}
            <button
              onClick={() => setIsAccessibilityModalOpen(true)}
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Acessibilidade: Ajustar Tamanho da Fonte para Dificuldade Visual"
              type="button"
            >
              <Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xl:inline text-xs font-extrabold">Fonte / Visão</span>
            </button>

            {/* Install App Button (Desktop Header) */}
            {!isAppInstalled && (
              <button
                onClick={handleInstallClick}
                className="px-2.5 lg:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 border border-emerald-500/30"
                title="Instalar EduConnect no seu dispositivo"
                type="button"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">Instalar App</span>
              </button>
            )}

            <button 
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 rounded-xl transition-all relative cursor-pointer"
              title="Recarregar"
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Realtime Firebase Firestore Notification Center */}
            <RealtimeNotificationSystem 
              onNavigateTab={(tab) => setActiveTab(tab)} 
              unreadCount={unreadNotifCount} 
              setUnreadCount={setUnreadNotifCount} 
            />

          </div>
        </header>

        {/* Primary Scrollable Workspace Grid */}
        <section className={`flex-1 ${activeTab === 'edumind' ? 'flex flex-col overflow-hidden p-3 sm:p-5' : `overflow-y-auto p-3 sm:p-8 ${(activeTab === 'dashboard' && currentRole === 'aluno') || activeTab === 'schedules' ? 'pb-32' : 'pb-20'} sm:pb-8`}`}>
          <div className={`h-full flex flex-col ${activeTab === 'edumind' ? 'w-full max-w-none flex-1' : 'max-w-7xl mx-auto w-full'}`}>
            
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  
                  {/* Install App Banner (only shown while the PWA isn't installed yet) */}
                  {!isAppInstalled && (
                    <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-emerald-950/90 text-white p-4 rounded-3xl border border-indigo-500/20 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            Instale o EduConnect no seu Celular
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-md uppercase">Novo</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-300 font-medium leading-tight mt-0.5">
                            Adicione o app na tela inicial para acessar mais rápido, como um aplicativo nativo.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95"
                      >
                        <Download className="h-4 w-4" />
                        Instalar App
                      </button>
                    </div>
                  )}

                  {/* Student vs Professor main dashboard screens */}
                  {currentRole === 'aluno' ? (
                    <StudentDashboard
                      activities={activities}
                      studentName={currentUser.name}
                      currentUser={currentUser}
                      onLogout={handleLogout}
                      onNavigateToAuth={handleNavigateToAuth}
                      onRefresh={handleRefreshAll}
                      onNavigateToChat={navigateToChat}
                      activeMode={studentActiveMode}
                      onChangeActiveMode={setStudentActiveMode}
                    />
                  ) : (
                    <TeacherDashboard
                      activities={activities}
                      onRefresh={handleRefreshAll}
                      onNavigateToChat={navigateToChat}
                      activeProfessorName={currentUser.name}
                      studentName="Estudante"
                      currentUser={currentUser}
                      onLogout={handleLogout}
                      onNavigateToAuth={handleNavigateToAuth}
                    />
                  )}

                  {/* Elegant "AI Assistant Box" at the bottom of the activities dashboard to prompt EduMind AI */}
                  {currentRole === 'aluno' && (
                    <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-md mt-8 border border-indigo-950">
                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-0.5 bg-indigo-500 rounded text-[10px] font-black uppercase tracking-wider">
                            Dúvidas de Estudos?
                          </span>
                          <span className="bg-emerald-500 text-emerald-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Garantia de Segurança Pedagógica
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">EduMind AI: Seu Tutor Particular Inteligente</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-5 max-w-xl leading-relaxed">
                          Tire dúvidas acadêmicas em tempo real. Nossa inteligência artificial segura responderá detalhadamente passos matemáticos, conceitos geográficos ou dará dicas estruturais para suas redações dissertativas.
                        </p>
                        
                        {/* Quick Interactive query selector */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <button 
                            type="button" 
                            onClick={() => handleQuickPresetAsk("Me ensine a resolver equações usando Bhaskara.")}
                            className="text-[11px] font-bold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all border border-white/5"
                          >
                            Como usar Bhaskara?
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQuickPresetAsk("Qual foi o período da queda do Império Romano de forma resumida?")}
                            className="text-[11px] font-bold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all border border-white/5"
                          >
                            Queda do Império Romano
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleQuickPresetAsk("Me dê 3 dicas de coesão para tirar nota 1000 na redação.")}
                            className="text-[11px] font-bold bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all border border-white/5"
                          >
                            Notas de Redação Nota 1000
                          </button>
                        </div>

                        {/* Homework Camera Trigger Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2.5 bg-indigo-950/70 rounded-2xl border border-indigo-800/60 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                              <Camera className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-100">Fotografar Dever de Casa</p>
                              <p className="text-[10px] text-indigo-300">Tire foto do caderno ou livro de exercícios</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleOpenAiCameraDirectly}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <span>Abrir Câmera</span>
                            </button>
                            <label className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Galeria</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleDashboardPhotoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Interactive Query Input */}
                        <form onSubmit={handleQuickAiAskSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl bg-white/5 p-1.5 rounded-2xl border border-white/10">
                          <input 
                            required
                            type="text" 
                            placeholder="Escreva sua dúvida sobre alguma matéria escolar..." 
                            value={dashboardAiInput}
                            onChange={(e) => setDashboardAiInput(e.target.value)}
                            className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-100 placeholder-slate-400 text-xs sm:text-sm px-3.5 py-2.5 focus:outline-hidden"
                          />
                          <button 
                            type="submit"
                            className="bg-white hover:bg-slate-100 text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-black/20 flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
                          >
                            <span>Perguntar Agora</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                      {/* Decorative glowing gradient circle */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    </div>
                  )}

                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Elegant Back Button */}
                  <div className="mb-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/55 dark:bg-indigo-950/40 border border-indigo-150/60 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all font-bold cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>Voltar para Atividades</span>
                    </button>
                  </div>
                  
                  {/* Real-time sync chat system */}
                  <ChatSystem
                    currentRole={currentRole}
                    refreshCount={refreshCount}
                    onRefreshTrigger={handleRefreshAll}
                    selectedChannelIdFromProps={selectedChatChannelId}
                    onClearPropsChannelId={() => setSelectedChatChannelId(null)}
                    activeProfessorName={currentUser.name}
                    currentUserName={currentUser.name}
                  />

                </motion.div>
              )}

              {activeTab === 'schedules' && (
                <motion.div
                  key="schedules"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Elegant Back Button */}
                  <div className="mb-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/55 dark:bg-indigo-950/40 border border-indigo-150/60 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all font-bold cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>Voltar para Atividades</span>
                    </button>
                  </div>

                  <SchedulesSystem
                    currentRole={currentRole}
                    activeProfessorName={currentUser.name}
                    onNavigateToAiTutor={(question: string) => {
                      setPrefilledAiQuestion(question);
                      setActiveTab('edumind');
                    }}
                    selectedDay={schedulesActiveDay}
                    onSelectDay={setSchedulesActiveDay}
                  />
                </motion.div>
              )}

              {activeTab === 'announcements' && (
                <motion.div
                  key="announcements"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Elegant Back Button */}
                  <div className="mb-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/55 dark:bg-indigo-950/40 border border-indigo-150/60 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all font-bold cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>Voltar para Atividades</span>
                    </button>
                  </div>
                  
                  <AnnouncementsSystem
                    currentRole={currentRole}
                    activeProfessorName={currentUser.name}
                    refreshCount={refreshCount}
                    onRefreshTrigger={handleRefreshAll}
                  />

                </motion.div>
              )}

              {activeTab === 'edumind' && (
                <motion.div
                  key="edumind"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-xl p-2 sm:p-4 md:p-6 h-screen w-screen flex flex-col overflow-hidden"
                >
                  {/* Secure Academic AI Tutor conversation box in Fullscreen */}
                  <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
                    <EduMindAiTutor 
                      currentRole={currentRole}
                      initialQuestion={prefilledAiQuestion}
                      onClearInitialQuestion={() => setPrefilledAiQuestion(null)}
                      initialPhoto={prefilledAiPhoto}
                      onClearInitialPhoto={() => setPrefilledAiPhoto(null)}
                      initialCameraOpen={prefilledCameraOpen}
                      onClearInitialCameraOpen={() => setPrefilledCameraOpen(false)}
                      onBackToDashboard={() => setActiveTab('dashboard')}
                    />
                  </div>

                </motion.div>
              )}

              {activeTab === 'auth' && (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Elegant Back Button */}
                  <div className="mb-4 flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/55 dark:bg-indigo-950/40 border border-indigo-150/60 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all font-bold cursor-pointer shadow-3xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                      <span>Voltar para Atividades</span>
                    </button>
                  </div>
                  
                  <AuthSystem
                    currentUser={currentUser}
                    onLoginSuccess={handleLoginSuccess}
                    onLogout={handleLogout}
                    initialRole={authInitialRole}
                    initialTab={authInitialTab}
                  />

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

      </main>

      {/* Modal de Perfil e Saída da Conta (Profile Drawer) */}
      <AnimatePresence>
        {isProfileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setIsProfileDrawerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl overflow-hidden relative space-y-5"
            >
              <button
                type="button"
                onClick={() => setIsProfileDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                  currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}>
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    {currentUser.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    Matrícula: {currentUser.matricula}
                  </p>
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md mt-1 ${
                    currentUser.role === 'professor' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {currentUser.role === 'professor' ? 'Conta Docente' : 'Conta de Estudante'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">E-mail:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{currentUser.email || 'educonect6@gmail.com'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Sincronização:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Firebase Firestore
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setIsProfileDrawerOpen(false);
                  }}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da Conta (Logout)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false);
                    setActiveTab('auth');
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="h-4 w-4 text-indigo-500" />
                  <span>Gerenciar Autenticação</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Instruções de Instalação no iPhone (Safari não expõe prompt nativo de instalação) */}
      <AnimatePresence>
        {isIosInstallHelpOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setIsIosInstallHelpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={() => setIsIosInstallHelpOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Instalar no iPhone
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    EduConnect Web App (PWA)
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-800">
                <p className="font-extrabold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5 text-xs">
                  Como Instalar no iPhone (Safari)
                </p>
                <ol className="list-disc list-inside text-[11px] text-slate-500 space-y-1">
                  <li>Abra este site no navegador <strong>Safari</strong> do iPhone</li>
                  <li>Toque no ícone de <strong>Compartilhar (⎋)</strong> na barra inferior</li>
                  <li>Selecione <strong>"Adicionar à Tela de Início"</strong></li>
                </ol>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIosInstallHelpOpen(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Entendi!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Acessibilidade e Tamanho da Fonte (Dificuldades Visuais) */}
      <AnimatePresence>
        {isAccessibilityModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setIsAccessibilityModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={() => setIsAccessibilityModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Acessibilidade & Visão
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Ajuste de Texto e Contraste
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Tamanho da Fonte */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                    <Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Tamanho do Texto (Dificuldades Visuais)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFontSize('normal')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        fontSize === 'normal'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs font-black">Normal</span>
                      <span className="block text-[10px] opacity-80 font-bold mt-0.5">100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFontSize('large')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        fontSize === 'large'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-sm font-black">Grande</span>
                      <span className="block text-[10px] opacity-80 font-bold mt-0.5">115%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFontSize('xlarge')}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        fontSize === 'xlarge'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-base font-black">Extra</span>
                      <span className="block text-[10px] opacity-80 font-bold mt-0.5">130%</span>
                    </button>
                  </div>
                </div>

                {/* Seleção do Tema Claro / Escuro */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                    {theme === 'light' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                    Modo do Tema (Claro / Escuro)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-black">Modo Claro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-indigo-600 text-white font-black border-indigo-500 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      <span className="text-xs font-black">Modo Escuro</span>
                    </button>
                  </div>
                </div>

                {/* Caixa de Demonstração de Leitura */}
                <div className="bg-indigo-50/70 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-indigo-100 dark:border-slate-700">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-1">
                    Pré-visualização do Texto:
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                    Atividade de Matemática - 9º Ano Fundamental. O texto do aplicativo será ampliado e adaptado automaticamente para facilitar a sua leitura.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAccessibilityModalOpen(false)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                >
                  Concluir e Salvar Preferências
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
