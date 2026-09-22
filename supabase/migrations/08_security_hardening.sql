-- ============================================================================
-- FITCOACH PRO — PARTE 8: BLINDAGEM DE SEGURANÇA (SECURITY HARDENING)
-- Correção contra Search Path Hijacking (CWE-426 / Supabase Linter) e SQLi
-- Garante SET search_path = public, pg_temp em todas as funções SECURITY DEFINER
-- ============================================================================

-- 1. Trigger de Atualização de Timestamp (handle_updated_at)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. Helper de Função RLS: current_user_role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. Helper de Função RLS: current_student_ids
CREATE OR REPLACE FUNCTION public.current_student_ids()
RETURNS TABLE (id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.students WHERE user_id = auth.uid();
$$;

-- 4. Helper de Permissão: is_master
CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'MASTER'
    );
$$;

-- 5. Função de Limpeza de Logs de Rate Limit
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

-- 6. Função de Verificação e Registro de Rate Limit (Sem concatenação de string em intervalos)
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
    -- Conta tentativas dentro da janela usando aritmética estrita de intervalos (imune a injeção)
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

-- 7. Função RPC de Validação de Convites
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

    -- Identificador do solicitante para rate limiting
    caller_id := COALESCE(auth.uid()::TEXT, 'anon_caller');

    -- Rate Limit: máx 15 consultas de convites a cada 5 minutos por identificador
    is_allowed := public.check_and_record_rate_limit('VALIDATE_INVITE', caller_id, 15, 300);

    IF NOT is_allowed THEN
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

-- 8. Trigger de Criação de Usuário (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    input_invite_code TEXT;
    found_invite RECORD;
    user_name TEXT;
    user_phone TEXT;
    direct_role TEXT;
    final_role TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    direct_role := NEW.raw_user_meta_data->>'role';

    -- Permite conta MASTER diretamente se o e-mail ou metadado for específico de dev
    IF direct_role = 'MASTER' OR NEW.email = 'dev.dev@fitcoach.com.br' THEN
        INSERT INTO public.profiles (id, role, name, email, avatar_url)
        VALUES (
            NEW.id,
            'MASTER',
            COALESCE(user_name, 'Desenvolvedor Master'),
            NEW.email,
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'MASTER',
            name = EXCLUDED.name,
            email = EXCLUDED.email;

        RETURN NEW;
    END IF;

    -- Validação do código de convite
    input_invite_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')));

    IF input_invite_code IS NULL OR input_invite_code = '' THEN
        RAISE EXCEPTION 'Acesso restrito: É necessário um código de convite válido para criar uma conta no FitCoach Pro.';
    END IF;

    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = input_invite_code
      AND status = 'PENDENTE'
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;

    IF found_invite.id IS NULL THEN
        RAISE EXCEPTION 'Código de convite inválido, expirado ou já utilizado.';
    END IF;

    final_role := found_invite.type;

    INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        final_role,
        COALESCE(found_invite.target_name, user_name),
        NEW.email,
        user_phone,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, profiles.phone);

    IF final_role = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer & Consultor', 'EMAIL')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF final_role = 'STUDENT' AND found_invite.personal_id IS NOT NULL THEN
        INSERT INTO public.students (
            personal_id,
            user_id,
            name,
            email,
            phone,
            status,
            plan,
            start_date,
            payment_status
        )
        VALUES (
            found_invite.personal_id,
            NEW.id,
            COALESCE(found_invite.target_name, user_name),
            NEW.email,
            COALESCE(user_phone, '(11) 99999-9999'),
            'ATIVO',
            COALESCE(found_invite.plan, 'MENSAL'),
            CURRENT_DATE,
            'EM_DIA'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.invites
    SET
        status = 'USADO',
        used_at = NOW(),
        used_by = NEW.id
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$;

-- 9. Conceder permissões mínimas necessárias às roles anon e authenticated
GRANT EXECUTE ON FUNCTION public.validate_invite(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_student_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master(UUID) TO authenticated;
