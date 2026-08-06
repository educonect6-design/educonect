/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, Submission, AbsenceJustification } from '../types';
import { UserProfile } from './AuthSystem';
import { Calendar, FileText, Plus, BookOpen, User, CheckCircle, Award, Send, ClipboardList, AlertCircle, RefreshCw, MessageSquare, Check, X, Camera, ChevronDown, ArrowLeft, ShieldCheck, KeyRound, UserCheck, Sparkles, Lock, ShieldAlert, LogOut, Users, Edit, GraduationCap, Search, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authFetch } from '../lib/apiClient';

interface TeacherDashboardProps {
  activities: Activity[];
  onRefresh: () => void;
  onNavigateToChat: (channelId: string) => void;
  activeProfessorName: string;
  studentName?: string;
  currentUser?: UserProfile | null;
  onNavigateToAuth?: (role?: 'aluno' | 'professor', tab?: 'login' | 'register') => void;
  onLogout?: () => void;
}

export default function TeacherDashboard({
  activities,
  onRefresh,
  onNavigateToChat,
  activeProfessorName,
  studentName = 'Estudante',
  currentUser,
  onNavigateToAuth,
  onLogout
}: TeacherDashboardProps) {
  const [quickTexts, setQuickTexts] = useState<{ [key: string]: string }>({});

  const channels = [
    { channelId: 'mailk-ana', professorName: 'Prof. Mailk', subject: 'Matemática' },
    { channelId: 'jucimar-ana', professorName: 'Prof. Jucimar', subject: 'Português' },
    { channelId: 'fabio-ana', professorName: 'Prof. Fábio', subject: 'História' },
    { channelId: 'marcos-ana', professorName: 'Prof. Marcos', subject: 'Geografia' },
    { channelId: 'nebia-ana', professorName: 'Profª. Nébia', subject: 'Ciências' },
    { channelId: 'mailk-orientado-ana', professorName: 'Prof. Mailk', subject: 'Estudo Orientado' },
    { channelId: 'marcos-desportiva-ana', professorName: 'Prof. Marcos', subject: 'Educação Desportiva' },
    { channelId: 'nebia-cientifica-ana', professorName: 'Profª. Nébia', subject: 'Iniciação Científica' },
    { channelId: 'jucimar-orientado-ana', professorName: 'Prof. Jucimar', subject: 'Estudo Orientado' },
    { channelId: 'george-ana', professorName: 'Prof. George', subject: 'Inglês' },
    { channelId: 'george-religioso-ana', professorName: 'Prof. George', subject: 'Ensino Religioso' },
    { channelId: 'ewerton-ana', professorName: 'Prof. Ewerton', subject: 'Educação Física' }
  ];

  const activeProfChannels = channels.filter(c => 
    c.professorName.toLowerCase().includes(activeProfessorName.toLowerCase())
  );

  const handleQuickSend = async (channelId: string) => {
    const text = quickTexts[channelId];
    if (!text || !text.trim()) return;
    
    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          senderRole: 'professor',
          senderName: activeProfessorName,
          text: text.trim()
        })
      });
      if (res.ok) {
        setQuickTexts(prev => ({ ...prev, [channelId]: '' }));
        onRefresh();
        onNavigateToChat(channelId);
      }
    } catch (err) {
      console.error('Error in handleQuickSend:', err);
    }
  };

  const FUNDAMENTAL_CLASSES = [
    '9º Ano A - Ensino Fundamental II',
  ];

  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('professor_selected_classes') : null;
      const parsed = saved ? JSON.parse(saved) : ['9º Ano A - Ensino Fundamental II'];
      const filtered = parsed.filter((c: string) => FUNDAMENTAL_CLASSES.includes(c));
      return filtered.length > 0 ? filtered : ['9º Ano A - Ensino Fundamental II'];
    } catch (e) {
      return ['9º Ano A - Ensino Fundamental II'];
    }
  });

  const [filterClass, setFilterClass] = useState<string>('all');

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Matemática');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-06-15T23:59');
  const [newTeacherProfile, setNewTeacherProfile] = useState('Prof. Mailk (Matemática, Estudo Orientado)');
  const [newTurma, setNewTurma] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('professor_selected_classes') : null;
      const classes = saved ? JSON.parse(saved) : [];
      return classes.length > 0 ? classes[0] : '9º Ano A - Ensino Fundamental II';
    } catch (e) {
      return '9º Ano A - Ensino Fundamental II';
    }
  });
  const [errorSubmit, setErrorSubmit] = useState('');
  const [successSubmit, setSuccessSubmit] = useState('');

  // Sate for grading tool
  const [gradingInfo, setGradingInfo] = useState<{ activityId: string; submission: Submission } | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');
  const [errorGrade, setErrorGrade] = useState('');
  const [successGrade, setSuccessGrade] = useState('');
  const [expandedCorrectionKey, setExpandedCorrectionKey] = useState<string | null>(null);

  // Tab and state for absence justifications review and direct student grading
  const [activeMenuTab, setActiveMenuTab] = useState<'atividades' | 'lancar_notas' | 'justificativas' | 'boletim_notas'>('atividades');
  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [justFetchTrigger, setJustFetchTrigger] = useState(0);
  const [justResponseFeedback, setJustResponseFeedback] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [justFilter, setJustFilter] = useState<'mine' | 'all'>('mine');

  // Firestore Registered Students state
  const [registeredStudentsList, setRegisteredStudentsList] = useState<Array<{ name: string; matricula: string }>>([]);

  // Direct 9º Ano Grading State
  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<string>('');
  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState<string>('custom');
  const [customStudentName, setCustomStudentName] = useState<string>('');
  const [directGradeInput, setDirectGradeInput] = useState<string>('');
  const [directFeedbackInput, setDirectFeedbackInput] = useState<string>('');
  const [rosterSearchTerm, setRosterSearchTerm] = useState<string>('');
  const [isSubmittingDirectGrade, setIsSubmittingDirectGrade] = useState<boolean>(false);
  const [directGradeSuccessMsg, setDirectGradeSuccessMsg] = useState<string>('');

  // Boletim form state
  const [boletimStudent, setBoletimStudent] = useState('');
  const [boletimTurma, setBoletimTurma] = useState('9º Ano A');
  const [boletimSubject, setBoletimSubject] = useState('');
  const [boletimBimestre, setBoletimBimestre] = useState('1º Bimestre');
  const [boletimExamGrade, setBoletimExamGrade] = useState('');
  const [boletimFrequency, setBoletimFrequency] = useState('');
  const [isSubmittingBoletim, setIsSubmittingBoletim] = useState(false);
  const [boletimError, setBoletimError] = useState('');
  const [boletimSuccess, setBoletimSuccess] = useState('');

  const handleBoletimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBoletimError('');
    setBoletimSuccess('');
    
    if (!boletimStudent || !boletimSubject || !boletimExamGrade || !boletimFrequency) {
      setBoletimError('Preencha todos os campos obrigatórios.');
      return;
    }
    
    setIsSubmittingBoletim(true);
    try {
      const res = await authFetch('/api/report-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: boletimStudent === 'custom' ? customStudentName : boletimStudent,
          turma: boletimTurma,
          subject: boletimSubject,
          bimestre: boletimBimestre,
          examGrade: parseFloat(boletimExamGrade),
          frequency: parseFloat(boletimFrequency)
        })
      });
      if (res.ok) {
        setBoletimSuccess('Notas do Boletim lançadas com sucesso!');
        setBoletimExamGrade('');
        setBoletimFrequency('');
      } else {
        setBoletimError('Erro ao lançar notas. Tente novamente.');
      }
    } catch (err) {
      setBoletimError('Erro de conexão ao lançar notas.');
    } finally {
      setIsSubmittingBoletim(false);
    }
  };
  const [directGradeErrorMsg, setDirectGradeErrorMsg] = useState<string>('');

  const fetchStudentsFromFirestore = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'aluno'));
      const snap = await getDocs(q);
      const list: Array<{ name: string; matricula: string }> = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.name) {
          list.push({ name: data.name, matricula: data.matricula || '' });
        }
      });
      setRegisteredStudentsList(list);
    } catch (err) {
      console.warn('Could not load students from Firestore:', err);
    }
  };

  useEffect(() => {
    fetchStudentsFromFirestore();
  }, [activities]);

  useEffect(() => {
    if (activities.length > 0 && !selectedActivityForGrading) {
      setSelectedActivityForGrading(activities[0].id);
    }
  }, [activities, selectedActivityForGrading]);

  useEffect(() => {
    if (registeredStudentsList.length > 0 && selectedStudentForGrading === 'custom' && !customStudentName) {
      setSelectedStudentForGrading(registeredStudentsList[0].name);
    }
  }, [registeredStudentsList, customStudentName, selectedStudentForGrading]);

  const sendGradeForStudent = async (targetStudentName: string, targetGrade: string, targetFeedback: string) => {
    const finalStudentName = targetStudentName.trim();
    const finalGrade = targetGrade.trim();
    const actId = selectedActivityForGrading || (activities.length > 0 ? activities[0].id : 'act-1');

    if (!finalStudentName) {
      setDirectGradeErrorMsg('Por favor, informe ou selecione o nome do aluno do 9º Ano.');
      return false;
    }
    if (!finalGrade) {
      setDirectGradeErrorMsg('Por favor, informe o valor da nota (ex: 9.5).');
      return false;
    }

    setDirectGradeErrorMsg('');
    setDirectGradeSuccessMsg('');
    setIsSubmittingDirectGrade(true);

    try {
      const res = await authFetch(`/api/activities/${actId}/grade-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: finalStudentName,
          grade: finalGrade,
          feedback: targetFeedback.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao lançar nota.');
      }

      // Broadcast grade notification to Firestore so student gets real-time push alert
      try {
        await addDoc(collection(db, 'announcements'), {
          title: `🏆 Nota Lançada no 9º Ano: ${finalStudentName}`,
          content: `O professor lançou a nota ${finalGrade} para ${finalStudentName}. Parecer: ${targetFeedback.trim() || 'Verifique no seu boletim.'}`,
          author: activeProfessorName || 'Professor',
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.log('Grade notification broadcast log:', e);
      }

      setDirectGradeSuccessMsg(`✅ Nota ${finalGrade} enviada com sucesso ao aluno "${finalStudentName}"!`);
      setDirectGradeInput('');
      setDirectFeedbackInput('');
      onRefresh();
      setTimeout(() => setDirectGradeSuccessMsg(''), 5000);
      return true;
    } catch (err: any) {
      setDirectGradeErrorMsg(err.message || 'Erro ao salvar nota no servidor.');
      return false;
    } finally {
      setIsSubmittingDirectGrade(false);
    }
  };

  const handleDirectGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStudentName = selectedStudentForGrading === 'custom' ? customStudentName.trim() : selectedStudentForGrading.trim();
    await sendGradeForStudent(finalStudentName, directGradeInput, directFeedbackInput);
  };

  const fetchJustifications = async () => {
    try {
      const res = await fetch('/api/justifications');
      if (res.ok) {
        const data = await res.json();
        setJustifications(data);
      }
    } catch (err) {
      console.error('Error fetching justifications:', err);
    }
  };

  useEffect(() => {
    fetchJustifications();
  }, [activeProfessorName, justFetchTrigger, activities]);

  const handleRespondJustification = async (id: string, status: 'Aceito' | 'Recusado') => {
    try {
      const res = await authFetch(`/api/justifications/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback: justResponseFeedback.trim()
        })
      });

      if (res.ok) {
        setJustResponseFeedback('');
        setRespondingId(null);
        setJustFetchTrigger(prev => prev + 1);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar resposta.');
      }
    } catch (err) {
      console.error('Error responding to justification:', err);
    }
  };

  const displayedJustifications = () => {
    return justifications.filter((j) => {
      if (justFilter === 'mine') {
        const query = activeProfessorName.toLowerCase();
        return j.professorName.toLowerCase().includes(query) || (j.subject && j.subject.toLowerCase().includes(query));
      }
      return true;
    });
  };

  const subjects = [
    'Matemática', 
    'Estudo Orientado',
    'História', 
    'Geografia', 
    'Educação Desportiva', 
    'Ciências', 
    'Iniciação Científica', 
    'Português', 
    'Inglês', 
    'Ensino Religioso', 
    'Educação Física'
  ];
  const teachers = [
    'Prof. Fábio (História)',
    'Prof. Mailk (Matemática, Estudo Orientado)',
    'Prof. Marcos (Geografia, Educação Desportiva)',
    'Profª. Nébia (Ciências, Iniciação Científica)',
    'Prof. Jucimar (Português, Estudo Orientado)',
    'Prof. George (Inglês, Ensino Religioso)',
    'Prof. Ewerton (Educação Física)'
  ];

  const handleToggleClass = (className: string) => {
    let updated;
    if (selectedClasses.includes(className)) {
      updated = selectedClasses.filter(c => c !== className);
    } else {
      updated = [...selectedClasses, className];
    }
    setSelectedClasses(updated);
    try {
      localStorage.setItem('professor_selected_classes', JSON.stringify(updated));
    } catch (e) {}
    
    // Auto sync selected class in creation field if they toggle it off and list changes
    if (updated.length > 0 && !updated.includes(newTurma)) {
      setNewTurma(updated[0]);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSubmit('');
    setSuccessSubmit('');

    if (!newTitle.trim() || !newDescription.trim() || !newDueDate) {
      setErrorSubmit('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const res = await authFetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          subject: newSubject,
          createdBy: newTeacherProfile,
          dueDate: new Date(newDueDate).toISOString(),
          turma: newTurma
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao publicar atividade.');
      }

      setSuccessSubmit('Atividade escolar criada e publicada para os alunos!');
      setNewTitle('');
      setNewDescription('');
      setTimeout(() => {
        setIsCreating(false);
        setSuccessSubmit('');
        onRefresh();
      }, 1500);

    } catch (err: any) {
      setErrorSubmit(err.message || 'Erro ao conectar-se ao servidor.');
    }
  };

  const handleOpenGrading = (activityId: string, submission: Submission) => {
    setGradingInfo({ activityId, submission });
    setGradeValue(submission.grade || '');
    setFeedbackValue(submission.feedback || '');
    setErrorGrade('');
    setSuccessGrade('');
  };

  const handleCloseGrading = () => {
    setGradingInfo(null);
    setGradeValue('');
    setFeedbackValue('');
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingInfo) return;

    setErrorGrade('');
    setSuccessGrade('');

    if (!gradeValue.trim()) {
      setErrorGrade('Insira uma nota para avaliar o aluno.');
      return;
    }

    try {
      const studentEncoded = encodeURIComponent(gradingInfo.submission.studentName);
      const res = await authFetch(`/api/activities/${gradingInfo.activityId}/submissions/${studentEncoded}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: gradeValue,
          feedback: feedbackValue
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao atribuir nota.');
      }

      // Broadcast grade notification to Firestore
      try {
        await addDoc(collection(db, 'announcements'), {
          title: `🏆 Nota Lançada no 9º Ano: ${gradingInfo.submission.studentName}`,
          content: `Atividade corrigida pelo professor! Nota: ${gradeValue.trim()}. Parecer: ${feedbackValue.trim() || 'Verifique no seu boletim.'}`,
          author: activeProfessorName || 'Professor',
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.log('Grade notification broadcast log:', e);
      }

      setSuccessGrade('Avaliação e comentários enviados ao aluno com sucesso!');
      setTimeout(() => {
        handleCloseGrading();
        onRefresh();
      }, 1500);

    } catch (err: any) {
      setErrorGrade(err.message || 'Erro de rede.');
    }
  };

  const getPendingGradingCount = () => {
    let count = 0;
    activities.forEach(act => {
      act.submissions.forEach(sub => {
        if (sub.status === 'Entregue') count++;
      });
    });
    return count;
  };

  const getCompletedGradingCount = () => {
    let count = 0;
    activities.forEach(act => {
      act.submissions.forEach(sub => {
        if (sub.status === 'Corrigido') count++;
      });
    });
    return count;
  };

  // Dynamic calculations filtered to the professor's workspace
  const getFilteredActivitiesCount = () => {
    return activities.filter(act => {
      if (selectedClasses.length === 0) return true;
      return !act.turma || selectedClasses.includes(act.turma);
    }).length;
  };

  const getFilteredPendingGradingCount = () => {
    let count = 0;
    activities.forEach(act => {
      if (selectedClasses.length > 0 && act.turma && !selectedClasses.includes(act.turma)) return;
      act.submissions.forEach(sub => {
        if (sub.status === 'Entregue') count++;
      });
    });
    return count;
  };

  const getFilteredCompletedGradingCount = () => {
    let count = 0;
    activities.forEach(act => {
      if (selectedClasses.length > 0 && act.turma && !selectedClasses.includes(act.turma)) return;
      act.submissions.forEach(sub => {
        if (sub.status === 'Corrigido') count++;
      });
    });
    return count;
  };

  // Helper variables for filtering rendering
  const displayedActivitiesList = activities.filter((act) => {
    if (filterClass === 'all') {
      // Show if it belongs to any of selected classes, or if selectedClasses is empty, show all
      if (selectedClasses.length === 0) return true;
      return !act.turma || selectedClasses.includes(act.turma);
    }
    return act.turma === filterClass;
  });

  return (
    <div id="teacher-dashboard" className="space-y-6">

      {/* Teacher Auth Status / Quick Access Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-700/50">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 tracking-wider">
                Área Docente
              </span>
              {currentUser?.role === 'professor' ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Autenticado no Firestore
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Modo de Demonstração
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold mt-0.5">
              {currentUser?.role === 'professor' 
                ? `Professor Conectado: ${currentUser.name} ${currentUser.subject ? `(${currentUser.subject})` : ''}`
                : `Painel do Professor - ${activeProfessorName}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {currentUser?.role === 'professor' ? (
            <>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer border border-rose-400/40 active:scale-95 shrink-0"
                  title="Sair da conta de professor"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da Conta ({currentUser.name.split(' ')[0]})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateToAuth && onNavigateToAuth('professor', 'login')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/30 shadow-xs"
              >
                <User className="h-4 w-4" />
                <span>Conta ({currentUser.matricula})</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigateToAuth && onNavigateToAuth('professor', 'login')}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-400/30"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Login Professor</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToAuth && onNavigateToAuth('professor', 'register')}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-emerald-400/30"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Cadastrar-se</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Sub-Navigation Tab Switcher */}
      <div className="flex flex-row bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-full sm:w-auto border border-slate-200/60 dark:border-slate-850 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveMenuTab('atividades')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeMenuTab === 'atividades'
              ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-450 shadow-xs border border-slate-200/50 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Minhas Atividades & Turmas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenuTab('lancar_notas')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer relative ${
            activeMenuTab === 'lancar_notas'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <Award className={`h-4 w-4 shrink-0 ${activeMenuTab === 'lancar_notas' ? 'text-slate-950' : 'text-amber-500'}`} />
          <span>Notas Individuais (9º Ano)</span>
          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
            activeMenuTab === 'lancar_notas' ? 'bg-slate-950 text-amber-400' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            Individual
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenuTab('boletim_notas')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer relative ${
            activeMenuTab === 'boletim_notas'
              ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <BarChart className={`h-4 w-4 shrink-0 ${activeMenuTab === 'boletim_notas' ? 'text-slate-950' : 'text-emerald-500'}`} />
          <span>Notas da Turma (Boletim)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenuTab('justificativas')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer relative ${
            activeMenuTab === 'justificativas'
              ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-450 shadow-xs border border-slate-200/50 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Justificativas de Falta</span>
          {justifications.filter(j => j.status === 'Pendente').length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-1">
              {justifications.filter(j => j.status === 'Pendente').length} pendentes
            </span>
          )}
        </button>
      </div>

      {activeMenuTab === 'atividades' && (
        <>
          {/* Overview stats header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-xs flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-bold block uppercase tracking-wide">Total Atividades</span>
                <span className="text-2xl font-extrabold text-gray-950">{getFilteredActivitiesCount()}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-xs flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-2xl text-amber-700">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-bold block uppercase tracking-wide">Aguardando Nota</span>
                <span className="text-2xl font-extrabold text-gray-950">{getFilteredPendingGradingCount()}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-xs flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-700">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-gray-500 font-bold block uppercase tracking-wide">Corrigidas</span>
                <span className="text-2xl font-extrabold text-gray-950">{getFilteredCompletedGradingCount()}</span>
              </div>
            </div>

          </div>

          {/* Profile Class Setup: Ensino Fundamental II (Fundamental Maior) selection */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-900">
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-700">
                <User className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Escolher Turmas do Ensino Fundamental Maior</h3>
                <p className="text-xs text-slate-500 font-medium">Selecione quais turmas do Ensino Fundamental II (6º ao 9º ano) você leciona atualmente</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1.5">
              {FUNDAMENTAL_CLASSES.map((className) => {
                const isSelected = selectedClasses.includes(className);
                return (
                  <button
                    type="button"
                    id={`btn-class-toggle-${className.replace(/\s+/g, '-')}`}
                    key={className}
                    onClick={() => handleToggleClass(className)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col justify-between h-20 group relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-350 bg-white text-slate-600 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Ensino Fund. II
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 block mt-1">
                      {className.split(' - ')[0]}
                    </span>
                    
                    {/* Active selection dot indicator */}
                    <span className={`absolute top-3 right-3 h-2 w-2 rounded-full transition-colors ${
                      isSelected ? 'bg-indigo-600 animate-pulse' : 'bg-slate-250 border border-slate-305'
                    }`} />
                  </button>
                );
              })}
            </div>

            {selectedClasses.length === 0 && (
              <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-250 text-amber-800 p-3 rounded-xl mt-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Nenhuma turma do Fundamental Maior selecionada em seu perfil. Selecione ao menos uma turma acima para organizar o quadro.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold font-sans text-gray-950 tracking-tight flex items-center gap-2">
                <BookOpen className="h-5.5 w-5.5 text-indigo-600" />
                Minhas Atividades & Avaliações
              </h2>
              <p className="text-xs text-gray-500 font-medium">Publique trabalhos e gerencie o progresso escolar da turma</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                className="p-2 border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-gray-55 rounded-xl transition-all"
                title="Atualizar dados"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
              >
                <Plus className="h-4 w-4" />
                Nova Atividade Escolar
              </button>
            </div>
          </div>

          {/* Classroom Quick Filters */}
          {selectedClasses.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center flex-wrap gap-2 text-xs">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Visualizar turma:</span>
              <button
                type="button"
                onClick={() => setFilterClass('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterClass === 'all'
                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                }`}
              >
                Todas as Suas Turmas ({selectedClasses.length})
              </button>
              
              {selectedClasses.map((cls) => (
                <button
                  type="button"
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                    filterClass === cls
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${filterClass === cls ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                  <span>{cls.split(' - ')[0]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Main activities listing & received files */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Created assignments */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Suas Atividades Publicadas</h3>

              {displayedActivitiesList.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-gray-100 text-center text-gray-500 shadow-2xs">
                  <ClipboardList className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  Nenhuma atividade criada para {filterClass === 'all' ? 'estas turmas' : filterClass.split(' - ')[0]}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-4">
                  {displayedActivitiesList.map((act) => (
                    <div 
                      id={`teacher-activity-card-${act.id}`}
                      key={act.id} 
                      className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs relative hover:shadow-xs transition-shadow duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                              {act.subject}
                            </span>
                            {act.turma && (
                              <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-md border border-slate-200">
                                {act.turma.split(' - ')[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Prazo: {new Date(act.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-gray-950 mb-2 leading-snug">{act.title}</h4>
                        <p className="text-sm text-gray-600 mb-4 whitespace-pre-line font-normal">{act.description}</p>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-semibold">
                        <span className="flex items-center gap-1.5 text-indigo-900 bg-indigo-50/50 px-2 py-1 rounded-md">
                          <User className="h-3 w-3" />
                          {act.createdBy}
                        </span>
                        <span>{act.submissions.length} entregas recebidas</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submissions review column */}
            <div className="space-y-4">
              
              {/* Direct Student Messaging Widget */}
              <div className="bg-white border border-indigo-150 rounded-3xl p-5 shadow-xs bg-gradient-to-br from-white to-indigo-50/20">
                <h3 className="text-sm sm:text-base font-display font-bold tracking-tight text-indigo-950 dark:text-white flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  Central de Mensagens Diretas
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 font-sans font-medium leading-relaxed mb-4">
                  Você está simulando o painel de <strong className="font-bold text-slate-800 dark:text-slate-300">{activeProfessorName}</strong>. Envie uma mensagem rápida para o(a) aluno(a) <strong className="font-bold text-slate-800 dark:text-slate-300">{studentName}</strong>:
                </p>
                
                <div className="space-y-3">
                  {activeProfChannels.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic font-sans font-medium">Nenhum canal ativo para sua disciplina.</p>
                  ) : (
                    activeProfChannels.map((ch) => {
                      const channelQuickText = quickTexts[ch.channelId] || '';
                      return (
                        <div key={ch.channelId} className="p-3 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-display font-extrabold uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded shadow-3xs">
                              {ch.subject}
                            </span>
                            <button
                              type="button"
                              onClick={() => onNavigateToChat(ch.channelId)}
                              className="text-[10px] font-display font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all"
                            >
                              Ir para o chat &rarr;
                            </button>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={channelQuickText}
                              onChange={(e) => setQuickTexts(prev => ({ ...prev, [ch.channelId]: e.target.value }))}
                              placeholder={`Avisar sobre ${ch.subject}...`}
                              className="flex-1 text-xs font-sans font-semibold px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-3xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickSend(ch.channelId)}
                              disabled={!channelQuickText.trim()}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-display font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl text-[10px] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-3xs"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pt-2">Correções Pendentes</h3>

              <div className="space-y-3">
                {displayedActivitiesList.flatMap(act => 
                  act.submissions
                    .filter(sub => sub.status === 'Entregue')
                    .map(sub => ({ act, sub }))
                ).length === 0 ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 text-center text-gray-500 text-xs font-medium">
                    Tudo em dia! Nenhuma entrega pendente de nota nas turmas atuais.
                  </div>
                ) : (
                  displayedActivitiesList.flatMap(act => 
                    act.submissions
                      .filter(sub => sub.status === 'Entregue')
                      .map(sub => (
                        <div 
                          key={`${act.id}-${sub.studentName}`} 
                          className="bg-white border border-yellow-250 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-3 border-l-4 border-l-amber-500"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-xs font-extrabold text-indigo-600 font-sans block">{act.subject}</span>
                                {act.turma && (
                                  <span className="bg-slate-100 text-[9px] text-slate-500 px-1.5 py-0.5 rounded border leading-none font-bold">
                                    {act.turma.split(' - ')[0]}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-medium text-gray-400 block line-clamp-1 mt-1">Ativ: {act.title}</span>
                              <div className="flex items-center gap-1 text-xs text-gray-900 font-bold mt-1.5">
                                <User className="h-3 w-3 text-emerald-500" />
                                {sub.studentName}
                              </div>
                            </div>
                            <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              Entregue
                            </span>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                            <p className="line-clamp-3">{sub.content}</p>
                            {sub.photo && (
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-lg border border-emerald-100">
                                <Camera className="h-3 w-3" />
                                <span>Contém Foto da Resolução</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleOpenGrading(act.id, sub)}
                              className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Award className="h-3.5 w-3.5" />
                              Avaliar Atividade
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const matchedChannel = channels.find(c => 
                                  c.subject.toLowerCase() === act.subject.toLowerCase() &&
                                  c.professorName.toLowerCase().includes(activeProfessorName.toLowerCase())
                                );
                                if (matchedChannel) {
                                  onNavigateToChat(matchedChannel.channelId);
                                } else {
                                  const anySubjectMatch = channels.find(c => c.subject.toLowerCase() === act.subject.toLowerCase());
                                  onNavigateToChat(anySubjectMatch ? anySubjectMatch.channelId : 'mailk-ana');
                                }
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                              Chat Aluno
                            </button>
                          </div>
                        </div>
                      ))
                  )
                )}
              </div>

              {/* List of completed gradings */}
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest pt-2">Correções Efetuadas</h3>
              
              <div className="space-y-3">
                {displayedActivitiesList.flatMap(act => 
                  act.submissions
                    .filter(sub => sub.status === 'Corrigido')
                    .map(sub => ({ act, sub }))
                ).length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-xs text-center">Nenhuma nota cadastrada nas turmas selecionadas.</p>
                ) : (
                  displayedActivitiesList.flatMap(act => 
                    act.submissions
                      .filter(sub => sub.status === 'Corrigido')
                      .map(sub => {
                        const isExpanded = expandedCorrectionKey === `corr-${act.id}-${sub.studentName}`;
                        return (
                          <div 
                            key={`corr-${act.id}-${sub.studentName}`}
                            className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 text-xs transition-shadow duration-200 hover:shadow-2xs"
                          >
                            <div 
                              onClick={() => setExpandedCorrectionKey(isExpanded ? null : `corr-${act.id}-${sub.studentName}`)}
                              className="flex items-center justify-between cursor-pointer w-full select-none"
                            >
                              <div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-gray-900 dark:text-slate-100 font-bold">{sub.studentName}</span>
                                  {act.turma && (
                                    <span className="bg-slate-100 dark:bg-slate-800 text-[8px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-205 dark:border-slate-700 font-bold leading-none">
                                      {act.turma.split(' - ')[0]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-normal line-clamp-1 mt-1">Matéria: {act.subject} • Ativ: {act.title}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-350 px-2.5 py-1 rounded-lg border border-emerald-150 dark:border-emerald-900/40 font-black">
                                  Nota: {sub.grade}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-gray-100 dark:border-slate-800/80 pt-3 space-y-3 animate-fadeIn">
                                <div>
                                  <span className="block text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Resposta Enviada pelo Aluno</span>
                                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 font-normal whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                                    {sub.content}
                                  </div>
                                </div>

                                {sub.photo && (
                                  <div>
                                    <span className="block text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1">Foto Enviada Anexa</span>
                                    <div className="bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-805 flex justify-center max-h-40 overflow-hidden">
                                      <img 
                                        src={sub.photo} 
                                        alt="Resolução do Aluno" 
                                        className="max-h-36 rounded-lg object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <span className="block text-[9px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1">Feedback Lançado para o Aluno</span>
                                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20 p-2.5 rounded-xl text-[11px] text-emerald-805 dark:text-emerald-300 italic font-medium">
                                    "{sub.feedback || 'Excelente trabalho!'}"
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleOpenGrading(act.id, sub)}
                                  className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-bold border border-indigo-200/50 dark:border-indigo-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Award className="h-3.5 w-3.5" />
                                  Alterar Nota ou Feedback
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )
                )}
              </div>
            </div>

          </div>

          {/* New Activity publish Modal Dialog */}
          <AnimatePresence>
            {isCreating && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden"
                >
                  <div className="bg-indigo-600 text-white p-5">
                    <h3 className="text-lg font-bold tracking-tight">Publicar Nova Atividade Escolar</h3>
                    <p className="text-xs text-indigo-100 mt-1">Insira as instruções oficiais para a turma do colégio</p>
                  </div>

                  <form onSubmit={handleCreateActivity} className="p-6 space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Matéria</label>
                        <select
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full border border-gray-250 rounded-xl p-2.5 text-sm bg-white"
                        >
                          {subjects.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Professor Emissor</label>
                        <select
                          value={newTeacherProfile}
                          onChange={(e) => setNewTeacherProfile(e.target.value)}
                          className="w-full border border-gray-250 rounded-xl p-2.5 text-sm bg-white"
                        >
                          {teachers.map((prof) => (
                            <option key={prof} value={prof}>{prof}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Turma da Atividade (Ensino Fundamental II)</label>
                      <select
                        value={newTurma}
                        onChange={(e) => setNewTurma(e.target.value)}
                        className="w-full border border-gray-250 rounded-xl p-2.5 text-sm bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        {FUNDAMENTAL_CLASSES.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-500 mt-1 font-medium">Selecione uma turma do Ensino Fundamental Maior para destinar este trabalho</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Título da Atividade</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Lista de Equações de 2º Grau"
                        className="w-full border border-gray-250 rounded-xl p-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Descrição e Diretrizes</label>
                      <textarea
                        required
                        rows={5}
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Escreva claramente o que os alunos devem responder nesta entrega..."
                        className="w-full border border-gray-250 rounded-xl p-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Data e Hora Limite de Entrega</label>
                      <input
                        type="datetime-local"
                        required
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full border border-gray-250 rounded-xl p-2.5 text-sm"
                      />
                    </div>

                    {errorSubmit && (
                      <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{errorSubmit}</span>
                      </div>
                    )}

                    {successSubmit && (
                      <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{successSubmit}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-55"
                      >
                        Calcelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Publicar Atividade
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {activeMenuTab === 'lancar_notas' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-800/40 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-amber-300">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Lançamento de Notas do 9º Ano
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase">
                    Diário Eletrônico
                  </span>
                </h2>
                <p className="text-xs text-indigo-200/90 font-medium max-w-2xl">
                  Selecione a aula/atividade, escolha o aluno do 9º Ano pelo nome e atribua individualmente a nota com parecer pedagógico. Cada aluno que se cadastrar visualizará suas notas instantaneamente no seu boletim.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Grade Assignment Form (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit className="h-4 w-4 text-amber-500" />
                  Mandar Nota Individual
                </h3>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                  9º Ano A
                </span>
              </div>

              <form onSubmit={handleDirectGradeSubmit} className="space-y-4">
                {/* 1. Select Activity / Aula */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>1. Selecionar Disciplina / Aula</span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Criar Nova Aula
                    </button>
                  </label>
                  <select
                    value={selectedActivityForGrading}
                    onChange={(e) => setSelectedActivityForGrading(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {activities.map((act) => (
                      <option key={act.id} value={act.id}>
                        [{act.subject}] {act.title} ({act.turma ? act.turma.split(' - ')[0] : '9º Ano'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select Student */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    2. Selecionar Aluno do 9º Ano
                  </label>
                  <select
                    value={selectedStudentForGrading}
                    onChange={(e) => setSelectedStudentForGrading(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {registeredStudentsList.map((s) => (
                      <option key={s.matricula || s.name} value={s.name}>
                        👤 {s.name} {s.matricula ? `(Matrícula: ${s.matricula})` : ''}
                      </option>
                    ))}
                    <option value="custom">✍️ Digitar Nome de Outro Aluno...</option>
                  </select>
                </div>

                {selectedStudentForGrading === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nome Completo do Aluno
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Silva do Nascimento"
                      value={customStudentName}
                      onChange={(e) => setCustomStudentName(e.target.value)}
                      className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* 3. Grade value input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      3. Nota do Aluno (0,0 a 10,0)
                    </label>
                    <div className="flex items-center gap-1">
                      {['10.0', '9.5', '9.0', '8.5', '8.0', '7.0'].map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => setDirectGradeInput(val)}
                          className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded cursor-pointer transition-colors"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Digite a nota (Ex: 9.5)"
                    value={directGradeInput}
                    onChange={(e) => setDirectGradeInput(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-sm font-black bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 4. Feedback / Parecer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      4. Observação / Parecer Pedagógico
                    </label>
                  </div>
                  
                  {/* Quick feedback chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Excelente desempenho no 9º Ano!',
                      'Parabéns pela dedicação e capricho!',
                      'Bom aproveitamento nos exercícios.',
                      'Atenção nas próximas tarefas.'
                    ].map((textSnippet) => (
                      <button
                        type="button"
                        key={textSnippet}
                        onClick={() => setDirectFeedbackInput(textSnippet)}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 hover:text-amber-900 dark:hover:text-amber-200 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-left"
                      >
                        + "{textSnippet.slice(0, 22)}..."
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Ex: Excelente aproveitamento nos exercícios do 9º Ano. Parabéns pela participação nas atividades!"
                    value={directFeedbackInput}
                    onChange={(e) => setDirectFeedbackInput(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {directGradeErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{directGradeErrorMsg}</span>
                  </div>
                )}

                {directGradeSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-2xs">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{directGradeSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingDirectGrade}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmittingDirectGrade ? 'Enviando Nota...' : `Mandar Nota para ${selectedStudentForGrading === 'custom' ? (customStudentName || 'Aluno') : selectedStudentForGrading}`}
                  </span>
                </button>
              </form>
            </div>

            {/* Right Column: Grades Roster for Selected Activity (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
              {(() => {
                const currentAct = activities.find(a => a.id === selectedActivityForGrading) || activities[0];
                if (!currentAct) return <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma atividade selecionada.</p>;

                const defaultStudents = registeredStudentsList.map(s => s.name);
                const uniqueStudents = Array.from(new Set([...defaultStudents, ...currentAct.submissions.map(s => s.studentName)]));

                const filteredRoster = uniqueStudents.filter(name => 
                  !rosterSearchTerm || name.toLowerCase().includes(rosterSearchTerm.toLowerCase())
                );

                return (
                  <>
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
                          Diário de Notas de Alunos do 9º Ano
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          [{currentAct.subject}] {currentAct.title}
                        </h3>
                      </div>
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-900">
                        {currentAct.submissions.filter(s => s.grade).length} de {uniqueStudents.length} Notas Lançadas
                      </span>
                    </div>

                    {/* Search student filter */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Buscar aluno no diário do 9º Ano pelo nome..."
                        value={rosterSearchTerm}
                        onChange={(e) => setRosterSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredRoster.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                          Nenhum aluno encontrado com a busca "{rosterSearchTerm}".
                        </div>
                      ) : (
                        filteredRoster.map((stName) => {
                          const sub = currentAct.submissions.find(s => s.studentName.toLowerCase().trim() === stName.toLowerCase().trim());
                          const hasGrade = sub && sub.grade !== undefined && sub.grade !== null && sub.grade !== '';

                          return (
                            <div
                              key={stName}
                              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                hasGrade
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200/70 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl font-black text-xs ${
                                  hasGrade ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  <User className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {stName}
                                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-extrabold">
                                      9º Ano A
                                    </span>
                                  </h4>
                                  {hasGrade ? (
                                    <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 font-medium line-clamp-1 mt-0.5">
                                      Parecer: "{sub.feedback || 'Nota atribuída pelo professor.'}"
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                      Aguardando envio de nota individual
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {hasGrade ? (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-2xs">
                                      Nota: {sub.grade}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedStudentForGrading(stName);
                                        setDirectGradeInput(sub.grade || '');
                                        setDirectFeedbackInput(sub.feedback || '');
                                      }}
                                      className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                      title="Editar nota"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudentForGrading(stName);
                                      const gradeToSend = directGradeInput.trim() || '9.0';
                                      const feedbackToSend = directFeedbackInput.trim() || 'Excelente desempenho na avaliação do 9º Ano.';
                                      sendGradeForStudent(stName, gradeToSend, feedbackToSend);
                                    }}
                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Mandar Nota</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeMenuTab === 'justificativas' && (
        <div className="space-y-6">
          {/* Back Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveMenuTab('atividades')}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-indigo-750 dark:text-indigo-350 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-150/60 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-all font-bold cursor-pointer shadow-3xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar para Atividades</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl font-bold font-sans text-gray-950 tracking-tight flex items-center gap-2">
                <Calendar className="h-5.5 w-5.5 text-indigo-600" />
                Justificativas de Falta Recebidas
              </h2>
              <p className="text-xs text-gray-500 font-medium font-sans">
                Selecione as justificações enviadas para análise e realize o abono das ausências escolares
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Filter: Addressed to me vs All */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setJustFilter('mine')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    justFilter === 'mine' ? 'bg-white shadow-xs text-indigo-950' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Suas Disciplinas
                </button>
                <button
                  type="button"
                  onClick={() => setJustFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    justFilter === 'all' ? 'bg-white shadow-xs text-indigo-950' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas do Colégio
                </button>
              </div>

              <button
                onClick={() => setJustFetchTrigger(p => p + 1)}
                className="p-2 border border-gray-255 text-gray-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Sincronizar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Justifications list rendering */}
          <div className="space-y-4">
            {displayedJustifications().length === 0 ? (
              <div className="bg-white border border-gray-105 rounded-3xl p-12 text-center text-gray-400 italic text-sm">
                Nenhuma justificativa de falta {justFilter === 'mine' ? 'encontrada para suas disciplinas no momento.' : 'enviada no sistema escolar.'}
              </div>
            ) : (
              displayedJustifications().map((just) => {
                const isAddressingThisProfessor = just.professorName.toLowerCase().includes(activeProfessorName.toLowerCase());
                
                return (
                  <motion.div
                    key={just.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-3xl p-5 shadow-3xs border-l-4 border-l-indigo-600 space-y-4 hover:shadow-2xs transition-all relative"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-gray-950">{just.studentName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded leading-none border border-indigo-100">
                            {just.subject}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          Direcionador: <strong className="text-slate-600">{just.professorName}</strong> {isAddressingThisProfessor && "(Você)"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                          Falta em: {just.date.split('-').reverse().join('/')}
                        </span>
                        
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          just.status === 'Aceito' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          just.status === 'Recusado' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                          'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {just.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                      <strong className="block text-xs font-bold text-slate-800 mb-1">{just.reason}</strong>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                        {just.description}
                      </p>
                    </div>

                    {just.evidencePhoto && (
                      <div className="space-y-2 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl max-w-lg">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Atestado Médico Anexado (Captura em Tempo Real):</span>
                        <div className="relative group max-w-sm rounded-xl overflow-hidden border border-slate-200 shadow-3xs bg-white">
                          <img 
                            src={just.evidencePhoto} 
                            alt="Atestado Médico" 
                            className="w-full max-h-64 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={just.evidencePhoto} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                          >
                            <span>Visualizar em Tamanho Real</span>
                            <span className="text-[10px] font-medium text-slate-200">Clique para expandir ↗</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {just.feedback && (
                      <div className="bg-slate-100/60 border border-slate-200 p-3 rounded-2xl text-xs text-slate-700 italic border-l-2 border-l-slate-400">
                        <strong className="text-slate-900 not-italic block font-bold text-[10px] mb-0.5">Retorno Registrado:</strong>
                        "{just.feedback}"
                      </div>
                    )}

                    {/* Quick Response Form for Pending ones */}
                    {just.status === 'Pendente' && (
                      <div className="border-t border-slate-100 pt-4 mt-2">
                        {respondingId === just.id ? (
                          <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Análise Docente & Comentário de Resposta
                            </label>
                            <textarea
                              required
                              rows={2}
                              value={justResponseFeedback}
                              onChange={(e) => setJustResponseFeedback(e.target.value)}
                              placeholder="Escreva orientações para o aluno (ex: atividade alternativa ou confirmação de abono)..."
                              className="w-full border border-gray-250 rounded-xl p-3 text-xs"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setRespondingId(null);
                                  setJustResponseFeedback('');
                                }}
                                className="px-3 py-1.5 border border-gray-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondJustification(just.id, 'Recusado')}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                              >
                                <X className="h-3 w-3" />
                                Recusar Justificativa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondJustification(just.id, 'Aceito')}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                              >
                                <Check className="h-3 w-3" />
                                Aceitar & Abonar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingId(just.id);
                                setJustResponseFeedback('');
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
                            >
                              Analisar e Responder
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Boletim de Notas Tab */}
      {activeMenuTab === 'boletim_notas' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
                <BarChart className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Notas da Turma (Boletim)
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase">
                    Fechamento de Bimestre
                  </span>
                </h2>
                <p className="text-xs text-emerald-200/90 font-medium max-w-2xl">
                  Insira as notas finais e a frequência dos estudantes. Estas informações comporão o Boletim de Notas exibido no perfil do aluno, consolidando o resultado do bimestre.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xs max-w-2xl mx-auto">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-5">
              <Edit className="h-4 w-4 text-emerald-500" />
              Lançamento para o Boletim
            </h3>

            <form onSubmit={handleBoletimSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Estudante
                  </label>
                  <select
                    value={boletimStudent}
                    onChange={(e) => setBoletimStudent(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>Selecione um aluno</option>
                    {registeredStudentsList.map((s) => (
                      <option key={s.matricula || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    <option value="custom">✍️ Digitar Nome de Outro Aluno...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Turma
                  </label>
                  <input
                    type="text"
                    value={boletimTurma}
                    onChange={(e) => setBoletimTurma(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {boletimStudent === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome do Aluno (Manual)
                  </label>
                  <input
                    type="text"
                    value={customStudentName}
                    onChange={(e) => setCustomStudentName(e.target.value)}
                    placeholder="Ex: João Pedro"
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Disciplina
                  </label>
                  <input
                    type="text"
                    value={boletimSubject}
                    onChange={(e) => setBoletimSubject(e.target.value)}
                    placeholder="Ex: Matemática"
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Bimestre
                  </label>
                  <select
                    value={boletimBimestre}
                    onChange={(e) => setBoletimBimestre(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1º Bimestre">1º Bimestre</option>
                    <option value="2º Bimestre">2º Bimestre</option>
                    <option value="3º Bimestre">3º Bimestre</option>
                    <option value="4º Bimestre">4º Bimestre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Nota Final
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={boletimExamGrade}
                    onChange={(e) => setBoletimExamGrade(e.target.value)}
                    placeholder="Ex: 8.5"
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Frequência (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={boletimFrequency}
                    onChange={(e) => setBoletimFrequency(e.target.value)}
                    placeholder="Ex: 95"
                    className="w-full border border-slate-250 dark:border-slate-700 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {boletimError && (
                <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{boletimError}</span>
                </div>
              )}
              {boletimSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{boletimSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingBoletim}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingBoletim ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Salvar no Boletim
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Evaluate & Grade Submissions Modal */}
      <AnimatePresence>
        {gradingInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden"
            >
              <div className="bg-amber-600 text-white p-5">
                <h3 className="text-lg font-bold">Corrigir Atividade do Aluno</h3>
                <p className="text-xs text-amber-100 mt-1">Estudante: {gradingInfo.submission.studentName}</p>
              </div>

              <div className="p-6 space-y-4">
                
                <div>
                  <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Resposta Enviada pelo Aluno</span>
                  <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-750 font-normal whitespace-pre-line border border-gray-150 max-h-48 overflow-y-auto mb-3">
                    {gradingInfo.submission.content}
                  </div>
                  {gradingInfo.submission.photo && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Foto Nitida da Atividade</span>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex justify-center items-center max-h-64 overflow-hidden">
                        <img 
                          src={gradingInfo.submission.photo} 
                          alt="Atividade do Aluno" 
                          className="max-h-60 rounded-xl object-contain shadow-3xs"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {gradingInfo.submission.pdfName && (
                    <div className="space-y-1 mt-3">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Documento PDF da Atividade</span>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{gradingInfo.submission.pdfName}</p>
                            <p className="text-[9px] text-emerald-750 font-bold">Formato PDF</p>
                          </div>
                        </div>
                        {gradingInfo.submission.pdfData && (
                          <a
                            href={gradingInfo.submission.pdfData}
                            download={gradingInfo.submission.pdfName}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-3xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Baixar PDF
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleGradeSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nota Atribuída (0.0 a 10.0)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 9.5"
                      value={gradeValue}
                      onChange={(e) => setGradeValue(e.target.value)}
                      className="w-full border border-gray-250 rounded-xl p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Comentários e Orientações Docentes (Feedback)</label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Parabéns pela dedicação! Seus cálculos matemáticos demonstraram grande domínio técnico..."
                      value={feedbackValue}
                      onChange={(e) => setFeedbackValue(e.target.value)}
                      className="w-full border border-gray-250 rounded-xl p-2.5 text-sm"
                    />
                  </div>

                  {errorGrade && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{errorGrade}</span>
                    </div>
                  )}

                  {successGrade && (
                    <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{successGrade}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseGrading}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-55"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
                    >
                      <Send className="h-3 w-3" />
                      Enviar Nota e Feedback
                    </button>
                  </div>
                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  function handleOpenSubmissionGrading(actId: string, sub: Submission) {
    handleOpenGrading(actId, sub);
  }
}
