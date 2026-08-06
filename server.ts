/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Activity, ChatMessage, Submission, AbsenceJustification, Announcement, ReportCardGrade } from "./src/types";
import { requireRole } from "./src/lib/authMiddleware";

let reportCardGrades: ReportCardGrade[] = [];

// Announcements list
let announcementsList: Announcement[] = [
  {
    id: "ann-1",
    senderName: "Direção Escolar (Sra. Adelaide)",
    senderRole: "direcao",
    title: "Reunião de Pais e Mestres - 2º Bimestre",
    text: "Prezados professores, coordenadores e responsáveis. Convidamos todos para a nossa Reunião de Pais e Mestres do 2º Bimestre, que ocorrerá neste sábado às 09h00 no auditório principal da escola. Discutiremos o feedback das notas e os projetos pedagógicos complementares.",
    category: "Reunião",
    timestamp: "2026-05-28T08:00:00Z"
  },
  {
    id: "ann-2",
    senderName: "Profª. Nébia",
    senderRole: "professor",
    title: "Feira de Ciências e Sustentabilidade",
    text: "Atenção professores! Já definimos os temas da Feira de Ciências para o 9º Ano A. Teremos montagens de robótica básica e exposição das ecogarrafas pet. Vamos coordenar a arrumação das mesas na quadra poliesportiva na sexta-feira.",
    category: "Pedagógico",
    timestamp: "2026-05-29T10:30:00Z"
  },
  {
    id: "ann-3",
    senderName: "Direção Escolar (Pedagógico)",
    senderRole: "direcao",
    title: "Prazo para Lançamento de Notas",
    text: "Lembramos a todos os docentes que o prazo máximo no sistema acadêmico para inserção das notas e detalhamento dos relatórios de faltas encerra na próxima quarta-feira (03/06). Qualquer dificuldade pontual contatar a coordenação.",
    category: "Urgente",
    timestamp: "2026-05-30T09:15:00Z"
  }
];

// Lazy-loaded GenAI client getter to avoid module-load crashes if key is omitted
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in the Settings > Secrets configuration.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// In-memory mock database populated with engaging initial educational data
let activitiesList: Activity[] = [
  {
    id: "act-1",
    title: "Equações de Segundo Grau no Cotidiano",
    description: "Pesquise e descreva uma situação prática onde equações de segundo grau (trajetórias de projéteis, pontes, economia, etc.) são aplicadas. Resolva também os exercícios 1 a 5 da página 42 do livro didático.",
    subject: "Matemática",
    createdBy: "Prof. Mailk",
    createdAt: "2026-05-25T14:00:00Z",
    dueDate: "2026-06-05T23:59:59Z",
    turma: "9º Ano A - Ensino Fundamental II",
    submissions: [
      {
        studentName: "Ana Souza",
        submittedAt: "2026-05-26T18:30:00Z",
        content: "Eu escolhi a trajetória de uma bola de futebol sendo chutada. A equação que define sua altura y em metros em função da distância x é y = -0.05x² + x. O chute alcança o ponto mais alto (vértice da parábola) na metade da distância total. Para os exercícios resolvidos: 1) x=2 ou x=3, 2) x=-5 ou x=5, 3) x=0 ou x=4, 4) x=1, 5) x=-2 ou x=-3.",
        status: "Entregue"
      }
    ]
  },
  {
    id: "act-2",
    title: "Trabalho Dirigido: O Espaço Geográfico e a Globalização",
    description: "Escreva uma reflexão sobre como os fluxos de informação, mercadorias e pessoas redefiniram o conceito de fronteiras no mundo globalizado atual. Destaque um caso prático nacional.",
    subject: "Geografia",
    createdBy: "Prof. Marcos",
    createdAt: "2026-05-26T09:00:00Z",
    dueDate: "2026-06-12T23:59:59Z",
    turma: "9º Ano A - Ensino Fundamental II",
    submissions: []
  },
  {
    id: "act-3",
    title: "Relatório: Ecossistema Fechado e Ciclo Biótico",
    description: "Descreva as interações observadas entre fatores bióticos e abióticos no mini-ecossistema montado em garrafa pet. Explique o ciclo interno da água e a relevância das plantas autótrofas.",
    subject: "Ciências",
    createdBy: "Profª. Nébia",
    createdAt: "2026-05-20T10:00:00Z",
    dueDate: "2026-05-26T12:00:00Z",
    turma: "9º Ano A - Ensino Fundamental II",
    submissions: [
      {
        studentName: "Ana Souza",
        submittedAt: "2026-05-25T11:15:00Z",
        content: "Relatório de Ciências: O ecossistema fechado permaneceu estável. Houve condensação nas paredes (ciclo da água). As plantas sobreviveram graças à reciclagem de dióxido de carbono pelas reações metabólicas.",
        grade: "9.8",
        feedback: "Excelente relatório, Ana! A análise das relações ecológicas em escala micro foi o ponto forte do seu trabalho. Parabéns!",
        status: "Corrigido"
      }
    ]
  }
];

