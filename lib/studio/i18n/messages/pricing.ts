import { defineMessages } from '../define';

// Keys must be prefixed with 'pricing.' — owned by the marketing slice (PricingCards + /studio/pricing).
export const pricing = defineMessages({
  en: {
    // ── Metadata ────────────────────────────────────────────────────────────────
    'pricing.meta.title': 'Pricing',
    'pricing.meta.description':
      'One-time AI credit packs in USD: Basic, Pro and VIP. Images cost 10 credits, videos 90. No subscription, credits never expire.',

    // ── Pricing cards ───────────────────────────────────────────────────────────
    'pricing.cards.label': 'Credit packs',
    'pricing.plan.basic.tagline': 'A taste of the studio',
    'pricing.plan.pro.tagline': 'The smart pick for regular creators',
    'pricing.plan.vip.tagline': 'For creators who want it all',
    'pricing.badge.popular': 'Most popular',
    'pricing.badge.bestValue': 'Best value',
    'pricing.deal': '{credits}× the credits for {price}× the price',
    'pricing.save': 'Save {percent}%',
    'pricing.saveSr': '{percent}% cheaper per credit than Basic',
    'pricing.oneTime': 'one-time payment · no subscription',
    'pricing.unit.images': '{count} images',
    'pricing.unit.imageOne': '1 image',
    'pricing.unit.videos': '{count} videos',
    'pricing.unit.videoOne': '1 video',
    'pricing.equivalence': '= {images} or {videos}',
    'pricing.perImage': '/ image',
    'pricing.perVideo': '/ video',
    'pricing.was': 'Basic price:',
    'pricing.now': 'your price:',
    'pricing.included': 'What’s included',
    'pricing.feature.generate': 'Image & video generation',
    'pricing.feature.reference': 'Reference image uploads',
    'pricing.feature.history': 'Private creation history',
    'pricing.feature.noExpiry': 'Credits never expire',
    'pricing.feature.refunds': 'Failed generations auto-refunded',
    'pricing.feature.vipBadge': 'VIP badge in the studio',
    'pricing.feature.priority': 'Priority support',
    'pricing.vipPerks': 'VIP badge + priority support',
    'pricing.cta.basic': 'Get Basic',
    'pricing.cta.pro': 'Get Pro',
    'pricing.cta.vip': 'Go VIP',
    'pricing.trust.label': 'Purchase guarantees',
    'pricing.trust.secure': 'Secure checkout',
    'pricing.trust.oneTime': 'One-time payment',
    'pricing.trust.noExpiry': 'Credits never expire',
    'pricing.trust.refunds': 'Failed generations are refunded automatically',
    'pricing.currencyNote': 'All prices in US dollars (USD).',

    // ── /studio/pricing page ────────────────────────────────────────────────────
    'pricing.page.eyebrow': 'Credit packs',
    'pricing.page.titleA': 'Pick your pack.',
    'pricing.page.titleB': 'Turn up the heat.',
    'pricing.page.subtitle':
      'Simple one-time packs. The bigger the pack, the less you pay per creation — and your credits never expire.',
    'pricing.page.balance': 'Your balance: {count} credits',
    'pricing.page.canceled': 'Checkout canceled — no charge was made.',
    'pricing.page.canceledHint': 'Whenever you’re ready, pick a pack below.',
    'pricing.page.resuming': 'Taking you to secure checkout for the {plan} pack…',

    // Cost table
    'pricing.costs.title': 'What each creation costs',
    'pricing.costs.subtitle':
      'Fixed prices, debited only when you hit generate. Failed generations are refunded automatically.',
    'pricing.costs.caption': 'Credit cost per creation type',
    'pricing.costs.type': 'Creation',
    'pricing.costs.cost': 'Cost',
    'pricing.costs.details': 'What you get',
    'pricing.costs.from': 'Lowest price',
    'pricing.costs.imageDetails': 'One image · {ratios}',
    'pricing.costs.videoDetails': 'A {seconds}-second video · from text or an image',
    'pricing.costs.withPlan': 'with {plan}',

    // Mini FAQ
    'pricing.faq.title': 'Good to know',
    'pricing.faq.subscription.q': 'Is this a subscription?',
    'pricing.faq.subscription.a':
      'No. Every pack is a one-time payment. You’re never charged again unless you decide to buy another pack.',
    'pricing.faq.expiry.q': 'Do credits expire?',
    'pricing.faq.expiry.a': 'Never. New packs stack on top of your current balance.',
    'pricing.faq.currency.q': 'Which currency am I charged in?',
    'pricing.faq.currency.a':
      'All prices are in US dollars (USD). If your card uses another currency, your bank converts it and may add its own fees.',
    'pricing.faq.failed.q': 'What if a generation fails?',
    'pricing.faq.failed.a':
      'If a generation fails or times out, its credits return to your balance automatically — no ticket needed.',
    'pricing.faq.refund.q': 'Can I get a refund?',
    'pricing.faq.refund.a':
      'Credits already spent on completed generations can’t be refunded. If something went wrong with a purchase, email {email} and we’ll look into it.',
    'pricing.faq.more': 'See all questions',
  },
  pt: {
    // ── Metadata ────────────────────────────────────────────────────────────────
    'pricing.meta.title': 'Planos',
    'pricing.meta.description':
      'Pacotes de créditos de IA com pagamento único em dólar: Basic, Pro e VIP. Imagens custam 10 créditos, vídeos 90. Sem assinatura, créditos não expiram.',

    // ── Pricing cards ───────────────────────────────────────────────────────────
    'pricing.cards.label': 'Pacotes de créditos',
    'pricing.plan.basic.tagline': 'Para experimentar o estúdio',
    'pricing.plan.pro.tagline': 'A escolha inteligente para quem cria sempre',
    'pricing.plan.vip.tagline': 'Para quem quer tudo — e um pouco mais',
    'pricing.badge.popular': 'Mais popular',
    'pricing.badge.bestValue': 'Melhor custo-benefício',
    'pricing.deal': '{credits}× os créditos por {price}× o preço',
    'pricing.save': 'Economize {percent}%',
    'pricing.saveSr': '{percent}% mais barato por crédito que o Basic',
    'pricing.oneTime': 'pagamento único · sem assinatura',
    'pricing.unit.images': '{count} imagens',
    'pricing.unit.imageOne': '1 imagem',
    'pricing.unit.videos': '{count} vídeos',
    'pricing.unit.videoOne': '1 vídeo',
    'pricing.equivalence': '= {images} ou {videos}',
    'pricing.perImage': '/ imagem',
    'pricing.perVideo': '/ vídeo',
    'pricing.was': 'preço no Basic:',
    'pricing.now': 'seu preço:',
    'pricing.included': 'O que está incluso',
    'pricing.feature.generate': 'Geração de imagens e vídeos',
    'pricing.feature.reference': 'Envio de imagens de referência',
    'pricing.feature.history': 'Histórico privado de criações',
    'pricing.feature.noExpiry': 'Créditos que nunca expiram',
    'pricing.feature.refunds': 'Reembolso automático de falhas',
    'pricing.feature.vipBadge': 'Selo VIP no estúdio',
    'pricing.feature.priority': 'Suporte prioritário',
    'pricing.vipPerks': 'Selo VIP + suporte prioritário',
    'pricing.cta.basic': 'Quero o Basic',
    'pricing.cta.pro': 'Quero o Pro',
    'pricing.cta.vip': 'Quero ser VIP',
    'pricing.trust.label': 'Garantias da compra',
    'pricing.trust.secure': 'Pagamento seguro',
    'pricing.trust.oneTime': 'Pagamento único',
    'pricing.trust.noExpiry': 'Créditos não expiram',
    'pricing.trust.refunds': 'Gerações com falha são reembolsadas automaticamente',
    'pricing.currencyNote': 'Todos os preços em dólar americano (USD).',

    // ── /studio/pricing page ────────────────────────────────────────────────────
    'pricing.page.eyebrow': 'Pacotes de créditos',
    'pricing.page.titleA': 'Escolha seu pacote.',
    'pricing.page.titleB': 'Aumente a temperatura.',
    'pricing.page.subtitle':
      'Pacotes simples, com pagamento único. Quanto maior o pacote, menos você paga por criação — e seus créditos nunca expiram.',
    'pricing.page.balance': 'Seu saldo: {count} créditos',
    'pricing.page.canceled': 'Pagamento cancelado — nenhuma cobrança foi feita.',
    'pricing.page.canceledHint': 'Quando quiser, é só escolher um pacote abaixo.',
    'pricing.page.resuming': 'Levando você ao pagamento seguro do pacote {plan}…',

    // Cost table
    'pricing.costs.title': 'Quanto custa cada criação',
    'pricing.costs.subtitle':
      'Preços fixos, descontados só quando você clica em gerar. Gerações com falha são reembolsadas automaticamente.',
    'pricing.costs.caption': 'Custo em créditos por tipo de criação',
    'pricing.costs.type': 'Criação',
    'pricing.costs.cost': 'Custo',
    'pricing.costs.details': 'O que você recebe',
    'pricing.costs.from': 'Menor preço',
    'pricing.costs.imageDetails': 'Uma imagem · {ratios}',
    'pricing.costs.videoDetails': 'Um vídeo de {seconds} segundos · a partir de texto ou imagem',
    'pricing.costs.withPlan': 'no {plan}',

    // Mini FAQ
    'pricing.faq.title': 'Bom saber',
    'pricing.faq.subscription.q': 'É uma assinatura?',
    'pricing.faq.subscription.a':
      'Não. Cada pacote é um pagamento único. Você nunca é cobrado de novo, a menos que decida comprar outro pacote.',
    'pricing.faq.expiry.q': 'Os créditos expiram?',
    'pricing.faq.expiry.a': 'Nunca. Novos pacotes se somam ao seu saldo atual.',
    'pricing.faq.currency.q': 'Em qual moeda sou cobrado?',
    'pricing.faq.currency.a':
      'Todos os preços são em dólar americano (USD). Se o seu cartão for em reais, o banco faz a conversão e pode cobrar IOF e tarifas próprias.',
    'pricing.faq.failed.q': 'E se uma geração falhar?',
    'pricing.faq.failed.a':
      'Se uma geração falhar ou demorar demais, os créditos voltam automaticamente para o seu saldo — sem precisar abrir chamado.',
    'pricing.faq.refund.q': 'Posso pedir reembolso?',
    'pricing.faq.refund.a':
      'Créditos já usados em gerações concluídas não são reembolsáveis. Se algo deu errado com uma compra, escreva para {email} e vamos analisar.',
    'pricing.faq.more': 'Ver todas as dúvidas',
  },
});
