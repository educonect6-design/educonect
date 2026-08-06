/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Submission {
  studentName: string;
  submittedAt: string;
  content: string;
  grade?: string; // e.g. "9.0" or "A"
  feedback?: string;
  status: 'Pendente' | 'Entregue' | 'Corrigido';
  photo?: string; // Base64 image data from camera capture
  pdfName?: string; // Optional name of submitted PDF
  pdfData?: string; // Base64 or mock binary data for PDF
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  subject: string; // e.g. "Matemática", "Física", "Gramática", "História"
  createdBy: string; // e.g. "Prof. Marcos Silva"
  createdAt: string;
  dueDate: string;
  submissions: Submission[];
  turma?: string; // e.g. "8º Ano A - Ensino Fundamental"
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderRole: 'professor' | 'aluno';
  senderName: string;
  text: string;
  image?: string; // Optional Base64 image attachment from camera/upload
  timestamp: string;
}

export interface ChatChannel {
  channelId: string;
  professorName: string;
  subject: string;
  studentName: string;
  lastMessageText: string;
  lastMessageTime: string;
}

export interface AbsenceJustification {
  id: string;
  studentName: string;
  subject: string;
  professorName: string;
  date: string;
  reason: string;
  description: string;
  status: 'Pendente' | 'Aceito' | 'Recusado';
  feedback?: string;
  evidencePhoto?: string; // Base64 data URL from camera capture
  createdAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isDeclined?: boolean; // If prompt was declined by academic filter
}

export interface Announcement {
  id: string;
  senderName: string;
  senderRole: 'professor' | 'direcao';
  title: string;
  text: string;
  category: 'Geral' | 'Urgente' | 'Pedagógico' | 'Direção' | 'Reunião';
  timestamp: string;
}

export interface ReportCardGrade {
  id?: string;
  studentName: string;
  turma: string;
  subject: string;
  bimestre: string;
  examGrade: number;
  frequency: number;
}

