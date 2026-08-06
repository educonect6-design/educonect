/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';
import AuthSystem, { UserProfile } from './AuthSystem';

interface LoginGateProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginGate({ onLoginSuccess }: LoginGateProps) {
  const [selectedRole, setSelectedRole] = useState<'aluno' | 'professor'>('aluno');

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-6">

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-indigo-900 dark:text-white">EduConnect</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Portal de Atividades e Estudos — acesse sua conta para continuar
            </p>
          </div>
        </div>

        {/* Role Picker */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedRole('aluno')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
              selectedRole === 'aluno'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Sou Aluno</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('professor')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
              selectedRole === 'professor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Sou Professor</span>
          </button>
        </div>

        <AuthSystem
          currentUser={null}
          onLoginSuccess={onLoginSuccess}
          onLogout={() => {}}
          initialRole={selectedRole}
          initialTab="login"
        />
      </div>
    </div>
  );
}
