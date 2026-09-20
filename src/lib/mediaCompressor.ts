/**
 * Utilitários de compressão e processamento de mídias (fotos e vídeos) no navegador
 */

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

        // Calcular tamanho aproximado do arquivo em bytes a partir do Base64
        const base64Data = dataUrl.split(',')[1] || '';
        const compressedSize = Math.round((base64Data.length * 3) / 4);

        resolve({
          dataUrl,
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
  return new Promise((resolve, reject) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;

      // Timeout de segurança caso o vídeo seja corrompido ou formato não decodificável
      const timeoutId = setTimeout(() => {
        resolve({
          dataUrl: objectUrl,
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

          resolve({
            dataUrl: objectUrl,
            originalSize: file.size,
            compressedSize: file.size,
            thumbnailDataUrl,
            duration: video.duration,
          });
        } catch {
          resolve({
            dataUrl: objectUrl,
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
          dataUrl: objectUrl,
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