let absenceJustifications: AbsenceJustification[] = [
  {
    id: "just-1",
    studentName: "Ana Souza",
    subject: "Matemática",
    professorName: "Prof. Mailk",
    date: "2026-05-22",
    reason: "Atestado Médico (Consulta Dental)",
    description: "Tive uma consulta odontológica agendada para sexta-feira de manhã para manutenção do aparelho ortodôntico e acabei perdendo as duas primeiras aulas. Segue anotação da clínica em anexo virtual.",
    status: "Aceito",
    feedback: "Justificativa aceita, Ana! Lembre de copiar a matéria com os colegas e fazer os exercícios recomendados.",
    createdAt: "2026-05-22T14:30:00Z"
  }
];

let chatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    channelId: "mailk-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Mailk, estou com uma dúvida no passo a passo da fórmula de Bhaskara para a questão 4 da atividade.",
    timestamp: "2026-05-26T15:20:00Z"
  },
  {
    id: "msg-2",
    channelId: "mailk-ana",
    senderRole: "professor",
    senderName: "Prof. Mailk",
    text: "Olá Ana! O segredo do exercício 4 é identificar corretamente que o coeficiente b é negativo, o que faz com que '-b' na fórmula acabe ficando positivo em -(-b). Quer que eu te envie um exemplo similar?",
    timestamp: "2026-05-26T15:25:00Z"
  },
  {
    id: "msg-3",
    channelId: "mailk-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Ah! Entendi perfeitamente. O sinal estava me atrapalhando. Consegui terminar a atividade e acabei de enviar!",
    timestamp: "2026-05-26T18:29:00Z"
  },
  {
    id: "msg-4",
    channelId: "jucimar-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Jucimar, o texto dissertativo pode ter citações a filósofos ou é melhor focar na tese direta?",
    timestamp: "2026-05-27T10:00:00Z"
  },
  {
    id: "msg-5",
    channelId: "jucimar-ana",
    senderRole: "professor",
    senderName: "Prof. Jucimar",
    text: "Bom dia Ana! Uma alusão filosófica embeleza muito a introdução e mostra repertório sociocultural. Mas lembre de relacionar com a tese de modo fluído nas linhas seguintes.",
    timestamp: "2026-05-27T10:08:00Z"
  },
  {
    id: "msg-6",
    channelId: "fabio-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Fábio, o trabalho sobre a Revolução Industrial pode ser feito em tópicos ou precisa de texto corrido?",
    timestamp: "2026-05-25T14:30:00Z"
  },
  {
    id: "msg-7",
    channelId: "fabio-ana",
    senderRole: "professor",
    senderName: "Prof. Fábio",
    text: "Olá Ana! Prefiro em texto corrido estruturado com introdução, desenvolvimento e conclusão. Isso ajuda a fortalecer sua capacidade argumentativa e de escrita histórica.",
    timestamp: "2026-05-25T14:45:00Z"
  },
  {
    id: "msg-8",
    channelId: "marcos-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Marcos, na questão 2 do trabalho de Globalização, a velocidade das redes de fibra óptica entra como fluxo de informação ou de capitais?",
    timestamp: "2026-05-26T16:10:00Z"
  },
  {
    id: "msg-9",
    channelId: "marcos-ana",
    senderRole: "professor",
    senderName: "Prof. Marcos",
    text: "Oi Ana! Ela é uma infraestrutura que serve diretamente ao fluxo de comunicação e informação. Por sua vez, esse canal imediato viabiliza o fluxo financeiro de capitais mundiais. Portanto, os conceitos estão interligados de forma íntima!",
    timestamp: "2026-05-26T16:18:00Z"
  },
  {
    id: "msg-10",
    channelId: "nebia-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professora Nébia, no mini-ecossistema de garrafa pet, devo regar as plantas novamente se notar que a terra está muito úmida?",
    timestamp: "2026-05-25T09:12:00Z"
  },
  {
    id: "msg-11",
    channelId: "nebia-ana",
    senderRole: "professor",
    senderName: "Profª. Nébia",
    text: "Oi Ana! De forma alguma. A umidade constante nas paredes indica que o ciclo da água está auto-sustentável dentro da garrafa pet fechada. Se você regar mais, poderá apodrecer as raízes das mudas.",
    timestamp: "2026-05-25T09:28:00Z"
  },
  {
    id: "msg-12",
    channelId: "mailk-orientado-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Mailk, estou montando meu cronograma semanal de estudos, tem alguma dica especial?",
    timestamp: "2026-05-27T08:00:00Z"
  },
  {
    id: "msg-13",
    channelId: "mailk-orientado-ana",
    senderRole: "professor",
    senderName: "Prof. Mailk",
    text: "Excelente iniciativa, Ana! Separe blocos focados de 40 minutos com descansos curtos de 5 minutos (técnica Pomodoro) e comece sempre pelas matérias em que sente maior dificuldade.",
    timestamp: "2026-05-27T08:15:00Z"
  },
  {
    id: "msg-14",
    channelId: "marcos-desportiva-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Marcos, nas regras do futsal escolar, o goleiro pode segurar a bola com as mãos se ela for recuada com os pés por mim?",
    timestamp: "2026-05-24T15:00:00Z"
  },
  {
    id: "msg-15",
    channelId: "marcos-desportiva-ana",
    senderRole: "professor",
    senderName: "Prof. Marcos",
    text: "Olá Ana! Não pode. Se você recuar a bola intencionalmente usando o pé, o goleiro só poderá jogar com os pés. Se ele pegar com as mãos dentro da área, será marcado um tiro livre indireto para o adversário.",
    timestamp: "2026-05-24T15:30:00Z"
  },
  {
    id: "msg-16",
    channelId: "nebia-cientifica-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professora Nébia, o tema do meu projeto de pesquisa científica precisa ser necessariamente de biologia ou de ciências?",
    timestamp: "2026-05-25T11:42:00Z"
  },
  {
    id: "msg-17",
    channelId: "nebia-cientifica-ana",
    senderRole: "professor",
    senderName: "Profª. Nébia",
    text: "Olá Ana! Na Iniciação Científica você pode propor um tema de qualquer área, contanto que siga o método científico rigorosamente: pergunta disparadora, hipóteses, metodologia prática e referências sólidas.",
    timestamp: "2026-05-25T12:00:00Z"
  },
  {
    id: "msg-18",
    channelId: "jucimar-orientado-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Jucimar, como faço para manter a concentração nos momentos de leitura longa em casa?",
    timestamp: "2026-05-27T11:00:00Z"
  },
  {
    id: "msg-19",
    channelId: "jucimar-orientado-ana",
    senderRole: "professor",
    senderName: "Prof. Jucimar",
    text: "Oi Ana! Uma ótima técnica é afastar as distrações visuais (guardar celular na gaveta) e fazer anotações em papel das ideias principais a cada capítulo lido. Ajuda muito a manter a mente ativa!",
    timestamp: "2026-05-27T11:15:00Z"
  },
  {
    id: "msg-20",
    channelId: "george-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor George, o uso do 'Present Perfect' sempre exige a menção do tempo exato em que algo ocorreu no passado?",
    timestamp: "2026-05-26T17:15:00Z"
  },
  {
    id: "msg-21",
    channelId: "george-ana",
    senderRole: "professor",
    senderName: "Prof. George",
    text: "Hi Ana! É o oposto. O Present Perfect foca no resultado ou na experiência de uma ação, e o momento exato em que ela aconteceu NÃO é mencionado. Se você disser um tempo exato (como 'yesterday'), deve usar o Simple Past!",
    timestamp: "2026-05-26T17:35:00Z"
  },
  {
    id: "msg-22",
    channelId: "george-religioso-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor George, qual será o tema de debate na próxima roda de Ensino Religioso?",
    timestamp: "2026-05-26T18:00:00Z"
  },
  {
    id: "msg-23",
    channelId: "george-religioso-ana",
    senderRole: "professor",
    senderName: "Prof. George",
    text: "Olá Ana! Discutiremos os valores comuns de tolerância, resiliência e respeito ao próximo compartilhados por variadas tradições éticas e espirituais no mundo. Leia o artigo 1 da folha distribuída na terça para se embasar!",
    timestamp: "2026-05-26T18:20:00Z"
  },
  {
    id: "msg-24",
    channelId: "ewerton-ana",
    senderRole: "aluno",
    senderName: "Ana Souza",
    text: "Professor Ewerton, a frequência cardíaca média durante uma corrida leve de aquecimento varia muito entre nós estudantes?",
    timestamp: "2026-05-25T16:15:00Z"
  },
  {
    id: "msg-25",
    channelId: "ewerton-ana",
    senderRole: "professor",
    senderName: "Prof. Ewerton",
    text: "Com certeza, Ana! Depende do condicionamento de cada um e da idade escolar. Usamos a zona de intensidade moderada (cerca de 130 a 160 batimentos por minuto) para um aquecimento aeróbico seguro.",
    timestamp: "2026-05-25T16:40:00Z"
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get all activities
  app.get("/api/activities", (req, res) => {
    res.json(activitiesList);
  });

  // API Route: Teacher creates new activity
  app.post("/api/activities", requireRole('professor'), (req, res) => {
    const { title, description, subject, createdBy, dueDate, turma } = req.body;
    
    if (!title || !description || !subject || !createdBy || !dueDate) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios para criar a atividade." });
    }

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title,
      description,
      subject,
      createdBy,
      createdAt: new Date().toISOString(),
      dueDate,
      submissions: [],
      turma: turma || "9º Ano A - Ensino Fundamental II"
    };

    activitiesList.push(newActivity);
    res.status(201).json(newActivity);
  });

  // API Route: Student submits activity response
  app.post("/api/activities/:id/submit", requireRole('aluno'), (req, res) => {
    const { id } = req.params;
    const { studentName, content, photo, pdfName, pdfData } = req.body;

    if (!studentName || (!content && !photo && !pdfData)) {
      return res.status(400).json({ error: "Nome do aluno e o conteúdo da entrega, foto ou arquivo PDF são obrigatórios." });
    }

    const activityIndex = activitiesList.findIndex(a => a.id === id);
    if (activityIndex === -1) {
      return res.status(404).json({ error: "Atividade não encontrada." });
    }

    const activity = activitiesList[activityIndex];
    if (activity.dueDate) {
      const isPastDueDate = new Date() > new Date(activity.dueDate);
      if (isPastDueDate) {
        return res.status(400).json({ error: "O prazo limite estabelecido pelo professor para a entrega desta atividade expirou." });
      }
    }

    // Check if student already submitted to overwrite or add
    const existingSubmissionIndex = activitiesList[activityIndex].submissions.findIndex(
      s => s.studentName === studentName
    );

    const submission: Submission = {
      studentName,
      submittedAt: new Date().toISOString(),
      content: content || (pdfName ? `Resolução enviada por arquivo PDF: ${pdfName}` : "Resolução enviada por foto da câmera."),
      status: "Entregue",
      photo: photo || undefined,
      pdfName: pdfName || undefined,
      pdfData: pdfData || undefined
    };

    if (existingSubmissionIndex !== -1) {
      // Keep old grade and feedback if updating? Let's reset status to 'Entregue'
      const oldSub = activitiesList[activityIndex].submissions[existingSubmissionIndex];
      submission.grade = oldSub.grade;
      submission.feedback = oldSub.feedback;
      if (oldSub.grade) {
        submission.status = "Corrigido";
      }
      activitiesList[activityIndex].submissions[existingSubmissionIndex] = submission;
    } else {
      activitiesList[activityIndex].submissions.push(submission);
    }

    res.json(activitiesList[activityIndex]);
  });

  // API Route: Teacher grades/feedback submission or assigns direct grade to student by name
  app.post("/api/activities/:activityId/submissions/:studentName/grade", requireRole('professor'), (req, res) => {
    const { activityId, studentName } = req.params;
    const { grade, feedback } = req.body;

    let activityIndex = activitiesList.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      if (activitiesList.length === 0) {
        const defaultAct: Activity = {
          id: "act-default",
          title: "Avaliação Geral de Desempenho - 9º Ano A",
          description: "Diário eletrônico de notas e conceitos do 9º Ano A.",
          subject: "Geral",
          createdBy: "Prof. Mailk",
          createdAt: new Date().toISOString(),
          dueDate: "2026-12-31T23:59:59Z",
          turma: "9º Ano A - Ensino Fundamental II",
          submissions: []
        };
        activitiesList.push(defaultAct);
        activityIndex = 0;
      } else {
        activityIndex = 0;
      }
    }

    const cleanStudentName = decodeURIComponent(studentName).trim();
    const subIndex = activitiesList[activityIndex].submissions.findIndex(
      s => s.studentName.toLowerCase().trim() === cleanStudentName.toLowerCase()
    );

    if (subIndex === -1) {
      // Create new submission for student directly assigned by teacher
      const newSubmission: Submission = {
        studentName: cleanStudentName,
        submittedAt: new Date().toISOString(),
        content: "Nota lançada diretamente pelo professor no diário de classe do 9º Ano.",
        grade: String(grade),
        feedback: feedback || "Nota atribuída na avaliação do 9º Ano.",
        status: "Corrigido"
      };
      activitiesList[activityIndex].submissions.push(newSubmission);
    } else {
      activitiesList[activityIndex].submissions[subIndex].grade = String(grade);
      activitiesList[activityIndex].submissions[subIndex].feedback = feedback || "";
      activitiesList[activityIndex].submissions[subIndex].status = "Corrigido";
    }

    res.json(activitiesList[activityIndex]);
  });

  // Direct endpoint to grade student by name
  app.post("/api/activities/:activityId/grade-student", requireRole('professor'), (req, res) => {
    const { activityId } = req.params;
    const { studentName, grade, feedback } = req.body;

    if (!studentName || grade === undefined || grade === null) {
      return res.status(400).json({ error: "Nome do aluno e nota são obrigatórios." });
    }

    let activityIndex = activitiesList.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      if (activitiesList.length === 0) {
        const defaultAct: Activity = {
          id: "act-default",
          title: "Avaliação Geral de Desempenho - 9º Ano A",
          description: "Diário eletrônico de notas e conceitos do 9º Ano A.",
          subject: "Geral",
          createdBy: "Prof. Mailk",
          createdAt: new Date().toISOString(),
          dueDate: "2026-12-31T23:59:59Z",
          turma: "9º Ano A - Ensino Fundamental II",
          submissions: []
        };
        activitiesList.push(defaultAct);
        activityIndex = 0;
      } else {
        activityIndex = 0;
      }
    }

    const cleanStudentName = studentName.trim();
    const subIndex = activitiesList[activityIndex].submissions.findIndex(
      s => s.studentName.toLowerCase().trim() === cleanStudentName.toLowerCase()
    );

    if (subIndex === -1) {
      const newSubmission: Submission = {
        studentName: cleanStudentName,
        submittedAt: new Date().toISOString(),
        content: "Nota lançada diretamente pelo professor no diário de classe do 9º Ano.",
        grade: String(grade),
        feedback: feedback || "Nota atribuída pelo professor.",
        status: "Corrigido"
      };
      activitiesList[activityIndex].submissions.push(newSubmission);
    } else {
      activitiesList[activityIndex].submissions[subIndex].grade = String(grade);
      activitiesList[activityIndex].submissions[subIndex].feedback = feedback || "";
      activitiesList[activityIndex].submissions[subIndex].status = "Corrigido";
    }

    res.json(activitiesList[activityIndex]);
  });

  // API Routes: Absence Justifications (Justificativas de Falta)
  app.get("/api/justifications", (req, res) => {
    res.json(absenceJustifications);
  });

  app.post("/api/justifications", requireRole('aluno'), (req, res) => {
    const { studentName, subject, professorName, date, reason, description, evidencePhoto } = req.body;
    
    if (!studentName || !subject || !professorName || !date || !reason || !description) {
      return res.status(400).json({ error: "Por favor, preencha todos os campos obrigatórios." });
    }

    const newJustification: AbsenceJustification = {
      id: `just-${Date.now()}`,
      studentName,
      subject,
      professorName,
      date,
      reason,
      description,
      evidencePhoto,
      status: "Pendente",
      createdAt: new Date().toISOString()
    };

    absenceJustifications.push(newJustification);
    res.status(201).json(newJustification);
  });

  app.post("/api/justifications/:id/respond", requireRole('professor'), (req, res) => {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!status || !["Aceito", "Recusado"].includes(status)) {
      return res.status(400).json({ error: "Status inválido. Escolha 'Aceito' ou 'Recusado'." });
    }

    const justIndex = absenceJustifications.findIndex(j => j.id === id);
    if (justIndex === -1) {
      return res.status(404).json({ error: "Justificativa de falta não encontrada." });
    }

    absenceJustifications[justIndex].status = status as 'Aceito' | 'Recusado';
    absenceJustifications[justIndex].feedback = feedback || "";

    res.json(absenceJustifications[justIndex]);
  });

  // API Route: Get all chat messages
  app.get("/api/chats", (req, res) => {
    res.json(chatMessages);
  });

  // API Route: Send a new chat message
  app.post("/api/chats/send", (req, res) => {
    const { channelId, senderRole, senderName, text, image } = req.body;

    if (!channelId || !senderRole || !senderName || (!text && !image)) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId,
      senderRole,
      senderName,
      text: text || "📷 [Foto de Atividade Anexada]",
      image,
      timestamp: new Date().toISOString()
    };

    chatMessages.push(newMessage);
    res.status(201).json(newMessage);
  });

  // API Route: Get all Announcements (Avisos)
  app.get("/api/announcements", (req, res) => {
    res.json(announcementsList);
  });

  // API Route: Send a new Announcement (Avisos)
  app.post("/api/announcements", requireRole('professor'), (req, res) => {
    const { senderName, senderRole, title, text, category } = req.body;

    if (!senderName || !senderRole || !title || !text || !category) {
      return res.status(400).json({ error: "Faltam informações obrigatórias para postar o aviso." });
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      senderName,
      senderRole,
      title,
      text,
      category,
      timestamp: new Date().toISOString()
    };

    announcementsList.push(newAnnouncement);
    res.status(201).json(newAnnouncement);
  });

  // API Route: Secure AI Academic Tutor endpoint
  app.post("/api/academic-ai", async (req, res) => {
    const { message, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    try {
      const ai = getGenAI();

      // Implement highly safe educational-focused system guidelines in Portuguese
      const systemInstruction = 
        `Você é um Tutor de Estudos Inteligente focado EXCLUSIVAMENTE em auxílio acadêmico, escolar e científico para alunos e professores.
        Sua missão é ajudar a tirar dúvidas de disciplinas como Matemática, Física, Química, Biologia, História, Geografia, Filosofia, Redação, Língua Portuguesa e Literatura de forma didática, assertiva e encorajadora.

        REGRAS CRÍTICAS DE SEGURANÇA E ESCOPO:
        1. Responda APENAS a perguntas estritamente acadêmicas, de matérias escolares, dúvidas conceituais, orientação de redação ou auxílio em exercícios de estudo.
        2. Recuse educadamente qualquer pedido não relacionado a estudos ou disciplinas escolares (exemplos de recusa: fofoca de celebridades, segredos de videogames, piadas impróprias, receitas de cozinha mundanas, programar jogos do zero não educacionais, ou bate-papo informal sem fins didáticos).
        3. Se o assunto for FORA do escopo, você deve mandar exatamente uma mensagem como essa ou similar na essência:
           "Olá! Como sou um Tutor de Estudos focado estritamente em auxílio acadêmico e matérias de aula, não posso conversar sobre esse assunto. Que tal fazermos uma pergunta sobre Matemática, Física, História, Redação ou outra matéria escolar?"
        4. Ajude o usuário a compreender o raciocínio por trás de uma questão. Ensine o passo a passo de exercícios matemáticos ou científicos em vez de simplesmente cuspir a resposta final diretamente, incentivando o aprendizado seguro.
        5. Se o aluno pedir para você resolver uma questão inteira, forneça dicas, explique a fórmula e dê um exemplo resolvido semelhante, depois guie o aluno para que ele faça o seu exercício.
        6. Suas respostas devem ser claras, bem formatadas em Markdown simples (uso de listas, negritos) e em idioma Português do Brasil.
        7. REQUISITO CRÍTICO DE FORMATAÇÃO: NUNCA use notação matemática LaTeX complexa (como $$, \[, \], \(, \), \frac, \sqrt, \pm). Em vez disso, use texto puro e símbolos matemáticos comuns de fácil leitura por qualquer ser humano (por exemplo, use 'x = (-b ± √Δ) / 2a', 'x²', 'H2O', 'sqrt(x)', '/' para frações, '*' para multiplicação). Isso evita caracteres estranhos e facilita muito a interpretação em dispositivos móveis e navegadores comuns!`;

      // Build chat contents array
      const contentsParts: any[] = [];
      
      // Map historical chat properly
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.slice(-10).forEach((historyMsg: any) => {
          contentsParts.push({
            role: historyMsg.role,
            parts: [{ text: historyMsg.text }]
          });
        });
      }

      // Add the final student message with optional camera image
      const finalParts: any[] = [];
      if (req.body.image) {
        // req.body.image should be a base64 encoded string
        const mimeType = req.body.imageMimeType || "image/jpeg";
        finalParts.push({
          inlineData: {
            mimeType,
            data: req.body.image
          }
        });
      }
      finalParts.push({ text: message });

      contentsParts.push({
        role: "user",
        parts: finalParts
      });

      // Call Gemini 3.5 Flash for speed, efficiency and robust general reasoning tasks
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsParts,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3, // Low temperature for high precision and compliance with safety rules
        }
      });

      const responseText = response.text || "Desculpe, não consegui processar essa resposta.";

      // Check if prompt was declined
      const blockTriggers = [
        "não posso conversar sobre esse assunto",
        "focado estritamente em auxílio acadêmico", 
        "não posso responder sobre",
        "fora do escopo"
      ];
      const isDeclined = blockTriggers.some(trigger => responseText.toLowerCase().includes(trigger));

      res.json({
        text: responseText,
        isDeclined: isDeclined
      });

    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ 
        error: "Erro do Tutor de Estudos IA. Verifique se a chave GEMINI_API_KEY está configurada adequadamente.",
        details: err.message
      });
    }
  });

  // API Route: Generate 5 Study Flashcards using Gemini AI (with complete fallback)
  app.post("/api/flashcards/generate", async (req, res) => {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Matéria não fornecida." });
    }

    // Helper function for Portuguese standard fallback study decks
    function getFallbackFlashcards(sub: string) {
      const normalized = sub.toLowerCase().trim();
      if (normalized.includes("matemática") || normalized.includes("matematica")) {
        return [
          {
            question: "Qual é o Teorema de Pitágoras?",
            answer: "a² + b² = c²",
            explanation: "Em qualquer triângulo retângulo, a soma dos quadrados dos catetos (a e b) é igual ao quadrado da hipotenusa (c)."
          },
          {
            question: "Como é calculada a Área de um Triângulo?",
            answer: "Área = (Base * Altura) / 2",
            explanation: "Dividimos por 2 porque um triângulo é equivalente à metade de um paralelogramo com a mesma base e altura."
          },
          {
            question: "Qual é a fórmula para encontrar as raízes de uma Equação do 2º Grau?",
            answer: "Fórmula de Bhaskara: x = (-b ± √Δ) / 2a, onde Δ = b² - 4ac",
            explanation: "Delta (Δ) indica o número de raízes: se for positivo, são duas reais distintas; zero, uma única raiz; se for negativo, nenhuma raiz real."
          },
          {
            question: "O que é um Número Primo?",
            answer: "Um número inteiro maior que 1 que possui apenas dois divisores: ele mesmo e o número 1.",
            explanation: "Exemplos de números primos: 2 (único primo par), 3, 5, 7, 11, 13, 17, 19, etc."
          },
          {
            question: "O que é a Razão Áurea?",
            answer: "Uma constante real representada pela letra grega Phi (φ), de valor aproximado 1.618.",
            explanation: "É considerada sinônimo de harmonia estética e proporção ideal, aparecendo com frequência na natureza e na arte clássica."
          }
        ];
      } else if (normalized.includes("português") || normalized.includes("portugues") || normalized.includes("língua") || normalized.includes("lingua")) {
        return [
          {
            question: "O que é uma Oração Coordenada Assindética?",
            answer: "Uma oração que não é introduzida por nenhuma conjunção conectiva.",
            explanation: "Exemplo clássico: 'Vim, vi, venci'. As orações aparecem justapostas e separadas apenas por sinais de pontuação."
          },
          {
            question: "Qual é a diferença entre Conotação e Denotação?",
            answer: "Denotação é o sentido literal/real do dicionário. Conotação é o sentido figurado/poético/contextual.",
            explanation: "Dica de memorização: 'D' de Denotação lembra 'Dicionário' (literal), e 'C' de Conotação lembra 'Criatividade' (figurado)."
          },
          {
            question: "O que é uma Metáfora?",
            answer: "Uma figura de linguagem baseada em uma comparação implícita, sem o termo conectivo 'como'.",
            explanation: "Exemplo: 'Ele é um leão nos negócios' (metáfora). Se dissermos 'Ele luta COMO um leão', teremos uma Comparação direta."
          },
          {
            question: "Quando ocorre a Crase na Língua Portuguesa?",
            answer: "Na fusão da preposição 'a' com o artigo feminino 'a' (a + a = à) ou pronomes demonstrativos.",
            explanation: "Regra básica: ocorre antes de termos femininos quando o verbo/nome exige preposição 'a' e o termo seguinte aceita o artigo."
          },
          {
            question: "O que é a Voz Passiva Analítica?",
            answer: "Uma estrutura verbal formada por: Sujeito Paciente + Verbo Auxiliar (Ser/Estar) + Particípio + Agente da Passiva.",
            explanation: "Exemplo: 'A prova foi resolvida pela aluna'. O sujeito (A prova) recebe a ação realizada pelo agente (pela aluna)."
          }
        ];
      } else if (normalized.includes("história") || normalized.includes("historia")) {
        return [
          {
            question: "Qual evento marcou o início da Revolução Francesa em 1789?",
            answer: "A Queda da Bastilha (14 de Julho de 1789).",
            explanation: "A Bastilha era uma prisão fortaleza que simbolizava o poder absoluto e autoritário do Antigo Regime monárquico francês."
          },
          {
            question: "Quem foi o primeiro Imperador do Brasil?",
            answer: "Dom Pedro I (proclamador da independência em 1822).",
            explanation: "Ele governou o Primeiro Reinado até sua abdicação em 1831 em favor de seu filho, que seria Dom Pedro II."
          },
          {
            question: "O que foi o Tratado de Tordesilhas de 1494?",
            answer: "Um acordo entre Portugal e Espanha dividindo as terras descobertas e por descobrir fora da Europa.",
            explanation: "Definiu um meridiano a 370 léguas das ilhas de Cabo Verde, permitindo que Portugal colonizasse o leste da América do Sul."
          },
          {
            question: "O que caracterizou o período da Guerra Fria?",
            answer: "Disputa ideológica, militar e tecnológica global entre os blocos liderados por EUA (Capitalista) e URSS (Socialista).",
            explanation: "Durou de 1947 a 1991, sendo 'fria' porque nunca houve um confronto militar direto em larga escala entre as duas superpotências."
          },
          {
            question: "Qual civilização antiga desenvolveu a Democracia?",
            answer: "A civilização grega, especificamente na cidade-estado de Atenas.",
            explanation: "Diferente da democracia moderna, em Atenas era direta (os cidadãos aptos votavam pessoalmente na Ágora) e excludente."
          }
        ];
      } else if (normalized.includes("ciências") || normalized.includes("ciencias") || normalized.includes("biologia") || normalized.includes("química") || normalized.includes("física")) {
        return [
          {
            question: "Qual é a função básica da Mitocôndria?",
            answer: "Realizar a Respiração Celular para gerar energia na forma de moléculas de ATP.",
            explanation: "Atua como a verdadeira 'usina energética' das células eucarióticas animais e vegetais."
          },
          {
            question: "Quais são as bases nitrogenadas que formam o DNA?",
            answer: "Adenina (A), Timina (T), Citosina (C) e Guanina (G).",
            explanation: "Elas sempre se emparelham de forma específica: Adenina com Timina (A-T) e Citosina com Guanina (C-G)."
          },
          {
            question: "O que é a Fotossíntese?",
            answer: "Processo em que plantas e algas convertem água, gás carbônico e luz solar em glicose e oxigênio.",
            explanation: "Ocorre nos cloroplastos com auxílio do pigmento clorofila, sendo essencial para manter a vida autotrófica na Terra."
          },
          {
            question: "Qual é a diferença fundamental entre Células Procariontes e Eucariontes?",
            answer: "Procariontes NÃO têm núcleo delimitado (material genético fica solto). Eucariontes POSSUEM núcleo organizado.",
            explanation: "Bactérias são procariontes clássicos. Animais, plantas e fungos são compostos por células eucariontes complexas."
          },
          {
            question: "Qual é a lei fundamental da Gravitação Universal de Newton?",
            answer: "Matéria atrai matéria na razão direta de suas massas e inversa do quadrado da distância entre elas.",
            explanation: "Essa atração mútua invisível explica desde a queda de uma maçã até a órbita da Lua ao redor do planeta Terra."
          }
        ];
      } else {
        return [
          {
            question: "Como funciona a memorização ativa (Active Recall)?",
            answer: "Estimular o cérebro a recuperar ativamente a informação de cabeça, em vez de apenas reler as anotações de forma passiva.",
            explanation: "Praticar com flashcards e testes rápidos força o cérebro a fortalecer as conexões neurais da memória de longo prazo."
          },
          {
            question: "O que diz a Lei de Conservação das Massas (Lei de Lavoisier)?",
            answer: "'Na natureza, nada se cria, nada se perde, tudo se transforma.'",
            explanation: "Significa que em uma reação química fechada, a massa total dos reagentes é exatamente igual à massa total dos produtos obtidos."
          },
          {
            question: "Qual é a importância da Revisão Espaçada (Spaced Repetition)?",
            answer: "Revisar os conteúdos em intervalos de tempo cada vez maiores para combater a Curva do Esquecimento natural do cérebro.",
            explanation: "Em vez de estudar tudo de uma vez antes da prova, revisar 1, 3, 7 e 30 dias depois garante fixação total e duradoura."
          },
          {
            question: "Como uma Redação do ENEM deve ser estruturada?",
            answer: "Em 4 parágrafos principais: Introdução (com tese), Desenvolvimento 1 (argumento 1), Desenvolvimento 2 (argumento 2) e Conclusão (proposta de intervenção).",
            explanation: "A proposta de intervenção exige detalhar: Agente, Ação, Meio/Modo, Efeito e um detalhamento adicional bem estruturado."
          },
          {
            question: "O que é o Método Feynman para Estudos?",
            answer: "Explicar um assunto complexo usando suas próprias palavras e uma linguagem ultra simples, como se estivesse ensinando uma criança de 10 anos.",
            explanation: "Isso ajuda a identificar furos na sua compreensão do assunto e consolida o conhecimento profundamente."
          }
        ];
      }
    }

    try {
      const ai = getGenAI();

      const systemInstruction = 
        `Você é um assistente gerador de flashcards acadêmicos de alta qualidade.
        Você deve gerar EXATAMENTE 5 flashcards de estudo ativo em formato JSON para a matéria fornecida pelo usuário.
        
        Você deve responder estritamente com uma array JSON válida contendo objetos com as seguintes propriedades:
        - "question": Pergunta para estudo ativa, curta, instigante e objetiva.
        - "answer": Resposta concisa e direta para conferência rápida.
        - "explanation": Explicação didática complementar de fixação rápida (máximo 2 linhas).

        REQUISITO CRÍTICO DE FORMATAÇÃO: NUNCA use expressões LaTeX matemáticas complexas (como $$, \\[, \\], \\frac, \\sqrt, etc.). Use símbolos comuns fáceis de ler por qualquer ser humano (por exemplo, use 'x²', 'sqrt(x)', '/' para frações).
        Não envolva a resposta com crases ou blocos markdown de código (como \`\`\`json). Comece diretamente com '[' e termine com ']'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: `Gere 5 flashcards excelentes para a matéria: ${subject}` }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
        }
      });

      const responseText = response.text || "";
      let cleanText = responseText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const deck = JSON.parse(cleanText);
      if (Array.isArray(deck) && deck.length > 0) {
        return res.json({ success: true, deck: deck.slice(0, 5), method: "ai" });
      } else {
        throw new Error("Invalid format received");
      }

    } catch (err: any) {
      console.warn("Utilizando baralho escolar padrão (Fallback) devido a:", err.message);
      // Fallback safely to Portuguese presets
      const fallbackDeck = getFallbackFlashcards(subject);
      return res.json({ success: true, deck: fallbackDeck, method: "fallback" });
    }
  });

  // Report Card endpoints
  app.get("/api/report-card", (req, res) => {
    res.json(reportCardGrades);
  });

  app.post("/api/report-card", express.json({ limit: "2mb" }), requireRole('professor'), (req, res) => {
    const { studentName, turma, subject, bimestre, examGrade, frequency } = req.body;
    
    // Check if entry already exists, then update or create
    const existingIndex = reportCardGrades.findIndex(
      (g) => g.studentName === studentName && g.subject === subject && g.bimestre === bimestre
    );

    const gradeEntry: ReportCardGrade = {
      id: `rg-${Date.now()}`,
      studentName,
      turma,
      subject,
      bimestre,
      examGrade: Number(examGrade),
      frequency: Number(frequency),
    };

    if (existingIndex >= 0) {
      gradeEntry.id = reportCardGrades[existingIndex].id;
      reportCardGrades[existingIndex] = gradeEntry;
    } else {
      reportCardGrades.push(gradeEntry);
    }
    
    res.json({ success: true, gradeEntry });
  });

  // Vite middleware setup (bridges assets correctly in development vs production modes)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
