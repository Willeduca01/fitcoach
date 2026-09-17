// Script para criar ou atualizar o usuário Master no Supabase Auth
const url = 'https://xmpbzpdggsonzftueynw.supabase.co/auth/v1/admin/users';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGJ6cGRnZ3NvbnpmdHVleW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY0Nzc2MSwiZXhwIjoyMTA1MjIzNzYxfQ.uSKQUPtnJhdvd07Ch0zDkCNWjtxyiiI2XTBNgjIcWqk';

async function createOrUpdateMasterUser() {
  console.log('Criando/atualizando usuário Master (dev.dev@fitcoach.com.br)...');
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': 'Bearer ' + serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'dev.dev@fitcoach.com.br',
      password: 'Esl5L98@m%',
      email_confirm: true,
      user_metadata: {
        name: 'Desenvolvedor Master',
        role: 'MASTER'
      }
    })
  });

  const data = await res.json();
  if (res.status === 200 || res.status === 201) {
    console.log('✅ Usuário Master criado com sucesso no Supabase! ID:', data.id);
  } else {
    console.log('Status:', res.status);
    console.log('Resposta:', JSON.stringify(data, null, 2));
  }
}

createOrUpdateMasterUser();
