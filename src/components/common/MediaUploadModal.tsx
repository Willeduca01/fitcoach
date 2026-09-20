import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ChatMedia } from '../../types';
import {
  compressImage,
  processVideo,
  ProcessedImageResult,
  ProcessedVideoResult
} from '../../lib/mediaCompressor';
import {
  Send,
  Loader2,
  AlertTriangle
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
      return;
    }

    const processFile = async () => {
      setIsProcessing(true);
      setErrorMsg(null);

      try {
        if (file.type.startsWith('image/')) {
          // Comprime a imagem em segundo plano para economizar banco de dados
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
        setErrorMsg('Não foi possível processar o arquivo selecionado.');
      } finally {
        setIsProcessing(false);
      }
    };

    processFile();
  }, [file, isOpen]);

  const handleConfirmSend = () => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    let mediaUrl = '';
    let compressedSize = file.size;
    let thumbnailUrl: string | undefined = undefined;

    if (isImage && processedImage) {
      mediaUrl = processedImage.dataUrl;
      compressedSize = processedImage.compressedSize;
    } else if (isVideo && processedVideo) {
      mediaUrl = processedVideo.dataUrl;
      compressedSize = processedVideo.compressedSize;
      thumbnailUrl = processedVideo.thumbnailDataUrl;
    }

    if (!mediaUrl) return;

    const media: ChatMedia = {
      url: mediaUrl,
      type: isImage ? 'image' : 'video',
      fileName: file.name,
      fileSize: file.size,
      compressedSize,
      allowDownload: true,
      thumbnailUrl,
    };

    onSendMedia(media, caption.trim());
    onClose();
  };

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isImage ? 'Enviar Imagem' : isVideo ? 'Enviar Vídeo' : 'Enviar Mídia'}
      subtitle={file ? file.name : undefined}
    >
      <div className="space-y-4 text-sm font-sans">
        {/* Loading State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-zinc-900/60 rounded-2xl border border-white/[0.06]">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-300 font-medium">
              Preparando visualização...
            </p>
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
        {!isProcessing && !errorMsg && (
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || !!errorMsg || (!processedImage && !processedVideo)}
            onClick={handleConfirmSend}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
