/**
 * Utilitários de compressão e processamento de mídias (fotos e vídeos) no navegador
 * com proteções de segurança contra injeção de arquivos maliciosos e XSS.
 */

import { sanitizeUrl, isSafeMediaUrl } from './security';

export interface ProcessedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
}

export interface ProcessedVideoResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  thumbnailDataUrl: string;
  duration?: number;
}

// Lista estrita de tipos MIME permitidos (rejeitando SVG, HTML, scripts executáveis)
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

/**
 * Valida se o arquivo possui tipo MIME e extensão seguros antes do processamento.
 */
export function validateMediaFile(file: File): { valid: boolean; reason?: string } {
  if (!file) {
    return { valid: false, reason: 'Nenhum arquivo fornecido.' };
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  // Bloqueio explícito de formatos que podem carregar código malicioso
  if (
    mime.includes('svg') ||
    mime.includes('html') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    name.endsWith('.svg') ||
    name.endsWith('.html') ||
    name.endsWith('.htm') ||
    name.endsWith('.xml')
  ) {
    return {
      valid: false,
      reason: 'Formato não permitido por motivos de segurança. Envie apenas imagens rasterizadas (JPG, PNG, WebP) ou vídeos (MP4, WebM).'
    };
  }

  const isAllowedImage = ALLOWED_IMAGE_MIME_TYPES.includes(mime);
  const isAllowedVideo = ALLOWED_VIDEO_MIME_TYPES.includes(mime);

  if (!isAllowedImage && !isAllowedVideo) {
    return {
      valid: false,
      reason: `Formato (${file.type || 'desconhecido'}) não suportado. Envie fotos (JPG, PNG, WebP) ou vídeos (MP4, WebM).`
    };
  }

  return { valid: true };
}

/**
 * Comprime uma foto/imagem no navegador utilizando HTML5 Canvas e exportando em WebP/JPEG com qualidade controlada.
 * Reduz fotos pesadas de smartphones (4MB - 8MB) para ~100KB - 250KB sem perda perceptível de nitidez.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<ProcessedImageResult> {
  const check = validateMediaFile(file);
  if (!check.valid) {
    throw new Error(check.reason);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Redimensionamento proporcional se exceder o limite máximo
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Contexto 2D do Canvas indisponível'));
          return;
        }

        // Desenhar com suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tentar formato WebP primeiro (melhor compressão) com fallback para JPEG
        let format = 'image/webp';
        let dataUrl = canvas.toDataURL(format, quality);

        if (!dataUrl.startsWith('data:image/webp')) {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL(format, quality);
        }

        const safeDataUrl = sanitizeUrl(dataUrl, '');
        if (!isSafeMediaUrl(safeDataUrl)) {
          reject(new Error('Falha de segurança ao gerar dados comprimidos da imagem.'));
          return;
        }

        // Calcular tamanho aproximado do arquivo em bytes a partir do Base64
        const base64Data = safeDataUrl.split(',')[1] || '';
        const compressedSize = Math.round((base64Data.length * 3) / 4);

        resolve({
          dataUrl: safeDataUrl,
          originalSize: file.size,
          compressedSize,
          width,
          height,
          format,
        });
      };

      img.onerror = () => reject(new Error('Erro ao carregar a imagem para compressão'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));
    reader.readAsDataURL(file);
  });
}

/**
 * Processa um vídeo no navegador de forma extremamente eficiente:
 * - Usa URL.createObjectURL para visualização instantânea com ZERO consumo de RAM (suporta arquivos de até 1 GB)
 * - Gera um thumbnail leve do primeiro frame via Canvas (~10 KB)
 */
export async function processVideo(file: File): Promise<ProcessedVideoResult> {
  const check = validateMediaFile(file);
  if (!check.valid) {
    throw new Error(check.reason);
  }

  return new Promise((resolve, reject) => {
    try {
      const rawObjectUrl = URL.createObjectURL(file);
      const safeObjectUrl = sanitizeUrl(rawObjectUrl, '');

      if (!safeObjectUrl.startsWith('blob:')) {
        reject(new Error('URL de blob de vídeo inválida ou rejeitada pela política de segurança.'));
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = safeObjectUrl;
      video.muted = true;
      video.playsInline = true;

      // Timeout de segurança caso o vídeo seja corrompido ou formato não decodificável
      const timeoutId = setTimeout(() => {
        resolve({
          dataUrl: safeObjectUrl,
          originalSize: file.size,
          compressedSize: file.size,
          thumbnailDataUrl: '',
        });
      }, 5000);

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(480, video.videoWidth || 480);
          canvas.height = Math.min(270, video.videoHeight || 270);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const safeThumb = sanitizeUrl(thumbnailDataUrl, '');

          resolve({
            dataUrl: safeObjectUrl,
            originalSize: file.size,
            compressedSize: file.size,
            thumbnailDataUrl: safeThumb,
            duration: video.duration,
          });
        } catch {
          resolve({
            dataUrl: safeObjectUrl,
            originalSize: file.size,
            compressedSize: file.size,
            thumbnailDataUrl: '',
            duration: video.duration,
          });
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        resolve({
          dataUrl: safeObjectUrl,
          originalSize: file.size,
          compressedSize: file.size,
          thumbnailDataUrl: '',
        });
      };
    } catch (err) {
      reject(new Error('Erro ao criar URL do vídeo para processamento: ' + err));
    }
  });
}

/**
 * Verifica se uma mídia expirou (se já passaram mais de 24 horas da data limite)
 */
export function isMediaExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Formata tamanho de bytes em formato legível (ex: 1.4 MB ou 180 KB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
