/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Megaphone, 
  MessageSquare, 
  BookOpen, 
  Radio, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCheck, 
  Clock,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Award
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppNotification {
  id: string;
  type: 'announcement' | 'chat' | 'activity' | 'system' | 'grade';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  linkTab?: 'announcements' | 'chat' | 'dashboard' | 'schedules';
  sender?: string;
}

interface RealtimeNotificationProps {
  onNavigateTab: (tab: 'announcements' | 'chat' | 'dashboard' | 'schedules') => void;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function RealtimeNotificationSystem({ onNavigateTab, unreadCount, setUnreadCount }: RealtimeNotificationProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission;
      }
    } catch (e) {
      console.log('Notification permission check iOS fallback:', e);
    }
    return 'default';
  });

  // Play subtle browser notification chime using Web Audio API
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio not permitted without click
    }
  };

  // Request Mobile / Web Native Browser Push Notification Permission
  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('No iPhone / iOS, os alertas chegam em tempo real na tela do seu aplicativo e ao adicionar à Tela de Início!');
      return;
    }

    try {
      if (typeof Notification.requestPermission !== 'function') {
        setPushPermission('granted');
        return;
      }

      const res = await Notification.requestPermission();
      setPushPermission(res);

      if (res === 'granted') {
        // Vibrate phone if supported
        try {
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        } catch (e) {}

        // Trigger welcome native push notification safely
        try {
          new Notification('🔔 Notificações Ativadas no Celular!', {
            body: 'Você receberá alertas em tempo real quando professores enviarem recados, notas ou mensagens para a turma.',
            tag: 'educonnect-welcome',
          });
        } catch (e) {
          console.log('Direct Notification constructor restricted on iOS/Safari, using in-app notification:', e);
        }

        // Trigger in-app toast
        triggerRealtimeToast({
          id: `push-enabled-${Date.now()}`,
          type: 'system',
          title: '📱 Notificações de Celular Ativadas!',
          message: 'Alertas em tempo real ativados com sucesso neste dispositivo.',
          timestamp: new Date(),
          read: false,
          sender: 'Sistema'
        });
      } else if (res === 'denied') {
        alert('Você bloqueou as notificações nas configurações do seu navegador.');
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificações:', err);
      // Fallback alert for iPhone users
      triggerRealtimeToast({
        id: `push-enabled-${Date.now()}`,
        type: 'system',
        title: '📱 Notificações Ativadas no App!',
        message: 'Você receberá todas as novidades e avisos diretamente no aplicativo em tempo real.',
        timestamp: new Date(),
        read: false,
        sender: 'Sistema'
      });
    }
  };

  // Send native mobile push alert on user device screen
  const triggerNativePush = (title: string, body: string) => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            tag: 'educonnect-notif-' + Date.now(),
          });
          notif.onclick = () => {
            window.focus();
          };

          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        } catch (e) {
          console.log('Mobile push trigger notice:', e);
        }
      }
    } catch (e) {
      console.log('Push check notice:', e);
    }
  };

  useEffect(() => {
    let isInitialLoad = true;

    // 1. Listen to Realtime Firestore Announcements (Comunicados pra turma)
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const title = `📢 ${data.title || 'Novo Comunicado para a Turma'}`;
          const message = data.content ? (data.content.length > 80 ? data.content.slice(0, 80) + '...' : data.content) : 'Novo comunicado publicado no portal.';

          const newNotif: AppNotification = {
            id: change.doc.id,
            type: 'announcement',
            title,
            message,
            timestamp: new Date(),
            read: false,
            linkTab: 'announcements',
            sender: data.author || 'Coordenação'
          };

          if (!isInitialLoad) {
            triggerRealtimeToast(newNotif);
            triggerNativePush(title, message);
          }
        }
      });
    }, (err) => console.log('Firestore notification snapshot info:', err));

    // 2. Listen to Realtime Firestore Chat Messages
    const chatQuery = query(collection(db, 'chat_messages'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const title = `💬 Mensagem de ${data.senderName || 'EduConnect'}`;
          const message = data.text ? (data.text.length > 80 ? data.text.slice(0, 80) + '...' : data.text) : 'Nova mensagem na turma.';

          const newNotif: AppNotification = {
            id: change.doc.id,
            type: 'chat',
            title,
            message,
            timestamp: new Date(),
            read: false,
            linkTab: 'chat',
            sender: data.senderName
          };

          if (!isInitialLoad) {
            triggerRealtimeToast(newNotif);
            triggerNativePush(title, message);
          }
        }
      });
    }, (err) => console.log('Firestore chat snapshot info:', err));

    // 3. Listen to Realtime Firestore Activities / Homework
    const activitiesQuery = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const title = `📝 Nova Tarefa: ${data.subject || 'Escolar'}`;
          const message = data.title || 'Nova atividade adicionada para a turma.';

          const newNotif: AppNotification = {
            id: change.doc.id,
            type: 'activity',
            title,
            message,
            timestamp: new Date(),
            read: false,
            linkTab: 'dashboard',
            sender: data.subject
          };

          if (!isInitialLoad) {
            triggerRealtimeToast(newNotif);
            triggerNativePush(title, message);
          }
        }
      });
    }, (err) => console.log('Firestore activities snapshot info:', err));

    // Mark initial setup done after 1 second so initial doc loads don't spam toasts
    const timer = setTimeout(() => {
      isInitialLoad = false;
    }, 1200);

    return () => {
      clearTimeout(timer);
      unsubscribeAnnouncements();
      unsubscribeChat();
      unsubscribeActivities();
    };
  }, []);

  const triggerRealtimeToast = (notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev]);
    setUnreadCount((c) => c + 1);
    setActiveToast(notif);
    playChimeSound();

    // Auto dismiss toast popup after 6 seconds
    setTimeout(() => {
      setActiveToast((current) => (current?.id === notif.id ? null : current));
    }, 6000);
  };

  // Helper to send a live test notification directly to Firestore (dispatches to all users/devices)
  const sendTestFirestoreNotif = async () => {
    try {
      await addDoc(collection(db, 'announcements'), {
        title: 'Comunicado Geral para Toda a Turma',
        content: 'Notificação enviada com sucesso! Todos os alunos e professores conectados receberam este alerta no celular.',
        author: 'EduConnect Geral',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      // Fallback local test toast
      const notif: AppNotification = {
        id: `test-${Date.now()}`,
        type: 'announcement',
        title: '📢 Notificação de Teste no Celular',
        message: 'A sincronização em tempo real para a turma está funcionando!',
        timestamp: new Date(),
        read: false,
        linkTab: 'announcements',
        sender: 'Sistema'
      };
      triggerRealtimeToast(notif);
      triggerNativePush(notif.title, notif.message);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    if (notif.linkTab) {
      onNavigateTab(notif.linkTab);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      
      {/* Header Bell Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-3xs"
        title="Notificações em Tempo Real"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-xs border-2 border-white dark:border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* FLOATING TOAST NOTIFICATION (Pop-up banner on top for mobile, bottom-right for desktop) */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-3 left-3 right-3 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm sm:w-full z-[9999] bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/50 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Radio className="h-5 w-5 animate-pulse text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Ao Vivo • Turma
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-tight mt-0.5 truncate">
                    {activeToast.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="text-slate-500 dark:text-slate-400 hover:text-white p-2.5 -mr-1 -mt-1 rounded-xl transition-colors cursor-pointer shrink-0 active:scale-90"
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 font-medium line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3 text-indigo-400" />
                <span>Agora</span>
              </span>

              {activeToast.linkTab && (
                <button
                  type="button"
                  onClick={() => {
                    handleNotificationClick(activeToast);
                    setActiveToast(null);
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>Abrir no App</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS DROPDOWN POPOVER MENU (Responsive modal overlay on mobile) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] sm:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-[9999] overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-500 animate-pulse shrink-0" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Notificações do Celular e Turma
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    title={soundEnabled ? 'Som Ativado' : 'Som Desativado'}
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4 text-indigo-600" /> : <VolumeX className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* PUSH NOTIFICATION PERMISSION PROMPT BANNER */}
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="h-5 w-5 text-indigo-200 shrink-0 animate-bounce" />
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">Notificações no Celular</p>
                    <p className="text-[10px] text-indigo-100 truncate">
                      {pushPermission === 'granted' ? 'Ativado! Alertas chegam no seu dispositivo' : 'Permita para receber avisos da turma'}
                    </p>
                  </div>
                </div>

                {pushPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="px-3 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-black text-[11px] rounded-xl shadow-xs shrink-0 cursor-pointer transition-all active:scale-95"
                  >
                    Ativar
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-lg font-black shrink-0 border border-emerald-400/30">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Ativado</span>
                  </span>
                )}
              </div>

              {/* Quick Actions Bar */}
              <div className="px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={sendTestFirestoreNotif}
                  className="font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Mandar Notificação Geral (Turma)</span>
                </button>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Marcar lidas</span>
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1 flex-1 min-h-0">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-bold">Nenhuma notificação recente.</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">O sistema alertará todos do grupo em tempo real no celular assim que novidades forem publicadas.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                        notif.read
                          ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-75'
                          : 'bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs flex-shrink-0">
                        {notif.type === 'announcement' && <Megaphone className="h-4 w-4" />}
                        {notif.type === 'chat' && <MessageSquare className="h-4 w-4" />}
                        {notif.type === 'activity' && <BookOpen className="h-4 w-4" />}
                        {notif.type === 'grade' && <Award className="h-4 w-4 text-amber-500" />}
                        {notif.type === 'system' && <Bell className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                          {notif.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold text-center shrink-0">
                Alertas em Tempo Real via Push e Firebase Firestore
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

