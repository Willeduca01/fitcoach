import React, { useState } from 'react';
import { ChatMedia } from '../../types';
import { Eye, Download } from 'lucide-react';
import { Modal } from './Modal';

interface ChatMediaBubbleProps {
  media: ChatMedia;
  isMe: boolean;
}

export const ChatMediaBubble: React.FC<ChatMediaBubbleProps> = ({ media }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.fileName || (media.type === 'image' ? 'imagem-fitcoach.webp' : 'video-fitcoach.mp4');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-1.5 mb-1.5 max-w-full">
      {/* Renderização de Imagem */}
      {media.type === 'image' && (
        <div className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[280px] sm:max-w-[340px]">
          <img
            src={media.url}
            alt={media.fileName || 'Imagem'}
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-auto max-h-[260px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
            loading="lazy"
          />

          {/* Botão de Expandir no Hover */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
              title="Expandir foto"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Renderização de Vídeo */}
      {media.type === 'video' && (
        <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[280px] sm:max-w-[340px]">
          <video
            src={media.url}
            controls
            className="w-full max-h-[260px] rounded-xl bg-black"
            poster={media.thumbnailUrl}
          />
        </div>
      )}

      {/* Lightbox / Modal de Imagem Expandida */}
      {isLightboxOpen && (
        <Modal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          title={media.fileName || 'Visualização da Imagem'}
        >
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden bg-black/90 flex items-center justify-center max-h-[75vh]">
              <img
                src={media.url}
                alt={media.fileName}
                className="max-h-[75vh] w-auto object-contain rounded-xl select-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </button>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
