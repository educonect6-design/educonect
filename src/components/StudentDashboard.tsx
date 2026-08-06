/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, AbsenceJustification, ReportCardGrade } from '../types';
import { UserProfile } from './AuthSystem';
import { Calendar, FileText, Send, Clock, CheckCircle2, AlertCircle, Award, MessageCircle, Camera, Trash2, RefreshCw, ArrowLeft, Sparkles, ChevronRight, ChevronLeft, Eye, BookOpen, Upload, LogOut, User, KeyRound, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { authFetch } from '../lib/apiClient';

interface StudentDashboardProps {
  activities: Activity[];
  studentName: string;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onNavigateToAuth?: (role?: 'aluno' | 'professor', tab?: 'login' | 'register') => void;
  onRefresh: () => void;
  onNavigateToChat: (channelId: string) => void;
  activeMode?: 'activities' | 'boletim' | 'justificar' | 'flashcards';
  onChangeActiveMode?: (mode: 'activities' | 'boletim' | 'justificar' | 'flashcards') => void;
}

export default function StudentDashboard({ 
  activities, 
  studentName, 
  currentUser,
  onLogout,
  onNavigateToAuth,
  onRefresh, 
  onNavigateToChat,
  activeMode: propActiveMode,
  onChangeActiveMode
}: StudentDashboardProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedContactChannel, setSelectedContactChannel] = useState('mailk-ana');
  const [localActiveMode, setLocalActiveMode] = useState<'activities' | 'boletim' | 'justificar' | 'flashcards'>('activities');

  const activeMode = propActiveMode !== undefined ? propActiveMode : localActiveMode;
  const setActiveMode = (mode: 'activities' | 'boletim' | 'justificar' | 'flashcards') => {
    if (onChangeActiveMode) {
      onChangeActiveMode(mode);
    } else {
      setLocalActiveMode(mode);
    }
  };

  // Flashcards (Estudo Ativo) State
  const [flashcardSubject, setFlashcardSubject] = useState('Matemática');
  const [flashcards, setFlashcards] = useState<Array<{ question: string; answer: string; explanation: string }>>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [practiceLogs, setPracticeLogs] = useState<Array<'easy' | 'medium' | 'hard'>>([]);
  const [deckMethod, setDeckMethod] = useState<'ai' | 'fallback' | ''>('');
  const [cardError, setCardError] = useState('');

  // Absence justifications state
  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [justSubject, setJustSubject] = useState('Matemática');
  const [justDate, setJustDate] = useState('');
  const [justReason, setJustReason] = useState('Atestado Médico');
  const [justDescription, setJustDescription] = useState('');
  const [isSubmittingJust, setIsSubmittingJust] = useState(false);
  const [justSuccess, setJustSuccess] = useState('');
  const [justError, setJustError] = useState('');
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Real-time Camera module states for medical certificates
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Real-time Camera module states for activity submission
  const [activityShowCamera, setActivityShowCamera] = useState(false);
  const [activityCapturedPhoto, setActivityCapturedPhoto] = useState<string | null>(null);
  const [activityCameraError, setActivityCameraError] = useState<string | null>(null);
  const activityVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const activityCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const activityStreamRef = React.useRef<MediaStream | null>(null);

  // PDF upload states for activity submission
  const [activityPdfName, setActivityPdfName] = useState<string | null>(null);
  const [activityPdfData, setActivityPdfData] = useState<string | null>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMessage('Por favor, selecione um arquivo no formato PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setActivityPdfName(file.name);
      setActivityPdfData(reader.result as string);
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo PDF.');
    };
    reader.readAsDataURL(file);
  };

  const startActivityCamera = async () => {
    setActivityCameraError(null);
    setActivityShowCamera(true);
    setActivityCapturedPhoto(null);
    try {
      let stream: MediaStream;
      try {
        // Try requesting environment camera with ideal constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (innerErr) {
        console.warn("Could not open environment-facing camera, falling back to default:", innerErr);
        // Fallback directly to any standard available camera input
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      activityStreamRef.current = stream;
      if (activityVideoRef.current) {
        activityVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Activity camera access error:", err);
      setActivityCameraError("Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso.");
      setActivityShowCamera(false);
    }
  };

  const stopActivityCamera = () => {
    if (activityStreamRef.current) {
      activityStreamRef.current.getTracks().forEach(track => track.stop());
      activityStreamRef.current = null;
    }
    setActivityShowCamera(false);
  };

  const captureActivitySnapshot = () => {
    if (activityVideoRef.current && activityCanvasRef.current) {
      const video = activityVideoRef.current;
      const canvas = activityCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setActivityCapturedPhoto(dataUrl);
        stopActivityCamera();
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    setCapturedPhoto(null);
    try {
      let stream: MediaStream;
      try {
        // Try requesting environment camera with ideal constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (innerErr) {
        console.warn("Could not open environment-facing camera, falling back to default:", innerErr);
        // Fallback directly to any standard available camera input
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (activityStreamRef.current) {
        activityStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (activeMode !== 'justificar') {
      stopCamera();
    }
  }, [activeMode]);

  const options = [
    { subject: 'Matemática', professor: 'Prof. Mailk' },
    { subject: 'Português', professor: 'Prof. Jucimar' },
    { subject: 'História', professor: 'Prof. Fábio' },
    { subject: 'Geografia', professor: 'Prof. Marcos' },
    { subject: 'Ciências', professor: 'Profª. Nébia' },
    { subject: 'Inglês', professor: 'Prof. George' },
    { subject: 'Educação Física', professor: 'Prof. Ewerton' },
    { subject: 'Estudo Orientado', professor: 'Prof. Mailk' },
    { subject: 'Educação Desportiva', professor: 'Prof. Marcos' },
    { subject: 'Iniciação Científica', professor: 'Profª. Nébia' },
    { subject: 'Ensino Religioso', professor: 'Prof. George' }
  ];

  const [reportCardGrades, setReportCardGrades] = useState<ReportCardGrade[]>([]);

  const fetchReportCardGrades = async () => {
    try {
      const res = await fetch('/api/report-card');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((g: any) => g.studentName === studentName);
        setReportCardGrades(filtered);
      }
    } catch (err) {
      console.error('Error fetching report card grades:', err);
    }
  };

  const fetchJustifications = async () => {
    try {
      const res = await fetch('/api/justifications');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((j: any) => j.studentName === studentName);
        setJustifications(filtered);
      }
    } catch (err) {
      console.error('Error fetching justifications:', err);
    }
  };

  useEffect(() => {
    fetchJustifications();
    fetchReportCardGrades();
  }, [studentName, activities, fetchTrigger]);

  const handleSubmitJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justDate || !justReason.trim() || !justDescription.trim()) {
      setJustError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const selectedOpt = options.find(o => o.subject === justSubject) || options[0];

    setIsSubmittingJust(true);
    setJustSuccess('');
    setJustError('');

    try {
      const res = await authFetch('/api/justifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          subject: selectedOpt.subject,
          professorName: selectedOpt.professor,
          date: justDate,
          reason: justReason,
          description: justDescription,
          evidencePhoto: capturedPhoto
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao enviar justificativa.');
      }

      setJustSuccess('Justificativa de falta enviada com sucesso ao professor junto com o atestado em tempo real!');
      setJustDate('');
      setJustDescription('');
      setJustReason('Atestado Médico');
      setCapturedPhoto(null);
      setFetchTrigger(prev => prev + 1);

      setTimeout(() => {
        setJustSuccess('');
        onRefresh();
      }, 1800);
    } catch (err: any) {
      setJustError(err.message || 'Erro de rede ao conectar com o servidor.');
    } finally {
      setIsSubmittingJust(false);
    }
  };

  const handleGenerateFlashcards = async (subjectName: string) => {
    setIsGeneratingCards(true);
    setCardError('');
    setFlashcards([]);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setPracticeLogs([]);
    setDeckMethod('');

    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subject: subjectName })
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar os flashcards acadêmicos de estudo ativo.');
      }

      const data = await res.json();
      if (data.success && data.deck) {
        setFlashcards(data.deck);
        setDeckMethod(data.method || 'ai');
      } else {
        throw new Error('Formato inválido recebido do servidor.');
      }
    } catch (err: any) {
      console.error(err);
      setCardError(err.message || 'Erro ao carregar flashcards.');
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const contactProfessorsList = [
    { channelId: 'mailk-ana', label: 'Prof. Mailk (Matemática)' },
    { channelId: 'jucimar-ana', label: 'Prof. Jucimar (Português)' },
    { channelId: 'fabio-ana', label: 'Prof. Fábio (História)' },
    { channelId: 'marcos-ana', label: 'Prof. Marcos (Geografia)' },
    { channelId: 'nebia-ana', label: 'Profª. Nébia (Ciências)' },
    { channelId: 'george-ana', label: 'Prof. George (Inglês)' },
    { channelId: 'ewerton-ana', label: 'Prof. Ewerton (Ed. Física)' },
    { channelId: 'mailk-orientado-ana', label: 'Prof. Mailk (Estudo Orientado)' },
    { channelId: 'marcos-desportiva-ana', label: 'Prof. Marcos (Ed. Desportiva)' },
    { channelId: 'nebia-cientifica-ana', label: 'Profª. Nébia (Inic. Científica)' },
    { channelId: 'jucimar-orientado-ana', label: 'Prof. Jucimar (Estudo Orientado)' },
    { channelId: 'george-religioso-ana', label: 'Prof. George (Ensino Religioso)' },
  ];

  const defaultSubjectsData = [
    { name: 'Português', teacher: 'Prof. Jucimar', examGrade: 9.2, frequency: 98 },
    { name: 'Matemática', teacher: 'Prof. Mailk', examGrade: 9.0, frequency: 95 },
    { name: 'História', teacher: 'Prof. Fábio', examGrade: 8.8, frequency: 92 },
    { name: 'Geografia', teacher: 'Prof. Marcos', examGrade: 9.2, frequency: 94 },
    { name: 'Ciências', teacher: 'Profª. Nébia', examGrade: 9.5, frequency: 97 },
    { name: 'Inglês', teacher: 'Prof. George', examGrade: 9.8, frequency: 100 },
    { name: 'Educação Física', teacher: 'Prof. Ewerton', examGrade: 9.5, frequency: 94 },
    { name: 'Estudo Orientado', teacher: 'Prof. Mailk', examGrade: 8.5, frequency: 98 },
    { name: 'Ensino Religioso', teacher: 'Prof. George', examGrade: 9.5, frequency: 96 },
    { name: 'Iniciação Científica', teacher: 'Profª. Nébia', examGrade: 9.0, frequency: 96 },
    { name: 'Educação Desportiva', teacher: 'Prof. Marcos', examGrade: 9.0, frequency: 95 },
  ];

  const calculateSubjectFinalGrade = (subData: typeof defaultSubjectsData[0]) => {
    // Check if there is an explicit report card grade for this subject
    const explicitGrade = reportCardGrades.find(
      (g) => g.subject.toLowerCase().trim() === subData.name.toLowerCase().trim()
    );

    const actualExamGrade = explicitGrade ? explicitGrade.examGrade : subData.examGrade;

    // 1. Find all activities of this subject
    const subActs = activities.filter(
      (act) => act.subject.toLowerCase().trim() === subData.name.toLowerCase().trim()
    );

    // 2. Extract current student's submissions
    const submissions = subActs
      .map((act) => {
        const sub = act.submissions.find((s) => s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim());
        return sub ? { ...sub, actTitle: act.title } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // 3. Separate graded submissions
    const gradedSubs = submissions.filter((s) => s.grade !== undefined && s.grade !== null);

    let homeworkGrade = actualExamGrade - 0.2; // default realistic homework grade
    let hasDynamicHomework = false;
    let pendingGradeCount = 0;

    if (submissions.length > 0) {
      if (gradedSubs.length > 0) {
        const sum = gradedSubs.reduce((acc, curr) => acc + parseFloat(curr.grade || '0'), 0);
        homeworkGrade = sum / gradedSubs.length;
        hasDynamicHomework = true;
      }
      const ungradedCount = submissions.filter((s) => s.status !== 'Corrigido').length;
      if (ungradedCount > 0) {
        pendingGradeCount = ungradedCount;
      }
    }

    // Weighted average: 60% Exam (AV1) and 40% Homework Activities (AV2)
    const finalGrade = (actualExamGrade * 0.6) + (homeworkGrade * 0.4);

    return {
      examGrade: Number(actualExamGrade.toFixed(1)),
      frequency: Number(explicitGrade ? explicitGrade.frequency : subData.frequency),
      homeworkGrade: Number(homeworkGrade.toFixed(1)),
      finalGrade: Number(finalGrade.toFixed(1)),
      submissions,
      hasDynamicHomework,
      pendingGradeCount,
      totalActivities: subActs.length
    };
  };

  // Overall Statistics for the student
  const calculatedGrades = defaultSubjectsData.map(sub => calculateSubjectFinalGrade(sub));
  const overallGpa = (calculatedGrades.reduce((sum, g) => sum + g.finalGrade, 0) / defaultSubjectsData.length).toFixed(1);
  const attendanceAvg = Math.round(calculatedGrades.reduce((sum, s) => sum + s.frequency, 0) / defaultSubjectsData.length);
  const totalHomeworkSubmitted = activities.reduce((sum, act) => {
    const hasSub = act.submissions.some(s => s.studentName === studentName);
    return sum + (hasSub ? 1 : 0);
  }, 0);

  const getPendingHomeworkCount = () => {
    return activities.filter(act => 
      !act.submissions.some(sub => sub.studentName === studentName)
    ).length;
  };

  const handleOpenSubmission = (activity: Activity) => {
    setSelectedActivity(activity);
    const existing = activity.submissions.find(s => s.studentName === studentName);
    setSubmissionContent(existing ? existing.content : '');
    setActivityCapturedPhoto(existing?.photo || null);
    setActivityPdfName(existing?.pdfName || null);
    setActivityPdfData(existing?.pdfData || null);
    setActivityShowCamera(false);
    setActivityCameraError(null);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCloseSubmission = () => {
    stopActivityCamera();
    setSelectedActivity(null);
    setSubmissionContent('');
    setActivityCapturedPhoto(null);
    setActivityPdfName(null);
    setActivityPdfData(null);
    setActivityShowCamera(false);
    setActivityCameraError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || (!submissionContent.trim() && !activityCapturedPhoto && !activityPdfData)) return;

    const isLate = new Date() > new Date(selectedActivity.dueDate);
    if (isLate) {
      setErrorMessage('O prazo limite para entrega desta atividade já passou (expirou). Envio bloqueado.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await authFetch(`/api/activities/${selectedActivity.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          content: submissionContent,
          photo: activityCapturedPhoto || undefined,
          pdfName: activityPdfName || undefined,
          pdfData: activityPdfData || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao enviar atividade.');
      }

      setSuccessMessage('Sua atividade foi enviada com sucesso para o professor!');
      setTimeout(() => {
        handleCloseSubmission();
        onRefresh();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formateDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Helper to determine the status of the activity for the student Ana Souza
  const getStudentActivityStatus = (activity: Activity) => {
    const sub = activity.submissions.find(s => s.studentName === studentName);
    const isLate = new Date() > new Date(activity.dueDate);
    if (!sub) {
      if (isLate) {
        return { label: 'Prazo Expirado', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      }
      return { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (sub.status === 'Corrigido') return { label: 'Corrigido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: 'Entregue', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  return (
    <div id="student-dashboard" className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-500/30 text-white font-semibold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
              Portal do Aluno
            </span>
            {currentUser && (
              <span className="bg-white/20 text-white font-black text-xs px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                <User className="h-3.5 w-3.5" />
                <span>Matrícula: {currentUser.matricula}</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Estude, envie atividades e tire suas dúvidas!</h2>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Bem-vindo(a), <strong className="text-white font-bold">{studentName}</strong>! Veja abaixo suas atividades pendentes, analise suas notas ou use as guias adicionais de Chat e Tutor de Estudos IA.
          </p>
        </div>

        {/* Account controls / Logout Button */}
        <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {currentUser && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer border border-rose-400/40 active:scale-95 shrink-0"
              title="Sair da sua conta de estudante"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Conta ({currentUser.name.split(' ')[0]})</span>
            </button>
          ) : (
            onNavigateToAuth && (
              <button
                type="button"
                onClick={() => onNavigateToAuth('aluno', 'login')}
                className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <KeyRound className="h-4 w-4 text-emerald-700" />
                <span>Entrar com sua Matrícula</span>
              </button>
            )
          )}
        </div>

        <div className="absolute right-0 bottom-0 opacity-15 translate-x-1/4 translate-y-1/4 transform pointer-events-none scale-150">
          <FileText className="h-48 w-48 text-white" />
        </div>
      </div>

      {/* Mode Tab Switcher */}
      <div className="hidden md:flex flex-row bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-full max-w-full overflow-x-auto border border-slate-200/50 dark:border-slate-850 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMode('activities')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeMode === 'activities'
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs border border-slate-200/40 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>Atividades</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold ml-0.5">
            {getPendingHomeworkCount() > 0 ? `${getPendingHomeworkCount()} pendentes` : 'em dia'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('boletim')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeMode === 'boletim'
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs border border-slate-200/40 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <Award className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Notas de Todas as Matérias (Boletim)</span>
          <span className="lg:hidden">Boletim e Notas</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('justificar')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeMode === 'justificar'
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs border border-slate-200/40 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Justificar Faltas</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('flashcards')}
          className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeMode === 'flashcards'
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs border border-slate-200/40 dark:border-slate-805'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Estudo Ativo (Flashcards)</span>
          <span className="lg:hidden">Flashcards IA</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Panel Column */}
        <div className="lg:col-span-2 space-y-4">
          {activeMode === 'activities' && (
            <>
              {/* Highlighted Banner for Grades assigned to current student */}
              {(() => {
                const studentGradesList = activities.flatMap((act) => {
                  const sub = act.submissions.find(
                    (s) => s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim()
                  );
                  if (sub && sub.grade !== undefined && sub.grade !== null && sub.grade !== '') {
                    return [{
                      activityId: act.id,
                      activityTitle: act.title,
                      subject: act.subject,
                      createdBy: act.createdBy,
                      turma: act.turma,
                      grade: sub.grade,
                      feedback: sub.feedback,
                      submittedAt: sub.submittedAt,
                      status: sub.status
                    }];
                  }
                  return [];
                });

                if (studentGradesList.length === 0) return null;

                return (
                  <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500 shrink-0" />
                        <span>Notas Lançadas para Você ({studentName})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveMode('boletim')}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>Ver Boletim Completo</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {studentGradesList.map((gItem) => (
                        <div
                          key={gItem.activityId}
                          className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 p-4 rounded-2xl shadow-3xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                              {gItem.subject}
                            </span>
                            <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-3xs">
                              Nota: {gItem.grade}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {gItem.activityTitle}
                          </h4>

                          {gItem.feedback && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic font-medium bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              "{gItem.feedback}"
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 pt-1">
                            <span>{gItem.createdBy}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Nota Registrada</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Quadro de Atividades Escolares
                </h3>
                <button 
                  onClick={onRefresh}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Atualizar Quadro
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-4">
                {activities.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center text-gray-500">
                    Ainda não há nenhuma atividade publicada pelos professores.
                  </div>
                ) : (
                  activities.map((activity) => {
                    const status = getStudentActivityStatus(activity);
                    const submission = activity.submissions.find(s => s.studentName === studentName);
                    const isActivityLate = new Date() > new Date(activity.dueDate);
                    
                    return (
                      <motion.div
                        id={`student-activity-card-${activity.id}`}
                        key={activity.id}
                        layoutId={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
                      >
                        <div>
                          {/* Badge / Header info */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                {activity.subject}
                              </span>
                              {activity.turma && (
                                <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                  {activity.turma.split(' - ')[0]}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {isActivityLate && (
                                <span className="bg-rose-150 text-rose-700 border border-rose-300 text-[9px] font-black px-2 py-0.5 rounded uppercase leading-none">
                                  Bloqueada
                                </span>
                              )}
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-gray-950 mb-1 leading-snug">
                            {activity.title}
                          </h4>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 md:line-clamp-3 mb-4 font-normal">
                            {activity.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              Prazo: {formateDate(activity.dueDate)}
                            </span>
                            <span>•</span>
                            <span>{activity.createdBy}</span>
                          </div>
                        </div>

                        {/* Footer actions & Feedback section */}
                        <div className="border-t border-gray-100 dark:border-slate-800/80 pt-4 mt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          {submission && submission.grade && (
                            <div className="bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 flex-1 mr-2 shadow-xs">
                              <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-black text-emerald-850 dark:text-emerald-350">
                                  <span>Atividade Corrigida</span>
                                  <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 text-[10px] font-black leading-none">
                                    Nota {submission.grade}
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-750 dark:text-emerald-300 italic mt-1.5 font-medium leading-relaxed">
                                  "{submission.feedback || 'Excelente trabalho!'}"
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleOpenSubmission(activity)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                              submission 
                                ? (isActivityLate 
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200') 
                                : (isActivityLate 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs')
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {submission 
                              ? (isActivityLate ? 'Ver Sua Entrega (Prazo Expirado)' : 'Atualizar Entrega') 
                              : (isActivityLate ? 'Prazo Expirado (Bloqueado)' : 'Enviar Resolução')}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeMode === 'boletim' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveMode('activities')}
                  className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/55 rounded-xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-all font-bold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Voltar para Atividades</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  Boletim de Notas
                </h3>
                <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded-md">1º Bimestre</span>
              </div>

              {/* Stats overview cards inside the boletim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xs">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block mb-0.5">Média Escolar Geral</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-700">{overallGpa}</span>
                    <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Meta &gt;= 6.0</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xs">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block mb-0.5">Atividades Entregues</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-teal-700">{totalHomeworkSubmitted}</span>
                    <span className="text-[9px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Em dia</span>
                  </div>
                </div>
              </div>

              {/* Gráfico de Desempenho Escolar (Recharts) */}
              <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-xs space-y-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Painel Visual de Evolução das Notas por Disciplina
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">A linha vermelha horizontal indica a nota mínima recomendada para aprovação direta (6.0)</p>
                </div>
                <div className="h-64 sm:h-80 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={defaultSubjectsData.map((sub) => {
                        const details = calculateSubjectFinalGrade(sub);
                        return {
                          name: sub.name,
                          'Nota Final': details.finalGrade,
                          'Prova Escrita': details.examGrade,
                          'Atividades de Casa': details.homeworkGrade
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} 
                        angle={-30} 
                        textAnchor="end" 
                        interval={0}
                        height={60}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                        ticks={[0, 2, 4, 6, 8, 10]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '12px', 
                          color: '#fff', 
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }} 
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <ReferenceLine 
                        y={6.0} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: 'Média (6.0)', position: 'insideTopLeft', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} 
                      />
                      <Bar dataKey="Nota Final" fill="#10b981" radius={[4, 4, 0, 0]} name="Nota Final Calculada" />
                      <Bar dataKey="Prova Escrita" fill="#6366f1" radius={[4, 4, 0, 0]} name="Prova Escrita (AV1)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subjects detailed listing */}
              <div className="space-y-3">
                {defaultSubjectsData.map((sub) => {
                  const details = calculateSubjectFinalGrade(sub);
                  
                  const statusInfo = details.finalGrade >= 6.0 
                    ? { label: 'Aprovada Média', pill: 'bg-emerald-50 text-emerald-700 border-emerald-150', color: 'text-emerald-700' }
                    : details.finalGrade >= 5.0 
                      ? { label: 'Em Recuperação', pill: 'bg-amber-50 text-amber-700 border-amber-150', color: 'text-amber-700' }
                      : { label: 'Pendente', pill: 'bg-rose-50 text-rose-700 border-rose-150', color: 'text-rose-700' };

                  return (
                    <div key={sub.name} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-3xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left side: Subject status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-extrabold text-slate-900 text-sm">{sub.name}</h4>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${statusInfo.pill}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-550 font-medium">Língua e Conteúdo Ministrado por: <strong className="text-gray-700 font-bold">{sub.teacher}</strong></p>
                      </div>

                      {/* Right side: Detailed notes grade visual */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-105 flex items-center justify-between gap-4 sm:w-64">
                        <div className="text-[10px] stroke-slate-400 space-y-1 font-medium flex-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Prova Escrita:</span>
                            <strong className="text-slate-800">{details.examGrade.toFixed(1)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Atividades Casa:</span>
                            <strong className="text-slate-800 flex items-center gap-1">
                              {details.pendingGradeCount > 0 && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" title="Feedback pendente"></span>
                              )}
                              {details.homeworkGrade.toFixed(1)}
                            </strong>
                          </div>
                        </div>

                        {/* Split line */}
                        <div className="w-[1px] h-8 bg-gray-200" />

                        {/* Calculated Bimestral Média */}
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black tracking-wider text-gray-400 block mb-0.5">Nota Final</span>
                          <span className={`text-base font-black ${statusInfo.color}`}>
                            {details.finalGrade.toFixed(1)}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeMode === 'justificar' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveMode('activities')}
                  className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/55 rounded-xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-all font-bold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Voltar para Atividades</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Justificar Falta de Aula ao Professor
                </h3>
                <button 
                  onClick={() => setFetchTrigger(p => p + 1)}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
                >
                  Atualizar Lista
                </button>
              </div>

              {/* Form Card */}
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs bg-gradient-to-br from-white to-emerald-50/10">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Enviar Nova Justificativa de Falta
                </h4>
                <form onSubmit={handleSubmitJustification} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Disciplina & Professor Alvo
                      </label>
                      <select
                        value={justSubject}
                        onChange={(e) => setJustSubject(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        {options.map((opt) => (
                          <option key={opt.subject} value={opt.subject}>
                            {opt.subject} — {opt.professor}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Data da Falta / Ausência
                      </label>
                      <input
                        type="date"
                        required
                        value={justDate}
                        onChange={(e) => setJustDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Motivo / Categoria Principal
                    </label>
                    <select
                      value={justReason}
                      onChange={(e) => setJustReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="Atestado Médico (Doença)">Atestado Médico / Problema de Saúde</option>
                      <option value="Consulta Odontológica">Consulta Odontológica</option>
                      <option value="Compromisso Familiar Urgente">Compromisso Familiar Urgente</option>
                      <option value="Imprevisto de Transporte / Trânsito">Imprevisto de Transporte / Trânsito</option>
                      <option value="Outro Motivo Relevante">Outro Motivo Relevante (Descrever abaixo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Escreva a Justificativa Detalhada
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={justDescription}
                      onChange={(e) => setJustDescription(e.target.value)}
                      placeholder="Descreva detalhadamente o ocorrido. Mencione se possui atestado para apresentar presencialmente ou se foi um imprevisto específico..."
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {/* Real-time Medical Certificate Camera Capture Section */}
                  <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider">Atestado Médico (Câmera em Tempo Real)</span>
                        <p className="text-[10px] text-gray-500 font-medium font-sans">Adicione o atestado tirando uma foto instantânea com sua webcam</p>
                      </div>
                      
                      {!showCamera && !capturedPhoto && (
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Tirar Foto do Atestado
                        </button>
                      )}
                    </div>

                    {cameraError && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-medium">
                        {cameraError}
                      </div>
                    )}

                    {/* Hidden canvas for taking snapshot */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera view screen */}
                    {showCamera && (
                      <div className="space-y-2">
                        <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden border border-slate-300 bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[9px] text-white font-extrabold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            CÂMERA ATIVA
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={captureSnapshot}
                            className="flex-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Camera className="h-4 w-4" />
                            Tirar Foto agora
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Render captured preview */}
                    {capturedPhoto && (
                      <div className="space-y-2 max-w-sm mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-white shadow-2xs">
                          <img 
                            src={capturedPhoto} 
                            alt="Atestado Capturado" 
                            className="w-full max-h-48 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setCapturedPhoto(null)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-full transition-colors cursor-pointer"
                            title="Remover Foto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-emerald-950/85 text-white text-[9px] font-semibold text-center p-1 uppercase tracking-wider">
                            Foto Capturada
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-700 font-bold"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Tirar outra foto
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {justSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center gap-2 shadow-3xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold">{justSuccess}</span>
                    </div>
                  )}

                  {justError && (
                    <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs flex items-center gap-2 shadow-3xs">
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span className="font-bold">{justError}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingJust || !justDate || !justDescription.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isSubmittingJust ? 'Enviando...' : 'Enviar Justificativa de Falta'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pt-2">
                  Histórico de Justificativas Enviadas
                </h4>

                {justifications.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-gray-400 text-xs italic shadow-3xs">
                    Nenhuma justificativa enviada anteriormente ou cadastrada.
                  </div>
                ) : (
                  justifications.map((just) => {
                    const statusStyle = 
                      just.status === 'Aceito' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      just.status === 'Recusado' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                      'bg-amber-50 border-amber-200 text-amber-700';

                    return (
                      <motion.div
                        key={just.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs flex flex-col gap-3 hover:shadow-2xs transition-all border-l-4 border-l-indigo-500"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded border border-slate-200 leading-none uppercase">
                              {just.subject}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              {just.professorName}
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                            {just.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-900 font-bold">
                            <span>{just.reason}</span>
                            <span className="text-[10px] text-gray-500 font-normal">Falta em: {just.date.split('-').reverse().join('/')}</span>
                          </div>
                          <p className="text-xs text-gray-650 font-normal leading-relaxed">
                            {just.description}
                          </p>
                        </div>

                        {just.evidencePhoto && (
                          <div className="space-y-1 bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl max-w-xs">
                            <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-wider">Atestado Médico Anexado:</span>
                            <div className="rounded-lg overflow-hidden border border-slate-200 bg-white max-h-32 flex items-center justify-center">
                              <img 
                                src={just.evidencePhoto} 
                                alt="Atestado Anexado" 
                                className="object-contain max-h-32 w-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}

                        {just.feedback && (
                          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs text-slate-700 italic border-l-2 border-l-emerald-400">
                            <strong className="text-slate-900 not-italic block font-bold text-[10px] mb-0.5">Resposta do Professor:</strong>
                            "{just.feedback}"
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeMode === 'flashcards' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveMode('activities')}
                  className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/55 rounded-xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-all font-bold cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Voltar para Atividades</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
                    Estudo Ativo: Flashcards Inteligentes (Estilo Anki)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-medium">
                    Escolha uma disciplina para gerar instantaneamente 5 cartões com conceitos cruciais recomendados pela IA.
                  </p>
                </div>
              </div>

              {/* Selector and Generator Action */}
              {flashcards.length === 0 && !isGeneratingCards && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs space-y-5 bg-gradient-to-br from-white to-emerald-50/10">
                  <div className="max-w-md">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Selecione a Disciplina para Praticar:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={flashcardSubject}
                        onChange={(e) => setFlashcardSubject(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        {defaultSubjectsData.map((sub) => (
                          <option key={sub.name} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => handleGenerateFlashcards(flashcardSubject)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        Gerar Baralho IA
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                      <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-2">1</span>
                      <h4 className="text-xs font-bold text-slate-800">Memorização Ativa</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Forçar o cérebro a recuperar respostas de cabeça em vez de apenas reler as anotações passivamente.</p>
                    </div>
                    <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                      <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">2</span>
                      <h4 className="text-xs font-bold text-slate-800">Análise de IA Especializada</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">EduMind AI identifica conceitos recorrentes que mais caem em provas escolares do Ensino Fundamental.</p>
                    </div>
                    <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
                      <span className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-2">3</span>
                      <h4 className="text-xs font-bold text-slate-800">Auto-avaliação Eficiente</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Avalie o seu grau de domínio (Fácil, Médio, Difícil) para focar no que você realmente precisa estudar.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loader */}
              {isGeneratingCards && (
                <div className="bg-white border border-gray-150 rounded-3xl p-12 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
                    <Sparkles className="h-5 w-5 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">EduMind AI está gerando seu baralho de estudos...</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Analisando currículo da disciplina de {flashcardSubject} e estruturando perguntas cruciais.</p>
                  </div>
                </div>
              )}

              {/* Card practicing Arena */}
              {flashcards.length > 0 && currentCardIndex < flashcards.length && (
                <div className="space-y-4">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-100/80 px-4 py-2.5 rounded-xl border border-slate-200/50">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      Prática de {flashcardSubject}
                    </span>
                    <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-md text-[10px] font-black">
                      Cartão {currentCardIndex + 1} de {flashcards.length}
                    </span>
                  </div>

                  {/* Flashcard Component */}
                  <div className="min-h-[220px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${currentCardIndex}-${isCardFlipped}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className={`w-full min-h-[200px] border rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer select-none transition-shadow duration-200 relative overflow-hidden shadow-xs hover:shadow-md flashcard-card-container ${
                          isCardFlipped 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : 'bg-white border-slate-200/80'
                        }`}
                      >
                        {/* Decorative watermark */}
                        <div className="absolute right-4 bottom-4 opacity-5 transform translate-x-1/4 translate-y-1/4 pointer-events-none">
                          <Sparkles className="h-44 w-44 text-slate-700" />
                        </div>

                        {/* Top badge */}
                        <div className="flex items-center justify-between relative z-10">
                          <span className="flashcard-badge-top-label text-[10px] font-display font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                            {isCardFlipped ? 'VERSO - RESPOSTA IA' : 'FRENTE - PERGUNTA ESTUDO'}
                          </span>
                          <span className="flashcard-badge-source text-[9px] font-mono text-slate-450 dark:text-slate-500 font-semibold bg-slate-100 dark:bg-slate-900/60 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            {deckMethod === 'ai' ? 'Gerado por IA' : 'Baralho Padrão'}
                          </span>
                        </div>

                        {/* Main Text Content */}
                        <div className="my-6 text-center max-w-lg mx-auto relative z-10">
                          {!isCardFlipped ? (
                            <h3 className="flashcard-question-text text-lg sm:text-xl md:text-2xl font-display font-bold text-slate-850 dark:text-white leading-relaxed">
                              {flashcards[currentCardIndex].question}
                            </h3>
                          ) : (
                            <div className="space-y-4">
                              <h3 className="flashcard-answer-text text-lg sm:text-xl md:text-2xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 leading-relaxed">
                                {flashcards[currentCardIndex].answer}
                              </h3>
                              {flashcards[currentCardIndex].explanation && (
                                <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-500/20 p-3.5 rounded-2xl max-w-md mx-auto">
                                  <p className="flashcard-explanation-text text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-sans font-medium leading-relaxed italic">
                                    "{flashcards[currentCardIndex].explanation}"
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Click feedback help */}
                        <div className="flashcard-tip-footer text-center text-[10px] font-display text-slate-500 dark:text-slate-400 font-extrabold tracking-widest uppercase relative z-10">
                          {isCardFlipped ? 'Toque para rever a pergunta' : 'Toque no cartão para revelar a resposta'}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Control / Feedback Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                    {!isCardFlipped ? (
                      <button
                        type="button"
                        onClick={() => setIsCardFlipped(true)}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-8 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        Revelar Resposta
                      </button>
                    ) : (
                      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPracticeLogs(prev => [...prev, 'hard']);
                            setIsCardFlipped(false);
                            setTimeout(() => {
                              setCurrentCardIndex(prev => prev + 1);
                            }, 250);
                          }}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          🔴 Errei / Difícil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPracticeLogs(prev => [...prev, 'medium']);
                            setIsCardFlipped(false);
                            setTimeout(() => {
                              setCurrentCardIndex(prev => prev + 1);
                            }, 250);
                          }}
                          className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          🟡 Lembrava Parcial
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPracticeLogs(prev => [...prev, 'easy']);
                            setIsCardFlipped(false);
                            setTimeout(() => {
                              setCurrentCardIndex(prev => prev + 1);
                            }, 250);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          🟢 Acertei / Fácil
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dots progress visual */}
                  <div className="flex justify-center gap-1.5 pt-2">
                    {flashcards.map((_, idx) => {
                      let color = 'bg-slate-200';
                      if (idx < practiceLogs.length) {
                        const score = practiceLogs[idx];
                        if (score === 'easy') color = 'bg-emerald-500';
                        else if (score === 'medium') color = 'bg-amber-500';
                        else color = 'bg-rose-500';
                      } else if (idx === currentCardIndex) {
                        color = 'bg-slate-800 scale-125';
                      }
                      return (
                        <div key={idx} className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${color}`} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Practice Completed Screen */}
              {flashcards.length > 0 && currentCardIndex >= flashcards.length && (
                <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-6 bg-gradient-to-br from-white to-emerald-50/10">
                  <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto border border-emerald-200 animate-bounce">
                    🎉
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900">Estudo Ativo Concluído!</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-normal">
                      Excelente trabalho! Forçar o cérebro a relembrar os conceitos ativa o fortalecimento sináptico e garante notas melhores nas avaliações.
                    </p>
                  </div>

                  {/* Statistics breakdown */}
                  <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl">
                      <span className="block text-lg font-black text-emerald-800">
                        {practiceLogs.filter(l => l === 'easy').length}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-emerald-650">Fácil / Memorizado</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl">
                      <span className="block text-lg font-black text-amber-800">
                        {practiceLogs.filter(l => l === 'medium').length}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-amber-650">Falta Fixar</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl">
                      <span className="block text-lg font-black text-rose-800">
                        {practiceLogs.filter(l => l === 'hard').length}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-rose-650">Preciso Revisar</span>
                    </div>
                  </div>

                  {/* Learning Tip Card */}
                  <div className="max-w-sm mx-auto bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800">Dica da Ciência do Aprendizado:</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 font-normal">
                        Para combater a "Curva do Esquecimento", revise este mesmo baralho em <strong>3 dias</strong> e depois em <strong>7 dias</strong>. Isso consolida as memórias de longo prazo!
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleGenerateFlashcards(flashcardSubject);
                      }}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Praticar Novamente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlashcards([]);
                        setCurrentCardIndex(0);
                        setPracticeLogs([]);
                      }}
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      Outra Disciplina
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar help */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-5 border border-indigo-800 shadow-sm">
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-2">Suporte Rápido</h4>
            <h3 className="text-base font-extrabold mb-3">Está com dificuldades?</h3>
            <p className="text-xs text-indigo-150 leading-relaxed font-normal mb-4">
              Você pode tirar suas dúvidas escolares em tempo real com nossa Inteligência Artificial acadêmica segura, ou enviar uma mensagem direta para os professores do colégio pelo chat interno.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Selecione o Canal / Professor:</label>
                <select
                  value={selectedContactChannel}
                  onChange={(e) => setSelectedContactChannel(e.target.value)}
                  className="w-full bg-indigo-950/70 border border-indigo-700 text-indigo-100 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {contactProfessorsList.map((item) => (
                    <option key={item.channelId} value={item.channelId} className="bg-indigo-950 text-indigo-150 font-medium">
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToChat(selectedContactChannel)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-500 shadow-md shadow-black/20"
              >
                <MessageCircle className="h-4 w-4" />
                Mandar Mensagem Direta
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Submission Form Modal Frame */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5">
                <span className="text-xs opacity-80 uppercase font-black tracking-wider">{selectedActivity.subject}</span>
                <h3 className="text-lg font-bold mt-1">{selectedActivity.title}</h3>
                <p className="text-xs text-emerald-100 mt-2 line-clamp-2">{selectedActivity.description}</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {(() => {
                  const submission = selectedActivity.submissions.find(s => s.studentName === studentName);
                  const isCorrected = submission?.status === 'Corrigido';
                  const isModalLate = (new Date() > new Date(selectedActivity.dueDate)) || isCorrected;
                  return (
                    <>
                      {isCorrected && (
                        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3 shadow-xs">
                          <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-black text-emerald-850 dark:text-emerald-350 uppercase tracking-wider">Atividade Corrigida pelo Professor</span>
                              <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 px-3 py-1 rounded-xl text-xs font-black border border-emerald-300 dark:border-emerald-800 shadow-3xs leading-none">
                                Nota: {submission.grade}
                              </span>
                            </div>
                            <div className="mt-3">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Comentários e Orientações Docentes:</span>
                              <div className="bg-white/75 dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-slate-800 italic text-[11px] font-mono leading-relaxed text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                                "{submission.feedback || 'Excelente trabalho!'}"
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                          Escreva sua Resposta / Resolução Acadêmica {isCorrected ? <span className="text-emerald-600 font-extrabold dark:text-emerald-400">(Avaliada & Nota Registrada)</span> : isModalLate && <span className="text-rose-600 font-extrabold dark:text-rose-400">(Bloqueada - Prazo Expirado)</span>}
                        </label>
                        <textarea
                          required={!activityCapturedPhoto && !activityPdfData}
                          rows={6}
                          value={submissionContent}
                          onChange={(e) => !isModalLate && setSubmissionContent(e.target.value)}
                          readOnly={isModalLate}
                          placeholder={isCorrected ? "Esta atividade já foi avaliada e a nota foi lançada. Nenhuma alteração pode ser feita." : (isModalLate ? "O prazo para envio de respostas para esta atividade já expirou. Nenhuma alteração pode ser feita." : "Digite sua resolução de forma detalhada ou anexe um arquivo PDF...")}
                          className={`w-full border rounded-2xl p-4 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${isModalLate ? 'bg-slate-100 dark:bg-slate-900 border-slate-350 dark:border-slate-850 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-gray-50/50 border-gray-250'}`}
                        />
                        <p className="text-[11px] mt-1 font-medium text-gray-500">
                          {isCorrected ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 inline flex-shrink-0" />
                              Esta atividade escolar já foi corrigida, avaliada e integrada ao seu boletim de notas.
                            </span>
                          ) : isModalLate ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 inline flex-shrink-0" />
                              O prazo limite para esta entrega expirou em: {formateDate(selectedActivity.dueDate)}. O envio está permanentemente bloqueado.
                            </span>
                          ) : (
                            "Sua entrega poderá conter texto, foto da sua resolução manuscrita, arquivo PDF, ou ambos."
                          )}
                        </p>
                      </div>

                      {/* PDF Upload Section */}
                      {!isModalLate && (
                        <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider">Arquivo PDF de Resolução</span>
                              <p className="text-[10px] text-gray-500 font-medium font-sans">Anexe o documento final de sua atividade no formato .pdf</p>
                            </div>
                            
                            {!activityPdfName && (
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-3xs">
                                <Upload className="h-3.5 w-3.5 animate-pulse" />
                                Escolher PDF
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={handlePdfUpload}
                                />
                              </label>
                            )}
                          </div>

                          {activityPdfName && (
                            <div className="relative max-w-sm mx-auto rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">{activityPdfName}</p>
                                  <p className="text-[9px] text-emerald-750 font-bold">Arquivo PDF Pronto para Entrega</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivityPdfName(null);
                                  setActivityPdfData(null);
                                }}
                                className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-xs cursor-pointer"
                                title="Excluir PDF"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display PDF on late/readOnly view if exists */}
                      {activityPdfName && (isModalLate || isCorrected) && (
                        <div className="space-y-2 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                          <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Documento PDF Entregue</span>
                          <div className="max-w-sm mx-auto rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <FileText className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{activityPdfName}</p>
                                <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">
                                  PDF Recebido pelo Professor
                                </span>
                              </div>
                            </div>
                            {activityPdfData && (
                              <a
                                href={activityPdfData}
                                download={activityPdfName}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all shadow-3xs"
                              >
                                Baixar
                              </a>
                            )}
                          </div>
                        </div>
                      )}
 
                       {/* Real-time Camera Capture Section for school assignments */}
                       {!isModalLate && (
                         <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                           <div className="flex items-center justify-between">
                             <div>
                               <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider">Foto da Resolução (Câmera em Tempo Real)</span>
                               <p className="text-[10px] text-gray-500 font-medium font-sans">Anexe uma imagem nítida tirada instantaneamente pela webcam</p>
                             </div>
                             
                             {!activityShowCamera && !activityCapturedPhoto && (
                               <button
                                 type="button"
                                 onClick={startActivityCamera}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-3xs"
                               >
                                 <Camera className="h-3.5 w-3.5" />
                                 Tirar Foto
                               </button>
                             )}
                           </div>
 
                           {activityCameraError && (
                             <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-medium">
                               {activityCameraError}
                             </div>
                           )}
 
                           {/* Hidden canvas for taking snapshot */}
                           <canvas ref={activityCanvasRef} className="hidden" />
 
                           {/* Camera live screen */}
                           {activityShowCamera && (
                             <div className="space-y-2">
                               <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-300 bg-black">
                                 <video 
                                   ref={activityVideoRef} 
                                   autoPlay 
                                   playsInline 
                                   muted
                                   className="w-full h-full object-cover"
                                 />
                                 <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[9px] text-white font-extrabold flex items-center gap-1">
                                   <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                   CÂMERA ATIVA
                                 </div>
                               </div>
 
                               <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                                 <button
                                   type="button"
                                   onClick={stopActivityCamera}
                                   className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                 >
                                   Cancelar
                                 </button>
                                 <button
                                   type="button"
                                   onClick={captureActivitySnapshot}
                                   className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                 >
                                   <Camera className="h-3.5 w-3.5" />
                                   Capturar
                                 </button>
                               </div>
                             </div>
                           )}
 
                           {/* Photo preview after successful capture */}
                           {activityCapturedPhoto && !activityShowCamera && (
                             <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-2 flex flex-col items-center">
                               <img 
                                 src={activityCapturedPhoto} 
                                 alt="Foto Capturada" 
                                 className="max-h-48 rounded-lg object-contain shadow-3xs"
                                 referrerPolicy="no-referrer"
                               />
                               <button
                                 type="button"
                                 onClick={() => setActivityCapturedPhoto(null)}
                                 className="absolute top-4 right-4 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-xs cursor-pointer"
                                 title="Excluir Foto"
                               >
                                 <Trash2 className="h-3.5 w-3.5" />
                               </button>
                               <span className="text-[10px] text-emerald-800 font-extrabold mt-2 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-150">
                                 Foto da Resolução Anexada!
                               </span>
                             </div>
                           )}
                         </div>
                       )}
 
                       {/* Display captured photo on late/readOnly view if exists */}
                       {isModalLate && activityCapturedPhoto && (
                         <div className="space-y-2 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                           <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Foto de Resolução Cadastrada</span>
                           <div className="max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-2 flex flex-col items-center">
                             <img 
                               src={activityCapturedPhoto} 
                               alt="Foto da Atividade" 
                               className="max-h-48 rounded-lg object-contain"
                               referrerPolicy="no-referrer"
                             />
                           </div>
                         </div>
                       )}

                      {successMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                          <span className="font-semibold">{successMessage}</span>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="font-semibold">{errorMessage}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCloseSubmission}
                          disabled={isSubmitting}
                          className="px-4 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-350 rounded-xl text-xs font-bold hover:bg-gray-55 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Cancelar / Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || (!submissionContent.trim() && !activityCapturedPhoto && !activityPdfData) || isModalLate}
                          className={`px-5 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer ${isModalLate ? (isCorrected ? 'bg-emerald-600/40 border border-emerald-500/20 text-white/50 cursor-not-allowed shadow-none' : 'bg-rose-450 cursor-not-allowed opacity-60') : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                          {isCorrected ? (
                            <>
                              <Award className="h-3 w-3" />
                              Atividade Avaliada
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              {isModalLate ? 'Entrega Bloqueada' : (isSubmitting ? 'Enviando...' : 'Confirmar Entrega')}
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
