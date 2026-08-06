/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatChannel } from '../types';
import { Send, User, MessageCircle, AlertCircle, RefreshCw, Sparkles, Camera, Upload, X, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatSystemProps {
  currentRole: 'professor' | 'aluno';
  refreshCount: number;
  onRefreshTrigger: () => void;
  selectedChannelIdFromProps?: string | null;
  onClearPropsChannelId?: () => void;
  activeProfessorName?: string;
  currentUserName?: string;
}

export default function ChatSystem({ 
  currentRole, 
  refreshCount, 
  onRefreshTrigger, 
  selectedChannelIdFromProps,
  onClearPropsChannelId,
  activeProfessorName,
  currentUserName = 'Estudante'
}: ChatSystemProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('mailk-ana');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  // Camera & Photo attachment states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Video play error:', e));
        }
      }, 150);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Não foi possível iniciar a câmera em tempo real (permissões do navegador ou dispositivo). Mas você pode enviar uma foto usando o botão de upload de arquivo!'
      );
      setIsCameraActive(true);
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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getInitials = (name: string) => {
    const cleanName = name.replace(/^Prof(ª)?\.\s*/i, '');
    return cleanName.charAt(0).toUpperCase() || 'P';
  };

  // Dynamic channel options matching current user profile
  const rawChannels: ChatChannel[] = [
    {
      channelId: 'mailk-ana',
      professorName: 'Prof. Mailk',
      subject: 'Matemática',
      studentName: currentUserName,
      lastMessageText: 'Ah! Entendi perfeitamente. O sinal estava me atrapalhando...',
      lastMessageTime: 'Ontem'
    },
    {
      channelId: 'jucimar-ana',
      professorName: 'Prof. Jucimar',
      subject: 'Português',
      studentName: currentUserName,
      lastMessageText: 'Bom dia! Uma alusão filosófica embeleza muito...',
      lastMessageTime: 'Hoje'
    },
    {
      channelId: 'fabio-ana',
      professorName: 'Prof. Fábio',
      subject: 'História',
      studentName: currentUserName,
      lastMessageText: 'Prefiro em texto corrido estruturado com introdução...',
      lastMessageTime: 'Anteontem'
    },
    {
      channelId: 'marcos-ana',
      professorName: 'Prof. Marcos',
      subject: 'Geografia',
      studentName: currentUserName,
      lastMessageText: 'Oi! Ela é uma infraestrutura que serve diretamente...',
      lastMessageTime: 'Ontem'
    },
    {
      channelId: 'nebia-ana',
      professorName: 'Profª. Nébia',
      subject: 'Ciências',
      studentName: currentUserName,
      lastMessageText: 'Oi! De forma alguma. A umidade constante...',
      lastMessageTime: '2 dias atrás'
    },
    {
      channelId: 'mailk-orientado-ana',
      professorName: 'Prof. Mailk',
      subject: 'Estudo Orientado',
      studentName: currentUserName,
      lastMessageText: 'Excelente iniciativa! Separe blocos focados...',
      lastMessageTime: 'Hoje'
    },
    {
      channelId: 'marcos-desportiva-ana',
      professorName: 'Prof. Marcos',
      subject: 'Educação Desportiva',
      studentName: currentUserName,
      lastMessageText: 'Não pode. Se você recuar a bola intencionalmente usando...',
      lastMessageTime: '3 dias atrás'
    },
    {
      channelId: 'nebia-cientifica-ana',
      professorName: 'Profª. Nébia',
      subject: 'Iniciação Científica',
      studentName: currentUserName,
      lastMessageText: 'Olá! Na Iniciação Científica você pode propor um...',
      lastMessageTime: 'Anteontem'
    },
    {
      channelId: 'jucimar-orientado-ana',
      professorName: 'Prof. Jucimar',
      subject: 'Estudo Orientado',
      studentName: currentUserName,
      lastMessageText: 'Oi! Uma ótima técnica é afastar as distrações...',
      lastMessageTime: 'Hoje'
    },
    {
      channelId: 'george-ana',
      professorName: 'Prof. George',
      subject: 'Inglês',
      studentName: currentUserName,
      lastMessageText: 'Hi! É o oposto. O Present Perfect foca no resultado...',
      lastMessageTime: 'Ontem'
    },
    {
      channelId: 'george-religioso-ana',
      professorName: 'Prof. George',
      subject: 'Ensino Religioso',
      studentName: currentUserName,
      lastMessageText: 'Discutiremos os valores comuns de tolerância, resiliência...',
      lastMessageTime: 'Ontem'
    },
    {
      channelId: 'ewerton-ana',
      professorName: 'Prof. Ewerton',
      subject: 'Educação Física',
      studentName: currentUserName,
      lastMessageText: 'Depende do condicionamento de cada um e da idade escolar...',
      lastMessageTime: '2 dias atrás'
    }
  ];

  const channels = rawChannels;

  // Filter channels based on role and active professor
  const filteredChannels = channels.filter((ch) => {
    if (currentRole === 'professor' && activeProfessorName) {
      return ch.professorName.toLowerCase().includes(activeProfessorName.toLowerCase());
    }
    return true; // Student sees all channels
  });

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [refreshCount]);

  // Handle automatic channel selection for the active professor simulated profile
  useEffect(() => {
    if (currentRole === 'professor' && activeProfessorName) {
      const match = filteredChannels.find(c => 
        c.professorName.toLowerCase().includes(activeProfessorName.toLowerCase())
      );
      if (match) {
        setActiveChannelId(match.channelId);
      }
    }
  }, [activeProfessorName, currentRole, filteredChannels.length]);

  // Handle cross-dashboard quick navigation triggers (e.g. clicking "Chat with Teacher" in Student screen)
  useEffect(() => {
    if (selectedChannelIdFromProps) {
      setActiveChannelId(selectedChannelIdFromProps);
      setShowMobileConversation(true);
      if (onClearPropsChannelId) {
        onClearPropsChannelId();
      }
    }
  }, [selectedChannelIdFromProps]);

  // Scroll to bottom whenever messages or active channel changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  const activeChannelObj = filteredChannels.find(c => c.channelId === activeChannelId) || filteredChannels[0] || channels[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !capturedPhoto) || isSending) return;

    setIsSending(true);
    setErrorText('');

    // Determine senderName based on current login simulation role
    const senderName = currentRole === 'aluno'
      ? activeChannelObj.studentName
      : activeChannelObj.professorName;

    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannelId,
          senderRole: currentRole,
          senderName,
          text: inputText.trim() || (capturedPhoto ? '📷 [Foto de Atividade Anexada]' : ''),
          image: capturedPhoto
        })
      });

      if (!res.ok) {
        throw new Error('Não foi possível enviar a mensagem.');
      }

      setInputText('');
      setCapturedPhoto(null);
      // Trigger global state update for instant rendering
      onRefreshTrigger();
      fetchMessages();

    } catch (err: any) {
      setErrorText(err.message || 'Erro de rede.');
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(m => m.channelId === activeChannelId);

  return (
    <div id="chat-system-grid" className="font-sans antialiased bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden h-[540px] md:h-[600px] flex">
      
      {/* Channels list sidebar */}
      <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 ${showMobileConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight font-display">Canais de Conversa</h3>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Fale diretamente com os professores</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChannels.map((ch) => {
            const isActive = ch.channelId === activeChannelId;
            const isMyChannel = currentRole === 'professor' && activeProfessorName && 
              ch.professorName.toLowerCase().includes(activeProfessorName.toLowerCase());
            
            return (
              <button
                id={`chat-channel-btn-${ch.channelId}`}
                key={ch.channelId}
                onClick={() => {
                  setActiveChannelId(ch.channelId);
                  setShowMobileConversation(true);
                }}
                className={`w-full text-left p-3 rounded-2xl transition-all flex flex-col gap-1 cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-indigo-950 dark:text-white font-black' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-350'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                      isActive ? 'bg-indigo-150 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {ch.subject}
                    </span>
                    {isMyChannel && (
                      <span className="bg-emerald-100 text-emerald-850 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                        Seu Canal
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{ch.lastMessageTime}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate tracking-tight font-display">
                  {ch.professorName}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-bold">
                  {currentRole === 'aluno' ? 'Seu Canal de Atendimento' : `Aluno(a): ${ch.studentName}`}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                  {ch.lastMessageText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
 
      {/* Messages interface area */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${!showMobileConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Dynamic header of chat context */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button to channel list view */}
            <button
              onClick={() => setShowMobileConversation(false)}
              className="md:hidden p-1.5 px-3 -ml-1 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <span>◀ Canais</span>
            </button>

            <div className="bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              {getInitials(activeChannelObj.professorName)}
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight font-display">
                {activeChannelObj.professorName} ↔ {activeChannelObj.studentName}
              </h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-extrabold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Suporte de {activeChannelObj.subject} Ativo
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchMessages}
            disabled={isLoading}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
            title="Atualizar chat"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Informative tips depending on current view role */}
        <div className="bg-indigo-50/40 border-b border-indigo-100 dark:border-indigo-950 px-4 py-2 flex items-center gap-2 text-[11px] text-indigo-800 dark:text-indigo-400 font-bold tracking-tight">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>
            {currentRole === 'aluno' 
              ? `Você está enviando como Aluno(a) (${currentUserName}).` 
              : `Você está enviando como Professor (${activeChannelObj.professorName}).`
            }
          </span>
          <span className="hidden md:inline text-indigo-200 dark:text-slate-600">•</span>
          <span className="hidden md:inline font-semibold text-indigo-700/80 dark:text-slate-400">Troque de papel acima para responder como outro usuário!</span>
        </div>

        {/* Live Camera Viewfinder Overlay Panel inside Chat */}
        {isCameraActive && (
          <div className="p-3 bg-slate-900 text-white border-b border-slate-800 animate-fadeIn shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                  {currentRole === 'professor' ? 'Câmera do Professor (Fotografar Atividade)' : 'Câmera do Estudante'}
                </span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 text-xs text-amber-300 space-y-1 mb-2">
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black mb-3 flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-44 sm:h-52 object-cover rounded-2xl"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer flex-1"
                >
                  <Camera className="h-4 w-4" />
                  <span>Fotografar Atividade</span>
                </button>
              )}

              <label className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer flex-1">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>Escolher da Galeria</span>
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

        {/* Message bubbles log list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 p-8">
              <MessageCircle className="h-8 w-8 text-slate-500 dark:text-slate-300 mb-2" />
              <p className="text-xs font-bold">Nenhuma mensagem neste canal ainda. Comece a conversa digitando ou fotografando uma atividade abaixo!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              // Standard message checker: Is it sent by the active login simulation perspective?
              const isMine = msg.senderRole === currentRole;
              
              return (
                <div
                  id={`chat-msg-${msg.id}`}
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 px-0.5 tracking-wide uppercase">{msg.senderName}</span>
                  
                  <div className={`p-3 rounded-2xl text-sm font-normal leading-relaxed tracking-normal shadow-3xs ${
                    isMine 
                      ? currentRole === 'aluno' 
                        ? 'bg-emerald-600 text-white rounded-tr-none font-medium' 
                        : 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      : 'bg-slate-100 text-slate-850 border border-slate-200/50 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-tl-none'
                  }`}>
                    {msg.image && (
                      <div 
                        className="mb-2 relative rounded-xl overflow-hidden border border-white/20 cursor-pointer group"
                        onClick={() => setExpandedImage(msg.image || null)}
                      >
                        <img 
                          src={msg.image} 
                          alt="Atividade ou Anexo enviado" 
                          className="w-full max-h-56 object-cover rounded-xl transition-transform duration-200 group-hover:scale-102"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                          <Maximize2 className="h-4 w-4" />
                          <span>Ampliar Imagem</span>
                        </div>
                      </div>
                    )}
                    {msg.text && <div>{msg.text}</div>}
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attached Photo Preview Bar */}
        {capturedPhoto && (
          <div className="px-3 py-2 bg-indigo-50/70 dark:bg-slate-950 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <img src={capturedPhoto} alt="Anexo" className="h-11 w-11 object-cover rounded-xl border-2 border-emerald-500 shadow-3xs" />
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Foto de Atividade Anexada</span>
                  <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">Pronta</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Será enviada ao clicar em Enviar</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCapturedPhoto(null)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
              title="Remover foto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Send message text box & Camera controls */}
        <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Camera Button */}
          <button
            type="button"
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isCameraActive 
                ? 'bg-rose-500 text-white' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60'
            }`}
            title="Tirar foto com a câmera para o chat"
          >
            <Camera className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline font-black">Câmera</span>
          </button>

          {/* Upload File Button */}
          <label 
            className="p-2.5 sm:px-3 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
            title="Anexar imagem da galeria"
          >
            <Upload className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={capturedPhoto ? "Adicione uma legenda à foto (opcional)..." : "Digite sua mensagem escolar aqui..."}
            className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
          />

          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !capturedPhoto)}
            className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 font-extrabold text-xs shrink-0 ${
              currentRole === 'aluno'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40'
            }`}
          >
            <Send className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Enviar</span>
          </button>
        </form>

        {errorText && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 text-rose-700 text-xs flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

      </div>

      {/* Full Size Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2 border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-rose-600 text-white rounded-full z-10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={expandedImage} alt="Foto da Atividade Ampliada" className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
