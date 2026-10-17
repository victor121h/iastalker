# Studio — plataforma de geração de imagens e vídeos com IA

Área nova e isolada dentro deste app Next.js (não altera o AI Ghost). Tudo fica em
`app/studio`, `app/api/studio`, `lib/studio` e `components/studio`, com tabelas `studio_*` no mesmo Postgres
(criadas automaticamente na primeira requisição).

## Rotas

| Rota | O que é |
|---|---|
| `/studio` | Landing page (hero, como funciona, planos, FAQ) |
| `/studio/pricing` | Planos (Basic / Pro / VIP) |
| `/studio/signup`, `/studio/login`, `/studio/forgot-password`, `/studio/reset-password` | Conta com e-mail e senha |
| `/studio/chat` | O chat: Imagem (10 créditos) ou Vídeo (90 créditos), prompt + imagem de referência |
| `/studio/account` | Saldo, histórico de créditos e compras, troca de senha |
| `/studio/checkout/success`, `/studio/checkout/dev` | Retorno do pagamento / compra simulada (teste) |
| `/studio/terms`, `/studio/privacy` | Termos, política de conteúdo e privacidade |

Planos e custos ficam em `lib/studio/plans.ts` (um único lugar; a página de planos calcula tudo a partir dele).

## Variáveis de ambiente

### Obrigatória
- `DATABASE_URL` — o mesmo Postgres que já é usado.

### IA (fal.ai)
- `FAL_KEY` — sem ela o Studio roda em **modo demonstração** (resultados de exemplo e um aviso no chat).
- Opcional: trocar modelos sem mexer no código:
  `STUDIO_FAL_MODEL_IMAGE` (padrão `fal-ai/flux/dev`), `STUDIO_FAL_MODEL_IMAGE_REF` (`fal-ai/flux-pro/kontext`),
  `STUDIO_FAL_MODEL_VIDEO` (`fal-ai/kling-video/v2.5-turbo/pro/text-to-video`),
  `STUDIO_FAL_MODEL_VIDEO_REF` (`fal-ai/kling-video/v2.5-turbo/pro/image-to-video`).

### Pagamentos (escolha um)
**Stripe** (recomendado para USD):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Webhook no painel do Stripe: `https://SEU_DOMINIO/api/studio/webhooks/stripe`, eventos
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `checkout.session.expired`, `charge.refunded`.

**PerfectPay**:
- `STUDIO_PERFECTPAY_TOKEN` — token do webhook
- `STUDIO_PERFECTPAY_URL_BASIC`, `STUDIO_PERFECTPAY_URL_PRO`, `STUDIO_PERFECTPAY_URL_VIP` — links de checkout
- `STUDIO_PERFECTPAY_CODES_BASIC`, `..._PRO`, `..._VIP` — códigos de plano/produto (separados por vírgula)
- Webhook: `https://SEU_DOMINIO/api/studio/webhooks/perfectpay`. Se a pessoa comprar antes de criar a conta,
  os créditos entram automaticamente quando ela se cadastrar com o mesmo e-mail.

**Teste**: `STUDIO_DEV_PURCHASES=true` ativa a compra simulada (ligada por padrão só fora de produção).
Opcional: `STUDIO_PAYMENT_PROVIDER=stripe|perfectpay|dev` para forçar um provedor.

### Outras (opcionais)
- `STUDIO_PUBLIC_URL` — URL pública (ex.: `https://studio.seudominio.com`), usada em redirecionamentos e e-mails.
- `STUDIO_SIGNUP_BONUS` — créditos grátis no cadastro (padrão `10`; `0` desliga).
- `STUDIO_MAX_ACTIVE_GENERATIONS` — gerações simultâneas por usuário (padrão `3`).
- `NEXT_PUBLIC_STUDIO_BRAND` — nome da marca (padrão `Ember`); `NEXT_PUBLIC_STUDIO_SUPPORT_EMAIL`.
- E-mail de redefinição de senha: usa a integração Resend do Replit ou `RESEND_API_KEY`; remetente em `STUDIO_EMAIL_FROM`.

## Créditos
- Débito atômico ao gerar (nunca fica negativo), com registro em extrato (`studio_credit_ledger`).
- Geração que falha ou passa do tempo limite é **reembolsada automaticamente**, uma única vez.
- Créditos não expiram. O "tier" do usuário (basic/pro/vip) é o maior plano já comprado; VIP ganha selo no app.

## Segurança e conteúdo
- Senhas com scrypt, sessão em cookie httpOnly, proteção CSRF por origem, limite de tentativas no login.
- Prompts bloqueados: qualquer conteúdo sexual envolvendo menores e pedidos de sexualizar/"despir" a pessoa da
  imagem de referência (protege pessoas reais). O filtro de segurança do provedor de IA fica ligado.
- Para testar o reembolso no modo demonstração, use um prompt contendo `[fail]`.
