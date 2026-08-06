/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  KeyRound, 
  User, 
  ShieldCheck, 
  GraduationCap, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  LogOut, 
  BookOpen, 
  CreditCard,
  ArrowRight,
  Database
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface UserProfile {
  matricula: string;
  name: string;
  role: 'aluno' | 'professor';
  subject?: string;
  email?: string;
  createdAt?: string;
}

interface AuthSystemProps {
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  initialRole?: 'aluno' | 'professor';
  initialTab?: 'login' | 'register';
}

// Firebase Authentication requires an e-mail; students/teachers log in with their
// matrícula, so we derive a stable synthetic e-mail from it instead of collecting a real one.
const toAuthEmail = (matricula: string) => `${matricula.trim().toLowerCase()}@educonnect.local`;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Esta matrícula já está cadastrada! Faça login ou escolha outra.',
  'auth/invalid-credential': 'Matrícula ou senha incorretos. Verifique os dados e tente novamente.',
  'auth/wrong-password': 'Matrícula ou senha incorretos. Verifique os dados e tente novamente.',
  'auth/user-not-found': 'Matrícula não encontrada. Se você é um novo usuário, crie sua conta na aba "Cadastrar (Registro)".',
  'auth/weak-password': 'A senha deve conter no mínimo 6 caracteres.',
  'auth/invalid-email': 'Matrícula inválida. Use apenas letras e números.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde um instante e tente novamente.',
  'auth/operation-not-allowed': 'Login por matrícula e senha ainda não está habilitado no Firebase deste projeto. Ative o provedor "E-mail/senha" em Authentication > Sign-in method no Console do Firebase.',
};

const getAuthErrorMessage = (err: any, fallback: string) =>
  AUTH_ERROR_MESSAGES[err?.code as string] || fallback;

