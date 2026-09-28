-- ============================================================================
-- FITCOACH PRO — MIGRATION 06: VINCULAR ALUNO EXISTENTE AO ATIVAR CONVITE
-- Evita duplicar alunos pré-cadastrados pelo personal e vincula user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_phone TEXT;
    input_invite_code TEXT;
    found_invite RECORD;
    existing_student_id UUID;
BEGIN
    user_name := NEW.raw_user_meta_data->>'name';
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- Se for a conta do Desenvolvedor / Dono, cria como MASTER automaticamente
    IF LOWER(NEW.email) = 'williamsilveira0204@gmail.com' THEN
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

        -- 1. Verifica se o aluno já foi pré-cadastrado na tabela students pelo personal
        SELECT id INTO existing_student_id
        FROM public.students
        WHERE personal_id = found_invite.personal_id
          AND (
            (email IS NOT NULL AND LOWER(email) = LOWER(NEW.email))
            OR (found_invite.target_email IS NOT NULL AND LOWER(email) = LOWER(found_invite.target_email))
          )
        ORDER BY created_at DESC
        LIMIT 1;

        IF existing_student_id IS NOT NULL THEN
            -- Vincula a conta criada ao aluno existente, preservando treinos, faturas e avaliações montadas pelo personal!
            UPDATE public.students
            SET user_id = NEW.id,
                email = NEW.email,
                phone = COALESCE(user_phone, phone),
                updated_at = NOW()
            WHERE id = existing_student_id;
        ELSE
            -- Cria um novo registro caso o aluno tenha vindo direto pelo link de convite sem pré-cadastro no CRM
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
    END IF;

    UPDATE public.invites
    SET status = 'USADO',
        used_by = NEW.id,
        used_at = NOW()
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
