# Documentação Completa - AI Ghost

## Visão Geral

**AI Ghost** é uma aplicação web (clone de Instagram) construída em **Next.js 14** que se apresenta como uma plataforma de "espionagem" de redes sociais com inteligência artificial. O funil é voltado para captura, conversão e upsells, com integração de pagamento via PerfectPay/CenterPag e envio automático de emails via Resend.

- **Domínio principal de produção**: `https://www.aighostapp.com`
- **Domínio Replit (alternativo)**: `https://aighostapp.replit.app`
- **Stack**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
- **Banco de dados**: PostgreSQL (Neon)
- **Email**: Resend (integração instalada)
- **API externa**: HikerAPI (dados reais do Instagram)
- **Pagamento**: PerfectPay / CenterPag

---

## Estrutura Geral do Funil

1. **Topo de funil** (captura): `/access`, `/cadastro`, `/pitch`
2. **Busca/análise**: `/buscando`, `/search`, `/profile`, `/buy`
3. **Conteúdo simulado** (para fisgar): `/chat1` até `/chat5`, `/feed`, `/direct`, `/calls`, `/sms`, `/camera`, `/location`
4. **Upsells**: `/up1`, `/up2`, `/up3`, `/up4`, `/up5`, `/up6`, `/upsell`
5. **Back-redirects** (oferta de desconto ao tentar sair): `/backdoup1`, `/backdoup3`, `/back-front`, `/back-up1`, `/backfront`
6. **Área pós-compra**: `/dashboard`, `/access3`, `/confirm`
7. **Administração**: `/admin`

---

## Domínio e Identidade

- **Nome do produto**: AI Ghost
- **Email do remetente**: `noreply@iastalker.com`
- **Email de suporte**: `support@aighostapp.com` / `contact@aitracker.com`
- **Logo**: `/ghost-logo.png` (público)
- **Senha do admin**: `iaobserver2024`

---

## Códigos de Produto (PerfectPay)

Cada compra de produto tem um código identificador. Webhook está em `/api/webhook/perfectpay`.

| Código | Função |
|---|---|
| `PPLQQOQML` | Produto base (100 créditos) |
| `PPPBEB3B` | Dispara o email de "Your Access Has Been Granted" |
| `PPPBEB3D` | Esconde vídeo + botão "Activate" no `/dashboard` |
| `PPPBEB3F` | Esconde o popup "FINAL STEP" do `/dashboard` (e usado na oferta `/backdoup1`) |

### Links de pagamento (CenterPag)

| Link | Onde aparece |
|---|---|
| `PPU38CQ93Q1` | Card WhatsApp em `/dashboard` |
| `PPU38CQ93Q2` | Card Facebook em `/dashboard` |
| `PPU38CQ9UO4` | Card iMessage em `/dashboard` |
| `PPU38CQ9UP6` | Combo "3 for 1" em `/dashboard` |
| `PPU38CQ99O2` | Botão da página `/backdoup1` (oferta Eye of God) |
| `PPU38CQ99O4` | Botão da página `/backdoup3` (verificação com desconto) |
| `PPU38CQ9UM0` | Botão da página `/up4` |
| `PPU38CQ9UM9` | Botão da página `/upsell` |
| `PPU38CQ89MU` | Botão da página `/up3` (verificação) |

---

## Páginas Detalhadas

### Páginas de Captura

#### `/` (página inicial)
- Página raiz do projeto.

#### `/access`
- Página inicial de acesso. Possui um campo de busca de @ do Instagram.
- Quando o usuário clica no botão, é redirecionado para `https://aighostapp.replit.app/cadastro` (domínio do Replit), preservando todos os parâmetros UTM.
- Pode receber dados via API `/api/user-utms` para puxar UTMs salvos.

#### `/access2`
- Variação da página `/access`.

#### `/access3` (pós-compra / dashboard de busca)
- Página acessada após a compra inicial.
- Contém **barra verde no topo** com a estatística: *"62% of infidelities are discovered on WhatsApp"* (com barra de progresso visual em 62%).
- **Banner de aviso de perfil privado**.
- **Campo de input vazio** para digitar @ do Instagram.
- Botão **Direct** mostra um popup de "cloning..." com o @username vindo da URL (não redireciona).
- **Removido**: banner do topo, card "Private Investigator", botão "Need help?" e popups, vídeo + botões, popup FINAL STEP.

