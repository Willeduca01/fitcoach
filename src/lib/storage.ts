import { supabase } from './supabase';
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
 * Converte uma dataURL (Base64) em um Blob nativo para upload eficiente
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
 * Realiza o upload de arquivos de imagem ou vídeo diretamente para o bucket 'chat-media' do Supabase.
 * Retorna a URL pública de acesso e o caminho no Storage.
 */
export async function uploadChatMedia(
  fileOrBlob: File | Blob,
  options: UploadMediaOptions = {}
): Promise<UploadMediaResult> {
  const mimeType = options.contentType || fileOrBlob.type || 'application/octet-stream';
  const isVideo = mimeType.startsWith('video/');
  const folder = options.folder || (isVideo ? 'videos' : 'images');

  const now = new Date();
  const period = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.random().toString(36).substring(2, 9);

  // Extensão segura baseada no tipo MIME ou nome do arquivo
  let ext = 'webp';
  if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('mp4')) ext = 'mp4';
  else if (mimeType.includes('webm')) ext = 'webm';
  else if (mimeType.includes('quicktime')) ext = 'mov';
  else if (options.fileName && options.fileName.includes('.')) {
    const rawExt = options.fileName.split('.').pop()?.toLowerCase();
    if (rawExt && /^[a-z0-9]{2,5}$/.test(rawExt)) {
      ext = rawExt;
    }
  }

  const cleanFileName = `${Date.now()}_${randomSuffix}.${ext}`;
  const filePath = `${folder}/${period}/${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from('chat-media')
    .upload(filePath, fileOrBlob, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    console.error('[Supabase Storage] Erro no upload para chat-media:', error);
    throw new Error(error.message || 'Falha ao enviar arquivo para o armazenamento na nuvem.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(data.path);

  return {
    publicUrl: publicUrlData.publicUrl,
    path: data.path,
  };
}

/**
 * Remove um arquivo do bucket chat-media a partir da sua URL ou caminho relativo
 */
export async function deleteChatMedia(pathOrUrl: string): Promise<boolean> {
  try {
    let filePath = pathOrUrl;
    if (pathOrUrl.includes('/chat-media/')) {
      filePath = pathOrUrl.split('/chat-media/')[1];
    }

    if (!filePath) return false;

    const { error } = await supabase.storage.from('chat-media').remove([filePath]);
    if (error) {
      console.warn('[Supabase Storage] Não foi possível remover mídia:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Storage] Erro ao deletar mídia:', err);
    return false;
  }
}
