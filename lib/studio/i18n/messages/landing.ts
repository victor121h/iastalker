import { defineMessages } from '../define';

// Keys must be prefixed with 'landing.' — owned by the marketing slice (landing page, shared
// site header/footer and the Studio 404 page).
export const landing = defineMessages({
  en: {
    // ── Metadata ────────────────────────────────────────────────────────────────
    'landing.meta.title': 'Exclusive AI images & videos',
    'landing.meta.description':
      'Turn any idea into exclusive AI images and videos from a simple chat. Reference images, image-to-video, one-time credit packs that never expire. 18+ only.',

    // ── Site header ─────────────────────────────────────────────────────────────
    'landing.nav.skip': 'Skip to content',
    'landing.nav.main': 'Main',
    'landing.nav.faq': 'FAQ',
    'landing.nav.openStudio': 'Open studio',
    'landing.nav.openMenu': 'Open menu',
    'landing.nav.closeMenu': 'Close menu',
    'landing.nav.menuTitle': 'Menu',
    'landing.nav.accountMenu': 'Account menu for {name}',
    'landing.nav.creditsLink': '{count} credits — buy more',
    'landing.nav.signedInAs': 'Signed in as',
    'landing.nav.loggingOut': 'Logging out…',

    // ── Site footer ─────────────────────────────────────────────────────────────
    'landing.footer.tagline': 'Exclusive AI images and videos from a simple chat. Private by default, made for adults.',
    'landing.footer.product': 'Product',
    'landing.footer.legal': 'Legal',
    'landing.footer.help': 'Help',
    'landing.footer.faq': 'FAQ',
    'landing.footer.contentPolicy': 'Content policy',
    'landing.footer.adultsNote':
      'For adults 18+ only. Any content involving minors is strictly prohibited and reported to the authorities.',
    'landing.footer.paymentsNote': 'Prices in USD · One-time payments · No subscription',
    'landing.footer.copyright': '© {year} {brand}.',

    // ── Hero ────────────────────────────────────────────────────────────────────
    'landing.hero.eyebrow': 'Private AI studio · 18+',
    'landing.hero.titleA': 'Your wildest ideas.',
    'landing.hero.titleB': 'Rendered in seconds.',
    'landing.hero.subtitle':
      'Exclusive AI images and videos from a simple chat. Describe your vision, drop in a reference image, or bring any of your images to life as video — unfiltered creativity, zero learning curve.',
    'landing.hero.bonus': 'Get {count} free credits',
    'landing.hero.bonusNote': '{count} free credits on sign-up · no card required',
    'landing.hero.ctaOpen': 'Open the studio',
    'landing.hero.ctaPricing': 'See pricing',
    'landing.hero.welcome': 'Welcome back, {name}. You have {count} credits ready to burn.',
    'landing.hero.factImage': 'Image = {credits} credits',
    'landing.hero.factVideo': '{seconds}s video = {credits} credits',
    'landing.hero.factNoSub': 'No subscription',

    // ── Hero visual (decorative chat mock) ──────────────────────────────────────
    'landing.visual.label':
      'Illustration of the studio: a prompt in the chat, a glowing generated image and a video being animated.',
    'landing.visual.title': 'New creation',
    'landing.visual.prompt': 'Neon-soaked rooftop at midnight, red silk drifting in the wind, cinematic glow',
    'landing.visual.reference': 'Reference attached',
    'landing.visual.ready': 'Ready',
    'landing.visual.animating': 'Animating…',
    'landing.visual.composer': 'Describe your scene…',

    // ── How it works ────────────────────────────────────────────────────────────
    'landing.how.eyebrow': 'How it works',
    'landing.how.title': 'From idea to exclusive in three moves',
    'landing.how.step': 'Step {n}',
    'landing.how.s1.title': 'Pick image or video',
    'landing.how.s1.body': 'Choose the format and the frame — square, portrait or widescreen.',
    'landing.how.s2.title': 'Describe it in the chat',
    'landing.how.s2.body': 'Write what you want to see. Attach a reference image to steer the look.',
    'landing.how.s3.title': 'Watch it come alive',
    'landing.how.s3.body':
      'Images land in seconds, videos shortly after. Download, refine, or animate any image into a video.',

    // ── Features ────────────────────────────────────────────────────────────────
    'landing.features.eyebrow': 'Everything you need',
    'landing.features.title': 'Made for bold, private creativity',
    'landing.features.subtitle': 'A focused studio with everything that matters — and nothing that slows you down.',
    'landing.features.media.title': 'Images & videos',
    'landing.features.media.body':
      'Striking stills or {seconds}-second clips from the same chat. Switch formats with a single tap.',
    'landing.features.reference.title': 'Reference images',
    'landing.features.reference.body': 'Upload a picture to guide composition, palette and mood.',
    'landing.features.animate.title': 'Animate any image',
    'landing.features.animate.body': 'Turn any of your generated images into motion in one click.',
    'landing.features.history.title': 'Private history',
    'landing.features.history.body':
      'Every creation stays in your private conversations. No public feed — only you can see them.',
    'landing.features.expiry.title': 'Credits never expire',
    'landing.features.expiry.body': 'Use them tonight or next year. Your balance stays yours.',
    'landing.features.once.title': 'Pay once — no subscription',
    'landing.features.once.body': 'Grab a credit pack when you need it. No recurring charges, ever.',

    // ── Styles showcase ─────────────────────────────────────────────────────────
    'landing.styles.eyebrow': 'Styles',
    'landing.styles.title': 'Name a mood. We’ll set the scene.',
    'landing.styles.subtitle':
      'Add a style to your prompt and steer the whole look. The swatches below are abstract color moods, not sample outputs.',
    'landing.styles.hintLabel': 'Try adding',
    'landing.styles.cinematic': 'Cinematic',
    'landing.styles.cinematic.hint': '35mm film, moody rim light, shallow depth of field',
    'landing.styles.neon': 'Neon noir',
    'landing.styles.neon.hint': 'rain-slick streets, crimson neon, deep shadows',
    'landing.styles.editorial': 'Editorial',
    'landing.styles.editorial.hint': 'high-fashion studio, soft key light, bold styling',
    'landing.styles.fantasy': 'Fantasy',
    'landing.styles.fantasy.hint': 'ember skies, ancient ruins, mythic atmosphere',
    'landing.styles.anime': 'Anime',
    'landing.styles.anime.hint': 'cel shading, vivid colors, dramatic sky',
    'landing.styles.product': 'Product',
    'landing.styles.product.hint': 'glossy surfaces, studio backdrop, crisp reflections',

    // ── Pricing section ─────────────────────────────────────────────────────────
    'landing.pricing.eyebrow': 'Pricing',
    'landing.pricing.title': 'Pay once. Create on your terms.',
    'landing.pricing.subtitle':
      'Credit packs in USD. No subscription, no expiry — the bigger the pack, the less each creation costs.',
    'landing.pricing.compare': 'See the full cost breakdown',

    // ── FAQ ─────────────────────────────────────────────────────────────────────
    'landing.faq.eyebrow': 'FAQ',
    'landing.faq.title': 'Questions, answered',
    'landing.faq.more': 'Still curious? Write to us at',
    'landing.faq.readPolicy': 'Read the full content policy',
    'landing.faq.credits.q': 'What are credits?',
    'landing.faq.credits.a':
      'Credits are the studio’s currency. Every generation has a fixed cost that is debited only when you start it, so you always know exactly what you’re spending.',
    'landing.faq.cost.q': 'How much does each creation cost?',
    'landing.faq.cost.a':
      'An image costs {image} credits and a {seconds}-second video costs {video} credits. With the {plan} pack that works out to just {imagePrice} per image and {videoPrice} per video.',
    'landing.faq.expiry.q': 'Do credits expire?',
    'landing.faq.expiry.a':
      'No. Credits never expire and there is no subscription. Packs stack, so buying again simply adds to your balance.',
    'landing.faq.reference.q': 'Can I use a reference image?',
    'landing.faq.reference.a':
      'Yes. Attach an image to guide composition, colors or style — or reuse one of your previous creations. Only upload images you own or have the right to use, and never photos of real people for intimate or sexual edits.',
    'landing.faq.policy.q': 'What’s not allowed?',
    'landing.faq.policy.a':
      'The studio is for adults 18+. We have zero tolerance for any sexual content involving minors — it is blocked and reported to the authorities. We also prohibit intimate or sexual imagery of real people without their consent, “undressing” edits of uploaded photos, deepfakes made to deceive or harass, and illegal or violent extremist content. Prompts that break the rules are blocked and accounts can be suspended.',
    'landing.faq.payment.q': 'How do I pay, and in which currency?',
    'landing.faq.payment.a':
      'Prices are in US dollars (USD) and charged once per pack through our secure payment partner. Card details are handled by the payment processor — we never see or store them. If your card uses another currency, your bank converts it and may add its own fees.',
    'landing.faq.failed.q': 'What happens if a generation fails?',
    'landing.faq.failed.a':
      'You get your credits back automatically. If the AI engine fails or times out, the full cost returns to your balance — no support ticket needed.',
    'landing.faq.privacy.q': 'Are my creations private?',
    'landing.faq.privacy.a':
      'Yes. Your prompts, reference images and results live in your private history and are never published to a public feed. You can delete conversations whenever you want.',

    // ── Final CTA ───────────────────────────────────────────────────────────────
    'landing.cta.title': 'Your next obsession is one prompt away.',
    'landing.cta.subtitle': 'Create your account in seconds and start creating tonight.',
    'landing.cta.subtitleBonus': 'Sign up and get {count} free credits to start creating tonight.',
    'landing.cta.subtitleUser': 'Your studio is waiting. Pick up right where you left off.',

    // ── 404 ─────────────────────────────────────────────────────────────────────
    'landing.notFound.title': 'This page slipped into the dark',
    'landing.notFound.body': 'The link may be broken or the page may have moved. Let’s get you back to the good stuff.',
    'landing.notFound.home': 'Back to home',
  },
  pt: {
    // ── Metadata ────────────────────────────────────────────────────────────────
    'landing.meta.title': 'Imagens e vídeos exclusivos com IA',
    'landing.meta.description':
      'Transforme qualquer ideia em imagens e vídeos exclusivos com IA em um chat simples. Imagens de referência, imagem para vídeo e pacotes de créditos que nunca expiram. Somente maiores de 18.',

    // ── Site header ─────────────────────────────────────────────────────────────
    'landing.nav.skip': 'Pular para o conteúdo',
    'landing.nav.main': 'Principal',
    'landing.nav.faq': 'Dúvidas',
    'landing.nav.openStudio': 'Abrir estúdio',
    'landing.nav.openMenu': 'Abrir menu',
    'landing.nav.closeMenu': 'Fechar menu',
    'landing.nav.menuTitle': 'Menu',
    'landing.nav.accountMenu': 'Menu da conta de {name}',
    'landing.nav.creditsLink': '{count} créditos — comprar mais',
    'landing.nav.signedInAs': 'Conectado como',
    'landing.nav.loggingOut': 'Saindo…',

    // ── Site footer ─────────────────────────────────────────────────────────────
    'landing.footer.tagline':
      'Imagens e vídeos exclusivos com IA a partir de um chat simples. Privado por padrão, feito para adultos.',
    'landing.footer.product': 'Produto',
    'landing.footer.legal': 'Legal',
    'landing.footer.help': 'Ajuda',
    'landing.footer.faq': 'Dúvidas frequentes',
    'landing.footer.contentPolicy': 'Política de conteúdo',
    'landing.footer.adultsNote':
      'Exclusivo para maiores de 18 anos. Qualquer conteúdo envolvendo menores é estritamente proibido e denunciado às autoridades.',
    'landing.footer.paymentsNote': 'Preços em USD · Pagamento único · Sem assinatura',
    'landing.footer.copyright': '© {year} {brand}.',

    // ── Hero ────────────────────────────────────────────────────────────────────
    'landing.hero.eyebrow': 'Estúdio de IA privado · 18+',
    'landing.hero.titleA': 'Suas ideias mais ousadas.',
    'landing.hero.titleB': 'Prontas em segundos.',
    'landing.hero.subtitle':
      'Imagens e vídeos exclusivos com IA a partir de um chat simples. Descreva o que você imagina, envie uma imagem de referência ou dê vida às suas imagens em vídeo — criatividade sem filtro, sem curva de aprendizado.',
    'landing.hero.bonus': 'Ganhe {count} créditos grátis',
    'landing.hero.bonusNote': '{count} créditos grátis no cadastro · sem cartão',
    'landing.hero.ctaOpen': 'Abrir o estúdio',
    'landing.hero.ctaPricing': 'Ver planos',
    'landing.hero.welcome': 'Que bom te ver de novo, {name}. Você tem {count} créditos prontos para usar.',
    'landing.hero.factImage': 'Imagem = {credits} créditos',
    'landing.hero.factVideo': 'Vídeo de {seconds}s = {credits} créditos',
    'landing.hero.factNoSub': 'Sem assinatura',

    // ── Hero visual (decorative chat mock) ──────────────────────────────────────
    'landing.visual.label':
      'Ilustração do estúdio: um prompt no chat, uma imagem gerada brilhando e um vídeo sendo animado.',
    'landing.visual.title': 'Nova criação',
    'landing.visual.prompt': 'Terraço banhado em neon à meia-noite, seda vermelha ao vento, brilho cinematográfico',
    'landing.visual.reference': 'Referência anexada',
    'landing.visual.ready': 'Pronto',
    'landing.visual.animating': 'Animando…',
    'landing.visual.composer': 'Descreva sua cena…',

    // ── How it works ────────────────────────────────────────────────────────────
    'landing.how.eyebrow': 'Como funciona',
    'landing.how.title': 'Da ideia ao exclusivo em três passos',
    'landing.how.step': 'Passo {n}',
    'landing.how.s1.title': 'Escolha imagem ou vídeo',
    'landing.how.s1.body': 'Defina o formato e o enquadramento — quadrado, retrato ou widescreen.',
    'landing.how.s2.title': 'Descreva no chat',
    'landing.how.s2.body': 'Escreva o que você quer ver. Anexe uma imagem de referência para guiar o visual.',
    'landing.how.s3.title': 'Veja ganhar vida',
    'landing.how.s3.body':
      'Imagens chegam em segundos e vídeos logo depois. Baixe, ajuste ou transforme qualquer imagem em vídeo.',

    // ── Features ────────────────────────────────────────────────────────────────
    'landing.features.eyebrow': 'Tudo o que você precisa',
    'landing.features.title': 'Feito para criatividade ousada e privada',
    'landing.features.subtitle': 'Um estúdio enxuto, com tudo o que importa — e nada que te atrase.',
    'landing.features.media.title': 'Imagens e vídeos',
    'landing.features.media.body':
      'Imagens marcantes ou clipes de {seconds} segundos no mesmo chat. Troque de formato com um toque.',
    'landing.features.reference.title': 'Imagens de referência',
    'landing.features.reference.body': 'Envie uma imagem para guiar composição, cores e clima.',
    'landing.features.animate.title': 'Anime qualquer imagem',
    'landing.features.animate.body': 'Transforme qualquer imagem que você gerou em movimento com um clique.',
    'landing.features.history.title': 'Histórico privado',
    'landing.features.history.body':
      'Cada criação fica nas suas conversas privadas. Nada de feed público — só você vê.',
    'landing.features.expiry.title': 'Créditos que não expiram',
    'landing.features.expiry.body': 'Use hoje à noite ou no ano que vem. Seu saldo continua seu.',
    'landing.features.once.title': 'Pague uma vez — sem assinatura',
    'landing.features.once.body': 'Compre um pacote de créditos quando quiser. Nada de cobrança recorrente.',

    // ── Styles showcase ─────────────────────────────────────────────────────────
    'landing.styles.eyebrow': 'Estilos',
    'landing.styles.title': 'Diga o clima. A gente monta a cena.',
    'landing.styles.subtitle':
      'Adicione um estilo ao seu prompt e direcione todo o visual. As amostras abaixo são paletas abstratas, não resultados gerados.',
    'landing.styles.hintLabel': 'Experimente adicionar',
    'landing.styles.cinematic': 'Cinematográfico',
    'landing.styles.cinematic.hint': 'filme 35mm, luz de recorte dramática, fundo desfocado',
    'landing.styles.neon': 'Neon noir',
    'landing.styles.neon.hint': 'ruas molhadas de chuva, neon carmesim, sombras profundas',
    'landing.styles.editorial': 'Editorial',
    'landing.styles.editorial.hint': 'estúdio de alta moda, luz suave, styling marcante',
    'landing.styles.fantasy': 'Fantasia',
    'landing.styles.fantasy.hint': 'céu em brasa, ruínas antigas, atmosfera mítica',
    'landing.styles.anime': 'Anime',
    'landing.styles.anime.hint': 'cel shading, cores vivas, céu dramático',
    'landing.styles.product': 'Produto',
    'landing.styles.product.hint': 'superfícies brilhantes, fundo de estúdio, reflexos nítidos',

    // ── Pricing section ─────────────────────────────────────────────────────────
    'landing.pricing.eyebrow': 'Planos',
    'landing.pricing.title': 'Pague uma vez. Crie do seu jeito.',
    'landing.pricing.subtitle':
      'Pacotes de créditos em dólar. Sem assinatura e sem validade — quanto maior o pacote, menos custa cada criação.',
    'landing.pricing.compare': 'Ver o detalhamento de custos',

    // ── FAQ ─────────────────────────────────────────────────────────────────────
    'landing.faq.eyebrow': 'Dúvidas',
    'landing.faq.title': 'Perguntas frequentes',
    'landing.faq.more': 'Ainda com dúvidas? Fale com a gente em',
    'landing.faq.readPolicy': 'Leia a política de conteúdo completa',
    'landing.faq.credits.q': 'O que são créditos?',
    'landing.faq.credits.a':
      'Créditos são a moeda do estúdio. Cada geração tem um custo fixo, descontado só quando você a inicia — assim você sempre sabe exatamente quanto está gastando.',
    'landing.faq.cost.q': 'Quanto custa cada criação?',
    'landing.faq.cost.a':
      'Uma imagem custa {image} créditos e um vídeo de {seconds} segundos custa {video} créditos. No pacote {plan}, isso sai por apenas {imagePrice} por imagem e {videoPrice} por vídeo.',
    'landing.faq.expiry.q': 'Os créditos expiram?',
    'landing.faq.expiry.a':
      'Não. Os créditos nunca expiram e não existe assinatura. Os pacotes se somam: comprar de novo simplesmente aumenta o seu saldo.',
    'landing.faq.reference.q': 'Posso usar uma imagem de referência?',
    'landing.faq.reference.a':
      'Pode. Anexe uma imagem para guiar composição, cores ou estilo — ou reaproveite uma das suas criações. Envie apenas imagens que são suas ou que você tem direito de usar, e nunca fotos de pessoas reais para edições íntimas ou sexuais.',
    'landing.faq.policy.q': 'O que não é permitido?',
    'landing.faq.policy.a':
      'O estúdio é só para maiores de 18 anos. Temos tolerância zero com qualquer conteúdo sexual envolvendo menores — ele é bloqueado e denunciado às autoridades. Também proibimos imagens íntimas ou sexuais de pessoas reais sem consentimento, edições para “despir” fotos enviadas, deepfakes feitos para enganar ou assediar e conteúdo ilegal ou extremista violento. Prompts que violam as regras são bloqueados e contas podem ser suspensas.',
    'landing.faq.payment.q': 'Como eu pago e em qual moeda?',
    'landing.faq.payment.a':
      'Os preços são em dólar americano (USD), cobrados uma única vez por pacote pelo nosso parceiro de pagamento seguro. Os dados do cartão ficam com o processador de pagamento — nós nunca os vemos nem armazenamos. Se o seu cartão for em reais, o banco faz a conversão e pode cobrar IOF e tarifas próprias.',
    'landing.faq.failed.q': 'E se uma geração falhar?',
    'landing.faq.failed.a':
      'Você recebe os créditos de volta automaticamente. Se a IA falhar ou demorar demais, o valor total volta para o seu saldo — sem precisar abrir chamado.',
    'landing.faq.privacy.q': 'Minhas criações são privadas?',
    'landing.faq.privacy.a':
      'Sim. Seus prompts, imagens de referência e resultados ficam no seu histórico privado e nunca são publicados em um feed público. Você pode apagar conversas quando quiser.',

    // ── Final CTA ───────────────────────────────────────────────────────────────
    'landing.cta.title': 'Sua próxima obsessão está a um prompt de distância.',
    'landing.cta.subtitle': 'Crie sua conta em segundos e comece a criar hoje à noite.',
    'landing.cta.subtitleBonus': 'Cadastre-se e ganhe {count} créditos grátis para começar a criar hoje à noite.',
    'landing.cta.subtitleUser': 'Seu estúdio está te esperando. Continue exatamente de onde parou.',

    // ── 404 ─────────────────────────────────────────────────────────────────────
    'landing.notFound.title': 'Esta página sumiu no escuro',
    'landing.notFound.body':
      'O link pode estar quebrado ou a página mudou de lugar. Vamos te levar de volta para o que importa.',
    'landing.notFound.home': 'Voltar ao início',
  },
});