#### `/cadastro`
- Formulário de cadastro (nome, email, telefone).
- Preserva o parâmetro `username` na URL ao redirecionar para `/dashboard`.
- Salva email/nome em localStorage e cookies (`pitch_username`).

#### `/pitch`
- Página principal de venda.
- **Preço**: $29.90 (de $200.00).
- Possui timer regressivo, escassez e back-redirect (popstate).
- Botão CTA leva ao checkout.

#### `/pitch1`
- Variação da página `/pitch`.

---

### Páginas de Busca

#### `/buscando`
- Tela de loading mostrando que a IA está "buscando" o perfil.

#### `/search`
- Tela de busca de perfil.

#### `/profile`
- Mostra o perfil encontrado (foto, dados, etc).
- Usa dados reais via HikerAPI (`/api/instagram`).

#### `/buy`
- Tela de compra de créditos / desbloqueio total.

---

### Conteúdo Simulado (geralmente bloqueado)

| Página | Descrição |
|---|---|
| `/chat1` a `/chat5` | Conversas falsas de chat (simulação de mensagens "incriminadoras") |
| `/feed` | Feed de fotos do perfil monitorado |
| `/direct` | Direct messages |
| `/direct2` | Variação de direct |
| `/calls` | Lista de chamadas |
| `/sms` | SMS |
| `/camera` | Acesso à câmera (simulado) |
| `/location` | Localização em tempo real |
| `/whatsapp` | Tela de WhatsApp clonado |
| `/perfil` | Variação de perfil |
| `/useronline` | Usuários online |
| `/investigator` | Tela de investigador |
| `/detetive` | Variação investigativa |
| `/outros` | Outras redes |
| `/login` | Tela de login (legacy) |
| `/confirm` | Tela de confirmação |
| `/logo` | Tela de logo |
| `/app` | Página app |

---

### Upsells

#### `/up1`
- **Preços**: $69.90 / $49.90 / $39.90.
- **Back-redirect**: ao clicar em "voltar" no navegador, redireciona para `/backdoup1`.

#### `/up2`
- Upsell secundário.

#### `/up3` (Verification Fee)
- **Preço**: $99.90 (atualizado de $79.90).
- Tela "FINAL STEP" pedindo verificação de identidade.
- Promete reembolso após confirmação da conta.
- Botão leva ao link `PPU38CQ89MU`.
- **Back-redirect**: ao clicar em "voltar" no navegador, redireciona para `/backdoup3`.

#### `/up4`
- Botão atualizado para o link `PPU38CQ9UM0`.

#### `/up5`
- Upsell adicional.

#### `/up6`
- **Preço**: $29.90.

#### `/upsell`
- Texto de instalação do AI Ghost (antes "AI Observer", agora **AI Ghost**).
- Botão atualizado para `PPU38CQ9UM9`.
- Valor de US$34.90 mencionado.

---

### Back-Redirects (Ofertas de Saída)

#### `/backdoup1`
- Aparece quando o usuário tenta sair de `/up1`.
- **Banner verde** "CONGRATULATIONS".
- Título: *"You are purchase #1,000!"*
- Mensagem: *"You earned an extra +$20 discount on the Eye of God plan."*
- **Preço**: De ~~$49.90~~ por **$29.90** (em verde).
- Badge: *"You save $20.00 (40% OFF)"*.
- Lista de features do "Ultra Plan – Eye of God".
- Botão: "GET OFFER AND ACTIVATE" → `PPU38CQ99O2`.
- **Timer** regressivo de 14:59.
- Link: *"No, thanks. I prefer to pay more later."* → volta para `/dashboard`.

#### `/backdoup3`
- Aparece quando o usuário tenta sair de `/up3`.
- **Banner verde** "EXCLUSIVE DISCOUNT".
- Aviso verde: *"You can verify your account for $20 less thanks to your user #1,000 discount coupon."*
- **Preço**: De ~~$99.90~~ por **$79.90** (em verde).
- Mesma estrutura de `/up3` (FINAL STEP, verificação, aviso de reembolso).
- Botão verde: "VERIFY MY ACCOUNT" → `PPU38CQ99O4`.

#### `/back-front`, `/backfront`, `/back-up1`
- Outras variações de back-redirect.

---

### Dashboard (Pós-compra)

#### `/dashboard`
A área principal do usuário após comprar.

