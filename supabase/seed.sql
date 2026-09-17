-- ============================================================================
-- FITCOACH PRO — SEED SCRIPT (DADOS INICIAIS OPCIONAIS DE DEMONSTRACAO)
-- ============================================================================

DO 
DECLARE
    demo_personal_id UUID;
    student_1_id UUID;
    student_2_id UUID;
    student_3_id UUID;
    workout_a_id UUID;
BEGIN
    -- Busca o primeiro personal cadastrado ou define um temporario
    SELECT id INTO demo_personal_id FROM public.profiles WHERE role = 'PERSONAL' LIMIT 1;

    IF demo_personal_id IS NOT NULL THEN
        -- Cria aluno 1: Rodrigo Faro
        INSERT INTO public.students (
            personal_id, name, email, phone, avatar_url, status, plan, monthly_fee, due_day,
            payment_status, primary_goal, streak_days, next_assessment_date, notes
        ) VALUES (
            demo_personal_id, 'Rodrigo Faro', 'rodrigo.faro@gmail.com', '11988887777',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            'ATIVO', 'MENSAL', 450.00, 10, 'EM_DIA', 'Hipertrofia e Densidade', 14,
            CURRENT_DATE + INTERVAL '15 days', 'Foco em peitoral e deltoide anterior. Cuidado com ombro esquerdo.'
        ) RETURNING id INTO student_1_id;

        -- Treino A para Rodrigo
        INSERT INTO public.workouts (student_id, personal_id, name, focus, exercises)
        VALUES (
            student_1_id, demo_personal_id, 'Treino A - Peito, Ombros e Triceps', 'Hipertrofia Superior',
            '[
                {id: ex1, name: Supino Reto com Barra, muscleGroup: Peito, sets: 4, reps: 8-10, load: 80kg, notes: Controle na descida (3s), completed: false},
                {id: ex2, name: Supino Inclinado com Halteres, muscleGroup: Peito, sets: 3, reps: 10-12, load: 26kg, notes: Foco na porcao clavicular, completed: false},
                {id: ex3, name: Desenvolvimento Militar Halteres, muscleGroup: Ombros, sets: 4, reps: 10, load: 20kg, notes: Escapulas travadas, completed: false},
                {id: ex4, name: Elevacao Lateral na Polia, muscleGroup: Ombros, sets: 4, reps: 12-15, load: 10kg, notes: Pico de contracao 1s, completed: false},
                {id: ex5, name: Triceps Corda, muscleGroup: Triceps, sets: 4, reps: 12, load: 35kg, notes: Abertura no final, completed: false}
            ]'::jsonb
        );

        -- Avaliacao fisica Rodrigo
        INSERT INTO public.physical_assessments (
            student_id, personal_id, date, weight_kg, height_cm, body_fat_percentage,
            chest_cm, arms_cm, waist_cm, hips_cm, thighs_cm
        ) VALUES (
            student_1_id, demo_personal_id, CURRENT_DATE - INTERVAL '30 days',
            84.5, 178.0, 16.2, 104.0, 38.5, 86.0, 100.0, 60.0
        ), (
            student_1_id, demo_personal_id, CURRENT_DATE,
            82.8, 178.0, 14.8, 105.5, 39.2, 83.5, 98.5, 60.5
        );

        -- Fatura Rodrigo
        INSERT INTO public.invoices (student_id, personal_id, amount, due_date, status, payment_method)
        VALUES (student_1_id, demo_personal_id, 450.00, CURRENT_DATE + INTERVAL '5 days', 'PENDENTE', 'PIX');

        -- Mensagem de exemplo
        INSERT INTO public.messages (
            personal_id, student_id, sender_role, sender_id, sender_name, content, category
        ) VALUES (
            demo_personal_id, student_1_id, 'PERSONAL', demo_personal_id, 'Coach',
            'Boa tarde Rodrigo! Ajustei suas cargas no supino para a sessao de hoje. Qualquer desconforto me avise!', 'GERAL'
        );

        RAISE NOTICE 'Dados de demonstracao inseridos com sucesso para o Personal %', demo_personal_id;
    ELSE
        RAISE NOTICE 'Nenhum perfil com role = PERSONAL encontrado ainda. Crie seu primeiro usuario no Supabase Auth antes de rodar o seed.';
    END IF;
END ;