export default function AuthSystem({
  currentUser, 
  onLoginSuccess, 
  onLogout,
  initialRole = 'professor',
  initialTab = 'login'
}: AuthSystemProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialTab);
  const [role, setRole] = useState<'aluno' | 'professor'>(initialRole);

  useEffect(() => {
    if (initialRole) setRole(initialRole);
    if (initialTab) setAuthMode(initialTab);
  }, [initialRole, initialTab]);
  
  // Form fields
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Matemática');
  const [schoolCode, setSchoolCode] = useState('EDUCONNECT-2026');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-generate random teacher registration ID
  const handleGenerateTeacherMatricula = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setMatricula(`PROF-2026-${randomNum}`);
  };

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanMatricula = matricula.trim();
    if (!cleanMatricula || !password) {
      setErrorMsg('Por favor, informe a matrícula e a senha de acesso.');
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, toAuthEmail(cleanMatricula), password);
      const profileSnap = await getDoc(doc(db, 'users', credential.user.uid));

      if (!profileSnap.exists()) {
        setErrorMsg('Não encontramos os dados da sua conta. Tente se cadastrar novamente.');
        setLoading(false);
        return;
      }

      const data = profileSnap.data();
      const loggedUser: UserProfile = {
        matricula: data.matricula || cleanMatricula,
        name: data.name || 'Usuário EduConnect',
        role: data.role === 'professor' ? 'professor' : 'aluno',
        subject: data.subject,
        email: data.email,
        createdAt: data.createdAt || new Date().toISOString()
      };

      setSuccessMsg(`Acesso confirmado! Bem-vindo(a) de volta, ${loggedUser.name}!`);
      setTimeout(() => {
        onLoginSuccess(loggedUser);
      }, 500);
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setErrorMsg(getAuthErrorMessage(err, 'Erro ao conectar com o servidor para verificar as credenciais. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanMatricula = matricula.trim();
    const cleanName = name.trim();

    if (!cleanName || !cleanMatricula || !password) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, toAuthEmail(cleanMatricula), password);

      const newUser: UserProfile = {
        matricula: cleanMatricula,
        name: cleanName,
        role: role,
        subject: role === 'professor' ? subject : undefined,
        email: `${cleanMatricula}@educonnect.edu.br`,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };

      // Save the profile in Firestore, keyed by the Firebase Auth uid. The password itself
      // is never stored here — Firebase Authentication keeps it hashed internally.
      await setDoc(doc(db, 'users', credential.user.uid), {
        ...newUser,
        createdAtTimestamp: serverTimestamp()
      });

      setSuccessMsg('Conta cadastrada com sucesso!');
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 700);

    } catch (err: any) {
      console.error('Erro no registro:', err);
      setErrorMsg(getAuthErrorMessage(err, 'Erro ao criar sua conta. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Firebase Firestore Activo
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                Autenticação do Portal Escolar
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">
                Acesse sua conta de Aluno ou Docente via Matrícula e Senha.
              </p>
            </div>
          </div>

          {currentUser && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-white ${
                currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-extrabold leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-indigo-200">Matrícula: {currentUser.matricula}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      {currentUser ? (
        /* Logged In View Card */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md ${
                currentUser.role === 'professor' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {currentUser.role === 'professor' ? <ShieldCheck className="h-8 w-8" /> : <GraduationCap className="h-8 w-8" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{currentUser.name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                    currentUser.role === 'professor' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {currentUser.role === 'professor' ? 'Docente / Professor' : 'Estudante / Aluno'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Matrícula escolar: <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{currentUser.matricula}</strong></span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs transition-all cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Conta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status de Sincronização</span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                <span>Nuvem Firestore</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Permissões de Acesso</span>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                {currentUser.role === 'professor' ? 'Lançar Notas & Atividades' : 'Acessar Aulas & Entregas'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">E-mail Institucional</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                {currentUser.email || `${currentUser.matricula}@educonnect.edu.br`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Login / Register Toggle Forms */
        <div className="max-w-2xl mx-auto w-full">
          
          {/* Main Auth Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Nav Tabs Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>Entrar (Login)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-800'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Cadastrar (Registro)</span>
              </button>
            </div>

            {/* Error / Success Messages */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Número de Matrícula Escolar / RA
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="text"
                      required
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Sua matrícula escolar (Ex: 20248832)"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Verificando Matrícula...</span>
                  ) : (
                    <>
                      <span>Acessar Portal</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* Role Selection Tabs in Registration */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Selecione o Tipo de Conta
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRole('professor');
                        if (!matricula || matricula.startsWith('202')) {
                          handleGenerateTeacherMatricula();
                        }
                      }}
                      className={`py-3 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs ${
                        role === 'professor'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/40'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Professor / Docente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('aluno')}
                      className={`py-3 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs ${
                        role === 'aluno'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/40'
                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Aluno / Estudante</span>
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {role === 'professor' ? 'Nome Completo do Professor(a)' : 'Nome Completo do Aluno(a)'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={role === 'professor' ? "Ex: Prof. Carlos Silva" : "Ex: João Carlos Ferreira"}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Teacher Subject Selection (only if professor) */}
                {role === 'professor' && (
                  <div>
                    <label className="block text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Disciplina / Matéria de Ensino</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-indigo-50/50 dark:bg-slate-950 border border-indigo-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Matemática">Matemática</option>
                      <option value="Língua Portuguesa">Língua Portuguesa</option>
                      <option value="História">História</option>
                      <option value="Geografia">Geografia</option>
                      <option value="Ciências / Biologia">Ciências / Biologia</option>
                      <option value="Física">Física</option>
                      <option value="Química">Química</option>
                      <option value="Inglês">Inglês</option>
                      <option value="Educação Física">Educação Física</option>
                      <option value="Artes">Artes</option>
                      <option value="Ensino Religioso">Ensino Religioso</option>
                      <option value="Outra Disciplina">Outra Disciplina</option>
                    </select>
                  </div>
                )}

                {/* Matricula / Teacher Registration ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {role === 'professor' ? 'Registro Funcional / Matrícula Docente' : 'Matrícula Escolar / RA do Aluno'}
                    </label>
                    {role === 'professor' && (
                      <button
                        type="button"
                        onClick={handleGenerateTeacherMatricula}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Gerar Matrícula Docente</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="text"
                      required
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder={role === 'professor' ? "Ex: PROF-2026-901" : "Ex: 2026101"}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {role === 'professor' 
                      ? 'Este número identificará você no Lançamento de Notas e Atividades.'
                      : 'Utilize sua matrícula institucional fornecida pela escola.'
                    }
                  </p>
                </div>

                {/* School Verification Code for Teachers */}
                {role === 'professor' && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Código de Verificação da Escola / Instituição
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <input
                        type="text"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        placeholder="Ex: EDUCONNECT-2026"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Criar senha"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirmar Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir senha"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 text-white rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    role === 'professor' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {loading ? (
                    <span>Registrando Conta no Firestore...</span>
                  ) : (
                    <>
                      <span>{role === 'professor' ? 'Cadastrar Minha Conta de Professor' : 'Criar Minha Conta de Estudante'}</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
