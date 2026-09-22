import DOMPurify from 'dompurify';
import type { Config as DOMPurifyConfig } from 'dompurify';

/**
 * Utilitários de Segurança e Sanitização contra Cross-Site Scripting (XSS)
 * e injeção de dados (OWASP Top 10 / ASVS Level 2).
 */

/**
 * Escapa caracteres HTML especiais para prevenir HTML Injection e XSS
 * ao interpolar dados em templates HTML (ex.: corpos de e-mail, atributos).
 */
export function escapeHtml(str: string | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Higieniza strings HTML usando DOMPurify para renderização dinâmica segura.
 * Remove elementos executáveis (<script>, <iframe>, <object>, etc.) e
 * atributos de manipuladores de eventos inline (onload, onerror, onclick, etc.).
 */
export function sanitizeHtml(
  dirty: string | undefined | null,
  customConfig?: DOMPurifyConfig
): string {
  if (!dirty) return '';

  const defaultConfig: DOMPurifyConfig = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
      'code', 'pre', 'hr', 'table', 'tbody', 'tr', 'td', 'th', 'thead'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  };

  const clean = DOMPurify.sanitize(dirty, { ...defaultConfig, ...customConfig });
  return typeof clean === 'string' ? clean : String(clean);
}

/**
 * Gera as chaves de rate limiting para defesa em profundidade (OWASP):
 * 1. Chave por IP: Defesa contra DoS / flood massivo vindo da mesma máquina/rede.
 * 2. Chave por Conta/Identificador: Defesa contra botnets e proxies rotativos que atacam a mesma conta.
 * Retorna o array de chaves a serem validadas simultaneamente no backend.
 */
export function getRateLimitKeys(action: string, ip: string, identifier?: string): string[] {
  const cleanIp = ip.trim() || '127.0.0.1';
  const keys: string[] = [`${action}_ip_${cleanIp}`];

  const cleanId = identifier?.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().toLowerCase() || '';
  if (cleanId && cleanId.length > 2 && cleanId !== 'global') {
    keys.push(`${action}_account_${cleanId}`);
  }

  return keys;
}

/**
 * Retorna chave composta (ou por IP) para rate limiting.
 */
export function getRateLimitKey(action: string, ip: string, identifier?: string): string {
  const cleanIp = ip.trim() || '127.0.0.1';
  const cleanId = identifier?.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().toLowerCase() || '';
  if (cleanId && cleanId.length > 2 && cleanId !== 'global') {
    return `${action}_ip_${cleanIp}_account_${cleanId}`;
  }
  return `${action}_ip_${cleanIp}`;
}

/**
 * Sanitiza URLs garantindo que esquemas maliciosos (javascript:, data:text/html, vbscript:, file:)
 * sejam neutralizados. Aceita apenas http, https, mailto, tel, caminhos relativos (/), âncoras (#)
 * ou blob URLs e data URLs estritamente de imagens rasterizadas (jpeg, png, webp, gif).
 */
export function sanitizeUrl(
  url: string | undefined | null,
  fallback = '#'
): string {
  if (!url) return fallback;

  const clean = String(url).trim();

  // Rejeita caracteres de controle e quebras de linha que possam contornar filtros
  if (/[\x00-\x1F\x7F]/.test(clean)) {
    return fallback;
  }

  // Bloqueio explícito de protocolos perigosos conhecidos (case insensitive)
  if (/^(javascript|data|vbscript|file):/i.test(clean)) {
    // Permite apenas data URIs de imagens bitmap seguras (ex: base64 do canvas ou uploads)
    // NUNCA aceita data:text/html ou data:image/svg+xml sem validação
    const isSafeDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(clean);
    if (isSafeDataImage) {
      return clean;
    }
    return fallback;
  }

  // Permite protocolos web seguros, URLs de blob temporárias de mídia ou caminhos relativos
  if (
    /^(https?:|\/|#|mailto:|tel:)/i.test(clean) ||
    /^blob:(http|https):\/\//i.test(clean)
  ) {
    return clean;
  }

  return fallback;
}

/**
 * Verifica se uma URL é segura para exibição em tags <img> ou <video>.
 */
export function isSafeMediaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const sanitized = sanitizeUrl(url, '');
  return sanitized !== '' && sanitized !== '#';
}

/**
 * Sanitiza nomes de arquivos para evitar Directory Traversal e injeções
 * em atributos de download de links ou cabeçalhos Content-Disposition.
 */
export function sanitizeFileName(
  name: string | undefined | null,
  fallback = 'arquivo'
): string {
  if (!name) return fallback;

  // Remove caracteres de controle, barras de caminho e aspas
  const cleaned = String(name)
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();

  return cleaned || fallback;
}

/**
 * Validador estrito de endereço de e-mail que rejeita quebras de linha (CRLF),
 * prevenindo ataques de Email Header Injection.
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const clean = String(email).trim();

  // Rejeita qualquer quebra de linha (CRLF injection)
  if (/[\r\n]/.test(clean)) return false;

  // Regex robusto para validação de e-mail (RFC 5322 simplificado)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Remove caracteres de quebra de linha (\r, \n) de cabeçalhos de e-mail e requisição
 * para neutralizar Email Header Injection / HTTP Response Splitting.
 */
export function sanitizeHeader(headerValue: string | undefined | null): string {
  if (!headerValue) return '';
  return String(headerValue).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Validador estrito de identificador UUID v4 (RFC 4122).
 * Previne injeções e parâmetros maliciosos em operações de banco por ID.
 */
export function isValidUuid(id: string | undefined | null): boolean {
  if (!id) return false;
  const clean = String(id).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(clean);
}

/**
 * Sanitiza valores passados para filtros dinâmicos do PostgREST / Supabase (.or(), .filter(), etc.).
 * Remove caracteres de controle sintático do PostgREST que poderiam alterar a árvore
 * de operadores lógicos (vírgulas, parênteses, pontos, dois-pontos e barras invertidas).
 */
export function sanitizePostgrestFilter(term: string | undefined | null): string {
  if (!term) return '';
  return String(term)
    // Remove delimitadores sintáticos do PostgREST
    .replace(/[(),.:\\"']/g, '')
    // Remove caracteres de controle invisíveis
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Escapa caracteres curinga (% e _) ao montar filtros de busca com .like() ou .ilike().
 * Previne exploração de wildcards não intencionais e DoS em consultas complexas.
 */
export function escapePostgrestWildcards(term: string | undefined | null): string {
  if (!term) return '';
  return String(term)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Sanitiza campos de texto de formulários (rotinas, exercícios, observações)
 * removendo caracteres de controle e limitando o tamanho máximo.
 */
export function sanitizeTextInput(
  input: string | undefined | null,
  maxLength = 500
): string {
  if (!input) return '';
  return String(input)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}
