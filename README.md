# 🏋️ FitCoach Pro — Dashboard/CRM para Personal Trainers & Portal do Aluno

Aplicação web moderna, de alta performance e responsiva (**Mobile-First**) desenvolvida para Personal Trainers autônomos e seus alunos. Possui controle de acesso baseado em perfis (RBAC), alternador dinâmico de tema **Claro Suave / Escuro Premium**, e persistência local no navegador.

---

## ✨ Funcionalidades Principais

### 👑 Painel do Personal Trainer (Admin/Gestão)
- **Dashboard Geral:** Visão macro com métricas de alunos ativos, faturamento mensal, taxa de retenção e agenda semanal com filtros rápidos.
- **CRM de Alunos:** Gestão completa com busca em tempo real, status de pagamento (Ativo, Pendente, Atrasado), criação rápida de novos alunos e visualização detalhada de fichas.
- **Montagem de Treinos:** Construtor dinâmico de treinos interativos com suporte a séries, repetições, carga, descanso e anexação de vídeos demonstrativos.
- **Gestão Financeira:** Controle de mensalidades, faturas pendentes, gráficos de faturamento por período e simulação de emissão de cobranças.
- **Chat Interno (Mini CRM):** Central de mensagens em tempo real integrada no próprio sistema entre treinador e cada aluno, com histórico de mensagens e sem necessidade de ferramentas externas.

### 📱 Portal do Aluno (Client Hub)
- **Experiência Mobile-First:** Projetado sob medida para uso na academia diretamente no smartphone.
- **Dashboard & Evolução:** Histórico de medidas corporais (peso, BF, circunferências) com gráficos interativos de evolução temporal.
- **Treino Interativo:** Execução do treino do dia com cronômetro de descanso embutido, checkboxes de séries concluídas e animação de comemoração (confete) ao finalizar.
- **Financeiro do Aluno:** Visualização transparente de mensalidades pagas e pendentes com simulação de código PIX / Copia e Cola.
- **Contato com o Treinador:** Chat direto com o Personal Trainer dentro do sistema.

### 🌗 Sistema de Temas Claro & Escuro
- **Dark Mode Premium:** Paleta neutra e elegante em tons de zinc-950 com efeito glassmorphism sutil e toques de verde esmeralda.
- **Light Mode Suave:** Paleta em tons off-white zinc-100/zinc-50 com cards em branco puro e bordas suaves, eliminando o cansaço visual e mantendo excelente legibilidade e contraste.
- **Alternador Rápido:** Botão único com ícone de Sol/Lua posicionado na barra lateral/cabeçalho.

---

## 🛠️ Stack Tecnológica

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build:** [Vite 8](https://vite.dev/)
- **Roteamento:** [React Router v7](https://reactrouter.com/)
- **Estilização:** [Tailwind CSS v3](https://tailwindcss.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Efeitos & Animações:** [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Persistência:** LocalStorage do navegador (itcoach_app_data_v3 e itcoach_theme)

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- **Node.js**: v20.19.0+ ou v22.12.0+ (LTS)
- **npm**: v10+

### 2. Instalação
`ash
# Clone ou acesse a pasta do projeto
cd fitcoach-crm

# Instale as dependências
npm install
`

### 3. Iniciar o Servidor de Desenvolvimento
`ash
npm run dev
`
Acesse no seu navegador: http://localhost:5173/

### 4. Acessar pelo Celular na Mesma Rede Wi-Fi
`ash
npm run dev -- --host 0.0.0.0
`
No celular, acesse o IP da sua rede exibido no terminal (ex: http://192.168.1.15:5173).

---

## 📖 Como Rodar em Outra Máquina?

Para o passo a passo completo de como clonar via **GitHub** ou transferir via **Pen Drive / Nuvem** para outro computador, consulte o arquivo dedicado:
👉 [**GUIA_MIGRACAO_OUTRO_DISPOSITIVO.md**](./GUIA_MIGRACAO_OUTRO_DISPOSITIVO.md)

---

## 📜 Scripts do package.json

| Comando | Descrição |
| :--- | :--- |
| 
pm run dev | Inicia o servidor local de desenvolvimento |
| 
pm run build | Valida tipagens com 	sc e gera a build de produção na pasta dist/ |
| 
pm run preview | Executa localmente o bundle gerado em dist/ |
| 
pm run lint | Executa análise estática e verificação de boas práticas via Oxlint |
