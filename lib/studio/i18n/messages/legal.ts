import { defineMessages } from '../define';

// Keys must be prefixed with 'legal.' — owned by the marketing slice (/studio/terms, /studio/privacy).
// Placeholders: {brand} = BRAND_NAME, {email} = SUPPORT_EMAIL (rendered as a mailto link),
// {image}/{video} = credit cost per generation, {age} = minimum age.
export const legal = defineMessages({
  en: {
    // ── Shared ──────────────────────────────────────────────────────────────────
    'legal.updated': 'Last updated: {date}',
    'legal.toc': 'On this page',
    'legal.contactCta': 'Questions about this page? Email us at',
    'legal.alsoRead': 'Also read',

    // ── Terms of Service & Content Policy ───────────────────────────────────────
    'legal.terms.metaTitle': 'Terms & content policy',
    'legal.terms.metaDescription':
      'Terms of Service and Content Policy: 18+ only, zero tolerance for content involving minors, no non-consensual imagery of real people, credits and payments.',
    'legal.terms.eyebrow': 'Legal',
    'legal.terms.title': 'Terms of Service & Content Policy',
    'legal.terms.intro':
      'These terms govern your use of {brand}, an AI image and video generation service. By creating an account or using the service you agree to them. Please read them carefully — especially the Content Policy.',
    'legal.terms.summaryTitle': 'The short version',
    'legal.terms.summary1': 'Adults {age}+ only.',
    'legal.terms.summary2': 'Zero tolerance for any sexual content involving minors — we report it.',
    'legal.terms.summary3':
      'No intimate imagery of real people without consent, no “undressing” edits, no deceptive deepfakes.',
    'legal.terms.summary4':
      'One-time credit packs in USD. Credits never expire; failed generations are refunded automatically.',

    'legal.terms.eligibility.title': 'Eligibility — {age}+ only',
    'legal.terms.eligibility.p1':
      'You must be at least {age} years old — or the age of majority where you live, if higher — to use {brand}. By signing up you confirm that you are. We may close any account we reasonably believe belongs to a minor.',

    'legal.terms.account.title': 'Your account',
    'legal.terms.account.p1':
      'You are responsible for your login credentials and for all activity on your account. Use a strong password, keep it private and tell us right away if you suspect unauthorized access. Accounts are personal and may not be shared, sold or transferred.',

    'legal.terms.policy.title': 'Content Policy',
    'legal.terms.policy.intro':
      'We want you to create boldly — within clear limits. The following is strictly prohibited, whether you write it in a prompt, upload it as a reference or try to obtain it as a result:',
    'legal.terms.policy.minors':
      'Zero tolerance: any sexual or sexualized content involving minors, or anyone who appears to be a minor — real, fictional or AI-generated. We block it, preserve the relevant information, report it to the competent authorities and permanently ban the account.',
    'legal.terms.policy.consent':
      'Sexual or intimate imagery of real, identifiable people without their explicit consent — including celebrities, public figures, acquaintances and ex-partners.',
    'legal.terms.policy.undress': '“Undressing”, nudifying or sexualizing edits of uploaded photos of real people.',
    'legal.terms.policy.deepfakes':
      'Deepfakes or impersonation designed to deceive, defame, harass, extort or manipulate anyone.',
    'legal.terms.policy.rights':
      'Uploading images you don’t own or don’t have the right to use. Only upload reference images you have the rights to.',
    'legal.terms.policy.harassment': 'Harassment, threats, bullying or hateful content that targets people or groups.',
    'legal.terms.policy.illegal':
      'Illegal content, terrorist or violent extremist material, content that promotes self-harm, or anything that facilitates a crime.',
    'legal.terms.policy.enforcement':
      'We use automated filters and may review content to enforce this policy. We may block prompts or uploads, remove content and suspend or terminate accounts that violate it, without refunding credits used in a violation. To report abuse, email {email}.',

    'legal.terms.content.title': 'Your prompts and creations',
    'legal.terms.content.p1':
      'You keep the rights you have in your prompts and uploads. To the extent permitted by law and by the terms of our AI providers, you may use the results you generate for personal or commercial purposes, as long as you follow this Content Policy and the law.',
    'legal.terms.content.p2':
      'You grant us a limited license to store and process your content only as needed to run the service. AI results are synthetic and can be unpredictable or resemble existing works — you are responsible for how you use them.',

    'legal.terms.credits.title': 'Credits & payments',
    'legal.terms.credits.usd':
      'Prices are listed and charged in US dollars (USD). Your bank may apply currency conversion and its own fees.',
    'legal.terms.credits.oneTime':
      'Credit packs are one-time purchases. There is no subscription and no automatic renewal.',
    'legal.terms.credits.costs':
      'Each generation debits a fixed number of credits when it starts: {image} credits per image and {video} credits per video.',
    'legal.terms.credits.noExpiry':
      'Credits never expire while your account is active. They have no cash value and can’t be transferred or exchanged for money.',
    'legal.terms.credits.refundFailed':
      'If a generation fails or times out, its credits are returned to your balance automatically.',
    'legal.terms.credits.noRefundUsed': 'Credits spent on completed generations are not refundable.',
    'legal.terms.credits.processor':
      'Payments are processed by third-party payment providers; your card details are handled by them, not by us.',
    'legal.terms.credits.billing':
      'Duplicate charge, missing credits or any other billing issue? Contact {email} and we will investigate.',

    'legal.terms.service.title': 'Availability & changes',
    'legal.terms.service.p1':
      'We work hard to keep the studio online, but the service is provided “as is” and “as available” and may change, pause or be discontinued. AI models and features may be updated over time. We may update these terms; when changes are material we will update the date at the top of this page and, where appropriate, notify you.',

    'legal.terms.termination.title': 'Suspension & termination',
    'legal.terms.termination.p1':
      'You can stop using the service at any time and ask us to delete your account. We may suspend or terminate accounts that break these terms or the Content Policy, create legal risk or abuse the service — for example through payment fraud or abusive chargebacks.',

    'legal.terms.disclaimer.title': 'Disclaimer & liability',
    'legal.terms.disclaimer.p1':
      'AI-generated results are synthetic and may be inaccurate, unexpected or imperfect. To the maximum extent permitted by law, {brand} is not liable for indirect, incidental or consequential damages, and our total liability for any claim is limited to the amount you paid us in the 12 months before the claim.',
    'legal.terms.disclaimer.p2':
      'Nothing in these terms limits rights you have under consumer protection laws that apply to you.',

    'legal.terms.contact.title': 'Contact',
    'legal.terms.contact.p1': 'Questions about these terms, billing or a report of abuse? Email {email}.',

    // ── Privacy Policy ──────────────────────────────────────────────────────────
    'legal.privacy.metaTitle': 'Privacy',
    'legal.privacy.metaDescription':
      'What we store (account, prompts, reference images, results, payment metadata), why, how long, cookies and how to request deletion.',
    'legal.privacy.eyebrow': 'Legal',
    'legal.privacy.title': 'Privacy Policy',
    'legal.privacy.intro':
      'Your creations are personal. This policy explains, in plain language, what {brand} collects, why we use it and the choices you have.',
    'legal.privacy.summaryTitle': 'The short version',
    'legal.privacy.summary1': 'Your history is private — there is no public feed.',
    'legal.privacy.summary2': 'Card data is handled by the payment processor, never by us.',
    'legal.privacy.summary3': 'We don’t sell your personal data.',
    'legal.privacy.summary4': 'You can ask us to delete your account and data at any time.',

    'legal.privacy.collect.title': 'What we store',
    'legal.privacy.collect.account':
      'Account data — your name, email address, a securely hashed password (never the password itself), language preference and credit balance.',
    'legal.privacy.collect.prompts': 'Prompts — the text you write in the studio and your conversations.',
    'legal.privacy.collect.references': 'Reference images — pictures you upload to guide a generation.',
    'legal.privacy.collect.results': 'Results — the images and videos generated for you.',
    'legal.privacy.collect.payments':
      'Payment metadata — the pack purchased, amount, currency, status and the processor’s transaction reference. Card details are entered on and handled by the payment processor; we never see or store your full card number.',
    'legal.privacy.collect.technical':
      'Technical data — IP address and basic request information used for security, rate limiting and abuse prevention.',

    'legal.privacy.use.title': 'Why we use it',
    'legal.privacy.use.service':
      'To run the service: sign you in, generate and display your creations and keep your history.',
    'legal.privacy.use.payments': 'To process purchases and keep an accurate record of your credits.',
    'legal.privacy.use.safety':
      'To keep the platform safe: enforce the Content Policy, prevent fraud and abuse, and meet legal obligations — including reporting illegal content.',
    'legal.privacy.use.emails': 'To send service emails, such as password resets.',
    'legal.privacy.use.noSell':
      'We do not sell your personal data, and we don’t use your private creations for advertising.',

    'legal.privacy.providers.title': 'Who processes it',
    'legal.privacy.providers.p1':
      'We share data only with providers that help us run the service: our AI generation provider (which receives your prompt and reference image to produce the result), our payment processor, and our hosting, database and email providers. They may use it only to provide their services to us.',

    'legal.privacy.retention.title': 'Retention & deletion',
    'legal.privacy.retention.p1':
      'We keep your data while your account is active. You can delete individual conversations in the studio at any time.',
    'legal.privacy.retention.p2':
      'To delete your account and its data, email {email} from the address on your account and we will confirm once it’s done. We may keep payment records and information related to policy violations for as long as the law requires or allows.',

    'legal.privacy.cookies.title': 'Cookies',
    'legal.privacy.cookies.session':
      'Session cookie — a secure, httpOnly cookie that keeps you logged in. Essential; the studio can’t work without it.',
    'legal.privacy.cookies.lang': 'Language cookie — remembers whether you prefer English or Portuguese.',
    'legal.privacy.cookies.p1':
      'The studio itself sets no advertising cookies. Our website may use analytics and marketing measurement tools (such as advertising pixels) to understand how visitors find us; you can block them in your browser settings or with an extension.',

    'legal.privacy.security.title': 'Security',
    'legal.privacy.security.p1':
      'Passwords are hashed with a slow, salted algorithm, sessions use secure httpOnly cookies and access to your creations is restricted to your account. No system is perfectly secure, but we work to protect your data and will notify you of a breach as required by law.',

    'legal.privacy.rights.title': 'Your rights',
    'legal.privacy.rights.p1':
      'Depending on where you live — for example under the LGPD in Brazil or the GDPR in Europe — you may have the right to access, correct, export or delete your personal data and to object to certain processing. Email {email} to exercise them.',

    'legal.privacy.minors.title': 'Adults only',
    'legal.privacy.minors.p1':
      '{brand} is only for people aged {age}+. We don’t knowingly collect data from minors and will delete any account we learn belongs to one.',

    'legal.privacy.contact.title': 'Contact',
    'legal.privacy.contact.p1': 'Privacy questions or requests: {email}.',
  },
  pt: {
    // ── Shared ──────────────────────────────────────────────────────────────────
    'legal.updated': 'Última atualização: {date}',
    'legal.toc': 'Nesta página',
    'legal.contactCta': 'Dúvidas sobre esta página? Escreva para',
    'legal.alsoRead': 'Leia também',

    // ── Terms of Service & Content Policy ───────────────────────────────────────
    'legal.terms.metaTitle': 'Termos e política de conteúdo',
    'legal.terms.metaDescription':
      'Termos de Uso e Política de Conteúdo: somente maiores de 18, tolerância zero com conteúdo envolvendo menores, proibição de imagens não consentidas de pessoas reais, créditos e pagamentos.',
    'legal.terms.eyebrow': 'Legal',
    'legal.terms.title': 'Termos de Uso e Política de Conteúdo',
    'legal.terms.intro':
      'Estes termos regem o uso do {brand}, um serviço de geração de imagens e vídeos com IA. Ao criar uma conta ou usar o serviço, você concorda com eles. Leia com atenção — principalmente a Política de Conteúdo.',
    'legal.terms.summaryTitle': 'Resumindo',
    'legal.terms.summary1': 'Somente maiores de {age} anos.',
    'legal.terms.summary2': 'Tolerância zero com qualquer conteúdo sexual envolvendo menores — nós denunciamos.',
    'legal.terms.summary3':
      'Nada de imagens íntimas de pessoas reais sem consentimento, edições para “despir” ou deepfakes enganosos.',
    'legal.terms.summary4':
      'Pacotes de créditos com pagamento único em USD. Créditos nunca expiram; falhas são reembolsadas automaticamente.',

    'legal.terms.eligibility.title': 'Elegibilidade — somente {age}+',
    'legal.terms.eligibility.p1':
      'Você precisa ter pelo menos {age} anos — ou a maioridade legal do seu país, se for maior — para usar o {brand}. Ao se cadastrar, você confirma que tem. Podemos encerrar qualquer conta que, com base razoável, acreditemos pertencer a um menor de idade.',

    'legal.terms.account.title': 'Sua conta',
    'legal.terms.account.p1':
      'Você é responsável pelos seus dados de acesso e por toda atividade na sua conta. Use uma senha forte, mantenha-a em sigilo e nos avise imediatamente se suspeitar de acesso não autorizado. As contas são pessoais e não podem ser compartilhadas, vendidas ou transferidas.',

    'legal.terms.policy.title': 'Política de Conteúdo',
    'legal.terms.policy.intro':
      'Queremos que você crie com ousadia — dentro de limites claros. É estritamente proibido, seja escrevendo em um prompt, enviando como referência ou tentando obter como resultado:',
    'legal.terms.policy.minors':
      'Tolerância zero: qualquer conteúdo sexual ou sexualizado envolvendo menores de idade, ou qualquer pessoa que aparente ser menor — real, fictícia ou gerada por IA. Nós bloqueamos, preservamos as informações relevantes, denunciamos às autoridades competentes e banimos a conta permanentemente.',
    'legal.terms.policy.consent':
      'Imagens sexuais ou íntimas de pessoas reais e identificáveis sem o consentimento explícito delas — incluindo celebridades, figuras públicas, conhecidos e ex-parceiros.',
    'legal.terms.policy.undress': 'Edições para “despir”, deixar nua ou sexualizar fotos enviadas de pessoas reais.',
    'legal.terms.policy.deepfakes':
      'Deepfakes ou falsificação de identidade feitos para enganar, difamar, assediar, extorquir ou manipular qualquer pessoa.',
    'legal.terms.policy.rights':
      'Enviar imagens que não são suas ou que você não tem direito de usar. Envie apenas imagens de referência sobre as quais você tem direitos.',
    'legal.terms.policy.harassment': 'Assédio, ameaças, bullying ou conteúdo de ódio direcionado a pessoas ou grupos.',
    'legal.terms.policy.illegal':
      'Conteúdo ilegal, material terrorista ou extremista violento, conteúdo que incentive automutilação ou qualquer coisa que facilite um crime.',
    'legal.terms.policy.enforcement':
      'Usamos filtros automáticos e podemos revisar conteúdos para aplicar esta política. Podemos bloquear prompts ou envios, remover conteúdo e suspender ou encerrar contas que a violarem, sem reembolso dos créditos usados na violação. Para denunciar abusos, escreva para {email}.',

    'legal.terms.content.title': 'Seus prompts e criações',
    'legal.terms.content.p1':
      'Você mantém os direitos que tiver sobre seus prompts e envios. Na medida permitida pela lei e pelos termos dos nossos provedores de IA, você pode usar os resultados que gerar para fins pessoais ou comerciais, desde que siga esta Política de Conteúdo e a lei.',
    'legal.terms.content.p2':
      'Você nos concede uma licença limitada para armazenar e processar seu conteúdo apenas no necessário para operar o serviço. Resultados de IA são sintéticos, podem ser imprevisíveis ou parecidos com obras existentes — você é responsável pelo uso que fizer deles.',

    'legal.terms.credits.title': 'Créditos e pagamentos',
    'legal.terms.credits.usd':
      'Os preços são anunciados e cobrados em dólar americano (USD). Seu banco pode aplicar conversão de moeda, IOF e tarifas próprias.',
    'legal.terms.credits.oneTime':
      'Os pacotes de créditos são compras únicas. Não há assinatura nem renovação automática.',
    'legal.terms.credits.costs':
      'Cada geração desconta um número fixo de créditos ao ser iniciada: {image} créditos por imagem e {video} créditos por vídeo.',
    'legal.terms.credits.noExpiry':
      'Os créditos nunca expiram enquanto sua conta estiver ativa. Eles não têm valor em dinheiro e não podem ser transferidos nem trocados por dinheiro.',
    'legal.terms.credits.refundFailed':
      'Se uma geração falhar ou demorar demais, os créditos voltam automaticamente para o seu saldo.',
    'legal.terms.credits.noRefundUsed': 'Créditos usados em gerações concluídas não são reembolsáveis.',
    'legal.terms.credits.processor':
      'Os pagamentos são processados por provedores de pagamento terceirizados; os dados do seu cartão ficam com eles, não conosco.',
    'legal.terms.credits.billing':
      'Cobrança duplicada, créditos que não chegaram ou qualquer outro problema de cobrança? Fale com {email} e vamos investigar.',

    'legal.terms.service.title': 'Disponibilidade e alterações',
    'legal.terms.service.p1':
      'Trabalhamos para manter o estúdio no ar, mas o serviço é fornecido “no estado em que se encontra” e “conforme disponível”, podendo mudar, ser pausado ou descontinuado. Modelos de IA e funcionalidades podem ser atualizados com o tempo. Podemos atualizar estes termos; quando as mudanças forem relevantes, atualizaremos a data no topo desta página e, quando apropriado, avisaremos você.',

    'legal.terms.termination.title': 'Suspensão e encerramento',
    'legal.terms.termination.p1':
      'Você pode parar de usar o serviço quando quiser e pedir a exclusão da sua conta. Podemos suspender ou encerrar contas que violem estes termos ou a Política de Conteúdo, criem risco jurídico ou abusem do serviço — por exemplo, com fraude de pagamento ou contestações abusivas.',

    'legal.terms.disclaimer.title': 'Isenção e responsabilidade',
    'legal.terms.disclaimer.p1':
      'Resultados gerados por IA são sintéticos e podem ser imprecisos, inesperados ou imperfeitos. Na máxima extensão permitida por lei, o {brand} não se responsabiliza por danos indiretos, incidentais ou consequenciais, e nossa responsabilidade total por qualquer reclamação fica limitada ao valor que você nos pagou nos 12 meses anteriores a ela.',
    'legal.terms.disclaimer.p2':
      'Nada nestes termos limita os direitos que você tem pelas leis de defesa do consumidor aplicáveis, incluindo o Código de Defesa do Consumidor.',

    'legal.terms.contact.title': 'Contato',
    'legal.terms.contact.p1': 'Dúvidas sobre estes termos, cobrança ou denúncia de abuso? Escreva para {email}.',

    // ── Privacy Policy ──────────────────────────────────────────────────────────
    'legal.privacy.metaTitle': 'Privacidade',
    'legal.privacy.metaDescription':
      'O que armazenamos (conta, prompts, imagens de referência, resultados, dados de pagamento), por quê, por quanto tempo, cookies e como pedir a exclusão.',
    'legal.privacy.eyebrow': 'Legal',
    'legal.privacy.title': 'Política de Privacidade',
    'legal.privacy.intro':
      'Suas criações são pessoais. Esta política explica, em linguagem simples, o que o {brand} coleta, para que usamos e quais escolhas você tem.',
    'legal.privacy.summaryTitle': 'Resumindo',
    'legal.privacy.summary1': 'Seu histórico é privado — não existe feed público.',
    'legal.privacy.summary2': 'Os dados do cartão ficam com o processador de pagamento, nunca conosco.',
    'legal.privacy.summary3': 'Não vendemos seus dados pessoais.',
    'legal.privacy.summary4': 'Você pode pedir a exclusão da sua conta e dos seus dados quando quiser.',

    'legal.privacy.collect.title': 'O que armazenamos',
    'legal.privacy.collect.account':
      'Dados da conta — seu nome, e-mail, uma versão criptografada (hash) da sua senha (nunca a senha em si), idioma preferido e saldo de créditos.',
    'legal.privacy.collect.prompts': 'Prompts — os textos que você escreve no estúdio e suas conversas.',
    'legal.privacy.collect.references': 'Imagens de referência — as imagens que você envia para guiar uma geração.',
    'legal.privacy.collect.results': 'Resultados — as imagens e vídeos gerados para você.',
    'legal.privacy.collect.payments':
      'Dados de pagamento — o pacote comprado, valor, moeda, status e a referência da transação no processador. Os dados do cartão são digitados e tratados pelo processador de pagamento; nunca vemos nem armazenamos o número completo do seu cartão.',
    'legal.privacy.collect.technical':
      'Dados técnicos — endereço IP e informações básicas das requisições, usados para segurança, limite de tentativas e prevenção de abusos.',

    'legal.privacy.use.title': 'Para que usamos',
    'legal.privacy.use.service':
      'Para operar o serviço: fazer seu login, gerar e exibir suas criações e manter seu histórico.',
    'legal.privacy.use.payments': 'Para processar compras e manter um registro correto dos seus créditos.',
    'legal.privacy.use.safety':
      'Para manter a plataforma segura: aplicar a Política de Conteúdo, prevenir fraudes e abusos e cumprir obrigações legais — incluindo denunciar conteúdo ilegal.',
    'legal.privacy.use.emails': 'Para enviar e-mails do serviço, como a redefinição de senha.',
    'legal.privacy.use.noSell':
      'Não vendemos seus dados pessoais e não usamos suas criações privadas para publicidade.',

    'legal.privacy.providers.title': 'Quem processa',
    'legal.privacy.providers.p1':
      'Compartilhamos dados apenas com fornecedores que nos ajudam a operar o serviço: nosso provedor de geração por IA (que recebe seu prompt e sua imagem de referência para produzir o resultado), nosso processador de pagamentos e nossos provedores de hospedagem, banco de dados e e-mail. Eles só podem usar os dados para nos prestar esses serviços.',

    'legal.privacy.retention.title': 'Retenção e exclusão',
    'legal.privacy.retention.p1':
      'Guardamos seus dados enquanto sua conta estiver ativa. Você pode apagar conversas individuais no estúdio a qualquer momento.',
    'legal.privacy.retention.p2':
      'Para excluir sua conta e os dados dela, escreva para {email} a partir do e-mail cadastrado e confirmaremos quando estiver concluído. Podemos manter registros de pagamento e informações relacionadas a violações da política pelo tempo que a lei exigir ou permitir.',

    'legal.privacy.cookies.title': 'Cookies',
    'legal.privacy.cookies.session':
      'Cookie de sessão — um cookie seguro e httpOnly que mantém você conectado. Essencial: o estúdio não funciona sem ele.',
    'legal.privacy.cookies.lang': 'Cookie de idioma — lembra se você prefere português ou inglês.',
    'legal.privacy.cookies.p1':
      'O estúdio em si não define cookies de publicidade. Nosso site pode usar ferramentas de análise e de mensuração de marketing (como pixels de anúncios) para entender como os visitantes nos encontram; você pode bloqueá-las nas configurações do navegador ou com uma extensão.',

    'legal.privacy.security.title': 'Segurança',
    'legal.privacy.security.p1':
      'As senhas são protegidas com um algoritmo de hash lento e com salt, as sessões usam cookies seguros e httpOnly, e o acesso às suas criações é restrito à sua conta. Nenhum sistema é perfeitamente seguro, mas trabalhamos para proteger seus dados e avisaremos você sobre incidentes conforme exigido por lei.',

    'legal.privacy.rights.title': 'Seus direitos',
    'legal.privacy.rights.p1':
      'Dependendo de onde você mora — por exemplo, pela LGPD no Brasil ou pelo GDPR na Europa — você pode ter direito de acessar, corrigir, exportar ou excluir seus dados pessoais e de se opor a certos tratamentos. Escreva para {email} para exercer esses direitos.',

    'legal.privacy.minors.title': 'Somente adultos',
    'legal.privacy.minors.p1':
      'O {brand} é exclusivo para maiores de {age} anos. Não coletamos intencionalmente dados de menores e excluiremos qualquer conta que descobrirmos pertencer a um.',

    'legal.privacy.contact.title': 'Contato',
    'legal.privacy.contact.p1': 'Dúvidas ou solicitações sobre privacidade: {email}.',
  },
});
