import { PersonalProfile, Student, SessionSchedule, Invoice, ChatMessage } from '../types';

// Utilitários de data para manter os dados sempre alinhados dinamicamente com o dia de teste
const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDate(d);
};

export const TODAY_STR = formatDate(new Date());

export const INITIAL_PERSONAL_PROFILE: PersonalProfile = {
  id: 'coach-1',
  name: 'Marcus Valério',
  title: 'Treinador de Alta Performance & Especialista em Fisiologia do Exercício',
  email: 'marcus.coach@fitcoach.pro',
  phone: '5511999887766',
  avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=faces',
  pixKey: 'marcus.coach@fitcoach.pro',
  pixType: 'EMAIL',
  cref: '045920-G/SP',
  bio: 'Mais de 10 anos transformando vidas através de treinamento periodizado, biomecânica aplicada e nutrição esportiva funcional.'
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-1',
    name: 'Lucas Andrade',
    email: 'lucas.andrade@gmail.com',
    phone: '5511987654321',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces',
    status: 'ATIVO',
    plan: 'MENSAL',
    monthlyFee: 380,
    dueDay: 25,
    paymentStatus: 'EM_DIA',
    startDate: '2025-10-10',
    primaryGoal: 'Hipertrofia Máxima & Definição',
    streakDays: 14,
    nextAssessmentDate: getRelativeDate(20),
    notes: 'Recuperado de leve tendinite no ombro direito. Priorizar aquecimento de manguito.',
    workouts: [
      {
        id: 'w1',
        name: 'Treino A - Peito, Deltoide Anterior e Tríceps',
        focus: 'Foco em Hipertrofia & Força de Empurrar',
        exercises: [
          { id: 'e1', name: 'Supino Reto com Barra', muscleGroup: 'Peitoral', sets: 4, reps: '8 a 10', load: '75 kg', notes: 'Manter escápulas aduzidas e descida controlada em 3s', completed: true },
          { id: 'e2', name: 'Supino Inclinado com Halteres', muscleGroup: 'Peitoral Superior', sets: 4, reps: '10 a 12', load: '28 kg cada', notes: 'Inclinação de 30 graus no banco', completed: true },
          { id: 'e3', name: 'Crucifixo na Polia Média', muscleGroup: 'Peitoral', sets: 3, reps: '12 a 15', load: '17.5 kg', notes: 'Pico de contração de 1s no centro', completed: false },
          { id: 'e4', name: 'Desenvolvimento Militar com Halteres', muscleGroup: 'Ombros', sets: 4, reps: '8 a 10', load: '22 kg cada', notes: 'Não hiperestender a lombar', completed: false },
          { id: 'e5', name: 'Elevação Lateral com Halteres', muscleGroup: 'Deltoide Lateral', sets: 4, reps: '12 a 15', load: '12 kg cada', notes: 'Braços levemente à frente no plano escapular', completed: false },
          { id: 'e6', name: 'Tríceps Corda no Cross', muscleGroup: 'Tríceps', sets: 4, reps: '10 a 12', load: '25 kg', notes: 'Abrir a corda no final da extensão', completed: false },
          { id: 'e7', name: 'Tríceps Francês Unilateral', muscleGroup: 'Tríceps', sets: 3, reps: '12 cada braço', load: '10 kg', notes: 'Cotovelo apontando para cima', completed: false },
        ]
      },
      {
        id: 'w2',
        name: 'Treino B - Costas, Deltoide Posterior e Bíceps',
        focus: 'Largura e Densidade Dorsal',
        exercises: [
          { id: 'e8', name: 'Puxada Frontal Pegada Aberta', muscleGroup: 'Dorsais', sets: 4, reps: '10 a 12', load: '65 kg', notes: 'Puxar até a altura do queixo com peito estufado', completed: false },
          { id: 'e9', name: 'Remada Curvada com Barra (Pronada)', muscleGroup: 'Costas / Romboides', sets: 4, reps: '8 a 10', load: '60 kg', notes: 'Tronco a 45 graus, coluna neutra', completed: false },
          { id: 'e10', name: 'Remada Baixa Triângulo', muscleGroup: 'Dorsais', sets: 3, reps: '12', load: '55 kg', notes: 'Alongar bem na volta sem curvar as costas', completed: false },
          { id: 'e11', name: 'Crucifixo Inverso no Peck Deck', muscleGroup: 'Deltoide Posterior', sets: 4, reps: '15', load: '35 kg', notes: 'Manter cotovelos na linha dos ombros', completed: false },
          { id: 'e12', name: 'Rosca Direta Barra W', muscleGroup: 'Bíceps', sets: 4, reps: '10', load: '24 kg', notes: 'Sem balançar o tronco', completed: false },
          { id: 'e13', name: 'Rosca Martelo com Halteres', muscleGroup: 'Braquial / Antebraço', sets: 3, reps: '12', load: '14 kg cada', notes: 'Excelente para espessura do braço', completed: false },
        ]
      },
      {
        id: 'w3',
        name: 'Treino C - Membros Inferiores Completo',
        focus: 'Potência e Hipertrofia de Quadríceps e Posterior',
        exercises: [
          { id: 'e14', name: 'Agachamento Livre com Barra', muscleGroup: 'Quadríceps / Glúteos', sets: 4, reps: '6 a 8', load: '90 kg', notes: 'Profundidade paralela ou além com segurança', completed: false },
          { id: 'e15', name: 'Leg Press 45 Graus', muscleGroup: 'Pernas', sets: 4, reps: '10 a 12', load: '220 kg', notes: 'Pés na largura dos ombros no meio da plataforma', completed: false },
          { id: 'e16', name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', sets: 3, reps: '12 a 15', load: '50 kg', notes: 'Drop set na última série', completed: false },
          { id: 'e17', name: 'Mesa Flexora', muscleGroup: 'Isquiotibiais', sets: 4, reps: '10 a 12', load: '40 kg', notes: 'Quadril colado no banco durante a flexão', completed: false },
          { id: 'e18', name: 'Stiff com Halteres', muscleGroup: 'Posterior / Glúteos', sets: 3, reps: '10 a 12', load: '24 kg cada', notes: 'Sentir o alongamento dos posteriores', completed: false },
          { id: 'e19', name: 'Gêmeos Sentado', muscleGroup: 'Panturrilhas', sets: 4, reps: '15 a 20', load: '45 kg', notes: 'Pausa de 2 segundos embaixo para anular reflexo elástico', completed: false },
        ]
      }
    ],
    measurements: [
      { id: 'm1', date: getRelativeDate(-75), weightKg: 82.5, heightCm: 178, bodyFatPercentage: 17.2, chestCm: 102, armsCm: 37.0, waistCm: 86, hipsCm: 101, thighsCm: 59 },
      { id: 'm2', date: getRelativeDate(-45), weightKg: 80.8, heightCm: 178, bodyFatPercentage: 15.6, chestCm: 103, armsCm: 37.8, waistCm: 83.5, hipsCm: 100, thighsCm: 60 },
      { id: 'm3', date: getRelativeDate(-15), weightKg: 79.4, heightCm: 178, bodyFatPercentage: 14.1, chestCm: 104.5, armsCm: 38.5, waistCm: 81.0, hipsCm: 99.5, thighsCm: 61.2 },
    ]
  },
  {
    id: 'student-2',
    name: 'Camila Rodrigues',
    email: 'camila.rodrigues@gmail.com',
    phone: '5511977771122',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    status: 'ATIVO',
    plan: 'TRIMESTRAL',
    monthlyFee: 340,
    dueDay: Number(getRelativeDate(3).split('-')[2]), // Vence em 3 dias!
    paymentStatus: 'VENCE_EM_BREVE',
    startDate: '2026-01-15',
    primaryGoal: 'Tonificação de Glúteos & Queima de Gordura',
    streakDays: 8,
    nextAssessmentDate: getRelativeDate(10),
    notes: 'Gosta de treinos intensos com descanso curto. Trabalha muito tempo sentada.',
    workouts: [
      {
        id: 'w4',
        name: 'Treino A - Inferiores com Ênfase em Glúteos & Posteriores',
        focus: 'Construção Glútea e Estabilidade de Quadril',
        exercises: [
          { id: 'e20', name: 'Elevação Pélvica com Barra', muscleGroup: 'Glúteos', sets: 4, reps: '10 a 12', load: '90 kg', notes: 'Segurar 2 segundos em cima contraindo forte', completed: false },
          { id: 'e21', name: 'Agachamento Búlgaro', muscleGroup: 'Glúteos / Quadríceps', sets: 3, reps: '10 cada perna', load: '12 kg cada haltere', notes: 'Tronco ligeiramente inclinado para frente', completed: false },
          { id: 'e22', name: 'Cadeira Abdutora (Tronco Inclinado)', muscleGroup: 'Glúteo Médio', sets: 4, reps: '15 a 20', load: '55 kg', notes: 'Controle na fase excêntrica', completed: false },
          { id: 'e23', name: 'RDL (Stiff Romeno)', muscleGroup: 'Posteriores', sets: 4, reps: '10 a 12', load: '45 kg', notes: 'Manter a barra colada nas pernas', completed: false },
        ]
      },
      {
        id: 'w5',
        name: 'Treino B - Superiores Completo & Core Funcional',
        focus: 'Postura, Ombros e Abdômen Forte',
        exercises: [
          { id: 'e24', name: 'Remada Baixa Supinada', muscleGroup: 'Dorsais', sets: 3, reps: '12', load: '35 kg', notes: 'Focar na aproximação das escápulas', completed: false },
          { id: 'e25', name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', sets: 3, reps: '10 a 12', load: '8 kg cada', notes: 'Não subir os ombros até as orelhas', completed: false },
          { id: 'e26', name: 'Prancha Frontal Isométrica', muscleGroup: 'Core', sets: 3, reps: '45 segundos', load: 'Peso corporal', notes: 'Abdômen e glúteos travados', completed: false },
        ]
      }
    ],
    measurements: [
      { id: 'm4', date: getRelativeDate(-60), weightKg: 64.2, heightCm: 165, bodyFatPercentage: 24.5, chestCm: 88, armsCm: 27, waistCm: 71, hipsCm: 99, thighsCm: 56 },
      { id: 'm5', date: getRelativeDate(-20), weightKg: 62.8, heightCm: 165, bodyFatPercentage: 22.8, chestCm: 87, armsCm: 27.5, waistCm: 68.5, hipsCm: 100.5, thighsCm: 57 },
    ]
  },
  {
    id: 'student-3',
    name: 'Rodrigo Silva',
    email: 'rodrigo.silva@uol.com.br',
    phone: '5511966554433',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    status: 'ATIVO',
    plan: 'MENSAL',
    monthlyFee: 400,
    dueDay: Number(getRelativeDate(-4).split('-')[2]), // Venceu há 4 dias!
    paymentStatus: 'ATRASADO',
    startDate: '2025-08-01',
    primaryGoal: 'Condicionamento Físico & Perda de Peso',
    streakDays: 3,
    nextAssessmentDate: getRelativeDate(5),
    notes: 'Viaja frequentemente a trabalho. Precisa de treinos flexíveis de 45 minutos.',
    workouts: [
      {
        id: 'w6',
        name: 'Treino A - Circuito Full Body Express',
        focus: 'Gasto Calórico e Força Global',
        exercises: [
          { id: 'e27', name: 'Agachamento Goblet', muscleGroup: 'Pernas / Core', sets: 4, reps: '12 a 15', load: '20 kg', notes: 'Descanso ativo de 40 segundos', completed: false },
          { id: 'e28', name: 'Flexão de Braços no Chão', muscleGroup: 'Peito / Tríceps', sets: 4, reps: '12', load: 'Peso corporal', notes: 'Corpo reto em prancha', completed: false },
          { id: 'e29', name: 'Remada Unilateral com Haltere (Serrote)', muscleGroup: 'Costas', sets: 4, reps: '12 cada lado', load: '18 kg', notes: 'Puxar com o cotovelo rente ao corpo', completed: false },
          { id: 'e30', name: 'Kettlebell Swing', muscleGroup: 'Posterior / Cardiorrespiratório', sets: 4, reps: '20', load: '16 kg', notes: 'Impulso gerado pelo quadril', completed: false },
        ]
      }
    ],
    measurements: [
      { id: 'm6', date: getRelativeDate(-90), weightKg: 94.0, heightCm: 181, bodyFatPercentage: 26.5, chestCm: 109, armsCm: 36, waistCm: 102, hipsCm: 108, thighsCm: 62 },
      { id: 'm7', date: getRelativeDate(-30), weightKg: 89.5, heightCm: 181, bodyFatPercentage: 23.9, chestCm: 106, armsCm: 36.5, waistCm: 96, hipsCm: 105, thighsCm: 61 },
    ]
  },
  {
    id: 'student-4',
    name: 'Beatriz Santos',
    email: 'beatriz.santos@outlook.com',
    phone: '5511955443322',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    status: 'ATIVO',
    plan: 'TRIMESTRAL',
    monthlyFee: 350,
    dueDay: 18,
    paymentStatus: 'EM_DIA',
    startDate: getRelativeDate(-5), // Nova aluna!
    primaryGoal: 'Postura, Força Funcional & Bem-estar',
    streakDays: 2,
    nextAssessmentDate: getRelativeDate(25),
    notes: 'Iniciante na musculação. Foco em aprendizado motor e adaptação neuromuscular.',
    workouts: [
      {
        id: 'w7',
        name: 'Treino A - Adaptação Neuromuscular & Mobilidade',
        focus: 'Técnica e Ativação Postural',
        exercises: [
          { id: 'e31', name: 'Agachamento com Bola na Parede', muscleGroup: 'Pernas', sets: 3, reps: '12', load: 'Peso corporal', notes: 'Apoio na lombar para aprender o padrão de sentar', completed: false },
          { id: 'e32', name: 'Puxada no Cabo com Elástico / Polia Leve', muscleGroup: 'Costas', sets: 3, reps: '12', load: '15 kg', notes: 'Conscientização do movimento escapular', completed: false },
          { id: 'e33', name: 'Ponte de Glúteo no Solo', muscleGroup: 'Glúteos', sets: 3, reps: '15', load: 'Peso corporal', notes: 'Segurar 1 segundo em cima', completed: false },
          { id: 'e34', name: 'Bird-Dog (Perdigueiro)', muscleGroup: 'Estabilidade Lombar', sets: 3, reps: '10 cada lado', load: 'Livre', notes: 'Manter quadril nivelado sem girar o tronco', completed: false },
        ]
      }
    ],
    measurements: [
      { id: 'm8', date: getRelativeDate(-5), weightKg: 58.0, heightCm: 162, bodyFatPercentage: 21.0, chestCm: 84, armsCm: 25, waistCm: 67, hipsCm: 94, thighsCm: 53 },
    ]
  },
  {
    id: 'student-5',
    name: 'Felipe Ramos',
    email: 'felipe.ramos@devtech.com',
    phone: '5511944332211',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    status: 'ATIVO',
    plan: 'SEMESTRAL',
    monthlyFee: 320,
    dueDay: 10,
    paymentStatus: 'EM_DIA',
    startDate: '2025-06-01',
    primaryGoal: 'Ganho de Força Bruta (Powerbuilding)',
    streakDays: 22,
    nextAssessmentDate: getRelativeDate(18),
    notes: 'Consultoria híbrida. Treina presencial 1x por semana com o personal e 3x avulso na academia de condomínio.',
    workouts: [
      {
        id: 'w8',
        name: 'Treino A - Dia Pesado de Agachamento e Terra',
        focus: 'Cadeia Posterior & Força Central',
        exercises: [
          { id: 'e35', name: 'Levantamento Terra Convencional', muscleGroup: 'Cadeia Posterior', sets: 5, reps: '5', load: '140 kg', notes: 'Travar o dorsal e empurrar o chão com os calcanhares', completed: false },
          { id: 'e36', name: 'Agachamento Frontal', muscleGroup: 'Quadríceps / Core', sets: 4, reps: '6', load: '80 kg', notes: 'Cotovelos altos durante toda a descida', completed: false },
          { id: 'e37', name: 'Elevação de Pernas na Barra Fixa', muscleGroup: 'Abdômen', sets: 4, reps: '12', load: 'Peso corporal', notes: 'Controlar o balanço', completed: false },
        ]
      }
    ],
    measurements: [
      { id: 'm9', date: getRelativeDate(-120), weightKg: 85.0, heightCm: 175, bodyFatPercentage: 18.0, chestCm: 104, armsCm: 39, waistCm: 88, hipsCm: 102, thighsCm: 61 },
      { id: 'm10', date: getRelativeDate(-40), weightKg: 83.5, heightCm: 175, bodyFatPercentage: 14.5, chestCm: 106, armsCm: 40.5, waistCm: 84, hipsCm: 102, thighsCm: 63 },
    ]
  }
];

export const INITIAL_SESSIONS: SessionSchedule[] = [
  // Sessões de Hoje
  {
    id: 'sess-1',
    studentId: 'student-1',
    studentName: 'Lucas Andrade',
    date: TODAY_STR,
    time: '17:00',
    durationMinutes: 60,
    location: 'Smart Fit - Unidade Paulista',
    status: 'AGENDADA',
    workoutRoutineId: 'w1',
    routineName: 'Treino A - Peito, Deltoide & Tríceps'
  },
  {
    id: 'sess-2',
    studentId: 'student-2',
    studentName: 'Camila Rodrigues',
    date: TODAY_STR,
    time: '18:30',
    durationMinutes: 60,
    location: 'Bio Ritmo - Jardins',
    status: 'AGENDADA',
    workoutRoutineId: 'w4',
    routineName: 'Treino A - Glúteos & Posteriores'
  },
  {
    id: 'sess-3',
    studentId: 'student-4',
    studentName: 'Beatriz Santos',
    date: TODAY_STR,
    time: '08:00',
    durationMinutes: 60,
    location: 'Academia do Condomínio Parque das Flores',
    status: 'REALIZADA',
    workoutRoutineId: 'w7',
    routineName: 'Treino A - Adaptação Neuromuscular'
  },
  // Sessões nos próximos dias
  {
    id: 'sess-4',
    studentId: 'student-5',
    studentName: 'Felipe Ramos',
    date: getRelativeDate(1),
    time: '07:00',
    durationMinutes: 60,
    location: 'Ironberg SP',
    status: 'AGENDADA',
    workoutRoutineId: 'w8',
    routineName: 'Treino A - Agachamento & Terra'
  },
  {
    id: 'sess-5',
    studentId: 'student-1',
    studentName: 'Lucas Andrade',
    date: getRelativeDate(2),
    time: '17:00',
    durationMinutes: 60,
    location: 'Smart Fit - Unidade Paulista',
    status: 'AGENDADA',
    workoutRoutineId: 'w2',
    routineName: 'Treino B - Costas & Bíceps'
  },
  {
    id: 'sess-6',
    studentId: 'student-3',
    studentName: 'Rodrigo Silva',
    date: getRelativeDate(3),
    time: '19:00',
    durationMinutes: 60,
    location: 'Smart Fit - Unidade Paulista',
    status: 'AGENDADA',
    workoutRoutineId: 'w6',
    routineName: 'Treino A - Full Body Express'
  },
  {
    id: 'sess-7',
    studentId: 'student-2',
    studentName: 'Camila Rodrigues',
    date: getRelativeDate(4),
    time: '18:30',
    durationMinutes: 60,
    location: 'Bio Ritmo - Jardins',
    status: 'AGENDADA',
    workoutRoutineId: 'w5',
    routineName: 'Treino B - Superiores & Core'
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  // Ciclo atual
  {
    id: 'inv-101',
    studentId: 'student-1',
    studentName: 'Lucas Andrade',
    amount: 380,
    dueDate: getRelativeDate(-10),
    paidDate: getRelativeDate(-10),
    status: 'PAGO',
    paymentMethod: 'PIX'
  },
  {
    id: 'inv-102',
    studentId: 'student-2',
    studentName: 'Camila Rodrigues',
    amount: 340,
    dueDate: getRelativeDate(3),
    status: 'PENDENTE'
  },
  {
    id: 'inv-103',
    studentId: 'student-3',
    studentName: 'Rodrigo Silva',
    amount: 400,
    dueDate: getRelativeDate(-4),
    status: 'ATRASADO'
  },
  {
    id: 'inv-104',
    studentId: 'student-4',
    studentName: 'Beatriz Santos',
    amount: 350,
    dueDate: getRelativeDate(-5),
    paidDate: getRelativeDate(-5),
    status: 'PAGO',
    paymentMethod: 'PIX'
  },
  {
    id: 'inv-105',
    studentId: 'student-5',
    studentName: 'Felipe Ramos',
    amount: 320,
    dueDate: getRelativeDate(-8),
    paidDate: getRelativeDate(-8),
    status: 'PAGO',
    paymentMethod: 'PIX'
  },
  // Histórico anterior para alimentar gráficos de 6 meses
  { id: 'inv-201', studentId: 'student-1', studentName: 'Lucas Andrade', amount: 380, dueDate: getRelativeDate(-40), paidDate: getRelativeDate(-40), status: 'PAGO', paymentMethod: 'PIX' },
  { id: 'inv-202', studentId: 'student-2', studentName: 'Camila Rodrigues', amount: 340, dueDate: getRelativeDate(-37), paidDate: getRelativeDate(-36), status: 'PAGO', paymentMethod: 'PIX' },
  { id: 'inv-203', studentId: 'student-3', studentName: 'Rodrigo Silva', amount: 400, dueDate: getRelativeDate(-34), paidDate: getRelativeDate(-33), status: 'PAGO', paymentMethod: 'PIX' },
  { id: 'inv-204', studentId: 'student-5', studentName: 'Felipe Ramos', amount: 320, dueDate: getRelativeDate(-38), paidDate: getRelativeDate(-38), status: 'PAGO', paymentMethod: 'PIX' },
];

export const MONTHLY_FINANCIAL_HISTORY = [
  { month: 'Abr', recebido: 1440, projetado: 1440 },
  { month: 'Mai', recebido: 1440, projetado: 1440 },
  { month: 'Jun', recebido: 1760, projetado: 1760 },
  { month: 'Jul', recebido: 1760, projetado: 1760 },
  { month: 'Ago', recebido: 1790, projetado: 1790 },
  { month: 'Set (Atual)', recebido: 1050, projetado: 1790 },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // Conversa com Lucas Andrade (student-1)
  {
    id: 'msg-1',
    senderRole: 'STUDENT',
    senderId: 'student-1',
    senderName: 'Lucas Andrade',
    studentId: 'student-1',
    content: 'Boa tarde Coach Marcus! Concluí o Treino A hoje, mas senti um leve incômodo no ombro durante a última série do supino inclinado. Devo reduzir a carga na próxima?',
    timestamp: 'Ontem 18:35',
    read: true,
    category: 'DUVIDA'
  },
  {
    id: 'msg-2',
    senderRole: 'PERSONAL',
    senderId: 'coach-1',
    senderName: 'Marcus Valério',
    studentId: 'student-1',
    content: 'Fala Lucas! Excelente você ter avisado. Na próxima sessão vamos diminuir 2 kg de cada lado e focar em aumentar o ângulo de rotação externa e aquecer bem o manguito rotador antes. Hoje tome um banho morno e faça um alongamento leve!',
    timestamp: 'Ontem 19:10',
    read: true,
    category: 'DUVIDA'
  },
  {
    id: 'msg-3',
    senderRole: 'STUDENT',
    senderId: 'student-1',
    senderName: 'Lucas Andrade',
    studentId: 'student-1',
    content: 'Perfeito, combinado! Nos vemos hoje às 17h na Smart Fit Paulista.',
    timestamp: 'Hoje 09:42',
    read: true,
    category: 'AGENDAMENTO'
  },
  // Conversa com Rodrigo Silva (student-3) - Tem mensagem não lida para o Personal!
  {
    id: 'msg-4',
    senderRole: 'STUDENT',
    senderId: 'student-3',
    senderName: 'Rodrigo Silva',
    studentId: 'student-3',
    content: 'Oi Marcus, tudo bem? Minha semana foi muito corrida com viagens de trabalho e acabei atrasando o pagamento da mensalidade. Já posso acertar hoje via PIX?',
    timestamp: 'Hoje 11:20',
    read: false,
    category: 'PAGAMENTO'
  },
  {
    id: 'msg-5',
    senderRole: 'STUDENT',
    senderId: 'student-3',
    senderName: 'Rodrigo Silva',
    studentId: 'student-3',
    content: 'Também gostaria de saber se conseguimos remarcar nosso treino de sexta para sábado de manhã.',
    timestamp: 'Hoje 11:22',
    read: false,
    category: 'AGENDAMENTO'
  },
  // Conversa com Camila Rodrigues (student-2)
  {
    id: 'msg-6',
    senderRole: 'STUDENT',
    senderId: 'student-2',
    senderName: 'Camila Rodrigues',
    studentId: 'student-2',
    content: 'Oi Coach! A progressão de carga no búlgaro funcionou demais, não senti dores no joelho!',
    timestamp: 'Hoje 10:15',
    read: true,
    category: 'GERAL'
  },
  {
    id: 'msg-7',
    senderRole: 'PERSONAL',
    senderId: 'coach-1',
    senderName: 'Marcus Valério',
    studentId: 'student-2',
    content: 'Sensacional, Camila! O ajuste na inclinação do tronco tirou a sobrecarga patelar. Hoje à tarde vamos manter esse padrão!',
    timestamp: 'Hoje 10:40',
    read: true,
    category: 'GERAL'
  },
  // Conversa com Beatriz Santos (student-4)
  {
    id: 'msg-8',
    senderRole: 'STUDENT',
    senderId: 'student-4',
    senderName: 'Beatriz Santos',
    studentId: 'student-4',
    content: 'Bom dia Marcus! O treino de adaptação correu super bem ontem. Minhas pernas estão um pouco doloridas, mas aquela dor boa de treino!',
    timestamp: 'Hoje 08:30',
    read: true,
    category: 'GERAL'
  },
  {
    id: 'msg-9',
    senderRole: 'PERSONAL',
    senderId: 'coach-1',
    senderName: 'Marcus Valério',
    studentId: 'student-4',
    content: 'Ótimo começo Beatriz! Essa dor tardia inicial é normal e mostra que a musculatura respondeu ao estímulo. Continue bebendo bastante água!',
    timestamp: 'Hoje 09:05',
    read: true,
    category: 'GERAL'
  }
];

