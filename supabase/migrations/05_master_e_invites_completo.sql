-- ============================================================================
-- FITCOACH PRO — CRIAÇÃO DA TABELA INVITES + PAPEL MASTER + POLÍTICAS COMPLETAS
-- (Execute este bloco completo no SQL Editor do Supabase)
-- ============================================================================

-- 1. Criar a Tabela de Convites (caso ainda não exista)
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('PERSONAL', 'STUDENT')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    personal_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_name TEXT,
    target_email TEXT,
    plan TEXT DEFAULT 'MENSAL',
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'USADO', 'EXPIRADO', 'REVOGADO')),
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_personal_id ON public.invites(personal_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);

-- 2. Atualizar a restrição de papéis em public.profiles para permitir 'MASTER'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('PERSONAL', 'STUDENT', 'MASTER'));

-- 3. Função Helper: is_master
CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'MASTER'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Função RPC de Validação de Convites para o Frontend
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

-- 5. Trigger handle_new_user com Suporte a MASTER e Validação de Convites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_invite_code TEXT;
    found_invite RECORD;
    user_name TEXT;
    user_phone TEXT;
    direct_role TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    direct_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', ''));

    -- Se for usuário MASTER (criado pelo admin)
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

    -- Caso contrário, exige código de convite obrigatório
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
        RAISE EXCEPTION 'Convite inválido, já utilizado ou expirado.';
    END IF;

    -- Cria o perfil com a role do convite
    INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        found_invite.type,
        COALESCE(found_invite.target_name, user_name),
        NEW.email,
        user_phone,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email;

    IF found_invite.type = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer & Consultor', 'EMAIL')
        ON CONFLICT (id) DO NOTHING;

    ELSIF found_invite.type = 'STUDENT' THEN
        IF found_invite.personal_id IS NULL THEN
            RAISE EXCEPTION 'Erro: O convite do aluno deve estar vinculado a um Personal Trainer.';
        END IF;

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

    UPDATE public.invites
    SET status = 'USADO',
        used_by = NEW.id,
        used_at = NOW()
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reassocia o trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Habilitar RLS e Criar Políticas para a Tabela Invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia seus convites de alunos" ON public.invites;
CREATE POLICY "Personal gerencia seus convites de alunos"
    ON public.invites FOR ALL
    TO authenticated
    USING (personal_id = auth.uid() OR created_by = auth.uid() OR public.is_master(auth.uid()))
    WITH CHECK (personal_id = auth.uid() OR created_by = auth.uid() OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Leitura publica de convites pendentes por codigo" ON public.invites;
CREATE POLICY "Leitura publica de convites pendentes por codigo"
    ON public.invites FOR SELECT
    TO anon, authenticated
    USING (status = 'PENDENTE' AND (expires_at IS NULL OR expires_at > NOW()));

-- 7. Políticas de Acesso Global para MASTER
DROP POLICY IF EXISTS "Master pode ver todos os perfis" ON public.profiles;
CREATE POLICY "Master pode ver todos os perfis"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver todos os perfis de personal" ON public.personal_profiles;
CREATE POLICY "Master pode ver todos os perfis de personal"
    ON public.personal_profiles FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver e gerenciar todos os alunos" ON public.students;
CREATE POLICY "Master pode ver e gerenciar todos os alunos"
    ON public.students FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver todas as faturas" ON public.invoices;
CREATE POLICY "Master pode ver todas as faturas"
    ON public.invoices FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

-- 8. Inserir Convite Mestre Inicial
INSERT INTO public.invites (code, type, target_name, plan)
VALUES ('PROF-MESTRE-2026', 'PERSONAL', 'Professor Master', 'ANUAL')
ON CONFLICT (code) DO NOTHING;
