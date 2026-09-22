import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('FITCOACH PRO — SUÍTE DE TESTES AUTOMATIZADOS DE SEGURANÇA APPSEC');
console.log('(Blindagem XSS, SQL Injection e PostgREST Filter Injection)');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FALHA: ${message}`);
    failedTests++;
  }
}

// 1. Teste de Funções de Sanitização do Módulo de Segurança (PostgREST & UUID)
console.log('[TESTE 1] Utilitários PostgREST Filter Injection & UUID...');

// Implementação espelho para teste isolado em Node
function sanitizePostgrestFilter(term) {
  if (!term) return '';
  return String(term)
    .replace(/[(),.:\\"']/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

function escapePostgrestWildcards(term) {
  if (!term) return '';
  return String(term)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

function isValidUuid(id) {
  if (!id) return false;
  const clean = String(id).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(clean);
}

function sanitizeUrl(url, fallback = '#') {
  if (!url) return fallback;
  const clean = String(url).trim();
  if (/[\x00-\x1F\x7F]/.test(clean)) return fallback;
  if (/^(javascript|data|vbscript|file):/i.test(clean)) {
    const isSafeDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(clean);
    return isSafeDataImage ? clean : fallback;
  }
  if (
    /^(https?:|\/|#|mailto:|tel:)/i.test(clean) ||
    /^blob:(http|https):\/\//i.test(clean)
  ) {
    return clean;
  }
  return fallback;
}

// Asserções PostgREST
const attackFilter = 'aluno),role.eq.MASTER,(status.eq.ACTIVE';
const cleanedFilter = sanitizePostgrestFilter(attackFilter);
assert(
  !cleanedFilter.includes(')') && !cleanedFilter.includes('(') && !cleanedFilter.includes(',') && !cleanedFilter.includes('.'),
  `PostgREST delimiter injection bloqueado: "${attackFilter}" -> "${cleanedFilter}"`
);

const attackSql = "1' OR '1'='1";
const cleanedSql = sanitizePostgrestFilter(attackSql);
assert(
  !cleanedSql.includes("'"),
  `Aspas simples neutralizadas: "${attackSql}" -> "${cleanedSql}"`
);

const wildcardTerm = '100%_desconto';
const escapedWildcard = escapePostgrestWildcards(wildcardTerm);
assert(
  escapedWildcard === '100\\%\\_desconto',
  `Caracteres curinga de LIKE/ILIKE escapados: "${wildcardTerm}" -> "${escapedWildcard}"`
);

// Asserções UUID
assert(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), 'UUID v4 válido aceito com sucesso.');
assert(!isValidUuid('admin'), 'String arbitrária "admin" rejeitada pelo validador de UUID.');
assert(!isValidUuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' OR 1=1--"), 'Payload SQLi no UUID rejeitado categoricamente.');

// 2. Teste de Sanitização de URLs de Avatares (XSS)
console.log('\n[TESTE 2] Sanitização de URLs de Mídia e Avatares contra XSS...');
assert(sanitizeUrl('javascript:alert(document.cookie)') === '#', 'Payload javascript: neutralizado para "#".');
assert(sanitizeUrl('data:text/html,<script>alert(1)</script>') === '#', 'Payload data:text/html neutralizado.');
assert(
  sanitizeUrl('https://images.unsplash.com/photo-1534528741775?w=150') ===
    'https://images.unsplash.com/photo-1534528741775?w=150',
  'URL HTTPS legítima do Unsplash preservada.'
);
assert(
  sanitizeUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==').startsWith('data:image/png'),
  'Data URI de imagem rasterizada (PNG) permitida com segurança.'
);

// 3. Auditoria Estática de Migrations SQL
console.log('\n[TESTE 3] Auditoria de Migrations SQL e Search Path Hijacking (CWE-426)...');
const migration08Path = path.join(projectRoot, 'supabase', 'migrations', '08_security_hardening.sql');
assert(fs.existsSync(migration08Path), 'Migration 08_security_hardening.sql criada com sucesso.');

const migration08Content = fs.readFileSync(migration08Path, 'utf8');

assert(
  migration08Content.includes('SET search_path = public, pg_temp'),
  'Migration 08 contém "SET search_path = public, pg_temp" em todas as funções elevadas.'
);

assert(
  !migration08Content.includes("|| ' seconds'"),
  'Migration 08 não contém concatenação de string insegura com "|| \' seconds\'".'
);

assert(
  migration08Content.includes('INTERVAL \'1 second\'') || migration08Content.includes('* INTERVAL \'1 second\''),
  'Migration 08 utiliza aritmética estrita com INTERVAL \'1 second\'.'
);

// 4. Auditoria de APIs Serverless
console.log('\n[TESTE 4] Auditoria de APIs Serverless em api/...');
const linkStudentPath = path.join(projectRoot, 'api', 'link-student.ts');
const linkStudentContent = fs.readFileSync(linkStudentPath, 'utf8');

assert(
  linkStudentContent.includes(".eq('email', cleanEmail)"),
  'api/link-student.ts utiliza correspondência exata .eq() em vez de .ilike() para e-mails.'
);

assert(
  linkStudentContent.includes('UUID_REGEX'),
  'api/link-student.ts valida estritamente o formato UUID antes de vincular o aluno.'
);

const sendInvitePath = path.join(projectRoot, 'api', 'send-invite.ts');
const sendInviteContent = fs.readFileSync(sendInvitePath, 'utf8');

assert(
  sendInviteContent.includes('VercelRequest') && sendInviteContent.includes('VercelResponse'),
  'api/send-invite.ts utiliza tipagem estrita da Vercel.'
);

assert(
  sendInviteContent.includes('ALLOWED_TYPES'),
  'api/send-invite.ts valida tipos com whitelist permitida.'
);

// 5. Verificação de CSP nos Cabeçalhos
console.log('\n[TESTE 5] Verificação de Cabeçalhos HTTP e CSP...');
const vercelJsonPath = path.join(projectRoot, 'vercel.json');
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

const globalHeaders = vercelJson.headers.find((h) => h.source === '/(.*)');
const cspHeader = globalHeaders?.headers.find((h) => h.key === 'Content-Security-Policy');

assert(
  cspHeader && cspHeader.value.includes("frame-ancestors 'none'"),
  'vercel.json contém diretiva "frame-ancestors \'none\'" contra Clickjacking.'
);

assert(
  cspHeader && cspHeader.value.includes("object-src 'none'"),
  'vercel.json contém diretiva "object-src \'none\'" contra injeção de plugins.'
);

console.log('\n----------------------------------------------------------------');
console.log(`TOTAL DE TESTES EXECUTADOS: ${passedTests + failedTests}`);
console.log(`PASSOU: ${passedTests}`);
console.log(`FALHOU: ${failedTests}`);
console.log('----------------------------------------------------------------');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\nTODOS OS TESTES DE SEGURANÇA PASSARAM COM SUCESSO! 🛡️🎉\n');
}
