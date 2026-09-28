-- ============================================================================
-- FITCOACH PRO — PARTE 7: RATE LIMITING E PROTEÇÃO CONTRA FORÇA BRUTA (SQL)
-- ============================================================================

-- 1. Tabela para auditoria e controle de taxa de requisições
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action TEXT NOT NULL,
    identifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para busca rápida por identificador e janela de tempo
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
    ON public.rate_limit_logs (action, identifier, created_at DESC);

-- Habilitar RLS: tabela de uso estritamente interno pelo banco/RPC
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Função de limpeza automática para manter a tabela leve (remove logs > 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.rate_limit_logs
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- 3. Função Helper: check_and_record_rate_limit
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
    p_action TEXT,
    p_identifier TEXT,
    p_max_attempts INT,
    p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    recent_attempts INT;
BEGIN
    -- Conta tentativas dentro da janela usando aritmética de intervalo segura (sem concatenação de strings)
    SELECT COUNT(*) INTO recent_attempts
    FROM public.rate_limit_logs
    WHERE action = p_action
      AND identifier = p_identifier
      AND created_at > NOW() - (p_window_seconds * INTERVAL '1 second');

    -- Se excedeu o limite permitido, recusa
    IF recent_attempts >= p_max_attempts THEN
        RETURN FALSE;
    END IF;

    -- Registra a nova tentativa
    INSERT INTO public.rate_limit_logs (action, identifier)
    VALUES (p_action, p_identifier);

    -- Limpeza leve ocasional (1% de chance por chamada)
    IF random() < 0.01 THEN
        PERFORM public.cleanup_old_rate_limits();
    END IF;

    RETURN TRUE;
END;
$$;

-- 4. Atualizar validate_invite com proteção de Rate Limit integrada
CREATE OR REPLACE FUNCTION public.validate_invite(invite_code TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    invite_type TEXT,
    target_name TEXT,
    target_email TEXT,
    plan TEXT,
    personal_id UUID,
    personal_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    found_invite RECORD;
    p_name TEXT;
    clean_code TEXT;
    caller_id TEXT;
    is_allowed BOOLEAN;
BEGIN
    clean_code := UPPER(TRIM(COALESCE(invite_code, '')));

    -- Identificador do solicitante: usa o UID do usuário ou 'anon_request'
    caller_id := COALESCE(auth.uid()::TEXT, 'anon_caller');

    -- Rate Limit: máx 15 consultas de convites a cada 5 minutos por identificador
    is_allowed := public.check_and_record_rate_limit('VALIDATE_INVITE', caller_id, 15, 300);

    IF NOT is_allowed THEN
        -- Recusa silenciosamente por excesso de requisições
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = clean_code
      AND status = 'PENDENTE'
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF found_invite.id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    IF found_invite.type = 'STUDENT' AND found_invite.personal_id IS NOT NULL THEN
        SELECT name INTO p_name FROM public.profiles WHERE id = found_invite.personal_id;
    ELSE
        p_name := 'Administrador / Desenvolvedor';
    END IF;

    RETURN QUERY SELECT
        TRUE,
        found_invite.type,
        found_invite.target_name,
        found_invite.target_email,
        found_invite.plan,
        found_invite.personal_id,
        COALESCE(p_name, 'Personal Trainer');
END;
$$;

