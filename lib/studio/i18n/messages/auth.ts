import { defineMessages } from '../define';

// Keys must be prefixed with 'auth.' — owned by the auth slice.
// Placeholders: {brand} is filled with BRAND_NAME where noted, {count}/{plan}/{email}/{name} by the caller.
export const auth = defineMessages({
  en: {
    // ── Shared fields ───────────────────────────────────────────────────────────────────────
    'auth.fields.name': 'Name',
    'auth.fields.namePlaceholder': 'How should we call you?',
    'auth.fields.email': 'Email',
    'auth.fields.emailPlaceholder': 'you@example.com',
    'auth.fields.password': 'Password',
    'auth.fields.passwordPlaceholder': 'Your password',
    'auth.fields.newPasswordPlaceholder': 'At least 8 characters',
    'auth.fields.passwordHint': 'At least 8 characters. Mix letters, numbers and symbols to make it stronger.',
    'auth.fields.newPassword': 'New password',
    'auth.fields.confirmPassword': 'Confirm new password',
    'auth.fields.confirmPasswordPlaceholder': 'Type it again',

    // ── Client-side validation ──────────────────────────────────────────────────────────────
    'auth.validation.nameRequired': 'Please enter your name.',
    'auth.validation.nameTooLong': 'Use at most 80 characters.',
    'auth.validation.emailInvalid': 'Enter a valid email address.',
    'auth.validation.passwordRequired': 'Enter your password.',
    'auth.validation.passwordShort': 'Use at least 8 characters.',
    'auth.validation.passwordTooLong': 'Use at most 200 characters.',
    'auth.validation.passwordMismatch': "Passwords don't match.",

    // ── Password strength meter ─────────────────────────────────────────────────────────────
    'auth.strength.label': 'Password strength',
    'auth.strength.tooShort': 'Too short',
    'auth.strength.weak': 'Weak',
    'auth.strength.fair': 'Fair',
    'auth.strength.good': 'Good',
    'auth.strength.strong': 'Strong',

    // ── Shell (split-screen layout + visual panel) ──────────────────────────────────────────
    'auth.visual.eyebrow': 'Exclusive AI studio',
    'auth.visual.titleA': 'Your imagination,',
    'auth.visual.titleB': 'set on fire.',
    'auth.visual.subtitle':
      'Describe it, add a reference photo if you like, and watch exclusive images and videos come to life.',
    'auth.visual.you': 'You',
    'auth.visual.prompt': 'Golden-hour portrait, red silk and soft smoke, cinematic lighting',
    'auth.visual.reference': 'Reference photo',
    'auth.visual.imageReady': 'Image ready',
    'auth.visual.videoRendering': 'Rendering video',
    'auth.visual.costsLabel': 'Credits per creation',
    'auth.visual.payPerCreation': 'No subscription — pay only for what you create.',

    // ── Log in ──────────────────────────────────────────────────────────────────────────────
    'auth.login.metaTitle': 'Log in',
    'auth.login.title': 'Welcome back',
    'auth.login.subtitle': 'Log in to keep creating.',
    'auth.login.forgot': 'Forgot password?',
    'auth.login.submit': 'Log in',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.createAccount': 'Sign up free',
    'auth.login.planNote': "After logging in you'll continue to checkout for the {plan} plan.",
    'auth.login.redirecting': "You're already logged in. Taking you to the studio…",

    // ── Sign up ─────────────────────────────────────────────────────────────────────────────
    'auth.signup.metaTitle': 'Create your account',
    'auth.signup.title': 'Create your account',
    'auth.signup.subtitle': 'It takes less than a minute.',
    'auth.signup.bonusTitle': 'Get {count} free credits',
    'auth.signup.bonusOneImage': 'Enough to create your first image — on us.',
    'auth.signup.bonusImages': 'Enough to create {count} images — on us.',
    'auth.signup.bonusGeneric': 'Added to your balance as soon as you sign up.',
    'auth.signup.terms': 'I am 18 or older and agree to the {terms}.',
    'auth.signup.termsLink': 'Terms & Content Policy',
    'auth.signup.newTab': '(opens in a new tab)',
    'auth.signup.submit': 'Create free account',
    'auth.signup.hasAccount': 'Already have an account?',
    'auth.signup.planNote': "After creating your account you'll continue to checkout for the {plan} plan.",
    'auth.signup.planDetail': '{price} · {credits} credits',
    'auth.signup.emailTakenAction': 'Log in instead',

    // ── Forgot password ─────────────────────────────────────────────────────────────────────
    'auth.forgot.metaTitle': 'Forgot password',
    'auth.forgot.title': 'Forgot your password?',
    'auth.forgot.subtitle': "Enter your email and we'll send you a link to choose a new one.",
    'auth.forgot.submit': 'Send reset link',
    'auth.forgot.sentTitle': 'Check your inbox',
    'auth.forgot.sentBody':
      "If an account exists for {email}, we've sent a link to reset your password. It expires in 1 hour.",
    'auth.forgot.spamHint': "Can't find it? Check your spam or promotions folder.",
    'auth.forgot.tryAgain': 'Use a different email',
    'auth.forgot.remembered': 'Remembered it?',
    'auth.forgot.backToLogin': 'Back to log in',

    // ── Reset password ──────────────────────────────────────────────────────────────────────
    'auth.reset.metaTitle': 'Choose a new password',
    'auth.reset.title': 'Choose a new password',
    'auth.reset.subtitle': "For your security, you'll be logged out of every other device.",
    'auth.reset.submit': 'Save and log in',
    'auth.reset.success': 'Password updated! Taking you to the studio…',
    'auth.reset.missingTitle': 'This link is incomplete',
    'auth.reset.missingBody':
      'The reset link is missing its security code. Open the link from the email again, or request a new one.',
    'auth.reset.expiredTitle': 'This link has expired',
    'auth.reset.expiredBody':
      'Reset links work once and expire after 1 hour. Request a new one and use it right away.',
    'auth.reset.requestNew': 'Request a new link',

    // ── Password reset email ({brand} = BRAND_NAME) ─────────────────────────────────────────
    'auth.email.reset.subject': 'Reset your {brand} password',
    'auth.email.reset.preheader': 'Use this link within 1 hour to choose a new password.',
    'auth.email.reset.title': 'Reset your password',
    'auth.email.greeting': 'Hi {name},',
    'auth.email.greetingNoName': 'Hi there,',
    'auth.email.reset.body':
      'We received a request to reset the password of your {brand} account. Click the button below to choose a new one.',
    'auth.email.reset.button': 'Choose a new password',
    'auth.email.reset.expiry': 'This link expires in 1 hour and can only be used once.',
    'auth.email.reset.fallback': "Button not working? Copy and paste this link into your browser:",
    'auth.email.reset.ignore':
      "Didn't ask for this? You can safely ignore this email — your password won't change.",
    'auth.email.footer': '{brand} · Exclusive AI images & videos · 18+ only',
    'auth.email.support': 'Questions? Write to us at {email}',
  },
  pt: {
    // ── Shared fields ───────────────────────────────────────────────────────────────────────
    'auth.fields.name': 'Nome',
    'auth.fields.namePlaceholder': 'Como podemos te chamar?',
    'auth.fields.email': 'E-mail',
    'auth.fields.emailPlaceholder': 'voce@exemplo.com',
    'auth.fields.password': 'Senha',
    'auth.fields.passwordPlaceholder': 'Sua senha',
    'auth.fields.newPasswordPlaceholder': 'No mínimo 8 caracteres',
    'auth.fields.passwordHint': 'No mínimo 8 caracteres. Misture letras, números e símbolos para deixá-la mais forte.',
    'auth.fields.newPassword': 'Nova senha',
    'auth.fields.confirmPassword': 'Confirme a nova senha',
    'auth.fields.confirmPasswordPlaceholder': 'Digite novamente',

    // ── Client-side validation ──────────────────────────────────────────────────────────────
    'auth.validation.nameRequired': 'Informe seu nome.',
    'auth.validation.nameTooLong': 'Use no máximo 80 caracteres.',
    'auth.validation.emailInvalid': 'Digite um e-mail válido.',
    'auth.validation.passwordRequired': 'Digite sua senha.',
    'auth.validation.passwordShort': 'Use pelo menos 8 caracteres.',
    'auth.validation.passwordTooLong': 'Use no máximo 200 caracteres.',
    'auth.validation.passwordMismatch': 'As senhas não coincidem.',

    // ── Password strength meter ─────────────────────────────────────────────────────────────
    'auth.strength.label': 'Força da senha',
    'auth.strength.tooShort': 'Muito curta',
    'auth.strength.weak': 'Fraca',
    'auth.strength.fair': 'Razoável',
    'auth.strength.good': 'Boa',
    'auth.strength.strong': 'Forte',

    // ── Shell (split-screen layout + visual panel) ──────────────────────────────────────────
    'auth.visual.eyebrow': 'Estúdio de IA exclusivo',
    'auth.visual.titleA': 'Sua imaginação,',
    'auth.visual.titleB': 'em chamas.',
    'auth.visual.subtitle':
      'Descreva, adicione uma foto de referência se quiser e veja imagens e vídeos exclusivos ganharem vida.',
    'auth.visual.you': 'Você',
    'auth.visual.prompt': 'Retrato na golden hour, seda vermelha e fumaça suave, luz cinematográfica',
    'auth.visual.reference': 'Foto de referência',
    'auth.visual.imageReady': 'Imagem pronta',
    'auth.visual.videoRendering': 'Gerando vídeo',
    'auth.visual.costsLabel': 'Créditos por criação',
    'auth.visual.payPerCreation': 'Sem assinatura — pague só pelo que criar.',

    // ── Log in ──────────────────────────────────────────────────────────────────────────────
    'auth.login.metaTitle': 'Entrar',
    'auth.login.title': 'Que bom te ver de novo',
    'auth.login.subtitle': 'Entre para continuar criando.',
    'auth.login.forgot': 'Esqueceu a senha?',
    'auth.login.submit': 'Entrar',
    'auth.login.noAccount': 'Ainda não tem conta?',
    'auth.login.createAccount': 'Cadastre-se grátis',
    'auth.login.planNote': 'Depois de entrar, você seguirá para o pagamento do plano {plan}.',
    'auth.login.redirecting': 'Você já está conectado. Levando você ao estúdio…',

    // ── Sign up ─────────────────────────────────────────────────────────────────────────────
    'auth.signup.metaTitle': 'Criar conta',
    'auth.signup.title': 'Crie sua conta',
    'auth.signup.subtitle': 'Leva menos de um minuto.',
    'auth.signup.bonusTitle': 'Ganhe {count} créditos grátis',
    'auth.signup.bonusOneImage': 'O suficiente para criar sua primeira imagem — por nossa conta.',
    'auth.signup.bonusImages': 'O suficiente para criar {count} imagens — por nossa conta.',
    'auth.signup.bonusGeneric': 'Somados ao seu saldo assim que você se cadastrar.',
    'auth.signup.terms': 'Tenho 18 anos ou mais e concordo com os {terms}.',
    'auth.signup.termsLink': 'Termos e a Política de Conteúdo',
    'auth.signup.newTab': '(abre em uma nova aba)',
    'auth.signup.submit': 'Criar conta grátis',
    'auth.signup.hasAccount': 'Já tem uma conta?',
    'auth.signup.planNote': 'Depois de criar sua conta, você seguirá para o pagamento do plano {plan}.',
    'auth.signup.planDetail': '{price} · {credits} créditos',
    'auth.signup.emailTakenAction': 'Entrar com essa conta',

    // ── Forgot password ─────────────────────────────────────────────────────────────────────
    'auth.forgot.metaTitle': 'Esqueci minha senha',
    'auth.forgot.title': 'Esqueceu sua senha?',
    'auth.forgot.subtitle': 'Informe seu e-mail e enviaremos um link para você criar uma nova.',
    'auth.forgot.submit': 'Enviar link de redefinição',
    'auth.forgot.sentTitle': 'Confira seu e-mail',
    'auth.forgot.sentBody':
      'Se existir uma conta com {email}, enviamos um link para redefinir sua senha. Ele expira em 1 hora.',
    'auth.forgot.spamHint': 'Não encontrou? Dê uma olhada na caixa de spam ou de promoções.',
    'auth.forgot.tryAgain': 'Usar outro e-mail',
    'auth.forgot.remembered': 'Lembrou a senha?',
    'auth.forgot.backToLogin': 'Voltar para o login',

    // ── Reset password ──────────────────────────────────────────────────────────────────────
    'auth.reset.metaTitle': 'Criar nova senha',
    'auth.reset.title': 'Crie uma nova senha',
    'auth.reset.subtitle': 'Por segurança, você será desconectado de todos os outros dispositivos.',
    'auth.reset.submit': 'Salvar e entrar',
    'auth.reset.success': 'Senha atualizada! Levando você ao estúdio…',
    'auth.reset.missingTitle': 'Este link está incompleto',
    'auth.reset.missingBody':
      'Falta o código de segurança no link de redefinição. Abra novamente o link do e-mail ou solicite um novo.',
    'auth.reset.expiredTitle': 'Este link expirou',
    'auth.reset.expiredBody':
      'Os links de redefinição funcionam uma única vez e expiram em 1 hora. Solicite um novo e use logo em seguida.',
    'auth.reset.requestNew': 'Solicitar novo link',

    // ── Password reset email ({brand} = BRAND_NAME) ─────────────────────────────────────────
    'auth.email.reset.subject': 'Redefina sua senha do {brand}',
    'auth.email.reset.preheader': 'Use este link em até 1 hora para criar uma nova senha.',
    'auth.email.reset.title': 'Redefina sua senha',
    'auth.email.greeting': 'Olá, {name}!',
    'auth.email.greetingNoName': 'Olá!',
    'auth.email.reset.body':
      'Recebemos um pedido para redefinir a senha da sua conta no {brand}. Clique no botão abaixo para criar uma nova.',
    'auth.email.reset.button': 'Criar nova senha',
    'auth.email.reset.expiry': 'Este link expira em 1 hora e só pode ser usado uma vez.',
    'auth.email.reset.fallback': 'O botão não funcionou? Copie e cole este link no seu navegador:',
    'auth.email.reset.ignore':
      'Não foi você? Pode ignorar este e-mail com tranquilidade — sua senha continuará a mesma.',
    'auth.email.footer': '{brand} · Imagens e vídeos exclusivos com IA · Somente maiores de 18',
    'auth.email.support': 'Dúvidas? Escreva para {email}',
  },
});
