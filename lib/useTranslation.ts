const translations: Record<string, Record<string, string>> = {
  pt: {
    'dash.camera': 'Câmera',
    'dash.target_device': 'Dispositivo alvo',
    'dash.other_networks': 'Outras Redes',
    'dash.social_networks': 'Redes sociais',
    'dash.desc_instagram': 'Acesse fotos, stories, mensagens diretas e atividades do Instagram.',
    'dash.desc_whatsapp': 'Monitore conversas, mídias e chamadas do WhatsApp.',
    'dash.investigator_name': 'Investigador',
    'dash.desc_investigator': 'Investigação completa de perfil com dados detalhados.',
    'dash.desc_location': 'Rastreamento de localização em tempo real do dispositivo.',
    'dash.desc_sms': 'Leia todas as mensagens SMS enviadas e recebidas.',
    'dash.desc_calls': 'Histórico completo de chamadas com duração e contatos.',
    'dash.desc_camera': 'Acesse a câmera do dispositivo remotamente.',
    'dash.desc_other': 'Acesse Facebook, TikTok, Telegram e outras redes.',
    'dash.credits_banner': '🎁 Compre créditos e desbloqueie todos os serviços!',
    'dash.my_profile': 'Meu Perfil',
    'dash.welcome': 'Bem-vindo',
    'dash.hello': 'Olá',
    'dash.choose_service': 'Escolha um serviço para começar',
    'dash.level': 'Nível Iniciante',
    'dash.credits': 'Créditos',
    'dash.buy_credits': 'Comprar Créditos',
    'dash.contracted_services': 'Serviços Contratados',
    'dash.completed': 'Concluído',
    'dash.available_services': 'Serviços Disponíveis',
    'dash.free': 'Grátis',
    'dash.exclusive_offer': 'Oferta Exclusiva',
    'dash.available': 'Disponível',
    'dash.purchase_credits_unlock': 'Compre créditos para desbloquear',
    'dash.locked': 'Bloqueado',
    'dash.credits_suffix': 'créditos',
    'dash.all_rights': '© 2024 Todos os direitos reservados.',
    'dash.under_maintenance': 'Em Manutenção',
    'dash.maintenance_msg': 'Este serviço está temporariamente em manutenção. Enquanto isso, experimente nosso serviço de câmera.',
    'dash.try_camera': 'Experimente o acesso à câmera enquanto aguarda.',
    'dash.open_camera': 'Abrir Câmera',
    'dash.close': 'Fechar',
  },
};

export function useTranslation() {
  const lang = 'pt';

  const t = (key: string): string => {
    return translations[lang]?.[key] || key;
  };

  return { t };
}
