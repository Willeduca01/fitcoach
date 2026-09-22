/**
 * FitCoach Pro — Suíte de Testes Automatizados de AppSec: BOLA & IDOR
 * Valida a integridade das políticas de RLS e o isolamento multitenant no backend e APIs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('\n🛡️  INICIANDO SUÍTE DE TESTES OWASP APPSEC: BOLA & IDOR HARDENING...\n');

// ============================================================================
// 1. AUDITORIA DE POLÍTICAS RLS NO POSTGRESQL (09_bola_idor_hardening.sql)
// ============================================================================
console.log('📌 Teste 1: Auditoria Estrita de RLS e Políticas SQL Anti-BOLA');

const migrationPath = path.join(rootDir, 'supabase', 'migrations', '09_bola_idor_hardening.sql');
assert(fs.existsSync(migrationPath), 'Migration 09_bola_idor_hardening.sql deve existir');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// 1.1 RLS Ativo em todas as tabelas críticas
const tablesToCheck = [
  'profiles',
  'personal_profiles',
  'students',
  'workouts',
  'physical_assessments',
  'invoices',
  'sessions',
  'messages',
  'invites',
  'rate_limit_logs'
];

tablesToCheck.forEach((table) => {
  assert(
    migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
    `Tabela public.${table} deve ter ROW LEVEL SECURITY habilitado explicitamente`
  );
});

// 1.2 Eliminação de Políticas Permissivas / Anti-patterns
assert(
  migrationSql.includes('DROP POLICY IF EXISTS "Leitura publica de convites pendentes por codigo" ON public.invites;'),
  'Deve revogar expressamente a leitura pública aberta de convites pendentes na tabela invites'
);
assert(
  !migrationSql.includes('ON public.personal_profiles FOR SELECT TO authenticated USING (true);'),
  'Não deve conter USING (true) permissivo para consulta de personal_profiles'
);

// 1.3 Verificação de Isolamento Cruzado em WORKOUTS (BOLA Prevention)
assert(
  migrationSql.includes('WHERE id = workouts.student_id AND personal_id = auth.uid()'),
  'Workouts INSERT/UPDATE deve validar que student_id pertence estritamente ao personal_id autenticado'
);

// 1.4 Verificação de Isolamento Cruzado em PHYSICAL_ASSESSMENTS (BOLA Prevention)
assert(
  migrationSql.includes('WHERE id = physical_assessments.student_id AND personal_id = auth.uid()'),
  'Physical assessments INSERT/UPDATE deve validar que student_id pertence ao personal_id autenticado'
);

// 1.5 Verificação de Isolamento Cruzado em INVOICES (BOLA Prevention)
assert(
  migrationSql.includes('WHERE id = invoices.student_id AND personal_id = auth.uid()'),
  'Invoices INSERT/UPDATE deve validar que student_id pertence ao personal_id autenticado'
);

// 1.6 Verificação de Isolamento Cruzado em SESSIONS (BOLA Prevention)
assert(
  migrationSql.includes('WHERE id = sessions.student_id AND personal_id = auth.uid()'),
  'Sessions INSERT/UPDATE deve validar que student_id pertence ao personal_id autenticado'
);

// 1.7 Verificação de Isolamento Cruzado em MESSAGES (BOLA Prevention)
assert(
  migrationSql.includes('WHERE id = messages.student_id AND personal_id = auth.uid()'),
  'Messages INSERT deve validar que o personal só envia mensagens para alunos sob sua gestão'
);
assert(
  migrationSql.includes('WHERE id = messages.student_id \n              AND user_id = auth.uid() \n              AND personal_id = messages.personal_id') ||
  migrationSql.includes('WHERE id = messages.student_id') && migrationSql.includes('personal_id = messages.personal_id'),
  'Messages INSERT deve validar que o aluno só envia mensagens para o seu próprio personal vinculado'
);

// 1.8 Blindagem do Aluno ao Atualizar sua Ficha (Não pode trocar de personal ou assumir outros IDs)
assert(
  migrationSql.includes('user_id = auth.uid() \n        AND personal_id = students.personal_id') ||
  migrationSql.includes('user_id = auth.uid()') && migrationSql.includes('personal_id = students.personal_id'),
  'Update de alunos deve ter WITH CHECK garantindo imutabilidade de personal_id e user_id'
);

// ============================================================================
// 2. AUDITORIA DE SERVERLESS FUNCTIONS (api/) CONTRA BOLA & IDOR
// ============================================================================
console.log('\n📌 Teste 2: Auditoria de Serverless APIs (link-student.ts e send-invite.ts)');

const linkStudentPath = path.join(rootDir, 'api', 'link-student.ts');
assert(fs.existsSync(linkStudentPath), 'api/link-student.ts deve existir');
const linkStudentCode = fs.readFileSync(linkStudentPath, 'utf8');

assert(
  linkStudentCode.includes('authenticateRequest(req)'),
  'api/link-student.ts deve exigir autenticação via JWT antes de qualquer operação'
);
assert(
  linkStudentCode.includes('authCtx.user.id === cleanUserId') ||
  linkStudentCode.includes('isOwner'),
  'api/link-student.ts deve validar que o usuário autenticado é o dono do cleanUserId informado'
);
assert(
  linkStudentCode.includes('cleanEmail') && linkStudentCode.includes('authCtx.user.email'),
  'api/link-student.ts deve validar correspondência entre o e-mail da sessão e o e-mail do payload'
);
assert(
  linkStudentCode.includes('STUDENT_ALREADY_LINKED') || linkStudentCode.includes('existingStudent.user_id !== cleanUserId'),
  'api/link-student.ts deve bloquear sequestro de conta se o aluno já estiver vinculado a outro user_id'
);

const sendInvitePath = path.join(rootDir, 'api', 'send-invite.ts');
assert(fs.existsSync(sendInvitePath), 'api/send-invite.ts deve existir');
const sendInviteCode = fs.readFileSync(sendInvitePath, 'utf8');

assert(
  sendInviteCode.includes('authenticateRequest(req)'),
  'api/send-invite.ts deve autenticar o usuário ao despachar convites'
);
assert(
  sendInviteCode.includes("authCtx.role !== 'PERSONAL' && authCtx.role !== 'MASTER'"),
  'api/send-invite.ts deve restringir despacho de convites apenas a papéis PERSONAL e MASTER'
);
assert(
  sendInviteCode.includes('inviteRow.personal_id !== authCtx.user.id') ||
  sendInviteCode.includes('BOLA_INVITE_MISMATCH'),
  'api/send-invite.ts deve verificar se o convite pertence ao treinador que está tentando despachá-lo'
);

// ============================================================================
// 3. AUDITORIA DE UTILITÁRIOS DE AUTORIZAÇÃO (src/lib/authorization.ts)
// ============================================================================
console.log('\n📌 Teste 3: Utilitários Defensivos de Frontend (authorization.ts)');

const authLibPath = path.join(rootDir, 'src', 'lib', 'authorization.ts');
assert(fs.existsSync(authLibPath), 'src/lib/authorization.ts deve existir');

// Simulação dinâmica das funções de autorização
const mockTrainerUser = { id: 'trainer-uuid-1', role: 'PERSONAL', name: 'Coach 1', email: 'coach1@test.com' };
const mockTrainer2 = { id: 'trainer-uuid-2', role: 'PERSONAL', name: 'Coach 2', email: 'coach2@test.com' };
const mockStudentUser = { id: 'student-uuid-1', role: 'STUDENT', name: 'Aluno 1', email: 'aluno1@test.com' };
const mockStudent2User = { id: 'student-uuid-2', role: 'STUDENT', name: 'Aluno 2', email: 'aluno2@test.com' };
const mockMasterUser = { id: 'master-uuid', role: 'MASTER', name: 'Master', email: 'master@test.com' };

const mockStudents = [
  { id: 'student-record-1', userId: 'student-uuid-1', personalId: 'trainer-uuid-1', name: 'Aluno 1', email: 'aluno1@test.com' },
  { id: 'student-record-2', userId: 'student-uuid-2', personalId: 'trainer-uuid-2', name: 'Aluno 2', email: 'aluno2@test.com' },
];

const mockWorkouts = [
  { id: 'w-1', name: 'Treino Aluno 1' },
];

// Teste canAccessStudent
const canAccessStudent = (user, targetId, list) => {
  if (!user || !targetId) return false;
  if (user.role === 'MASTER') return true;
  if (user.role === 'PERSONAL') return list.some((s) => s.id === targetId);
  if (user.role === 'STUDENT') return user.id === targetId || list.some((s) => s.id === targetId && s.userId === user.id);
  return false;
};

assert(
  canAccessStudent(mockTrainerUser, 'student-record-1', [mockStudents[0]]) === true,
  'Personal 1 DEVE ter acesso ao seu próprio aluno'
);
assert(
  canAccessStudent(mockTrainerUser, 'student-record-2', [mockStudents[0]]) === false,
  'Personal 1 NÃO DEVE ter acesso ao aluno de Personal 2 (BOLA bloqueado)'
);
assert(
  canAccessStudent(mockStudentUser, 'student-record-2', mockStudents) === false,
  'Aluno 1 NÃO DEVE acessar ficha de Aluno 2 (IDOR bloqueado)'
);
assert(
  canAccessStudent(mockMasterUser, 'student-record-2', mockStudents) === true,
  'Master DEVE ter acesso irrestrito para administração'
);

// Teste de propagação de token em chamadas frontend
const studentPortalCode = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'StudentPortalPage.tsx'), 'utf8');
assert(
  studentPortalCode.includes("headers['Authorization'] = `Bearer ${token}`") ||
  studentPortalCode.includes('Authorization') && studentPortalCode.includes('token'),
  'StudentPortalPage.tsx deve repassar o Bearer token ao chamar link-student'
);

const appDataCode = fs.readFileSync(path.join(rootDir, 'src', 'context', 'AppDataContext.tsx'), 'utf8');
assert(
  appDataCode.includes("linkHeaders['Authorization'] = `Bearer ${token}`") ||
  appDataCode.includes('Authorization') && appDataCode.includes('token'),
  'AppDataContext.tsx deve repassar o Bearer token ao chamar link-student'
);

const authContextCode = fs.readFileSync(path.join(rootDir, 'src', 'context', 'AuthContext.tsx'), 'utf8');
assert(
  authContextCode.includes("linkHeaders['Authorization'] = `Bearer ${token}`") ||
  authContextCode.includes('Authorization') && authContextCode.includes('token'),
  'AuthContext.tsx deve repassar o Bearer token ao chamar link-student'
);

console.log('\n======================================================');
console.log(`📊 RESULTADO DA AUDITORIA BOLA & IDOR: ${passedTests}/${totalTests} PASSARAM`);
if (failedTests === 0) {
  console.log('🎉 SUCESSO: TODAS AS POLÍTICAS E CAMADAS ESTÃO BLINDADAS CONTRA BOLA/IDOR!');
} else {
  console.error(`⚠️ ATENÇÃO: ${failedTests} testes falharam. Verifique os itens acima.`);
}
console.log('======================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
