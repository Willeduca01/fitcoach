-- ============================================================================
-- FITCOACH PRO — MIGRATION 06: ATUALIZAÇÃO DO SISTEMA DE CONVITES & RBAC
-- Suporte completo a papéis (PERSONAL/trainer, STUDENT/student, MASTER)
-- e status de convite (PENDENTE/pending, USADO/used)
-- ============================================================================

-- 1. Ampliar a restrição de status e tipo na tabela public.invites
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_type_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_type_check 
    CHECK (type IN ('PERSONAL', 'STUDENT', 'TRAINER', 'trainer', 'student'));

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_status_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_status_check 
    CHECK (status IN ('PENDENTE', 'USADO', 'EXPIRADO', 'REVOGADO', 'pending', 'used', 'expired'));

-- 2. Atualizar a RPC validate_invite para suportar tanto código quanto email e case-insensitive
CREATE OR REPLACE FUNCTION public.validate_invite(invite_code TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    invite_type TEXT,
    target_name TEXT,
    target_email TEXT,
    plan TEXT,
    personal_id UUID,
    personal_name TEXT
) AS $$
DECLARE
    found_invite RECORD;
    p_name TEXT;
    normalized_type TEXT;
BEGIN
    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = UPPER(TRIM(invite_code))
      AND status IN ('PENDENTE', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF found_invite.id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    -- Normaliza o tipo de convite
    IF UPPER(found_invite.type) IN ('PERSONAL', 'TRAINER') THEN
        normalized_type := 'PERSONAL';
        p_name := 'Administrador Master';
    ELSE
        normalized_type := 'STUDENT';
        IF found_invite.personal_id IS NOT NULL THEN
            SELECT name INTO p_name FROM public.profiles WHERE id = found_invite.personal_id;
        END IF;
    END IF;

    RETURN QUERY SELECT
        TRUE,
        normalized_type,
        found_invite.target_name,
        found_invite.target_email,
        found_invite.plan,
        found_invite.personal_id,
        COALESCE(p_name, 'Personal Trainer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar a Trigger handle_new_user para registrar used_by, used_at e status = 'USADO'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_invite_code TEXT;
    found_invite RECORD;
    user_name TEXT;
    user_phone TEXT;
    direct_role TEXT;
    assigned_role TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    direct_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', ''));

    -- Se for usuário MASTER (criado diretamente)
    IF direct_role = 'MASTER' THEN
        INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
        VALUES (
            NEW.id,
            'MASTER',
            COALESCE(user_name, 'Desenvolvedor Master'),
            NEW.email,
            user_phone,
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'MASTER',
            name = EXCLUDED.name,
            email = EXCLUDED.email;
        RETURN NEW;
    END IF;

    -- Validação obrigatória de convite
    input_invite_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')));

    IF input_invite_code IS NULL OR input_invite_code = '' THEN
        RAISE EXCEPTION 'Acesso restrito: É necessário um código de convite válido para criar uma conta no FitCoach Pro.';
    END IF;

    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = input_invite_code
      AND status IN ('PENDENTE', 'pending')
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;

    IF found_invite.id IS NULL THEN
        RAISE EXCEPTION 'Convite inválido, já utilizado ou expirado.';
    END IF;

    -- Determina o papel oficial
    IF UPPER(found_invite.type) IN ('PERSONAL', 'TRAINER') THEN
        assigned_role := 'PERSONAL';
    ELSE
        assigned_role := 'STUDENT';
    END IF;

    -- Cria o perfil
    INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        assigned_role,
        COALESCE(found_invite.target_name, user_name),
        NEW.email,
        user_phone,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email;

    -- Perfil complementar
    IF assigned_role = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer', 'CHAVE_ALEATORIA')
        ON CONFLICT (id) DO NOTHING;
    ELSIF assigned_role = 'STUDENT' THEN
        INSERT INTO public.students (
            user_id,
            personal_id,
            name,
            email,
            phone,
            plan,
            status,
            payment_status,
            start_date
        )
        VALUES (
            NEW.id,
            found_invite.personal_id,
            COALESCE(found_invite.target_name, user_name),
            NEW.email,
            user_phone,
            COALESCE(found_invite.plan, 'MENSAL'),
            'ATIVO',
            'EM_DIA',
            CURRENT_DATE
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Marca o convite como utilizado (used)
    UPDATE public.invites
    SET status = 'USADO',
        used_by = NEW.id,
        used_at = NOW()
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
