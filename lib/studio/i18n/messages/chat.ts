import { defineMessages } from '../define';

// Keys must be prefixed with 'chat.' — owned by the chat slice.
// Placeholders are filled by the caller: {cost}, {credits}, {missing}, {count}, {seconds}, {title},
// {position}, {max}, {prompt}, {image}, {video}, {brand}.
export const chat = defineMessages({
  en: {
    'chat.meta.title': 'Studio',

    // ── Sidebar ─────────────────────────────────────────────────────────────────────────────
    'chat.sidebar.newCreation': 'New creation',
    'chat.sidebar.history': 'Your creations',
    'chat.sidebar.nav': 'Conversations',
    'chat.sidebar.empty': 'Nothing here yet. Every conversation you start shows up here.',
    'chat.sidebar.loadError': "We couldn't load your conversations.",
    'chat.sidebar.open': 'Open menu',
    'chat.sidebar.close': 'Close menu',
    'chat.sidebar.untitled': 'Untitled creation',
    'chat.sidebar.renameLabel': 'Rename “{title}”',
    'chat.sidebar.deleteLabel': 'Delete “{title}”',
    'chat.sidebar.balance': 'Your balance',

    // ── Rename / delete ─────────────────────────────────────────────────────────────────────
    'chat.rename.title': 'Rename conversation',
    'chat.rename.label': 'Title',
    'chat.rename.placeholder': 'Give it a name',
    'chat.rename.empty': 'Enter a title.',
    'chat.rename.hint': 'Up to {max} characters.',
    'chat.delete.title': 'Delete this conversation?',
    'chat.delete.body':
      '“{title}” and all of its images and videos will be permanently removed from your history. Creations still in progress are cancelled and refunded.',
    'chat.delete.confirm': 'Delete conversation',
    'chat.delete.done': 'Conversation deleted.',

    // ── User menu ───────────────────────────────────────────────────────────────────────────
    'chat.user.menu': 'Account menu for {name}',
    'chat.user.signedInAs': 'Signed in as',
    'chat.user.loggingOut': 'Logging out…',

    // ── Header ──────────────────────────────────────────────────────────────────────────────
    'chat.header.newCreation': 'New creation',

    // ── Empty state ─────────────────────────────────────────────────────────────────────────
    'chat.empty.eyebrow': 'Your private studio',
    'chat.empty.title': 'What are we creating tonight?',
    'chat.empty.subtitle':
      'Describe a scene, choose Image or Video and watch it come to life. Attach a reference image to guide the look.',
    'chat.empty.imageDesc': 'Striking stills in seconds',
    'chat.empty.videoDesc': '{seconds}-second cinematic clips',
    'chat.empty.afford': '{count} with your credits',
    'chat.empty.selectMode': 'Switch to {mode}',
    'chat.empty.suggestionsTitle': 'Need a spark? Start from one of these',
    'chat.empty.useSuggestion': 'Use this idea: {title}',

    // ── Prompt suggestions ──────────────────────────────────────────────────────────────────
    'chat.suggestions.rooftop.tag': 'Cinematic',
    'chat.suggestions.rooftop.title': 'Midnight rooftop',
    'chat.suggestions.rooftop.prompt':
      'Cinematic portrait of a woman in a flowing red silk dress on a rooftop at midnight, city lights bokeh behind her, warm rim light, 35mm film grain',
    'chat.suggestions.gown.tag': 'Glamour',
    'chat.suggestions.gown.title': 'Golden hour glamour',
    'chat.suggestions.gown.prompt':
      'Glamour portrait of a woman in an elegant emerald evening gown, golden hour light through sheer curtains, soft glow, luxury magazine style',
    'chat.suggestions.neon.tag': 'Neon',
    'chat.suggestions.neon.title': 'Neon noir',
    'chat.suggestions.neon.prompt':
      'Rain-soaked neon alley at night, a mysterious figure in a long leather coat, magenta and orange reflections on wet asphalt, cinematic cyberpunk mood',
    'chat.suggestions.velvet.tag': 'Editorial',
    'chat.suggestions.velvet.title': 'Velvet editorial',
    'chat.suggestions.velvet.prompt':
      'High-fashion editorial portrait of a model in a black velvet suit, dramatic studio lighting, deep red backdrop, crisp details, magazine cover style',
    'chat.suggestions.embers.tag': 'Cinematic',
    'chat.suggestions.embers.title': 'Dancing embers',
    'chat.suggestions.embers.prompt':
      'Silhouette of a dancer surrounded by swirling embers and smoke, dramatic backlight, dark red and orange palette, slow-motion feel',
    'chat.suggestions.penthouse.tag': 'Glamour',
    'chat.suggestions.penthouse.title': 'Penthouse nights',
    'chat.suggestions.penthouse.prompt':
      'Luxury penthouse at night, champagne glasses on a marble table, fireworks over the city skyline through floor-to-ceiling windows, moody warm light',

    // ── Composer ────────────────────────────────────────────────────────────────────────────
    'chat.composer.label': 'Describe what you want to create',
    'chat.composer.placeholderImage': 'Describe the image you want to create…',
    'chat.composer.placeholderVideo': 'Describe the scene and the motion of your video…',
    'chat.composer.placeholderAnimate': 'Describe how your image should move…',
    'chat.composer.mode': 'Generation type',
    'chat.composer.ratio': 'Aspect ratio',
    'chat.composer.ratioSquare': 'Square (1:1)',
    'chat.composer.ratioPortrait': 'Portrait (9:16)',
    'chat.composer.ratioLandscape': 'Landscape (16:9)',
    'chat.composer.attach': 'Attach a reference image',
    'chat.composer.generate': 'Generate · {cost}',
    'chat.composer.generateLabel': 'Generate for {cost} credits',
    'chat.composer.hintVideo': '{seconds}-second video',
    'chat.composer.hintVideoReference': '{seconds}-second video · your reference image is the starting frame',
    'chat.composer.hintReference': 'Your reference image guides the result',
    'chat.composer.hintKeys': 'Enter to generate · Shift + Enter for a new line',
    'chat.composer.counter': '{count}/{max}',
    'chat.composer.dropTitle': 'Drop your reference image',
    'chat.composer.dropHint': 'JPG, PNG or WebP',

    // ── Reference image ─────────────────────────────────────────────────────────────────────
    'chat.reference.label': 'Reference image',
    'chat.reference.fromCreation': 'From your creation',
    'chat.reference.remove': 'Remove reference image',
    'chat.reference.processing': 'Preparing image…',
    'chat.reference.unsupported': 'Use a JPG, PNG or WebP image.',
    'chat.reference.tooLarge': 'This image is too large. Use one under 30 MB.',
    'chat.reference.readError': "We couldn't read this image. Try another file.",
    'chat.reference.unavailable': "This image can't be used as a reference. Attach the file instead.",
    'chat.reference.invalid': 'The reference image was rejected. Try a different JPG, PNG or WebP file.',

    // ── Credits nudges ──────────────────────────────────────────────────────────────────────
    'chat.credits.low': 'Running low: {credits} credits left.',
    'chat.credits.notEnoughImage': 'You need {cost} credits for an image — you have {credits}.',
    'chat.credits.notEnoughVideo': 'You need {cost} credits for a video — you have {credits}.',
    'chat.credits.getCredits': 'Get credits',
    'chat.credits.dismiss': 'Dismiss',

    // ── Messages ────────────────────────────────────────────────────────────────────────────
    'chat.item.you': 'You',
    'chat.item.reference': 'Reference image',
    'chat.item.cost': '{cost} cr',
    'chat.pending.sending': 'Sending to the studio…',
    'chat.pending.image': 'Creating your image…',
    'chat.pending.video': 'Rendering your video… usually 1–3 minutes',
    'chat.pending.queue': '#{position} in queue',
    'chat.pending.elapsed': 'Elapsed time',
    'chat.result.openFullscreen': 'Open image in full screen',
    'chat.result.download': 'Download',
    'chat.result.useReference': 'Use as reference',
    'chat.result.animate': 'Animate into video',
    'chat.result.animateHint': 'Turn this image into a {seconds}-second video',
    'chat.result.regenerate': 'Regenerate',
    'chat.result.mediaUnavailable': 'This file is no longer available.',
    'chat.result.imageAlt': 'Generated image: {prompt}',
    'chat.result.videoLabel': 'Generated video: {prompt}',
    'chat.failed.title': "This one didn't work out",
    'chat.failed.provider_error': "The AI engine couldn't create this one. Try again or tweak your prompt.",
    'chat.failed.timeout': 'This took too long and was cancelled.',
    'chat.failed.refunded': 'Your {cost} credits were refunded',
    'chat.animate.defaultPrompt': 'Bring this image to life with subtle, cinematic motion',
    'chat.animate.ready': 'Video mode on — your image is the starting frame. Describe the motion and hit Generate.',
    'chat.regenerate.referenceMissing':
      "We couldn't reload the original reference image. Attach it again and generate.",

    // ── Paywall ─────────────────────────────────────────────────────────────────────────────
    'chat.paywall.titleMissing': 'You need {missing} more credits',
    'chat.paywall.titleMissingOne': 'You need 1 more credit',
    'chat.paywall.title': 'Unlock more creations',
    'chat.paywall.subtitle': 'Pick a credit pack and keep creating. One-time payment, no subscription.',
    'chat.paywall.balance': 'Your balance',
    'chat.paywall.costImage': 'This image',
    'chat.paywall.costVideo': 'This video',
    'chat.paywall.rates': 'Image = {image} credits · Video = {video} credits',
    'chat.paywall.creditsAdded': 'Credits added — you’re all set to create.',

    // ── Toasts, loading, misc ───────────────────────────────────────────────────────────────
    'chat.toast.region': 'Notifications',
    'chat.toast.dismiss': 'Dismiss notification',
    'chat.toast.conversationNotFound': "This conversation doesn't exist anymore.",
    'chat.toast.readyImage': 'Your image is ready.',
    'chat.toast.readyVideo': 'Your video is ready.',
    'chat.toast.view': 'View',
    'chat.load.error': "We couldn't load this conversation.",
    'chat.jumpToLatest': 'Jump to latest',
    'chat.lightbox.title': 'Image preview',
    'chat.time.justNow': 'just now',
  },
  pt: {
    'chat.meta.title': 'Estúdio',

    // ── Sidebar ─────────────────────────────────────────────────────────────────────────────
    'chat.sidebar.newCreation': 'Nova criação',
    'chat.sidebar.history': 'Suas criações',
    'chat.sidebar.nav': 'Conversas',
    'chat.sidebar.empty': 'Nada por aqui ainda. Toda conversa que você começar aparece aqui.',
    'chat.sidebar.loadError': 'Não conseguimos carregar suas conversas.',
    'chat.sidebar.open': 'Abrir menu',
    'chat.sidebar.close': 'Fechar menu',
    'chat.sidebar.untitled': 'Criação sem título',
    'chat.sidebar.renameLabel': 'Renomear “{title}”',
    'chat.sidebar.deleteLabel': 'Excluir “{title}”',
    'chat.sidebar.balance': 'Seu saldo',

    // ── Rename / delete ─────────────────────────────────────────────────────────────────────
    'chat.rename.title': 'Renomear conversa',
    'chat.rename.label': 'Título',
    'chat.rename.placeholder': 'Dê um nome para ela',
    'chat.rename.empty': 'Digite um título.',
    'chat.rename.hint': 'Até {max} caracteres.',
    'chat.delete.title': 'Excluir esta conversa?',
    'chat.delete.body':
      '“{title}” e todas as imagens e vídeos dela serão removidos do seu histórico para sempre. Criações ainda em andamento são canceladas e os créditos devolvidos.',
    'chat.delete.confirm': 'Excluir conversa',
    'chat.delete.done': 'Conversa excluída.',

    // ── User menu ───────────────────────────────────────────────────────────────────────────
    'chat.user.menu': 'Menu da conta de {name}',
    'chat.user.signedInAs': 'Conectado como',
    'chat.user.loggingOut': 'Saindo…',

    // ── Header ──────────────────────────────────────────────────────────────────────────────
    'chat.header.newCreation': 'Nova criação',

    // ── Empty state ─────────────────────────────────────────────────────────────────────────
    'chat.empty.eyebrow': 'Seu estúdio privado',
    'chat.empty.title': 'O que vamos criar hoje à noite?',
    'chat.empty.subtitle':
      'Descreva uma cena, escolha Imagem ou Vídeo e veja tudo ganhar vida. Anexe uma imagem de referência para guiar o visual.',
    'chat.empty.imageDesc': 'Imagens impactantes em segundos',
    'chat.empty.videoDesc': 'Clipes cinematográficos de {seconds} segundos',
    'chat.empty.afford': '{count} com seus créditos',
    'chat.empty.selectMode': 'Mudar para {mode}',
    'chat.empty.suggestionsTitle': 'Precisa de inspiração? Comece por uma destas',
    'chat.empty.useSuggestion': 'Usar esta ideia: {title}',

    // ── Prompt suggestions ──────────────────────────────────────────────────────────────────
    'chat.suggestions.rooftop.tag': 'Cinematográfico',
    'chat.suggestions.rooftop.title': 'Cobertura à meia-noite',
    'chat.suggestions.rooftop.prompt':
      'Retrato cinematográfico de uma mulher com um vestido de seda vermelho esvoaçante em uma cobertura à meia-noite, luzes da cidade em bokeh ao fundo, luz de contorno quente, granulação de filme 35mm',
    'chat.suggestions.gown.tag': 'Glamour',
    'chat.suggestions.gown.title': 'Glamour na golden hour',
    'chat.suggestions.gown.prompt':
      'Retrato glamouroso de uma mulher com um elegante vestido de gala verde-esmeralda, luz dourada do fim de tarde atravessando cortinas translúcidas, brilho suave, estilo revista de luxo',
    'chat.suggestions.neon.tag': 'Neon',
    'chat.suggestions.neon.title': 'Neon noir',
    'chat.suggestions.neon.prompt':
      'Beco iluminado por neon em uma noite chuvosa, uma figura misteriosa de sobretudo de couro, reflexos magenta e laranja no asfalto molhado, clima cyberpunk cinematográfico',
    'chat.suggestions.velvet.tag': 'Editorial',
    'chat.suggestions.velvet.title': 'Editorial em veludo',
    'chat.suggestions.velvet.prompt':
      'Retrato editorial de alta moda de uma modelo com terno de veludo preto, iluminação de estúdio dramática, fundo vermelho profundo, detalhes nítidos, estilo capa de revista',
    'chat.suggestions.embers.tag': 'Cinematográfico',
    'chat.suggestions.embers.title': 'Dança das brasas',
    'chat.suggestions.embers.prompt':
      'Silhueta de uma dançarina cercada por brasas e fumaça em espiral, contraluz dramático, paleta vermelho-escuro e laranja, sensação de câmera lenta',
    'chat.suggestions.penthouse.tag': 'Glamour',
    'chat.suggestions.penthouse.title': 'Noites na cobertura',
    'chat.suggestions.penthouse.prompt':
      'Cobertura de luxo à noite, taças de champanhe sobre uma mesa de mármore, fogos de artifício sobre o horizonte da cidade vistos por janelas do chão ao teto, luz quente e intimista',

    // ── Composer ────────────────────────────────────────────────────────────────────────────
    'chat.composer.label': 'Descreva o que você quer criar',
    'chat.composer.placeholderImage': 'Descreva a imagem que você quer criar…',
    'chat.composer.placeholderVideo': 'Descreva a cena e o movimento do seu vídeo…',
    'chat.composer.placeholderAnimate': 'Descreva como sua imagem deve se mover…',
    'chat.composer.mode': 'Tipo de geração',
    'chat.composer.ratio': 'Proporção',
    'chat.composer.ratioSquare': 'Quadrado (1:1)',
    'chat.composer.ratioPortrait': 'Retrato (9:16)',
    'chat.composer.ratioLandscape': 'Paisagem (16:9)',
    'chat.composer.attach': 'Anexar imagem de referência',
    'chat.composer.generate': 'Gerar · {cost}',
    'chat.composer.generateLabel': 'Gerar por {cost} créditos',
    'chat.composer.hintVideo': 'Vídeo de {seconds} segundos',
    'chat.composer.hintVideoReference': 'Vídeo de {seconds} segundos · sua imagem de referência é o quadro inicial',
    'chat.composer.hintReference': 'Sua imagem de referência guia o resultado',
    'chat.composer.hintKeys': 'Enter para gerar · Shift + Enter para nova linha',
    'chat.composer.counter': '{count}/{max}',
    'chat.composer.dropTitle': 'Solte sua imagem de referência',
    'chat.composer.dropHint': 'JPG, PNG ou WebP',

    // ── Reference image ─────────────────────────────────────────────────────────────────────
    'chat.reference.label': 'Imagem de referência',
    'chat.reference.fromCreation': 'Da sua criação',
    'chat.reference.remove': 'Remover imagem de referência',
    'chat.reference.processing': 'Preparando imagem…',
    'chat.reference.unsupported': 'Use uma imagem JPG, PNG ou WebP.',
    'chat.reference.tooLarge': 'Esta imagem é grande demais. Use uma com menos de 30 MB.',
    'chat.reference.readError': 'Não conseguimos ler esta imagem. Tente outro arquivo.',
    'chat.reference.unavailable': 'Esta imagem não pode ser usada como referência. Anexe o arquivo.',
    'chat.reference.invalid': 'A imagem de referência foi recusada. Tente outro arquivo JPG, PNG ou WebP.',

    // ── Credits nudges ──────────────────────────────────────────────────────────────────────
    'chat.credits.low': 'Seus créditos estão acabando: restam {credits}.',
    'chat.credits.notEnoughImage': 'Você precisa de {cost} créditos para uma imagem — você tem {credits}.',
    'chat.credits.notEnoughVideo': 'Você precisa de {cost} créditos para um vídeo — você tem {credits}.',
    'chat.credits.getCredits': 'Comprar créditos',
    'chat.credits.dismiss': 'Dispensar',

    // ── Messages ────────────────────────────────────────────────────────────────────────────
    'chat.item.you': 'Você',
    'chat.item.reference': 'Imagem de referência',
    'chat.item.cost': '{cost} cr',
    'chat.pending.sending': 'Enviando para o estúdio…',
    'chat.pending.image': 'Criando sua imagem…',
    'chat.pending.video': 'Renderizando seu vídeo… costuma levar de 1 a 3 minutos',
    'chat.pending.queue': '{position}º na fila',
    'chat.pending.elapsed': 'Tempo decorrido',
    'chat.result.openFullscreen': 'Abrir imagem em tela cheia',
    'chat.result.download': 'Baixar',
    'chat.result.useReference': 'Usar como referência',
    'chat.result.animate': 'Transformar em vídeo',
    'chat.result.animateHint': 'Transforme esta imagem em um vídeo de {seconds} segundos',
    'chat.result.regenerate': 'Gerar de novo',
    'chat.result.mediaUnavailable': 'Este arquivo não está mais disponível.',
    'chat.result.imageAlt': 'Imagem gerada: {prompt}',
    'chat.result.videoLabel': 'Vídeo gerado: {prompt}',
    'chat.failed.title': 'Essa não deu certo',
    'chat.failed.provider_error': 'A IA não conseguiu criar esta. Tente de novo ou ajuste seu prompt.',
    'chat.failed.timeout': 'Demorou demais e foi cancelada.',
    'chat.failed.refunded': 'Seus {cost} créditos foram devolvidos',
    'chat.animate.defaultPrompt': 'Dê vida a esta imagem com um movimento sutil e cinematográfico',
    'chat.animate.ready': 'Modo vídeo ativado — sua imagem é o quadro inicial. Descreva o movimento e clique em Gerar.',
    'chat.regenerate.referenceMissing':
      'Não conseguimos recarregar a imagem de referência original. Anexe-a de novo e gere.',

    // ── Paywall ─────────────────────────────────────────────────────────────────────────────
    'chat.paywall.titleMissing': 'Faltam {missing} créditos',
    'chat.paywall.titleMissingOne': 'Falta 1 crédito',
    'chat.paywall.title': 'Desbloqueie mais criações',
    'chat.paywall.subtitle': 'Escolha um pacote de créditos e continue criando. Pagamento único, sem assinatura.',
    'chat.paywall.balance': 'Seu saldo',
    'chat.paywall.costImage': 'Esta imagem',
    'chat.paywall.costVideo': 'Este vídeo',
    'chat.paywall.rates': 'Imagem = {image} créditos · Vídeo = {video} créditos',
    'chat.paywall.creditsAdded': 'Créditos adicionados — tudo pronto para criar.',

    // ── Toasts, loading, misc ───────────────────────────────────────────────────────────────
    'chat.toast.region': 'Notificações',
    'chat.toast.dismiss': 'Fechar notificação',
    'chat.toast.conversationNotFound': 'Esta conversa não existe mais.',
    'chat.toast.readyImage': 'Sua imagem está pronta.',
    'chat.toast.readyVideo': 'Seu vídeo está pronto.',
    'chat.toast.view': 'Ver',
    'chat.load.error': 'Não conseguimos carregar esta conversa.',
    'chat.jumpToLatest': 'Ir para o mais recente',
    'chat.lightbox.title': 'Visualização da imagem',
    'chat.time.justNow': 'agora mesmo',
  },
});