**Componentes principais**:
- **Banner de boas-vindas** no topo: *"Welcome to AI Ghost, {username}."* + email de suporte (`support@aighostapp.com`).
- **Botão "My Profile"** no topo direito.
- **Animação de loading** circular com porcentagem (até 100%).
- **Botão flutuante** vermelho: *"Want to cancel AI Ghost?"* — abre popup de cancelamento.

**Cards de Serviços** (grid):
| Card | Descrição | Ação ao clicar |
|---|---|---|
| Camera | Target device | (info) |
| Other Networks | Social networks | (info) |
| Instagram | *"What if what you're looking for is hidden here?"* (logo: `/instalogo.png`) | Vai para `/access3` + envia o email "We found suspicious messages..." (1x) |
| WhatsApp | (logo: `/whatsapplogo.png`) | Abre `PPU38CQ93Q1` |
| Facebook | *"21% of people who found infidelity using AI Ghost discovered it through Facebook."* (logo: `/facelogo.webp`) | Abre `PPU38CQ93Q2` |
| iMessage | *"What if what you're looking for is hidden here?"* (logo: `/imessagelogo.png`) | Abre `PPU38CQ9UO4` |
| 3 for 1 | *"3 for 1 - WhatsApp, Facebook and iMessage / Total: $149 for only $79.90"* (3 logos sobrepostas) | Abre `PPU38CQ9UP6` |

**Popups**:
- **FINAL STEP**: aparece após 5 segundos da primeira vez, e a cada 20 segundos após ser fechado. Mostra "Verification Fee: $79.90". Não aparece para usuários com compra `PPPBEB3F`.
- **Cancel popup**: salva email e dispara `/api/send-refund-email`.
- **Vídeo + botão "Activate"**: escondidos para usuários com compra `PPPBEB3D`.

**Lógica de email "suspicious"**:
- Ao clicar no card do Instagram, dispara `/api/send-suspicious-email` (1x apenas, controlado por `localStorage.suspicious_email_sent`).
- Não envia se o usuário tem `hasVerifyPurchase` (compra `PPPBEB3F`).

---

### Administração

#### `/admin`
- Painel administrativo protegido por senha (`iaobserver2024`).
- Mostra dados das compras: phone, amount, status detail, raw payload.
- **Logs expansíveis**: até 100 eventos.

---

## API Endpoints

### `/api/credits`
- Retorna informações sobre os créditos do usuário pelo email.
- Retorna: `available`, `credits`, `unlocked_all`, `has_verify_purchase` (PPPBEB3F), `has_activate_purchase` (PPPBEB3D).

### `/api/webhook/perfectpay`
- Recebe webhooks da PerfectPay.
- Salva compras no banco.
- Dispara o email de "Your Access Has Been Granted" se o produto for `PPPBEB3B`.
- Token de validação: `PERFECTPAY_WEBHOOK_TOKEN` (env).

### `/api/send-refund-email`
- Envia email "Refund Confirmed - AI Ghost".
- Acionado pelo popup de cancelamento no `/dashboard`.

### `/api/send-suspicious-email`
- Envia email "We found suspicious messages...".
- Acionado pelo clique no card Instagram do `/dashboard`.

### `/api/cron/send-emails`
- Endpoint de cron que envia emails pendentes.
- Tipos: `registration_followup` ("Important Alert About Your Account") e `support_followup` ("AI Ghost Support" — Lucia).
- Protegido por `CRON_SECRET`.
- O workflow `Email Cron` chama esse endpoint a cada 60s.

### `/api/instagram`
- Integra com HikerAPI (v2):
  - Profile: `GET /v2/user/by/username` → `{ user: {...} }`
  - Following: `GET /v2/user/following` → `{ response: { users: [...] } }`
- Header: `x-access-key: HIKERAPI_ACCESS_KEY`.

### `/api/proxy-image`
- Proxy para imagens externas (evita CORS).

### `/api/tracking`, `/api/track-utms`, `/api/user-utms`
- Tracking e captura de UTMs.

### `/api/geolocation`
- Geolocalização do usuário.

### `/api/auth`
- Autenticação simples.

### `/api/admin`
- Endpoints do painel admin.

### `/api/support`
- Endpoints relacionados a suporte.

---

## Emails (Resend)

Todos enviados de **AI Ghost <noreply@iastalker.com>**.

### 1. "Your Access Has Been Granted" (compra confirmada)
- **Trigger**: Webhook PerfectPay com produto `PPPBEB3B`.
- **CTA**: "Access AI Ghost" → `https://www.aighostapp.com/access`.

