import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { 
  Megaphone, 
  Send, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  Lock, 
  AlertTriangle, 
  Users, 
  Building,
  RefreshCw,
  PlusCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../lib/apiClient';

interface AnnouncementsSystemProps {
  currentRole: 'aluno' | 'professor';
  activeProfessorName: string;
  refreshCount: number;
  onRefreshTrigger: () => void;
}

export default function AnnouncementsSystem({
  currentRole,
  activeProfessorName,
  refreshCount,
  onRefreshTrigger
}: AnnouncementsSystemProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New announcement form states
  const [showNewForm, setShowNewForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState<'Geral' | 'Urgente' | 'Pedagógico' | 'Direção' | 'Reunião'>('Geral');
  const [formRole, setFormRole] = useState<'professor' | 'direcao'>('professor');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) {
        throw new Error('Erro ao obter os avisos escolares.');
      }
      const data = await res.json();
      // Sort announcements by date desc
      const sorted = data.sort((a: Announcement, b: Announcement) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setAnnouncements(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formText.trim()) return;

    setSubmitting(true);
    setError(null);

    // Determine sender name based on the simulated role
    const senderName = formRole === 'direcao' 
      ? 'Direção Escolar (Coordenação Geral)' 
      : activeProfessorName;

    try {
      const res = await authFetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          senderRole: formRole,
          title: formTitle.trim(),
          text: formText.trim(),
          category: formCategory
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao publicar aviso.');
      }

      setFormTitle('');
      setFormText('');
      setFormCategory('Geral');
      setFormSuccess(true);
      onRefreshTrigger();
      setTimeout(() => setFormSuccess(false), 3000);
      setShowNewForm(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar o aviso.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter functionality
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = 
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || ann.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Urgente':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
      case 'Pedagógico':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
      case 'Reunião':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
      case 'Direção':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900';
      default:
        return 'bg-slate-150 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getRoleBadgeColor = (role: 'professor' | 'direcao') => {
    if (role === 'direcao') {
      return 'bg-purple-600 text-white shadow-xs';
    }
    return 'bg-indigo-600 text-white shadow-xs';
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div id="announcements-system-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-7xl mx-auto items-start font-sans">
      
      {/* LEFT COLUMN: Filters, Post Trigger, and Feed */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Search and Filters Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-colors duration-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Header Identity */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-xs">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Mural de Avisos</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Comunicados e decisões da Direção e Professores</p>
              </div>
            </div>

            {/* Quick Action Button for Teachers */}
            {currentRole === 'professor' && !showNewForm && (
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                Criar Novo Aviso
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            {/* Search Input */}
            <div className="md:col-span-7 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar comunicados, autores ou palavras-chave..."
                className="w-full pl-9 pr-4 py-2 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="md:col-span-5 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:block mr-1">Filtrar:</span>
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'Geral', label: 'Geral' },
                  { value: 'Urgente', label: 'Urgente' },
                  { value: 'Pedagógico', label: 'Pedag' },
                  { value: 'Direção', label: 'Diret' },
                  { value: 'Reunião', label: 'Reun' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedCategory(item.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                      selectedCategory === item.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Restricted Chat Instruction / Banner */}
        {currentRole === 'aluno' ? (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block font-sans">Canal Informativo de Alta Visibilidade</span>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 leading-relaxed font-semibold font-sans">
                Este mural funciona como um <strong className="font-extrabold text-emerald-900 dark:text-emerald-200">canal informativo seguro de leitura obrigatória</strong>. Apenas professores, coordenadores pedagógicos e membros da Direção Escolar possuem autorização para postar notícias e debater diretrizes. Você possui permissão completa de visualização.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 flex items-start gap-4 shadow-3xs">
            <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-800 dark:text-indigo-300 block font-sans">Sala de Comunicação Docente & Gestora</span>
              <p className="text-xs text-indigo-950/80 dark:text-slate-300 mt-1.5 leading-relaxed font-sans font-semibold">
                Você está logado como membro da equipe escolar (<strong className="text-indigo-900 dark:text-white font-extrabold">{activeProfessorName}</strong>). Você pode debater novas resoluções com a equipe ou postar comunicados em massa para os estudantes. Alunos visualizam os tópicos em formato de <strong className="text-indigo-800 dark:text-indigo-200 font-extrabold">somente leitura</strong>.
              </p>
            </div>
          </div>
        )}

        {/* FEED SCRIPT */}
        <div className="space-y-4 font-sans">
          {loading && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Buscando quadro de avisos atualizado...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && filteredAnnouncements.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum aviso encontrado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed font-medium">
                Nenhum comunicado se enquadra na busca de textos ou no filtro selecionado. Tente alterar o filtro.
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((ann) => {
              const isUrgent = ann.category === 'Urgente';
              return (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-2xs relative overflow-hidden transition-all duration-200 ${
                    isUrgent 
                      ? 'border-rose-350 dark:border-rose-900 bg-gradient-to-br from-white to-rose-50/10 dark:from-slate-900 dark:to-rose-950/20' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  
                  {isUrgent && (
                    <div className="absolute top-0 right-0 h-1.5 w-full bg-rose-500 animate-pulse"></div>
                  )}

                  {/* Notice Metadata Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                    
                    <div className="flex items-center gap-3 font-sans">
                      {/* Avatar representativa */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${getRoleBadgeColor(ann.senderRole)}`}>
                        {ann.senderRole === 'direcao' ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>

                      <div>
                        {/* Autor Name e Role Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-850 dark:text-white leading-none">{ann.senderName}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            ann.senderRole === 'direcao' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' 
                              : 'bg-indigo-100 text-indigo-805 dark:bg-indigo-950/40 dark:text-indigo-300'
                          }`}>
                            {ann.senderRole === 'direcao' ? 'Direção' : 'Professor'}
                          </span>
                        </div>
                        {/* Data e hora de publicação */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Mural Escola • {formatDate(ann.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Categoria Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider ${getCategoryColor(ann.category)}`}>
                        {ann.category}
                      </span>
                    </div>

                  </div>

                  {/* Body Content */}
                  <div className="pt-4 font-sans">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                      {ann.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line font-medium">
                      {ann.text}
                    </p>
                  </div>

                  {/* Read-Only Status Indicator */}
                  {currentRole === 'aluno' && (
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-emerald-500" />
                        Apenas Leitura
                      </span>
                      <span className="text-[9px] bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-md font-mono text-slate-500 dark:text-slate-400 lowercase">
                        id: {ann.id}
                      </span>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>

        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Post Box for Teachers */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Toggleable Form Desk card */}
        {currentRole === 'professor' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Megaphone className="h-4.5 w-4.5 text-indigo-600" />
              Painel de Publicações
            </h3>

            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-600" />
                Aviso publicado com sucesso no mural!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* simulated role selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Publicar em Nome de:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-900">
                  <button
                    type="button"
                    onClick={() => setFormRole('professor')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formRole === 'professor'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Meu Registro
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('direcao')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      formRole === 'direcao'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Direção/Gestão
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 font-sans text-slate-500 dark:text-slate-400 italic font-medium">
                  {formRole === 'direcao' 
                    ? 'Assina coletivamente como Direção Escolar.' 
                    : `Assina como ${activeProfessorName}.`
                  }
                </p>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Título do Comunicado
                </label>
                <input
                  required
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Mudança no Horário de Aulas..."
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Category input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Categoria de urgência
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Geral">⚠️ Geral (Organização Padrão)</option>
                  <option value="Urgente">🚨 Urgente (Pop-out de Alerta)</option>
                  <option value="Pedagógico">📚 Pedagógico (Aulas e Feiras)</option>
                  <option value="Direção">🏛️ Direção (Gestão Geral)</option>
                  <option value="Reunião">👥 Reunião (Calendários e Eventos)</option>
                </select>
              </div>

              {/* Content text */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Conteúdo Detalhado do Comunicado
                </label>
                <textarea
                  required
                  rows={5}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Seja descritivo e anote as orientações importantes tanto para os outros professores quanto alunos..."
                  className="w-full text-xs font-medium bg-white dark:bg-slate-950 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !formTitle.trim() || !formText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Enviando...' : 'Publicar Comunicado'}
              </button>

            </form>
          </div>
        )}

        {/* Info card always visible for both */}
        <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl p-6 relative overflow-hidden border border-slate-205 dark:border-slate-800 shadow-sm">
          <div className="relative z-10 space-y-4">
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 font-extrabold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider w-fit block border border-amber-200 dark:border-amber-900/40">
              Gestão Escolar Conectada
            </span>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Normas & Segurança</h3>
            <p className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed font-sans font-semibold">
              O <strong className="font-extrabold text-indigo-700 dark:text-indigo-400">Quadro de Avisos</strong> do EduConnect apoia a comunicação transparente. Todas as interações escolares de professores e diretores geram alertas automáticos e registros indeléveis de auditoria pedagógica.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Unidade Escolar Central de Ensino</p>
            </div>
          </div>
          {/* subtle decorative blur circle */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 dark:bg-indigo-950/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>

      </div>

    </div>
  );
}
