/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Download,
  Share2
} from 'lucide-react';

interface SchedulesSystemProps {
  currentRole: 'aluno' | 'professor';
  activeProfessorName: string;
  onNavigateToAiTutor: (question: string) => void;
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
}

// Complete Weekly Timetable
interface ScheduleSlot {
  period: string; // e.g., "1º Horário"
  time: string;   // e.g., "07:35 - 08:25"
  subject: string;
  teacher: string;
  room: string;
  color: string;
  secondaryInfo?: string;
}

const WEEKDAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

const WEEKDAY_LABELS: Record<string, { short: string; full: string }> = {
  'Segunda-feira': { short: 'Segunda', full: 'Segunda-feira' },
  'Terça-feira': { short: 'Terça', full: 'Terça-feira' },
  'Quarta-feira': { short: 'Quarta', full: 'Quarta-feira' },
  'Quinta-feira': { short: 'Quinta', full: 'Quinta-feira' },
  'Sexta-feira': { short: 'Sexta', full: 'Sexta-feira' }
};

const SCHEDULE_DATA: Record<string, ScheduleSlot[]> = {
  'Segunda-feira': [
    { period: '1º Horário', time: '07:00 - 07:50', subject: 'História', teacher: 'Prof. Fábio', room: 'Sala 12A', color: 'rose' },
    { period: '2º Horário', time: '07:50 - 08:40', subject: 'História', teacher: 'Prof. Fábio', room: 'Sala 12A', color: 'rose' },
    { period: '3º Horário', time: '08:40 - 09:30', subject: 'Est. Orientado', teacher: 'Prof. Mailk', room: 'Biblioteca', color: 'violet' },
    { period: 'Intervalo', time: '09:30 - 09:50', subject: 'Intervalo', teacher: 'Pátio Central', room: 'Pátio', color: 'slate' },
    { period: '4º Horário', time: '09:50 - 10:40', subject: 'Matemática', teacher: 'Prof. Mailk', room: 'Lab Matemática', color: 'emerald' },
    { period: '5º Horário', time: '10:40 - 11:30', subject: 'Matemática', teacher: 'Prof. Mailk', room: 'Lab Matemática', color: 'emerald' },
    { period: 'Almoço', time: '11:30 - 13:00', subject: 'Almoço e Recreação', teacher: 'Refeitório Escolar', room: 'Refeitório', color: 'slate' },
    { period: '6º Horário', time: '13:00 - 13:50', subject: 'L.A.I.', teacher: 'Prof. Mailk', room: 'Laboratório Maker', color: 'teal' },
    { period: '7º Horário', time: '13:50 - 14:40', subject: 'A.P.I.', teacher: 'Profª. Nébia', room: 'Sala Integrada', color: 'purple' },
    { period: '8º Horário', time: '14:40 - 15:30', subject: 'Arte', teacher: 'Prof. George', room: 'Ateliê de Artes', color: 'amber' },
  ],
  'Terça-feira': [
    { period: '1º Horário', time: '07:00 - 07:50', subject: 'Geografia', teacher: 'Prof. Marcos', room: 'Sala Geografia', color: 'cyan' },
    { period: '2º Horário', time: '07:50 - 08:40', subject: 'Geografia', teacher: 'Prof. Marcos', room: 'Sala Geografia', color: 'cyan' },
    { period: '3º Horário', time: '08:40 - 09:30', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: 'Intervalo', time: '09:30 - 09:50', subject: 'Intervalo', teacher: 'Pátio Central', room: 'Pátio', color: 'slate' },
    { period: '4º Horário', time: '09:50 - 10:40', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: '5º Horário', time: '10:40 - 11:30', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: 'Almoço', time: '11:30 - 13:00', subject: 'Almoço e Recreação', teacher: 'Refeitório Escolar', room: 'Refeitório', color: 'slate' },
    { period: '6º Horário', time: '13:00 - 13:50', subject: 'Est. Orientado', teacher: 'Prof. Mailk', room: 'Biblioteca', color: 'violet' },
    { period: '7º Horário', time: '13:50 - 14:40', subject: 'Português', teacher: 'Prof. Jucimar', room: 'Sala 12A', color: 'indigo' },
    { period: '8º Horário', time: '14:40 - 15:30', subject: 'Português', teacher: 'Prof. Jucimar', room: 'Sala 12A', color: 'indigo' },
  ],
  'Quarta-feira': [
    { period: '1º Horário', time: '07:00 - 07:50', subject: 'Inglês', teacher: 'Prof. George', room: 'Sala Multimídia', color: 'teal' },
    { period: '2º Horário', time: '07:50 - 08:40', subject: 'Inglês', teacher: 'Prof. George', room: 'Sala Multimídia', color: 'teal' },
    { period: '3º Horário', time: '08:40 - 09:30', subject: 'Inglês', teacher: 'Prof. George', room: 'Sala Multimídia', color: 'teal' },
    { period: 'Intervalo', time: '09:30 - 09:50', subject: 'Intervalo', teacher: 'Pátio Central', room: 'Pátio', color: 'slate' },
    { period: '4º Horário', time: '09:50 - 10:40', subject: 'Matemática', teacher: 'Prof. Mailk', room: 'Lab Matemática', color: 'emerald' },
    { period: '5º Horário', time: '10:40 - 11:30', subject: 'Matemática', teacher: 'Prof. Mailk', room: 'Lab Matemática', color: 'emerald' },
    { period: 'Almoço', time: '11:30 - 13:00', subject: 'Almoço e Recreação', teacher: 'Refeitório Escolar', room: 'Refeitório', color: 'slate' },
    { period: '6º Horário', time: '13:00 - 13:50', subject: 'Arte', teacher: 'Prof. George', room: 'Ateliê de Artes', color: 'amber' },
    { period: '7º Horário', time: '13:50 - 14:40', subject: 'Est. Orientado', teacher: 'Prof. Mailk', room: 'Biblioteca', color: 'violet' },
    { period: '8º Horário', time: '14:40 - 15:30', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
  ],
  'Quinta-feira': [
    { period: '1º Horário', time: '07:00 - 07:50', subject: 'Português', teacher: 'Prof. Jucimar', room: 'Sala 12A', color: 'indigo' },
    { period: '2º Horário', time: '07:50 - 08:40', subject: 'Português', teacher: 'Prof. Jucimar', room: 'Sala 12A', color: 'indigo' },
    { period: '3º Horário', time: '08:40 - 09:30', subject: 'Ed. Desportiva', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
    { period: 'Intervalo', time: '09:30 - 09:50', subject: 'Intervalo', teacher: 'Pátio Central', room: 'Pátio', color: 'slate' },
    { period: '4º Horário', time: '09:50 - 10:40', subject: 'Geografia', teacher: 'Prof. Marcos', room: 'Sala Geografia', color: 'cyan' },
    { period: '5º Horário', time: '10:40 - 11:30', subject: 'Geografia', teacher: 'Prof. Marcos', room: 'Sala Geografia', color: 'cyan' },
    { period: 'Almoço', time: '11:30 - 13:00', subject: 'Almoço e Recreação', teacher: 'Refeitório Escolar', room: 'Refeitório', color: 'slate' },
    { period: '6º Horário', time: '13:00 - 13:50', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: '7º Horário', time: '13:50 - 14:40', subject: 'Ed. Física', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
    { period: '8º Horário', time: '14:40 - 15:30', subject: 'Ed. Física', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
  ],
  'Sexta-feira': [
    { period: '1º Horário', time: '07:00 - 07:50', subject: 'Est. Orientado', teacher: 'Prof. Mailk', room: 'Biblioteca', color: 'violet' },
    { period: '2º Horário', time: '07:50 - 08:40', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: '3º Horário', time: '08:40 - 09:30', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: 'Intervalo', time: '09:30 - 09:50', subject: 'Intervalo', teacher: 'Pátio Central', room: 'Pátio', color: 'slate' },
    { period: '4º Horário', time: '09:50 - 10:40', subject: 'Ciências', teacher: 'Profª. Nébia', room: 'Laboratório Químico', color: 'purple' },
    { period: '5º Horário', time: '10:40 - 11:30', subject: 'A. de Classe', teacher: 'Prof. Jucimar', room: 'Sala 12A', color: 'violet' },
    { period: 'Almoço', time: '11:30 - 13:00', subject: 'Almoço e Recreação', teacher: 'Refeitório Escolar', room: 'Refeitório', color: 'slate' },
    { period: '6º Horário', time: '13:00 - 13:50', subject: 'Ed. Desportiva', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
    { period: '7º Horário', time: '13:50 - 14:40', subject: 'Ed. Desportiva', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
    { period: '8º Horário', time: '14:40 - 15:30', subject: 'Ed. Desportiva', teacher: 'Prof. Ewerton', room: 'Quadra Poliesportiva', color: 'amber' },
  ]
};

// Simulated dynamic class changes / teacher's other groups
const TEACHER_SCHEDULE_HIGHLIGHTS: Record<string, Array<{ day: string; period: string; classGroupName: string; subject: string; room: string }>> = {
  'Prof. Mailk': [
    { day: 'Segunda-feira', period: '3º Horário', classGroupName: '9º Ano A', subject: 'Matemática', room: 'Lab Matemática' },
    { day: 'Segunda-feira', period: '4º Horário', classGroupName: '9º Ano A', subject: 'Matemática', room: 'Lab Matemática' },
    { day: 'Quarta-feira', period: '1º Horário', classGroupName: '9º Ano A', subject: 'Matemática', room: 'Lab Matemática' },
    { day: 'Quarta-feira', period: '2º Horário', classGroupName: '8º Ano B', subject: 'Matemática Básica', room: 'Sala 10B' },
    { day: 'Quinta-feira', period: '5º Horário', classGroupName: '9º Ano A', subject: 'Matemática', room: 'Lab Matemática' },
    { day: 'Sexta-feira', period: '3º Horário', classGroupName: '8º Ano A', subject: 'Álgebra e Funções', room: 'Sala 11A' },
  ],
  'Prof. Fábio': [
    { day: 'Terça-feira', period: '4º Horário', classGroupName: '9º Ano A', subject: 'História', room: 'Sala 12A' },
    { day: 'Quarta-feira', period: '5º Horário', classGroupName: '9º Ano A', subject: 'História', room: 'Sala 12A' },
    { day: 'Quinta-feira', period: '1º Horário', classGroupName: '9º Ano A', subject: 'História', room: 'Sala 12A' },
    { day: 'Quinta-feira', period: '2º Horário', classGroupName: '9º Ano A', subject: 'História', room: 'Sala 12A' },
    { day: 'Sexta-feira', period: '1º Horário', classGroupName: '8º Ano A', subject: 'História Geral', room: 'Sala 11A' },
  ],
  'Prof. Marcos': [
    { day: 'Terça-feira', period: '3º Horário', classGroupName: '9º Ano A', subject: 'Geografia', room: 'Sala Geografia' },
    { day: 'Quarta-feira', period: '2º Horário', classGroupName: '9º Ano A', subject: 'Geografia', room: 'Sala Geografia' },
    { day: 'Sexta-feira', period: '2º Horário', classGroupName: '9º Ano A', subject: 'Geografia', room: 'Sala Geografia' },
  ],
  'Profª. Nébia': [
    { day: 'Terça-feira', period: '1º Horário', classGroupName: '9º Ano A', subject: 'Ciências', room: 'Laboratório Químico' },
    { day: 'Terça-feira', period: '2º Horário', classGroupName: '9º Ano A', subject: 'Ciências', room: 'Laboratório Químico' },
    { day: 'Quinta-feira', period: '3º Horário', classGroupName: '9º Ano A', subject: 'Ciências', room: 'Laboratório Químico' },
    { day: 'Quinta-feira', period: '4º Horário', classGroupName: '9º Ano A', subject: 'Ciências', room: 'Laboratório Químico' },
  ],
  'Prof. Jucimar': [
    { day: 'Segunda-feira', period: '1º Horário', classGroupName: '9º Ano A', subject: 'Português', room: 'Sala 12A' },
    { day: 'Segunda-feira', period: '2º Horário', classGroupName: '9º Ano A', subject: 'Português', room: 'Sala 12A' },
    { day: 'Quarta-feira', period: '3º Horário', classGroupName: '9º Ano A', subject: 'Português', room: 'Sala 12A' },
    { day: 'Sexta-feira', period: '3º Horário', classGroupName: '9º Ano A', subject: 'Português', room: 'Sala 12A' },
  ],
  'Prof. George': [
    { day: 'Terça-feira', period: '5º Horário', classGroupName: '9º Ano A', subject: 'Inglês', room: 'Sala Multimídia' },
    { day: 'Quarta-feira', period: '4º Horário', classGroupName: '9º Ano A', subject: 'Inglês', room: 'Sala Multimídia' },
    { day: 'Sexta-feira', period: '1º Horário', classGroupName: '9º Ano A', subject: 'Inglês', room: 'Sala Multimídia' },
  ],
  'Prof. Ewerton': [
    { day: 'Segunda-feira', period: '5º Horário', classGroupName: '9º Ano A', subject: 'Educação Física', room: 'Quadra Poliesportiva' },
    { day: 'Sexta-feira', period: '4º Horário', classGroupName: '9º Ano A', subject: 'Educação Física', room: 'Quadra Poliesportiva' },
  ]
};

export default function SchedulesSystem({ 
  currentRole, 
  activeProfessorName, 
  onNavigateToAiTutor,
  selectedDay: propSelectedDay,
  onSelectDay
}: SchedulesSystemProps) {
  const [scheduleState, setScheduleState] = useState<Record<string, ScheduleSlot[]>>(SCHEDULE_DATA);
  const [localSelectedDay, setLocalSelectedDay] = useState<string>('Segunda-feira');
  
  const selectedDay = propSelectedDay !== undefined ? propSelectedDay : localSelectedDay;
  const setSelectedDay = (day: string) => {
    if (onSelectDay) {
      onSelectDay(day);
    } else {
      setLocalSelectedDay(day);
    }
  };

  const [rescheduleSlot, setRescheduleSlot] = useState<string>('');
  const [rescheduleDay, setRescheduleDay] = useState<string>('Segunda-feira');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const daysContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollDays = (direction: 'left' | 'right') => {
    if (daysContainerRef.current) {
      const scrollAmount = 180;
      daysContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDaysWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (daysContainerRef.current) {
      // Prevents vertical page scroll and scrolls the bar horizontally
      e.preventDefault();
      daysContainerRef.current.scrollLeft += e.deltaY * 0.85;
    }
  };

  // Professor Room Change inputs
  const [formTab, setFormTab] = useState<'room' | 'schedule'>('room');
  const [roomChangeDay, setRoomChangeDay] = useState<string>('Segunda-feira');
  const [roomChangePeriod, setRoomChangePeriod] = useState<string>('1º Horário');
  const [roomChangeNewRoom, setRoomChangeNewRoom] = useState<string>('Sala do 9º Ano');

  const targetDaySlots = (scheduleState[roomChangeDay] || []).filter(
    s => s.period !== 'Intervalo' && s.period !== 'Almoço' && s.subject !== 'Intervalo' && s.subject !== 'Almoço e Recreação'
  );

  // Custom visual indicator colors for the subjects
  const getSubjectStyleMatters = (color: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-950 border-emerald-300/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-950 border-indigo-300/80 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40';
      case 'purple':
        return 'bg-purple-50 text-purple-950 border-purple-300/80 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40';
      case 'amber':
        return 'bg-amber-50 text-amber-950 border-amber-300/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40';
      case 'rose':
        return 'bg-rose-50 text-rose-950 border-rose-300/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40';
      case 'cyan':
        return 'bg-cyan-50 text-cyan-950 border-cyan-300/80 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/40';
      case 'teal':
        return 'bg-teal-50 text-teal-950 border-teal-300/80 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40';
      case 'violet':
        return 'bg-violet-50 text-violet-950 border-violet-300/80 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40';
      default:
        return 'bg-slate-50 text-slate-900 border-slate-300 dark:bg-slate-900 dark:text-slate-250 dark:border-slate-800';
    }
  };

  // Check which slot is currently running based on simulated Monday, 12:14 PM
  const isPeriodActiveSimulation = (day: string, timeText: string) => {
    // Current local time metadata is June 1st, 2026 (Monday), 12:14 PM.
    // The "Almoço e Recreação" period ('11:30 - 13:00') perfectly covers this time.
    if (day === 'Segunda-feira' && timeText === '11:30 - 13:00') {
      return true;
    }
    return false;
  };

  const currentTeacherAgenda = TEACHER_SCHEDULE_HIGHLIGHTS[activeProfessorName] || [];

  const handleSuggestReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSlot || !rescheduleReason) return;
    setActionSuccess(`Sua proposta de alteração do ${rescheduleSlot} (${rescheduleDay}) foi registrada e enviada à Coordenação Pedagógica!`);
    setRescheduleSlot('');
    setRescheduleReason('');
    setTimeout(() => setActionSuccess(''), 6000);
  };

  const handleRoomChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = roomChangeDay;
    const period = roomChangePeriod;
    const newRoom = roomChangeNewRoom;

    const daySlots = scheduleState[day] || [];
    const slotIndex = daySlots.findIndex(s => s.period === period);

    if (slotIndex === -1) {
      return;
    }

    const slot = daySlots[slotIndex];
    const prevRoom = slot.room;

    // Mutate state gracefully
    const updatedSchedule = { ...scheduleState };
    updatedSchedule[day] = [...updatedSchedule[day]];
    updatedSchedule[day][slotIndex] = {
      ...updatedSchedule[day][slotIndex],
      room: newRoom
    };

    setScheduleState(updatedSchedule);
    setActionSuccess(`Local da aula de ${slot.subject} (${day}, ${slot.period}) alterado com sucesso! De: ${prevRoom} para: ${newRoom}`);
    setTimeout(() => setActionSuccess(''), 7000);
  };

  const handleQuickQuestionAi = (subj: string) => {
    const defaultQuestions: Record<string, string> = {
      'Português': 'Me dê dicas rápidas sobre figuras de linguagem cobradas em provas.',
      'Matemática': 'Me explique brevemente como resolver problemas práticos de equações quadráticas.',
      'Ciências': 'Como funciona o método científico e as divisões clássicas da biologia celular?',
      'Geografia': 'Explique o conceito de globalização e blocos econômicos de forma pedagógica.',
      'História': 'Quais foram as causas estruturais imediatas para a eclosão da Primeira Guerra Mundial?',
      'Inglês': 'Qual a diferença crucial entre a utilização de Simple Past e Present Perfect?'
    };
    const question = defaultQuestions[subj] || `Quero tirar uma dúvida escolar rápida sobre o assunto de ${subj}.`;
    onNavigateToAiTutor(question);
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER CARD - 100% white, optimized styling */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-950">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
                Grade de Horários Semanais
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                {currentRole === 'aluno' 
                  ? 'Veja abaixo sua escala de aulas presenciais e laboratórios para a semana.' 
                  : `Visualização de agenda exclusiva para o docente atuante: ${activeProfessorName}.`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copiar Horários"
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
            <button
              onClick={() => alert("Sua grade de horários consolidada em PDF foi agendada para download de impressão escolar!")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Imprimir PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIVE STATUS PANEL (Detections based on Monday 11:57) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Calendar Navigation and Timeline */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Weekday Switcher Pills */}
          <div className="hidden md:flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => scrollDays('left')}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-indigo-600 transition-all cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
              title="Voltar dia"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" />
            </button>
            <div 
              ref={daysContainerRef}
              onWheel={handleDaysWheel}
              className="bg-slate-100/70 dark:bg-slate-950 p-1.5 rounded-2xl flex border border-slate-200/50 dark:border-slate-850 overflow-x-auto gap-1.5 no-scrollbar scroll-smooth flex-1"
            >
              {WEEKDAYS.map((day) => {
                const isToday = day === 'Segunda-feira'; // Dynamic simulation match
                const dayLabel = WEEKDAY_LABELS[day];
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center ${
                      selectedDay === day
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200/40 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <span className="hidden lg:inline">{dayLabel?.full || day}</span>
                    <span className="lg:hidden">{dayLabel?.short || day}</span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollDays('right')}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-indigo-600 transition-all cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
              title="Avançar dia"
            >
              <ChevronRight className="h-4 w-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" />
            </button>
          </div>

          {/* Actual Timeline Body Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-3xs space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-250 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-600" />
                <span>Horários de {selectedDay}</span>
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 px-2 py-0.5 rounded-md">
                {currentRole === 'aluno' ? 'Turma: 9º Ano A' : 'Todas as Grades'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-2 pt-1">
              {scheduleState[selectedDay]?.map((slot, idx) => {
                const isActive = isPeriodActiveSimulation(selectedDay, slot.time);
                const isBreak = slot.period === 'Intervalo' || slot.period === 'Almoço' || slot.subject === 'Intervalo' || slot.subject === 'Almoço e Recreação';
                
                // For teachers - is this slot taught by other teacher?
                const isThisTeacherSlot = currentRole === 'professor' && slot.teacher === activeProfessorName;
                const showMutedForTeacher = currentRole === 'professor' && !isThisTeacherSlot && !isBreak;

                return (
                  <div 
                    key={idx}
                    className={`py-2.5 px-3 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
                      isActive 
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-500 shadow-2xs' 
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/50'
                    } ${showMutedForTeacher ? 'opacity-40' : 'opacity-100'}`}
                  >
                    
                    {/* Period and Time duration */}
                    <div className="flex items-center gap-3 shrink-0 min-w-[150px]">
                      <div className={`px-2.5 py-1.5 rounded-xl text-center text-xs font-bold min-w-[76px] uppercase border shrink-0 ${
                        isBreak 
                          ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700' 
                          : isActive 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs' 
                            : 'bg-slate-100/90 text-slate-700 border-slate-200/90 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-850'
                      }`}>
                        {slot.period}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono font-bold tracking-wide text-slate-900 dark:text-slate-100">{slot.time}</p>
                        {isActive && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase animate-pulse inline-block">
                            Agora
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Class Details: Subject and Teacher */}
                    <div className="flex-1 min-w-0 my-0.5 sm:my-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold p-1 px-3 rounded-lg border shadow-3xs ${getSubjectStyleMatters(slot.color)}`}>
                          {slot.subject}
                        </span>
                        {!isBreak && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 shrink-0">
                            <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                            {slot.teacher}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Room Place and Quick AI Buttons */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{slot.room}</span>
                      </div>

                      {/* AI Tutor Assist trigger for students */}
                      {currentRole === 'aluno' && !isBreak && slot.subject !== 'Estudo Dirigido' && (
                        <button
                          type="button"
                          onClick={() => handleQuickQuestionAi(slot.subject)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-900 border border-indigo-100 dark:border-indigo-950 cursor-pointer transition-all flex items-center gap-1 shrink-0"
                          title={`Tirar dúvidas de ${slot.subject} com AI`}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI Tutor</span>
                        </button>
                      )}

                      {/* Log lesson contents for teachers (only for their active slots) */}
                      {currentRole === 'professor' && isThisTeacherSlot && (
                        <button
                          type="button"
                          onClick={() => alert(`Você selecionou o ${slot.period} para preencher o Diário de Classe Pedagógico de ${slot.subject} (${selectedDay}). Seu livro de presença está pronto.`)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-500 hover:text-white border border-emerald-100 dark:border-emerald-950 cursor-pointer transition-all flex items-center gap-1 shrink-0"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Registrar Aula</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* Right Column: Interactive Widgets */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Active Highlight Info Block */}
          {selectedDay === 'Segunda-feira' && (
            <div className="schedule-active-period-card bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="schedule-active-period-title text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                  Período em Andamento Agora
                </h4>
              </div>

              <div className="schedule-active-period-box p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-150 dark:border-emerald-900/60 shadow-3xs space-y-2">
                <span className="schedule-active-period-badge text-[9px] bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-black uppercase tracking-wide">
                  Intervalo Longo
                </span>
                <h5 className="schedule-active-period-main-title text-sm font-black text-slate-850 dark:text-white">Almoço e Recreação</h5>
                <p className="schedule-active-period-subtitle text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Comunidade Escolar • Refeitório e Pátio
                </p>
                <p className="schedule-active-period-description text-[10px] text-emerald-700 dark:text-emerald-400 pt-1 leading-relaxed font-semibold font-sans">
                  Horário de almoço e convívio integrador. O próximo período letivo (L.A.I.) iniciará pontualmente às 13:00.
                </p>
              </div>
            </div>
          )}

          {/* Role specific control card */}
          {currentRole === 'aluno' ? (
            <div className="active-studies-card bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <h4 className="active-studies-title text-xs font-extrabold text-indigo-950 dark:text-indigo-300 uppercase tracking-widest pl-1">
                  Estudos Ativos Inteligente
                </h4>
              </div>
              <p className="active-studies-description text-xs text-indigo-900/80 dark:text-slate-300 leading-relaxed font-semibold">
                Anote suas dúvidas ao longo da aula presencial e clique no botão <strong className="font-bold">AI Tutor</strong> de cada matéria para preparar roteiros de estudos consolidados instantaneamente com IA!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToAiTutor('Me ajude a elaborar um cronograma de estudos diário de 2 horas para o meu 9º Ano.')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                >
                  <span>Gerar Cronograma de Estudos</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
              {/* Mini Tabs Selector */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setFormTab('room')}
                  className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                    formTab === 'room'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Alterar Sala / Local
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('schedule')}
                  className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                    formTab === 'schedule'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Propor Horário
                </button>
              </div>

              {actionSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-start gap-1.5 leading-relaxed">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {formTab === 'room' ? (
                <form onSubmit={handleRoomChangeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Dia da Semana:
                    </label>
                    <select
                      value={roomChangeDay}
                      onChange={(e) => {
                        const day = e.target.value;
                        setRoomChangeDay(day);
                        // Safely preset to first available teaching period of new day
                        const daySlots = (scheduleState[day] || []).filter(
                          s => s.period !== 'Intervalo' && s.period !== 'Almoço' && s.subject !== 'Intervalo' && s.subject !== 'Almoço e Recreação'
                        );
                        if (daySlots.length > 0) {
                          setRoomChangePeriod(daySlots[0].period);
                        }
                      }}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {WEEKDAYS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Selecionar Aula / Horário:
                    </label>
                    <select
                      value={roomChangePeriod}
                      onChange={(e) => setRoomChangePeriod(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {targetDaySlots.length === 0 ? (
                        <option value="">Sem aulas letivas neste dia</option>
                      ) : (
                        targetDaySlots.map((slot, index) => (
                          <option key={index} value={slot.period}>
                            {slot.period} - {slot.subject} ({slot.room})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Mudar Local da Sala Para:
                    </label>
                    <select
                      value={roomChangeNewRoom}
                      onChange={(e) => setRoomChangeNewRoom(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Sala do 9º Ano">Sala do 9º Ano</option>
                      <option value="Laboratório de Química">Laboratório de Química</option>
                      <option value="Laboratório de Informática">Laboratório de Informática</option>
                      <option value="Quadra">Quadra</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer uppercase tracking-wider mt-2"
                  >
                    Confirmar Alteração de Local
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSuggestReschedule} className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Dia Proposto:
                    </label>
                    <select
                      value={rescheduleDay}
                      onChange={(e) => setRescheduleDay(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      {WEEKDAYS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Período / Horário:
                    </label>
                    <select
                      value={rescheduleSlot}
                      onChange={(e) => setRescheduleSlot(e.target.value)}
                      required
                      className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Selecione um horário...</option>
                      <option value="1º Horário (07:00 - 07:50)">1º Horário (07:00 - 07:50)</option>
                      <option value="2º Horário (07:50 - 08:40)">2º Horário (07:50 - 08:40)</option>
                      <option value="3º Horário (08:40 - 09:30)">3º Horário (08:40 - 09:30)</option>
                      <option value="4º Horário (09:50 - 10:40)">4º Horário (09:50 - 10:40)</option>
                      <option value="5º Horário (10:40 - 11:30)">5º Horário (10:40 - 11:30)</option>
                      <option value="6º Horário (13:00 - 13:50)">6º Horário (13:00 - 13:50)</option>
                      <option value="7º Horário (13:50 - 14:40)">7º Horário (13:50 - 14:40)</option>
                      <option value="8º Horário (14:40 - 15:30)">8º Horário (14:40 - 15:30)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Justificativa de Troca/Ajuda:
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Ex: Correção de choque de horários ou aplicação de laboratório externo..."
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-205 dark:border-slate-800 rounded-xl p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    Solicitar Alteração Oficial
                  </button>
                </form>
              )}
            </div>
          )}

          {/* General Stats and Dynamic calendar notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">
              Informativos Críticos
            </h4>
            
            <div className="space-y-2.5 pt-1">
              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0"></div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Avaliações Periódicas (Junho)
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    A semana de testes globais inicia dia 15/06 em períodos regulares.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 flex-shrink-0"></div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Feira Literária & Projetos
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    Projetos interdisciplinares serão expostos no Pátio dia 26/06.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