### 2. "Refund Confirmed - AI Ghost" (reembolso)
- **Trigger**: Botão de cancelar do `/dashboard`.
- **Conteúdo**: Reembolso aprovado, processado em 5–12 dias úteis.

### 3. "Important Alert About Your Account" (registration_followup)
- **Trigger**: Cron — usuários cadastrados que não compraram.
- **Conteúdo**: IA detectou conteúdo sensível em conversas de WhatsApp.
- **CTA**: "Discover the Truth" → `/cadastro?utm_source=email1`.

### 4. "AI Ghost Support" (support_followup, "Lucia")
- **Trigger**: Cron — usuários que compraram mas não verificaram.
- **Conteúdo**: Assinada por Lucia do suporte, pedindo verificação.
- **CTA**: "Verify Now" → `/up3?utm_source=email2`.

### 5. "We found suspicious messages..." (suspicious)
- **Trigger**: Clique no card Instagram do `/dashboard` (1x apenas, somente se FINAL STEP ainda visível).
- **Conteúdo**: IA detectou sinais de infidelidade no Instagram monitorado, mas só libera após verificar a conta.
- **CTA**: "Verify My Account Now" → `/up3?utm_source=email_suspicious`.

---

## Configurações Importantes

### Workflows
- **Next.js Dev Server**: `npm run dev` (porta 5000).
- **Email Cron**: `node scripts/email-cron.js` (chama `/api/cron/send-emails` a cada 60s).

### Middleware (`middleware.ts`)
- Permite acesso público (sem autenticação) às rotas: `/access`, `/access2`, `/access3`, `/backdoup1`, `/backdoup3`, `/api`, `/_next`, `/favicon.ico`, `/logo`, `/public`, `/dashboard`, `/buscando`, `/buy`, `/cadastro`, `/profile`, `/detetive`, `/admin`, `/useronline`, `/pitch`, `/up1` a `/up6`, `/upsell`, `/back-front`, `/back-up1`, `/backfront`, `/chat1` a `/chat5`, `/direct`, `/feed`, `/login`, `/confirm`, `/search`.

### Variáveis de Ambiente / Secrets
- `HIKERAPI_ACCESS_KEY` — chave da API do Instagram.
- `DATABASE_URL` — string de conexão PostgreSQL (Neon).
- `PERFECTPAY_WEBHOOK_TOKEN` — token de validação do webhook.
- `CRON_SECRET` — secret do endpoint de cron.

### Arquivos Públicos (`/public`)
- `/instalogo.png`, `/whatsapplogo.png`, `/facelogo.webp`, `/imessagelogo.png`, `/ghost-logo.png`.

### i18n
- Traduções em `lib/useTranslation.ts`.
- Exemplo: `dash.desc_instagram` = *"What if what you're looking for is hidden here?"*.

---

## Comportamentos e Regras de Negócio

1. **Username persistente**: prioridade — URL `searchParams.get('username')` → cookie `pitch_username` → sessionStorage.
2. **Email do usuário**: salvo em `localStorage.user_email` após cadastro.
3. **Filtro de logo branca**: `style={{ filter: 'brightness(0) invert(1)' }}`.
4. **UTMs preservados** em todos os links críticos (utm_source, utm_medium, utm_campaign, utm_term, utm_content, src, sck, xcod, fbclid, lang).
5. **Back-redirects**: implementados via `window.history.pushState` + listener `popstate`.
6. **Status de compra**: o `/api/credits` verifica produtos por código (`PPPBEB3F`, `PPPBEB3D`) para customizar a UX do `/dashboard`.

---

## Resumo de Preços Atuais

| Página | Item | Preço |
|---|---|---|
| `/pitch` | Plano principal | $29.90 (de $200) |
| `/up1` | Opções | $69.90 / $49.90 / $39.90 |
| `/up3` | Verification Fee | $99.90 |
| `/up6` | Upsell | $29.90 |
| `/upsell` | Instalação AI Ghost | $34.90 |
| `/dashboard` (popup FINAL STEP) | Verification Fee | $79.90 |
| `/backdoup1` | Eye of God | $29.90 (de $49.90) |
| `/backdoup3` | Verification com desconto | $79.90 (de $99.90) |
| `/dashboard` (combo 3 for 1) | WhatsApp + Facebook + iMessage | $79.90 (de $149) |
