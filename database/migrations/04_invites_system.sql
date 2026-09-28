-- ============================================================================
-- FITCOACH PRO — PARTE 4: SISTEMA DE CONVITES RIGOROSO (RBAC & ISOLAMENTO)
-- ============================================================================

-- 1. Criar Tabela de Convites
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Ex: 'PROF-9X2K4A' ou 'ALUNO-8L1P3Q'
    type TEXT NOT NULL CHECK (type IN ('PERSONAL', 'STUDENT')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    personal_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- ID do Personal vinculado (obrigatório se type = 'STUDENT')
    target_name TEXT, -- Nome sugerido do convidado (ex: "Ana Paula")
    target_email TEXT, -- Email opcional restrito
    plan TEXT DEFAULT 'MENSAL',
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'USADO', 'EXPIRADO', 'REVOGADO')),
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices de Performance para busca rápida de convite
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_personal_id ON public.invites(personal_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);

-- 3. Habilitar RLS na tabela de convites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 3.1 Personal pode ver e gerenciar os convites que ele mesmo criou
DROP POLICY IF EXISTS "Personal gerencia seus convites de alunos" ON public.invites;
CREATE POLICY "Personal gerencia seus convites de alunos"
    ON public.invites FOR ALL
    TO authenticated
    USING (personal_id = auth.uid() OR created_by = auth.uid())
    WITH CHECK (personal_id = auth.uid() OR created_by = auth.uid());

-- 3.2 Qualquer visitante (anon ou autenticado) pode consultar convites pendentes pelo código para validar na tela de cadastro
DROP POLICY IF EXISTS "Leitura publica de convites pendentes por codigo" ON public.invites;
CREATE POLICY "Leitura publica de convites pendentes por codigo"
    ON public.invites FOR SELECT
    TO anon, authenticated
    USING (status = 'PENDENTE' AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================================================
-- 4. FUNÇÃO RPC DE VALIDAÇÃO DE CONVITE (Acessível pelo Frontend público)
-- ============================================================================
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
BEGIN
    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = UPPER(TRIM(invite_code))
      AND status = 'PENDENTE'
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF found_invite.id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;

    -- Se for de aluno, busca o nome do personal vinculado
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ATUALIZAÇÃO DO TRIGGER DE CRIAÇÃO DE USUÁRIO (VINCULAÇÃO E SEGURANÇA)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_invite_code TEXT;
    found_invite RECORD;
    user_name TEXT;
    user_phone TEXT;
BEGIN
    -- 1. Captura o código de convite dos metadados fornecidos no cadastro
    input_invite_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')));
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- Se não enviou código de convite, bloqueia imediatamente!
    IF input_invite_code IS NULL OR input_invite_code = '' THEN
        RAISE EXCEPTION 'Acesso restrito: É necessário um código de convite válido para criar uma conta no FitCoach Pro.';
    END IF;

    -- 2. Busca e valida o convite no banco de dados
    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = input_invite_code
      AND status = 'PENDENTE'
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE; -- Trava o registro para evitar uso simultâneo (race condition)

    IF found_invite.id IS NULL THEN
        RAISE EXCEPTION 'Convite inválido, já utilizado ou expirado.';
    END IF;

    -- 3. Cria o perfil do usuário correspondente ao tipo de convite
    INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        found_invite.type, -- 'PERSONAL' ou 'STUDENT'
        COALESCE(found_invite.target_name, user_name),
        NEW.email,
        user_phone,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email;

    -- 4. Tratamento específico para PERSONAL (Treinador)
    IF found_invite.type = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer & Consultor', 'EMAIL')
        ON CONFLICT (id) DO NOTHING;

    -- 5. Tratamento específico para STUDENT (Aluno) — Vinculação permanente com o professor
    ELSIF found_invite.type = 'STUDENT' THEN
        IF found_invite.personal_id IS NULL THEN
            RAISE EXCEPTION 'Erro de integridade: O convite do aluno deve estar vinculado ao Personal Trainer.';
        END IF;

        -- Insere a ficha do aluno vinculada exclusivamente ao personal_id do convite
        INSERT INTO public.students (
            personal_id,
            user_id,
            name,
            email,
            phone,
            status,
            plan,
            monthly_fee,
            due_day,
            payment_status,
            start_date,
            primary_goal
        ) VALUES (
            found_invite.personal_id,
            NEW.id,
            COALESCE(found_invite.target_name, user_name),
            NEW.email,
            user_phone,
            'ATIVO',
            COALESCE(found_invite.plan, 'MENSAL'),
            350.00,
            10,
            'EM_DIA',
            CURRENT_DATE,
            'Hipertrofia e Condicionamento'
        );
    END IF;

    -- 6. Queima o convite (marca como USADO)
    UPDATE public.invites
    SET status = 'USADO',
        used_by = NEW.id,
        used_at = NOW()
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reassocia o trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. CONVITE MASTER INICIAL DE PROFESSOR (Para o desenvolvedor criar sua conta)
-- ============================================================================
INSERT INTO public.invites (code, type, target_name, plan)
VALUES ('PROF-MESTRE-2026', 'PERSONAL', 'Professor Master', 'ANUAL')
ON CONFLICT (code) DO NOTHING;
