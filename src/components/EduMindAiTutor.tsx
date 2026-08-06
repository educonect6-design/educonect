/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, GraduationCap, AlertTriangle, ShieldCheck, HelpCircle, BookOpen, Clock, Camera, Trash2, Image, Minimize2, Maximize2, Upload, MoreVertical, Menu, X, RotateCcw, Info, Settings, ChevronRight, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface AiMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isDeclined?: boolean; // True if was filtered out of scope
}

interface EduMindAiTutorProps {
  currentRole: 'professor' | 'aluno';
  initialQuestion?: string | null;
  onClearInitialQuestion?: () => void;
  initialPhoto?: string | null;
  onClearInitialPhoto?: () => void;
  initialCameraOpen?: boolean;
  onClearInitialCameraOpen?: () => void;
  onBackToDashboard?: () => void;
}

export default function EduMindAiTutor({ 
  currentRole, 
  initialQuestion, 
  onClearInitialQuestion,
  initialPhoto,
  onClearInitialPhoto,
  initialCameraOpen,
  onClearInitialCameraOpen,
  onBackToDashboard
}: EduMindAiTutorProps) {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Olá! Sou o **EduMind AI**, seu **Tutor de Estudos Inteligente**. 

Fui desenvolvido com altos padrões de segurança para responder **exclusivamente a dúvidas acadêmicas, escolares e de estudos** (como Matemática, Física, Biologia, Redação, Língua Portuguesa e História).

Como posso te ajudar a compreender as suas matérias hoje? Escolha um exemplo abaixo ou digite sua pergunta!`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mobile, Sidebar & Fullscreen states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isThreeDotsOpen, setIsThreeDotsOpen] = useState(false);
  const isFullscreen = true; // Permanent Fullscreen Mode
  const [studyTip, setStudyTip] = useState<string | null>(null);
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'suggestions' | 'stats' | 'tips'>('suggestions');

  // ESC key listener to return to dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBackToDashboard) {
        onBackToDashboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToDashboard]);

  // Pomodoro states
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroType, setPomodoroType] = useState<'work' | 'break'>('work');

  // Set default sidebar state based on screen size on mount
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, []);

  // Pomodoro Timer logic
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroActive) {
      interval = setInterval(() => {
        if (pomodoroSeconds > 0) {
          setPomodoroSeconds(pomodoroSeconds - 1);
        } else if (pomodoroSeconds === 0) {
          if (pomodoroMinutes === 0) {
            // Timer finished!
            if (pomodoroType === 'work') {
              setStudyTip('🍅 Excelente ciclo de foco! Hora de uma pausa de 5 minutos.');
              setPomodoroType('break');
              setPomodoroMinutes(5);
            } else {
              setStudyTip('💪 Pausa finalizada! Vamos focar por mais 25 minutos.');
              setPomodoroType('work');
              setPomodoroMinutes(25);
            }
            setIsPomodoroActive(false);
          } else {
            setPomodoroMinutes(pomodoroMinutes - 1);
            setPomodoroSeconds(59);
          }
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroMinutes, pomodoroSeconds, pomodoroType]);
  
  // Camera, Webcam & Image analysis states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      // Let React render video frame element before attaching srcObject stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Video play interrupted:', e));
        }
      }, 150);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Não foi possível iniciar a câmera em tempo real (restrições de permissões do navegador ou iframe). Mas você pode enviar uma foto usando o seletor de arquivos de imagem!'
      );
      setIsCameraActive(true); // Keeps panel active so the student can capture via system upload trigger
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
        setIsCameraActive(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Turn off hardware camera on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested high-fidelity academic starters
  const academicSuggestions = [
    { text: 'Explique a fórmula de Bhaskara passo a passo', category: 'Matemática' },
    { text: 'Qual a diferença entre Mitose e Meiose?', category: 'Biologia' },
    { text: 'Escreva uma introdução modelo para redação sobre IA', category: 'Redação' },
    { text: 'Como calcular o tempo na queda livre de Física?', category: 'Física' }
  ];

  const studyTips = [
    "🍅 Técnica Pomodoro: Estude focado por 25 minutos e descanse 5 minutos. Repita 4 vezes e faça uma pausa maior.",
    "🗣️ Método Feynman: Explique o que aprendeu em voz alta com suas próprias palavras para identificar falhas no seu aprendizado.",
    "🧠 Revisão Ativa: Teste-se fazendo perguntas sobre o conteúdo estudado em vez de apenas ler ou sublinhar.",
    "🗺️ Mapas Mentais: Conecte ideias-chave desenhando esquemas visuais simples para facilitar a memorização do cérebro.",
    "📆 Prática Distribuída: Estudar um pouco da matéria todo dia é muito mais eficiente do que tentar acumular tudo na véspera da prova.",
    "✍️ Escreva à mão: Resumos escritos à mão ajudam a processar e reter a informação de forma mais profunda.",
    "💧 Hidratação e Sono: O cérebro precisa de água e pelo menos 7-8 horas de sono para consolidar memórias de longo prazo!"
  ];

  const showRandomStudyTip = () => {
    const randomIdx = Math.floor(Math.random() * studyTips.length);
    setStudyTip(studyTips[randomIdx]);
    setIsThreeDotsOpen(false);
  };

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle cross-component pre-filled questions or photos
  useEffect(() => {
    if (initialQuestion) {
      handleAskQuestion(initialQuestion);
      if (onClearInitialQuestion) {
        onClearInitialQuestion();
      }
    }
  }, [initialQuestion]);

  useEffect(() => {
    if (initialPhoto) {
      setCapturedPhoto(initialPhoto);
      if (onClearInitialPhoto) {
        onClearInitialPhoto();
      }
    }
  }, [initialPhoto]);

  useEffect(() => {
    if (initialCameraOpen) {
      startCamera();
      if (onClearInitialCameraOpen) {
        onClearInitialCameraOpen();
      }
    }
  }, [initialCameraOpen]);

  const handleAskQuestion = async (questionText: string, photoBase64Url?: string | null) => {
    const photoToUse = photoBase64Url || capturedPhoto;
    
    if (!questionText.trim() && !photoToUse) return;

    const finalQuestionText = questionText.trim() 
      ? questionText 
      : 'Considere a imagem capturada e explique o exercício escolar passo a passo de forma didática.';

    const displayUserText = questionText.trim()
      ? questionText
      : '📸 [Foto da Câmera Enviada] Por favor, analise a imagem e tire minhas dúvidas sobre ela.';

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: displayUserText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setCapturedPhoto(null);
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Map existing messages to strict chat history format expected by api
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      // Extract raw base64 string and mimeType for Gemini format
      let cleanImage = null;
      let imageMimeType = 'image/jpeg';
      if (photoToUse) {
        const parts = photoToUse.split(';base64,');
        if (parts.length === 2) {
          cleanImage = parts[1];
          imageMimeType = parts[0].split(':')[1] || 'image/jpeg';
        }
      }

      const res = await fetch('/api/academic-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalQuestionText,
          chatHistory,
          image: cleanImage,
          imageMimeType: imageMimeType
        })
      });

      if (!res.ok) {
        throw new Error('Serviço de IA temporariamente indisponível. Verifique se a chave API está configurada.');
      }

      const data = await res.json();
      
      const modelMsg: AiMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.text,
        timestamp: new Date().toISOString(),
        isDeclined: data.isDeclined
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (err: any) {
      setErrorMessage(err.message || 'Houve um erro ao processar sua dúvida acadêmica.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuestion.trim() || capturedPhoto) {
      handleAskQuestion(inputQuestion);
    }
  };

  const renderSidebarContent = () => {
    const questionCount = messages.filter(m => m.role === 'user').length;
    let studentLevel = 'Iniciante';
    let levelColor = 'from-blue-500 to-indigo-600';
    let levelIcon = '🌱';
    if (questionCount >= 10) {
      studentLevel = 'Mestre Acadêmico';
      levelColor = 'from-amber-500 to-yellow-600';
      levelIcon = '👑';
    } else if (questionCount >= 5) {
      studentLevel = 'Estudioso Avançado';
      levelColor = 'from-purple-500 to-indigo-600';
      levelIcon = '🎓';
    } else if (questionCount >= 2) {
      studentLevel = 'Estudante Focado';
      levelColor = 'from-emerald-500 to-teal-600';
      levelIcon = '🧠';
    }

    return (
      <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sidebar tabs navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarActiveTab('suggestions')}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              sidebarActiveTab === 'suggestions'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600'
            }`}
          >
            Matérias
          </button>
          <button
            type="button"
            onClick={() => setSidebarActiveTab('stats')}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              sidebarActiveTab === 'stats'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600'
            }`}
          >
            Foco & Timer
          </button>
          <button
            type="button"
            onClick={() => setSidebarActiveTab('tips')}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              sidebarActiveTab === 'tips'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600'
            }`}
          >
            Dicas Pro
          </button>
        </div>

        {/* Scrollable content container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
          {sidebarActiveTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
                <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Menu Rápido
                </span>
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mt-2 mb-3">Selecione um tópico escolar para iniciar:</h4>
                
                <div className="space-y-2">
                  {academicSuggestions.map((sug, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        handleAskQuestion(sug.text);
                        if (window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      disabled={isLoading}
                      className="w-full text-left text-xs p-3 rounded-xl border border-slate-100 dark:border-slate-800/85 hover:border-indigo-300 dark:hover:border-indigo-900 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-1 cursor-pointer"
                    >
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md w-max">
                        {sug.category}
                      </span>
                      <span className="line-clamp-2">{sug.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 text-xs">
                <h5 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  Privacidade & Segurança
                </h5>
                <p className="text-purple-900/80 dark:text-purple-300/80 leading-relaxed text-[11px]">
                  Nosso tutor possui filtros pedagógicos rígidos. Ele explica conceitos passo a passo e recusa resolver provas completas diretamente, garantindo um aprendizado real e ético.
                </p>
              </div>
            </div>
          )}

          {sidebarActiveTab === 'stats' && (
            <div className="space-y-4">
              {/* Progress Profile Badge */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${levelColor} text-white flex items-center justify-center text-xl shadow-md`}>
                  {levelIcon}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Nível de Foco</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{studentLevel}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{questionCount} {questionCount === 1 ? 'pergunta feita' : 'perguntas feitas'}</p>
                </div>
              </div>

              {/* Pomodoro Timer Widget */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-4 rounded-2xl shadow-md border border-indigo-900/50 space-y-3 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-5 translate-x-4 translate-y-4 pointer-events-none">
                  <Clock className="h-32 w-32" />
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase bg-white/10 px-2 py-0.5 rounded-md tracking-wider text-indigo-200">
                    {pomodoroType === 'work' ? '⏱️ Foco Ativo' : '☕ Pausa Ativa'}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                </div>

                <div className="text-center py-2 relative z-10">
                  <h3 className="text-3xl font-black tracking-widest font-mono">
                    {String(pomodoroMinutes).padStart(2, '0')}:{String(pomodoroSeconds).padStart(2, '0')}
                  </h3>
                  <p className="text-[10px] text-indigo-200/80 font-bold mt-1 uppercase tracking-wider">
                    {pomodoroType === 'work' ? 'Ciclo Pomodoro de 25m' : 'Intervalo Curto de 5m'}
                  </p>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden relative z-10">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-indigo-400 h-full transition-all duration-1000"
                    style={{ 
                      width: `${((pomodoroType === 'work' ? 25 : 5) * 60 - (pomodoroMinutes * 60 + pomodoroSeconds)) / ((pomodoroType === 'work' ? 25 : 5) * 60) * 100}%` 
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                    className={`text-[11px] font-black py-1.5 px-1.5 rounded-lg transition-all cursor-pointer ${
                      isPomodoroActive 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-white text-indigo-950 hover:bg-slate-100'
                    }`}
                  >
                    {isPomodoroActive ? 'Pausar' : 'Iniciar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPomodoroActive(false);
                      setPomodoroMinutes(pomodoroType === 'work' ? 25 : 5);
                      setPomodoroSeconds(0);
                    }}
                    className="text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white py-1.5 px-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Resetar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPomodoroActive(false);
                      if (pomodoroType === 'work') {
                        setPomodoroType('break');
                        setPomodoroMinutes(5);
                      } else {
                        setPomodoroType('work');
                        setPomodoroMinutes(25);
                      }
                      setPomodoroSeconds(0);
                    }}
                    className="text-[11px] font-semibold bg-indigo-900/60 hover:bg-indigo-900 text-white py-1.5 px-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Alternar
                  </button>
                </div>
              </div>

              {/* Secure Tutor Meter */}
              <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">Segurança de Estudos</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">100%</span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900/50 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full" />
                </div>
                <p className="text-[10px] leading-relaxed text-emerald-900/75 dark:text-emerald-400/80">
                  Pronto para vestibular, provas de escola, tarefas de casa e pesquisas inteiramente seguras.
                </p>
              </div>
            </div>
          )}

          {sidebarActiveTab === 'tips' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs space-y-3">
                <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Dicas Científicas
                </span>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Melhores Práticas de Estudos:</h4>
                
                <div className="space-y-2.5">
                  {studyTips.map((tip, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={showRandomStudyTip}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <Sparkles className="h-4 w-4" />
                Sortear Dica Pro Individual
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      id="edumind-tutor" 
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-900/95 dark:bg-slate-950 backdrop-blur-md p-2 sm:p-4 md:p-6 h-screen w-screen flex flex-col overflow-hidden space-y-3"
          : "flex-1 flex flex-col h-full w-full overflow-hidden min-h-[500px] sm:min-h-[600px] space-y-3"
      }
    >
      {/* Sleek Integrated Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-indigo-800/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-shrink-0 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-1.5 font-bold text-xs shrink-0 cursor-pointer shadow-3xs group"
              title="Voltar ao Portal de Atividades"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}

          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md flex-shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="bg-indigo-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                EduMind AI
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span>Modo Tela Cheia Ativo</span>
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-extrabold tracking-tight leading-snug">
              Tutor de Estudos Inteligente em Tela Cheia
            </h2>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs flex-1 md:flex-none ${
              isCameraActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>{isCameraActive ? 'Fechar Câmera' : 'Fotografar Dever'}</span>
          </button>

          <label className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer flex-1 md:flex-none">
            <Upload className="h-4 w-4" />
            <span>Anexar Foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 overflow-hidden">
        
        {/* Main Conversation Log Container */}
        <div className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col h-full min-h-0 shadow-xs overflow-hidden transition-all duration-300`}>
          
          {/* Active session bar */}
          <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 relative z-20">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
              <strong className="text-slate-700 dark:text-slate-300 font-bold truncate">EduMind AI Online</strong>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline truncate">Gemini 3.5 Flash</span>
            </div>
            
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setMessages([
                  {
                    id: 'welcome',
                    role: 'model',
                    text: `Olá! Sou o **EduMind AI**, seu **Tutor de Estudos Inteligente**. Fui desenvolvido com altos padrões de segurança para responder **exclusivamente a dúvidas acadêmicas**, escolares e de estudos (como Matemática, Física, Biologia, Redação, Língua Portuguesa e História). Como posso te ajudar a compreender as suas matérias hoje?`,
                    timestamp: new Date().toISOString()
                  }
                ])}
                className="hidden md:inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-xs font-bold focus:outline-hidden cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar Conversa
              </button>

              {/* Direct Sidebar Toggle Button (Aba Lateral) */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-3xs ${
                  isSidebarOpen
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-350'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Menu className="h-4 w-4 text-indigo-500" />
                <span>Aba Lateral</span>
                {isSidebarOpen && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                )}
              </button>

              {/* 3-Dots Button (Abas de 3 Pontos) */}
              <button
                type="button"
                onClick={() => setIsThreeDotsOpen(!isThreeDotsOpen)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all cursor-pointer shadow-xs flex items-center justify-center"
                aria-label="Mais Opções"
              >
                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              
              {/* 3-Dots Dropdown Popover Menu */}
              <AnimatePresence>
                {isThreeDotsOpen && (
                  <>
                    {/* Invisible backdrop to close the popover */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsThreeDotsOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 overflow-hidden py-1.5 text-left"
                    >
                      <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-850">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Ferramentas do Tutor
                        </span>
                      </div>

                      {onBackToDashboard && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsThreeDotsOpen(false);
                            onBackToDashboard();
                          }}
                          className="w-full px-3.5 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2.5 transition-all font-bold cursor-pointer text-left"
                        >
                          <ArrowLeft className="h-4 w-4 text-indigo-500" />
                          <span>Voltar para Atividades</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(true);
                          setIsThreeDotsOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2.5 transition-all font-semibold cursor-pointer text-left"
                      >
                        <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>Abrir Aba Lateral</span>
                      </button>

                      <button
                        type="button"
                        onClick={showRandomStudyTip}
                        className="w-full px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2.5 transition-all font-semibold cursor-pointer text-left"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span>Dica de Estudo Aleatória</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          isCameraActive ? stopCamera() : startCamera();
                          setIsThreeDotsOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2.5 transition-all font-semibold cursor-pointer text-left"
                      >
                        <Camera className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{isCameraActive ? "Desativar Câmera" : "Ativar Câmera AI"}</span>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-850 my-1"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setMessages([
                            {
                              id: 'welcome',
                              role: 'model',
                              text: `Olá! Sou o **EduMind AI**, seu **Tutor de Estudos Inteligente**. Fui desenvolvido com altos padrões de segurança para responder **exclusivamente a dúvidas acadêmicas**, escolares e de estudos (como Matemática, Física, Biologia, Redação, Língua Portuguesa e História). Como posso te ajudar a compreender as suas matérias hoje?`,
                              timestamp: new Date().toISOString()
                            }
                          ]);
                          setIsThreeDotsOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2.5 transition-all font-semibold cursor-pointer text-left"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reiniciar Conversa</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              
              return (
                <div
                  id={`ai-message-bubble-${message.id}`}
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                      : message.isDeclined
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 rounded-tl-none shadow-xs'
                        : 'bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-xs'
                  }`}>
                    {/* Role Header for model */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-850 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {message.isDeclined ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-800 dark:text-amber-300">Filtro de Segurança Acadêmica</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-indigo-400" />
                            <span className="text-indigo-900 dark:text-indigo-450 font-extrabold text-xs">Tutor Acadêmico EduMind</span>
                          </>
                        )}
                        <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Markdown/Raw Renderer for elegant display */}
                    <div className={isUser ? "text-white font-medium" : "prose prose-slate prose-sm max-w-none dark:prose-invert text-slate-800 dark:text-slate-200"}>
                      {isUser ? (
                        <p className="whitespace-pre-line text-white font-medium text-sm leading-relaxed">{message.text}</p>
                      ) : (
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      )}
                    </div>

                    {isUser && (
                      <div className="text-[10px] text-indigo-200 text-right mt-2 font-semibold">
                        Sua Pergunta • {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading / Writing state */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 max-w-[80%] shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-indigo-400 animate-spin" />
                    <span>EduMind AI está elaborando uma resposta pedagógica...</span>
                  </div>
                  <div className="flex space-x-1.5 justify-center py-2">
                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" />
                <div>
                  <h4 className="font-bold">Ocorreu um erro</h4>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Live Camera Feed Panel */}
          {isCameraActive && (
            <div className="bg-slate-900 text-white p-4 border-t border-slate-200 dark:border-slate-850 space-y-3 relative flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase text-slate-200 tracking-wider">Câmera EduMind AI</span>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-slate-500 dark:text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-850 transition-all cursor-pointer"
                  title="Fechar Câmera"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>

              {cameraError ? (
                <div className="p-3 bg-slate-800/40 rounded-xl space-y-2.5 border border-slate-750">
                  <p className="text-xs text-amber-300 font-medium leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      Enviar Foto da Galeria
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-video w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden border border-slate-850 relative shadow-inner">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  </div>
                  
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer uppercase tracking-wider"
                    >
                      <Camera className="h-4 w-4" />
                      Tirar Foto (Capturar)
                    </button>
                    
                    <label className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all uppercase tracking-wider">
                      <Image className="h-4 w-4" />
                      Carregar Arquivo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachment Preview */}
          {capturedPhoto && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-150 dark:bg-slate-850 dark:border-slate-850 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-row items-center gap-3">
                <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-205 dark:border-slate-700 shadow-xs bg-black">
                  <img src={capturedPhoto} referrerPolicy="no-referrer" alt="Captured Thumbnail" className="h-full w-full object-cover" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-slate-750 dark:text-slate-200">Foto da Câmera Anexada</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide">Pronta para envio ao Tutor Inteligente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCapturedPhoto(null)}
                className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 transition-all font-semibold cursor-pointer"
                title="Remover Foto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Suggestions Carousel - Highly adjusted for mobile & desktop */}
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-950/90 border-t border-slate-150/70 dark:border-slate-850 flex flex-col gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Sugestões Rápidas:
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
              {academicSuggestions.map((sug, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleAskQuestion(sug.text)}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-bold hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-3xs"
                >
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-750 dark:bg-indigo-950/50 dark:text-indigo-400">
                    {sug.category}
                  </span>
                  <span className="max-w-[210px] truncate">{sug.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form input */}
          <form onSubmit={handleSubmitForm} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              className={`p-3 rounded-xl transition-all focus:outline-hidden flex items-center justify-center cursor-pointer ${
                isCameraActive 
                  ? 'bg-red-50 text-red-650 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750'
              }`}
              title="Abrir Câmera da IA"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>

            <input
              type="text"
              required={!capturedPhoto}
              disabled={isLoading}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={
                capturedPhoto 
                  ? "Deseja perguntar algo específico sobre a foto?" 
                  : "Digite sua dúvida ou mande foto de um exercício..."
              }
              className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60 placeholder-slate-400 dark:placeholder-slate-500"
            />

            <button
              type="submit"
              disabled={isLoading || (!inputQuestion.trim() && !capturedPhoto)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl disabled:opacity-40 transition-all shadow-xs cursor-pointer flex-shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>

        </div>

        {/* Instructions, Guidelines and interactive trigger presets */}
        {isSidebarOpen && (
          <div className="hidden lg:flex lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl h-full min-h-0 overflow-hidden shadow-xs flex-col">
            {renderSidebarContent()}
          </div>
        )}

      </div>

      {/* Dynamic Study Tip Alert Toast - beautiful micro-interaction */}
      <AnimatePresence>
        {studyTip && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-3 border border-amber-400"
          >
            <Sparkles className="h-5 w-5 text-amber-100 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 text-left">
              <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md">
                Dica de Estudos EduMind
              </span>
              <p className="text-xs font-semibold leading-relaxed mt-1 text-white/95">
                {studyTip}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStudyTip(null)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Mobile Sidebar Drawer - Abas Laterais */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950 z-50 lg:hidden"
            />

            {/* Sidebar content panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-850 z-50 shadow-2xl flex flex-col h-full overflow-hidden lg:hidden text-left"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Painel do Aluno</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">EduMind AI Auxiliar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Render the unified responsive tabbed content inside the drawer */}
              <div className="flex-1 overflow-hidden">
                {renderSidebarContent()}
              </div>

              {/* Drawer Footer info card */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex-shrink-0">
                <span>Versão Mobile Pro</span>
                <span>EduMind AI v2.2</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
