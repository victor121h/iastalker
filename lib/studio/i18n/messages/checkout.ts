import { defineMessages } from '../define';

// Keys must be prefixed with 'checkout.' — owned by the checkout slice.
export const checkout = defineMessages({
  en: {
    'checkout.meta.devTitle': 'Test checkout',
    'checkout.meta.successTitle': 'Payment confirmation',

    // ── Test mode ─────────────────────────────────────────────────────────────
    'checkout.testMode.title': 'TEST MODE — no real charge',
    'checkout.testMode.body':
      'This checkout is simulated for development. No card is needed, no money moves and the credits are added instantly.',

    // ── Dev checkout page ─────────────────────────────────────────────────────
    'checkout.dev.eyebrow': 'Checkout',
    'checkout.dev.title': 'Review your order',
    'checkout.dev.subtitle': 'Check the pack below, then simulate the payment to add the credits to your account.',
    'checkout.dev.paymentTitle': 'Simulated payment',
    'checkout.dev.accountLabel': 'Credits go to',
    'checkout.dev.point1': 'No card or payment details needed',
    'checkout.dev.point2': 'Credits are added the moment you confirm',
    'checkout.dev.point3': 'Shows up in your history as a test purchase',
    'checkout.dev.simulate': 'Simulate successful payment',
    'checkout.dev.backToPricing': 'Back to pricing',
    'checkout.dev.disabledTitle': 'Test checkout is turned off',
    'checkout.dev.disabledBody':
      'Simulated purchases are disabled on this server. Pick a pack on the pricing page to pay securely.',
    'checkout.dev.invalidTitle': 'Pack not found',
    'checkout.dev.invalidBody': "We couldn't find that credit pack. Choose one on the pricing page.",
    'checkout.dev.seePacks': 'See credit packs',

    // ── Order summary ─────────────────────────────────────────────────────────
    'checkout.summary.title': 'Order summary',
    'checkout.summary.creditPack': 'Credit pack',
    'checkout.summary.pack': '{plan} pack',
    'checkout.summary.equivalent': '= {images} or {videos}',
    'checkout.summary.perCredit': 'Price per credit',
    'checkout.summary.savings': 'Savings',
    'checkout.summary.savingsValue': '{percent}% per credit vs. Basic',
    'checkout.summary.total': 'Total',
    'checkout.summary.oneTime': 'One-time payment · no subscription',
    'checkout.badge.popular': 'Most popular',
    'checkout.badge.bestValue': 'Best value',
    'checkout.unit.imageOne': '{count} image',
    'checkout.unit.imageMany': '{count} images',
    'checkout.unit.videoOne': '{count} video',
    'checkout.unit.videoMany': '{count} videos',

    // ── Success page ──────────────────────────────────────────────────────────
    'checkout.success.confirmingTitle': 'Confirming your payment…',
    'checkout.success.confirmingBody':
      'This usually takes just a few seconds. Keep this page open — your credits will show up automatically.',
    'checkout.success.title': 'Payment confirmed',
    'checkout.success.creditsAdded': '+{count} credits added',
    'checkout.success.creditsAddedGeneric': 'Your credits were added',
    'checkout.success.body': 'Your {plan} pack is ready. Time to bring your next idea to life.',
    'checkout.success.bodyGeneric': 'Your credits are ready. Time to bring your next idea to life.',
    'checkout.success.newBalance': 'New balance',
    'checkout.success.vipUnlocked': 'VIP status unlocked',
    'checkout.success.viewAccount': 'View account',
    'checkout.success.testNote': 'Simulated purchase — no real payment was made.',

    'checkout.slow.title': 'Your payment is being processed',
    'checkout.slow.body':
      'Credits will appear shortly — sometimes the payment provider takes a few minutes to confirm. You can keep creating in the meantime; we add them automatically.',
    'checkout.slow.balance': 'Current balance',
    'checkout.slow.support': "Still nothing after 15 minutes? Write to {email} and we'll sort it out.",
    'checkout.slow.checkAgain': 'Check again',

    'checkout.failed.title': "We couldn't confirm this payment",
    'checkout.failed.body': "The payment didn't go through, so no credits were added.",
    'checkout.failed.support': "If you were charged anyway, write to {email} and we'll fix it.",
    'checkout.failed.tryAgain': 'Choose a pack',

    'checkout.loggedOut.title': 'Log in to see your credits',
    'checkout.loggedOut.body':
      'Your purchase is linked to the email you used at checkout. Log in with that account — or create one with the same email — and your credits will be waiting.',
  },
  pt: {
    'checkout.meta.devTitle': 'Checkout de teste',
    'checkout.meta.successTitle': 'Confirmação de pagamento',

    'checkout.testMode.title': 'MODO DE TESTE — nenhuma cobrança real',
    'checkout.testMode.body':
      'Este checkout é simulado para desenvolvimento. Não precisa de cartão, nenhum dinheiro é movimentado e os créditos entram na hora.',

    'checkout.dev.eyebrow': 'Checkout',
    'checkout.dev.title': 'Revise seu pedido',
    'checkout.dev.subtitle': 'Confira o pacote abaixo e simule o pagamento para adicionar os créditos à sua conta.',
    'checkout.dev.paymentTitle': 'Pagamento simulado',
    'checkout.dev.accountLabel': 'Os créditos vão para',
    'checkout.dev.point1': 'Sem cartão nem dados de pagamento',
    'checkout.dev.point2': 'Os créditos entram assim que você confirmar',
    'checkout.dev.point3': 'Aparece no seu histórico como compra de teste',
    'checkout.dev.simulate': 'Simular pagamento aprovado',
    'checkout.dev.backToPricing': 'Voltar aos planos',
    'checkout.dev.disabledTitle': 'O checkout de teste está desativado',
    'checkout.dev.disabledBody':
      'As compras simuladas estão desativadas neste servidor. Escolha um pacote na página de planos para pagar com segurança.',
    'checkout.dev.invalidTitle': 'Pacote não encontrado',
    'checkout.dev.invalidBody': 'Não encontramos esse pacote de créditos. Escolha um na página de planos.',
    'checkout.dev.seePacks': 'Ver pacotes de créditos',

    'checkout.summary.title': 'Resumo do pedido',
    'checkout.summary.creditPack': 'Pacote de créditos',
    'checkout.summary.pack': 'Pacote {plan}',
    'checkout.summary.equivalent': '= {images} ou {videos}',
    'checkout.summary.perCredit': 'Preço por crédito',
    'checkout.summary.savings': 'Economia',
    'checkout.summary.savingsValue': '{percent}% por crédito vs. Basic',
    'checkout.summary.total': 'Total',
    'checkout.summary.oneTime': 'Pagamento único · sem assinatura',
    'checkout.badge.popular': 'Mais popular',
    'checkout.badge.bestValue': 'Melhor custo-benefício',
    'checkout.unit.imageOne': '{count} imagem',
    'checkout.unit.imageMany': '{count} imagens',
    'checkout.unit.videoOne': '{count} vídeo',
    'checkout.unit.videoMany': '{count} vídeos',

    'checkout.success.confirmingTitle': 'Confirmando seu pagamento…',
    'checkout.success.confirmingBody':
      'Isso costuma levar só alguns segundos. Mantenha esta página aberta — seus créditos vão aparecer automaticamente.',
    'checkout.success.title': 'Pagamento confirmado',
    'checkout.success.creditsAdded': '+{count} créditos adicionados',
    'checkout.success.creditsAddedGeneric': 'Seus créditos foram adicionados',
    'checkout.success.body': 'Seu pacote {plan} está pronto. Hora de dar vida à sua próxima ideia.',
    'checkout.success.bodyGeneric': 'Seus créditos estão prontos. Hora de dar vida à sua próxima ideia.',
    'checkout.success.newBalance': 'Novo saldo',
    'checkout.success.vipUnlocked': 'Status VIP desbloqueado',
    'checkout.success.viewAccount': 'Ver minha conta',
    'checkout.success.testNote': 'Compra simulada — nenhum pagamento real foi feito.',

    'checkout.slow.title': 'Seu pagamento está sendo processado',
    'checkout.slow.body':
      'Os créditos vão aparecer em breve — às vezes a operadora leva alguns minutos para confirmar. Você pode continuar criando enquanto isso; eles entram automaticamente.',
    'checkout.slow.balance': 'Saldo atual',
    'checkout.slow.support': 'Nada depois de 15 minutos? Escreva para {email} que a gente resolve.',
    'checkout.slow.checkAgain': 'Verificar de novo',

    'checkout.failed.title': 'Não conseguimos confirmar este pagamento',
    'checkout.failed.body': 'O pagamento não foi concluído, então nenhum crédito foi adicionado.',
    'checkout.failed.support': 'Se houve cobrança mesmo assim, escreva para {email} que a gente resolve.',
    'checkout.failed.tryAgain': 'Escolher um pacote',

    'checkout.loggedOut.title': 'Entre para ver seus créditos',
    'checkout.loggedOut.body':
      'Sua compra fica vinculada ao e-mail usado no pagamento. Entre com essa conta — ou crie uma com o mesmo e-mail — e seus créditos estarão te esperando.',
  },
});
