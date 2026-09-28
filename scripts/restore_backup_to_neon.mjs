import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no ambiente!');
  process.exit(1);
}

const sql = neon(databaseUrl);

function parseCopyTable(content, tableName) {
  const marker = 'COPY ' + tableName + ' (';
  const startIdx = content.indexOf(marker);
  if (startIdx === -1) return null;

  const parenClose = content.indexOf(')', startIdx);
  const colsRaw = content.substring(startIdx + marker.length, parenClose);
  const cols = colsRaw.split(',').map((c) => c.trim().replace(/^"/, '').replace(/"$/, ''));

  const lineEnd = content.indexOf('\n', parenClose);
  const endIdx = content.indexOf('\\.\n', lineEnd);
  if (endIdx === -1) return { cols, rows: [] };

  const dataBlock = content.substring(lineEnd + 1, endIdx).trim();
  if (!dataBlock) return { cols, rows: [] };

  const lines = dataBlock.split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t').map((val) => (val === '\\N' ? null : val));
    const rowObj = {};
    for (let i = 0; i < cols.length; i++) {
      rowObj[cols[i]] = parts[i] !== undefined ? parts[i] : null;
    }
    rows.push(rowObj);
  }

  return { cols, rows };
}

async function restoreBackup() {
  console.log('🔄 Iniciando restauração do backup do Supabase para o Neon Postgres...');

  const dumpPath = path.resolve('backup_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error('❌ Arquivo backup_dump.sql não encontrado!');
    process.exit(1);
  }

  const content = fs.readFileSync(dumpPath, 'utf8');

  // 1. Restaurar auth.users
  const authUsers = parseCopyTable(content, 'auth.users');
  if (authUsers && authUsers.rows.length > 0) {
    console.log(`👤 1/6 Restaurando ${authUsers.rows.length} usuários de auth.users...`);
    for (const u of authUsers.rows) {
      await sql`
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
        VALUES (
          ${u.id}::uuid,
          ${u.email},
          ${u.raw_user_meta_data ? u.raw_user_meta_data : '{}'}::jsonb,
          ${u.created_at ? new Date(u.created_at) : new Date()},
          ${u.updated_at ? new Date(u.updated_at) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
      `;

      // Também espelha em neon_auth.user para o Neon Auth reconhecer
      try {
        await sql`
          INSERT INTO neon_auth.user ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role")
          VALUES (
            ${u.id}::uuid,
            ${u.email.split('@')[0]},
            ${u.email},
            true,
            ${u.created_at ? new Date(u.created_at) : new Date()},
            ${u.updated_at ? new Date(u.updated_at) : new Date()},
            'user'
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      } catch (neonAuthErr) {
        // Ignora caso neon_auth tenha estrutura diferente
      }
    }
  }

  // 2. Restaurar public.profiles
  const profiles = parseCopyTable(content, 'public.profiles');
  if (profiles && profiles.rows.length > 0) {
    console.log(`📋 2/6 Restaurando ${profiles.rows.length} perfis de public.profiles...`);
    // Limpa placeholders provisórios que geramos antes
    await sql`
      DELETE FROM public.personal_profiles 
      WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
    `;
    await sql`
      DELETE FROM public.profiles 
      WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
    `;

    for (const p of profiles.rows) {
      console.log(`   → Perfil: [${p.role}] ${p.name} (${p.email})`);
      await sql`
        INSERT INTO public.profiles (id, role, name, email, phone, avatar_url, created_at, updated_at)
        VALUES (
          ${p.id}::uuid,
          ${p.role},
          ${p.name},
          ${p.email},
          ${p.phone},
          ${p.avatar_url},
          ${p.created_at ? new Date(p.created_at) : new Date()},
          ${p.updated_at ? new Date(p.updated_at) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE
        SET role = EXCLUDED.role,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url;
      `;
    }
  }

  // 3. Restaurar public.personal_profiles
  const personalProfiles = parseCopyTable(content, 'public.personal_profiles');
  if (personalProfiles && personalProfiles.rows.length > 0) {
    console.log(`🏆 3/6 Restaurando ${personalProfiles.rows.length} perfis de personal trainer...`);
    for (const pp of personalProfiles.rows) {
      await sql`
        INSERT INTO public.personal_profiles (id, title, cref, bio, pix_key, pix_type, created_at, updated_at)
        VALUES (
          ${pp.id}::uuid,
          ${pp.title},
          ${pp.cref},
          ${pp.bio},
          ${pp.pix_key},
          ${pp.pix_type},
          ${pp.created_at ? new Date(pp.created_at) : new Date()},
          ${pp.updated_at ? new Date(pp.updated_at) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            cref = EXCLUDED.cref,
            bio = EXCLUDED.bio,
            pix_key = EXCLUDED.pix_key,
            pix_type = EXCLUDED.pix_type;
      `;
    }
  }

  // 4. Restaurar public.students
  const students = parseCopyTable(content, 'public.students');
  if (students && students.rows.length > 0) {
    console.log(`🎓 4/6 Restaurando ${students.rows.length} alunos...`);
    for (const s of students.rows) {
      console.log(`   → Aluno: ${s.name} (${s.email})`);
      await sql`
        INSERT INTO public.students (
          id, personal_id, user_id, name, email, phone, avatar_url,
          status, plan, monthly_fee, due_day, payment_status, start_date,
          primary_goal, streak_days, next_assessment_date, notes, created_at, updated_at
        )
        VALUES (
          ${s.id}::uuid,
          ${s.personal_id}::uuid,
          ${s.user_id ? s.user_id : null}::uuid,
          ${s.name},
          ${s.email},
          ${s.phone},
          ${s.avatar_url},
          ${s.status || 'ATIVO'},
          ${s.plan || 'MENSAL'},
          ${s.monthly_fee ? Number(s.monthly_fee) : 0},
          ${s.due_day ? Number(s.due_day) : 10},
          ${s.payment_status || 'EM_DIA'},
          ${s.start_date || new Date().toISOString().slice(0, 10)},
          ${s.primary_goal},
          ${s.streak_days ? Number(s.streak_days) : 0},
          ${s.next_assessment_date || null},
          ${s.notes},
          ${s.created_at ? new Date(s.created_at) : new Date()},
          ${s.updated_at ? new Date(s.updated_at) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            status = EXCLUDED.status,
            plan = EXCLUDED.plan,
            payment_status = EXCLUDED.payment_status;
      `;
    }
  }

  // 5. Restaurar public.messages
  const messages = parseCopyTable(content, 'public.messages');
  if (messages && messages.rows.length > 0) {
    console.log(`💬 5/6 Restaurando ${messages.rows.length} mensagens do chat...`);
    for (const m of messages.rows) {
      await sql`
        INSERT INTO public.messages (
          id, personal_id, student_id, sender_role, sender_id, sender_name, content, category, read, created_at
        )
        VALUES (
          ${m.id}::uuid,
          ${m.personal_id}::uuid,
          ${m.student_id}::uuid,
          ${m.sender_role},
          ${m.sender_id}::uuid,
          ${m.sender_name},
          ${m.content},
          ${m.category || 'GERAL'},
          ${m.read === 't' || m.read === true},
          ${m.created_at ? new Date(m.created_at) : new Date()}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }
  }

  // 6. Restaurar public.invites
  const invites = parseCopyTable(content, 'public.invites');
  if (invites && invites.rows.length > 0) {
    console.log(`🎟️ 6/6 Restaurando ${invites.rows.length} convites...`);
    for (const inv of invites.rows) {
      console.log(`   → Convite: ${inv.code} [${inv.status}] (${inv.target_name || 'Sem nome'})`);
      await sql`
        INSERT INTO public.invites (
          id, code, type, created_by, personal_id, target_name, target_email,
          plan, status, used_by, used_at, expires_at, created_at
        )
        VALUES (
          ${inv.id}::uuid,
          ${inv.code},
          ${inv.type},
          ${inv.created_by ? inv.created_by : null}::uuid,
          ${inv.personal_id ? inv.personal_id : null}::uuid,
          ${inv.target_name},
          ${inv.target_email},
          ${inv.plan || 'MENSAL'},
          ${inv.status || 'PENDENTE'},
          ${inv.used_by ? inv.used_by : null}::uuid,
          ${inv.used_at ? new Date(inv.used_at) : null},
          ${inv.expires_at ? new Date(inv.expires_at) : null},
          ${inv.created_at ? new Date(inv.created_at) : new Date()}
        )
        ON CONFLICT (code) DO UPDATE
        SET status = EXCLUDED.status,
            used_by = EXCLUDED.used_by,
            used_at = EXCLUDED.used_at;
      `;
    }
  }

  console.log('\n✨ Todos os dados e usuários do backup foram restaurados com sucesso no Neon Postgres!');
}

restoreBackup().catch((err) => {
  console.error('❌ Falha na restauração do backup:', err);
  process.exit(1);
});
