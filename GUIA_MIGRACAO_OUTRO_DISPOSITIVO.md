# 🚀 Guia de Migração e Execução em Outro Dispositivo — FitCoach Pro

Este documento contém todas as orientações, dependências, comandos e métodos para transferir, clonar, instalar e rodar a aplicação **FitCoach Pro** em qualquer outro computador (Windows, macOS ou Linux) ou dispositivo móvel (smartphone/tablet na rede local).

---

## 📋 1. Requisitos do Sistema na Nova Máquina

Antes de começar no novo dispositivo, certifique-se de que ele possui os seguintes softwares instalados:

| Software | Versão Recomendada | Link para Download |
| :--- | :--- | :--- |
| **Node.js** | **v20.19.0+** ou **v22.12.0+ (LTS)** | [nodejs.org](https://nodejs.org/) |
| **npm** | v10+ (já incluso no instalador do Node.js) | — |
| **Git** | Versão recente (2.40+) | [git-scm.com](https://git-scm.com/) |
| **Navegador Web** | Google Chrome, Edge, Safari, Firefox ou Brave | Qualquer moderno |
| **Editor de Código** (opcional) | VS Code ou Cursor | [code.visualstudio.com](https://code.visualstudio.com/) |

> **Dica:** Para verificar se o Node.js e o npm estão instalados na nova máquina, abra o terminal (Prompt de Comando, PowerShell ou Terminal do macOS/Linux) e digite:
> `ash
> node -v
> npm -v
> `

---

## 📦 2. Dependências do Projeto

O projeto utiliza **React 19 + TypeScript + Tailwind CSS + Vite 8**. Todas as dependências já estão registradas no arquivo package.json.

### 🔹 Dependências de Produção (dependencies)
* **eact** (^19.2.8) e **eact-dom**: Biblioteca base da interface reativa.
* **eact-router-dom** (^7.18.4): Roteamento SPA com rotas aninhadas, navegação do Personal Trainer (Admin) e Portal do Aluno.
* **lucide-react** (^1.46.0): Pacote de ícones SVG modernos e leves.
* **echarts** (^3.10.1): Gráficos interativos para o dashboard financeiro e evolução corporal do aluno.
* **canvas-confetti** (^1.9.4): Efeitos visuais de comemoração (conclusão de treinos).
* **clsx** e **	ailwind-merge**: Utilitários para concatenação e fusão limpa de classes CSS dinâmicas.

### 🔹 Dependências de Desenvolvimento (devDependencies)
* **ite** (^8.3.0): Bundler ultrarrápido com Hot Module Replacement (HMR).
* **@vitejs/plugin-react** (^6.1.1): Plugin oficial do React para o Vite.
* **	ypescript** (~6.0.2): Tipagem estática e segurança de tipos em todo o código.
* **	ailwindcss** (^3.4.17): Framework CSS utilitário para o Design System (suporte a Dark Mode e Light Mode suave).
* **postcss** e **utoprefixer**: Processamento e compatibilidade de navegadores para o CSS.
* **oxlint** (^1.81.0): Linter ultrarrápido baseado em Rust para validação de código.
* **@types/***: Definições de tipagem TypeScript para React, React DOM, Node e Confetti.

---

## 🌐 3. Método A: Enviar e Clonar via Git / GitHub (Recomendado)

Esta é a melhor maneira de manter seu código sincronizado em vários computadores e em nuvem.

### 📍 Passo A.1 — Na máquina atual (onde o projeto está agora):
O repositório Git local já foi iniciado. Siga os passos:

1. **Adicionar os arquivos e criar o primeiro commit:**
   `ash
   git add .
   git commit -m feat: projeto inicial FitCoach Pro com temas dark/light e portal do aluno
   `

2. **Criar um repositório no GitHub:**
   - Acesse [github.com/new](https://github.com/new).
   - Dê um nome ao repositório (por exemplo: itcoach-crm).
   - Escolha **Privado** (recomendado se contiver dados pessoais) ou **Público**.
   - **Não** marque a opção de inicializar com README ou .gitignore (eles já existem no projeto).
   - Clique em **Create repository**.

3. **Vincular e enviar o código para o GitHub:**
   `ash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/fitcoach-crm.git
   git push -u origin main
   `
   *(Substitua SEU_USUARIO/fitcoach-crm pelo link do repositório que o GitHub forneceu)*.

---

### 📍 Passo A.2 — No novo computador / dispositivo:

1. Abra o terminal na pasta onde deseja guardar seus projetos (ex: C:\Projetos ou ~/Projetos).
2. Clone o repositório:
   `ash
   git clone https://github.com/SEU_USUARIO/fitcoach-crm.git
   `
3. Entre na pasta do projeto:
   `ash
   cd fitcoach-crm
   `
4. Instale as dependências:
   `ash
   npm install
   `
5. Inicie o servidor de desenvolvimento:
   `ash
   npm run dev
   `
6. O terminal exibirá o link local (geralmente http://localhost:5173). Abra este link no navegador!

---

## 💾 4. Método B: Migrar via Pen Drive, Arquivo ZIP ou Nuvem (Sem Git)

Se você preferir transferir diretamente os arquivos sem usar o GitHub:

### ⚠️ O que você DEVE copiar:
Copie toda a pasta itcoach-crm, **EXCETO**:
- ❌ **
ode_modules/** *(NÃO COPIE: essa pasta é muito pesada e será recriada automaticamente pelo 
pm install)*
- ❌ **dist/** *(NÃO COPIE: pasta de build gerada automaticamente)*

### 📍 No novo computador:
1. Cole a pasta itcoach-crm no local desejado.
2. Abra o terminal nessa pasta.
3. Execute:
   `ash
   npm install
   `
4. Em seguida, inicie o projeto:
   `ash
   npm run dev
   `

---

## 📱 5. Como Acessar pelo Celular / Tablet na Mesma Rede Wi-Fi

Para testar o Portal do Aluno diretamente no smartphone como um aplicativo real:

1. Certifique-se de que o computador e o celular estejam conectados **na mesma rede Wi-Fi**.
2. No computador, inicie o Vite com o parâmetro --host:
   `ash
   npm run dev -- --host 0.0.0.0
   `
3. O Vite exibirá no terminal os endereços de acesso:
   `	ext
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.X.X:5173/
   `
4. No celular ou tablet, abra o navegador (Chrome, Safari, etc.) e digite o endereço **Network** (ex: http://192.168.1.15:5173).
5. Pronto! Você poderá navegar pelo Portal do Aluno com a experiência mobile-first fluida, alternar temas Claro/Escuro e testar os treinos interativos.

---

## 🗄️ 6. Armazenamento e Persistência de Dados

O FitCoach Pro utiliza um sistema de persistência no **localStorage** do navegador do cliente:
* **itcoach_app_data_v3**: Guarda o estado dos alunos, treinos, faturas, mensagens do chat interno e avaliações físicas.
* **itcoach_theme**: Guarda a preferência de tema do usuário (dark ou light).

> **Importante:** Se você abrir o projeto em um novo computador ou navegador, ele iniciará automaticamente com os **dados de demonstração completos (mock data)**. Caso queira carregar dados específicos de outra máquina, você pode exportar ou consultar a chave itcoach_app_data_v3 no console do navegador (Application > Local Storage).

---

## ⚙️ 7. Scripts Disponíveis no Projeto

| Comando | Descrição |
| :--- | :--- |
| 
pm run dev | Inicia o servidor local de desenvolvimento com Hot Reload. |
| 
pm run build | Compila o TypeScript e gera o pacote estático otimizado para produção na pasta dist/. |
| 
pm run preview | Roda um servidor local servindo a versão de produção gerada na pasta dist/. |
| 
pm run lint | Executa o linter Oxlint para verificar padrões e qualidade do código. |

---

## 🛠️ 8. Solução de Dúvidas e Problemas Comuns

### 1. 
pm install falhou com erro de versão do Node
- **Causa:** O Vite 8 exige Node.js versão 20.19+ ou 22.12+.
- **Solução:** Baixe e instale a versão LTS mais recente em [nodejs.org](https://nodejs.org/).

### 2. A porta 5173 já está em uso
- O Vite usará automaticamente a próxima porta livre (ex: 5174), exibindo o novo link no terminal.
- Se quiser forçar uma porta específica: 
pm run dev -- --port 3000.

### 3. As alterações no celular não aparecem
- Verifique se o firewall do computador não está bloqueando conexões de rede de entrada na porta 5173.
- Certifique-se de que ambos os dispositivos estão no mesmo roteador/Wi-Fi (sem isolamento de AP/rede de convidados).
