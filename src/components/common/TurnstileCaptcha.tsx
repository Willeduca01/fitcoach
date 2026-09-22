import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: any) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          action?: string;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error?: string) => void;
  onExpire?: () => void;
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  action?: string;
  className?: string;
}

// Chave oficial de teste da Cloudflare (sempre aprova)
const DEFAULT_TEST_SITE_KEY = '1x00000000000000000000AA';

export const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({
  onVerify,
  onError,
  onExpire,
  siteKey,
  theme = 'dark',
  size = 'normal',
  action = 'fitcoach_auth',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resolvedSiteKey =
    siteKey ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURNSTILE_SITE_KEY) ||
    DEFAULT_TEST_SITE_KEY;

  useEffect(() => {
    let isMounted = true;

    // Função de inicialização do widget Turnstile
    const initWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Limpa widget anterior se houver
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: resolvedSiteKey,
          theme,
          size,
          action,
          callback: (token: string) => {
            if (isMounted) {
              setIsLoading(false);
              onVerify(token);
            }
          },
          'error-callback': (code?: any) => {
            console.warn('[Turnstile] Erro de desafio anti-bot:', code);
            if (isMounted) {
              setIsLoading(false);
              onError?.('Falha no desafio anti-bot. Tente novamente.');
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              onExpire?.();
            }
          },
        });

        widgetIdRef.current = id;
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.warn('[Turnstile] Falha ao renderizar widget:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Verifica se a biblioteca Turnstile já está presente no window
    if (window.turnstile) {
      initWidget();
      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
        }
      };
    }

    // Carrega o script oficial do Cloudflare Turnstile de forma segura
    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        if (isMounted) {
          initWidget();
        }
      };

      script.onerror = () => {
        console.warn('[Turnstile] Erro ao carregar script do Cloudflare Turnstile.');
        if (isMounted) {
          setIsLoading(false);
          // Em caso de falha de conexão com a Cloudflare, não bloqueia o usuário legítimo
          onVerify('bypass_offline_token');
        }
      };

      document.head.appendChild(script);
    } else {
      // Script já inserido, aguarda disponibilização do window.turnstile
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          if (isMounted) initWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (isMounted && !window.turnstile) {
          setIsLoading(false);
        }
      }, 5000);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        clearTimeout(timeout);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
        }
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [resolvedSiteKey, theme, size, action]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-[68px] ${className}`}>
      {isLoading && (
        <div className="flex items-center gap-2 py-3 text-xs text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Iniciando verificação anti-bot segura...</span>
        </div>
      )}
      <div ref={containerRef} className={isLoading ? 'hidden' : 'block'} />
      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
        <ShieldCheck className="w-3 h-3 text-emerald-400/80" />
        <span>Protegido por Cloudflare Turnstile • Verificação de Bot</span>
      </div>
    </div>
  );
};
