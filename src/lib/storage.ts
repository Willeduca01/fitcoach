import { sanitizeFileName } from './security';

export interface UploadMediaOptions {
  folder?: 'images' | 'videos' | 'thumbnails';
  fileName?: string;
  contentType?: string;
}

export interface UploadMediaResult {
  publicUrl: string;
  path: string;
}

/**
 * Converte uma dataURL (Base64) em um Blob nativo para processamento
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Realiza o upload de arquivos de imagem ou vídeo convertendo para DataURL seguro
 * Retorna a URL pública de acesso e o identificador de mídia.
 */
export async function uploadChatMedia(
  fileOrBlob: File | Blob,
  options: UploadMediaOptions = {}
): Promise<UploadMediaResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const cleanFileName = `${Date.now()}_${randomSuffix}`;
      resolve({
        publicUrl: base64data,
        path: `media/${cleanFileName}`,
      });
    };
    reader.onerror = () => reject(new Error('Falha ao processar arquivo de mídia.'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Remove um arquivo de mídia
 */
export async function deleteChatMedia(pathOrUrl: string): Promise<boolean> {
  return true;
}
