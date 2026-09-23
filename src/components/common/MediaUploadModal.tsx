import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ChatMedia } from '../../types';
import {
  compressImage,
  processVideo,
  validateMediaFile,
  ProcessedImageResult,
  ProcessedVideoResult
} from '../../lib/mediaCompressor';
import { uploadChatMedia, dataUrlToBlob } from '../../lib/storage';
import { sanitizeFileName, sanitizeUrl } from '../../lib/security';
import {
  Send,
  Loader2,
  AlertTriangle,
  CloudUpload
} from 'lucide-react';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onSendMedia: (media: ChatMedia, caption: string) => void;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  file,
  onSendMedia,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processedImage, setProcessedImage] = useState<ProcessedImageResult | null>(null);
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideoResult | null>(null);
  const [caption, setCaption] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isOpen) {
      setProcessedImage(null);
      setProcessedVideo(null);
      setCaption('');
      setErrorMsg(null);
      setIsUploading(false);
      return;
    }

    const processFile = async () => {
      setIsProcessing(true);
      setErrorMsg(null);

      // Validação estrita de segurança do tipo de arquivo (OWASP)
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.reason || 'Arquivo rejeitado pela política de segurança.');
        setIsProcessing(false);
        return;
      }

      try {
        if (file.type.startsWith('image/')) {
          const result = await compressImage(file);
          setProcessedImage(result);
        } else if (file.type.startsWith('video/')) {
          if (file.size > 1024 * 1024 * 1024) {
            setErrorMsg('O vídeo selecionado excede o limite máximo de 1 GB.');
            setIsProcessing(false);
            return;
          }
          const result = await processVideo(file);
          setProcessedVideo(result);
        } else {
          setErrorMsg('Formato de arquivo não suportado. Envie uma foto ou vídeo.');
        }
      } catch (err: any) {
        console.error('Erro ao processar mídia:', err);
        setErrorMsg(err.message || 'Não foi possível processar o arquivo selecionado.');
      } finally {
        setIsProcessing(false);
      }
    };

    processFile();
  }, [file, isOpen]);

  const handleConfirmSend = async () => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    setIsUploading(true);
    setErrorMsg(null);

    try {
      let finalMediaUrl = '';
      let finalThumbnailUrl: string | undefined = undefined;
      let compressedSize = file.size;

      if (isImage && processedImage) {
        // Obter blob comprimido para upload no bucket chat-media
        const imageBlob = processedImage.blob || dataUrlToBlob(processedImage.dataUrl);
        compressedSize = processedImage.compressedSize;

        const uploadResult = await uploadChatMedia(imageBlob, {
          folder: 'images',
          fileName: file.name,
          contentType: processedImage.format || 'image/webp',
        });
        finalMediaUrl = uploadResult.publicUrl;
      } else if (isVideo && processedVideo) {
        compressedSize = processedVideo.compressedSize;

        // Upload do vídeo original/processado
        const videoUploadResult = await uploadChatMedia(file, {
          folder: 'videos',
          fileName: file.name,
          contentType: file.type,
        });
        finalMediaUrl = videoUploadResult.publicUrl;

        // Se houver thumbnail gerado no canvas, faz upload no bucket
        if (processedVideo.thumbnailDataUrl) {
          try {
            const thumbBlob = dataUrlToBlob(processedVideo.thumbnailDataUrl);
            const thumbUploadResult = await uploadChatMedia(thumbBlob, {
              folder: 'thumbnails',
              contentType: 'image/jpeg',
            });
            finalThumbnailUrl = thumbUploadResult.publicUrl;
          } catch (thumbErr) {
            console.warn('[MediaUploadModal] Não foi possível fazer upload da thumbnail:', thumbErr);
          }
        }
      } else {
        throw new Error('Nenhuma mídia processada disponível para envio.');
      }

      const safeMediaUrl = sanitizeUrl(finalMediaUrl, '');
      if (!safeMediaUrl || safeMediaUrl === '#') {
        throw new Error('Falha de segurança ao validar a URL pública da mídia.');
      }

      const safeFileName = sanitizeFileName(
        file.name,
        isImage ? 'imagem-fitcoach.webp' : 'video-fitcoach.mp4'
      );

      const media: ChatMedia = {
        url: safeMediaUrl,
        type: isImage ? 'image' : 'video',
        fileName: safeFileName,
        fileSize: file.size,
        compressedSize,
        allowDownload: true,
        thumbnailUrl: finalThumbnailUrl ? sanitizeUrl(finalThumbnailUrl, '') : undefined,
      };

      // Remove quebras de linha e caracteres de controle da legenda
      const safeCaption = caption.replace(/[\x00-\x1F\x7F]/g, '').trim();

      onSendMedia(media, safeCaption);
      setIsUploading(false);
      onClose();
    } catch (err: any) {
      console.error('[MediaUploadModal] Erro ao enviar mídia:', err);
      setErrorMsg(err.message || 'Erro ao realizar upload da mídia para o servidor.');
      setIsUploading(false);
    }
  };

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title={isImage ? 'Enviar Imagem' : isVideo ? 'Enviar Vídeo' : 'Enviar Mídia'}
      subtitle={file ? sanitizeFileName(file.name) : undefined}
    >
      <div className="space-y-4 text-sm font-sans">
        {/* Loading State durante Processamento Local */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-zinc-900/60 rounded-2xl border border-white/[0.06]">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-300 font-medium">
              Processando e validando segurança da mídia...
            </p>
          </div>
        )}

        {/* Loading State durante Upload para Supabase Storage */}
        {isUploading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-zinc-900/60 rounded-2xl border border-emerald-500/20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-200 font-semibold flex items-center justify-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-emerald-400" />
                <span>Enviando para o Supabase Storage (chat-media)...</span>
              </p>
              <p className="text-[11px] text-zinc-400">
                Otimizando armazenamento e gerando link seguro...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Demonstrativo da Imagem / Vídeo + Legenda */}
        {!isProcessing && !isUploading && (
          <div className="space-y-3">
            {/* Visualizador / Demonstrativo */}
            <div className="relative rounded-2xl bg-zinc-950/80 border border-white/[0.08] overflow-hidden flex items-center justify-center max-h-[300px] min-h-[160px]">
              {isImage && processedImage && (
                <img
                  src={processedImage.dataUrl}
                  alt="Demonstrativo da Imagem"
                  className="max-h-[300px] w-auto object-contain rounded-xl"
                />
              )}

              {isVideo && processedVideo && (
                <video
                  src={processedVideo.dataUrl}
                  controls
                  className="max-h-[300px] w-full object-contain rounded-xl"
                />
              )}
            </div>

            {/* Campo de Legenda */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Legenda
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicione uma legenda à imagem..."
                className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || isUploading || (!processedImage && !processedVideo)}
            onClick={handleConfirmSend}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
