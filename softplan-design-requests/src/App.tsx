import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, MonitorPlay, Presentation, Video, ArrowRight, ArrowLeft, CheckCircle2, Send, Sparkles, Palette, Globe, Wrench, Loader2, Copy } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

type Step = 'macro' | 'material' | 'questions' | 'generating' | 'success';
type QuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  condition?: (formData: Record<string, any>, material?: string) => boolean;
}

const MACRO_SUBJECTS = [
  { id: 'grafico', label: 'Gráfico (Impressos)', icon: FileText, available: true, description: 'Materiais físicos, brindes, estandes, etc.' },
  { id: 'digital', label: 'Digital', icon: MonitorPlay, available: true, description: 'Banners, posts, redes sociais, apresentações, etc.' },
  { id: 'identidade_visual', label: 'Identidade Visual', icon: Palette, available: true, description: 'Logos, manuais, KVs, etc.' },
  { id: 'site', label: 'Site', icon: Globe, available: true, description: 'Páginas, landing pages, atualizações.' },
  { id: 'video', label: 'Vídeos', icon: Video, available: true, description: 'Edição, motion graphics, captação.' },
  { id: 'ajustes', label: 'Ajustes', icon: Wrench, available: true, description: 'Ajustes em materiais existentes.' },
];

const MATERIALS_BY_MACRO: Record<string, { id: string, label: string, description?: string }[]> = {
  'grafico': [
    { id: 'Institucionais', label: 'Materiais Institucionais', description: 'Para a sede ou onboarding' },
    { id: 'Folder', label: 'Folder', description: 'Materiais dobráveis informativos' },
    { id: 'Cartaz', label: 'Cartaz', description: 'Posters e cartazes de aviso' },
    { id: 'Evento', label: 'Evento (estande etc)', description: 'Estande, backdrop, balcão, etc.' },
    { id: 'Brindes', label: 'Brindes', description: 'Caneca, ecobag, caderno, etc.' },
    { id: 'Cartão de visita', label: 'Cartão de visita', description: '(Exceção)' },
  ],
  'digital': [
    { id: 'Apresentações', label: 'Apresentações', description: 'PPT de vendas, interno, evento' },
    { id: 'Posts redes sociais', label: 'Posts redes sociais', description: 'Instagram, LinkedIn, etc.' },
    { id: 'Material Rico', label: 'Material Rico', description: 'E-book, planilha, modelo, etc.' },
    { id: 'Banner/Outras imagens', label: 'Banner/Outras imagens', description: 'Banners para web e outras imagens' },
    { id: 'Header/Footer para E-mail', label: 'Header/Footer para E-mail', description: 'Assinaturas e cabeçalhos' },
  ],
  'identidade_visual': [
    { id: 'Logo Simples', label: 'Logo Simples', description: 'Criação de logotipo' },
    { id: 'Manual da marca', label: 'Manual da marca', description: 'Diretrizes visuais da marca' },
    { id: 'Material de Implantação', label: 'Material de Implantação', description: 'Materiais para lançamento' },
    { id: 'KV para Eventos', label: 'KV para Eventos', description: 'Key Visual para eventos' },
    { id: 'Iconografia/Assets', label: 'Iconografia e Assets', description: 'Ícones, ilustrações de suporte, gráficos' },
  ],
  'site': [
    { id: 'Página com dev', label: 'Página com dev (páginas de site)', description: 'Páginas complexas estruturadas no site' },
    { id: 'Página sem dev', label: 'Página sem dev (landing pages)', description: 'LPs em plataformas como RD ou Elementor' },
    { id: 'Atualização de elementos', label: 'Atualização de elementos', description: 'Alterações em páginas existentes' },
  ],
  'video': [
    { id: 'Video tutorial', label: 'Video tutorial', description: 'Tutoriais e passo a passo' },
    { id: 'Video institucional', label: 'Video institucional', description: 'Vídeos corporativos' },
    { id: 'Video Case', label: 'Video Case', description: 'Casos de sucesso' },
    { id: 'Video curto/Reels', label: 'Vídeo curto/Reels', description: 'Vídeos verticais até 1:30s' },
    { id: 'Vinhetas', label: 'Vinhetas', description: 'Introduções animadas' },
    { id: 'Motion Graphic', label: 'Motion Graphic', description: 'Lettering, animações, ilustrações animadas' },
    { id: 'GIFs', label: 'GIFs', description: 'Animações curtas em loop' },
    { id: 'Edição de Webinar/Mesacast', label: 'Edição de Webinar/Mesacast', description: 'Edição de gravação ao vivo' },
  ],
  'ajustes': [
    { id: 'Briefing de Ajuste', label: 'Briefing de Ajuste', description: 'Solicitar alterações em um material' }
  ]
};

const materialsQuestions: Record<string, Question[]> = {
  'Institucionais': [
    { id: 'item_exato', label: 'Qual é o item exato?', type: 'radio', options: ['Crachá', 'Caderno', 'Caneta', 'Adesivo', 'Copo', 'Outro'] },
    { id: 'item_exato_especificar', label: 'Especifique o item:', type: 'text', condition: (data) => data.item_exato === 'Outro' },
    { id: 'quantidade_impressao', label: 'Quantidade para impressão (se houver):', type: 'text' },
    { id: 'acabamento_especial', label: 'Algum acabamento especial? (Ex: Verniz, Laminação, Furo)', type: 'text' },
    { id: 'tamanho_cms', label: 'Qual o tamanho em cms?', type: 'text' },
    { id: 'gabarito', label: 'Você já tem o gabarito/faca do fornecedor ou a equipe de design precisará criar do zero?', type: 'radio', options: ['Já tenho o gabarito', 'Equipe precisa criar do zero'] },
    { id: 'variacao_dados', label: 'Haverá variação de nomes/dados na impressão?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'tipo_impressao', label: 'Impressão em CMYK ou Pantone?', type: 'radio', options: ['CMYK', 'Pantone', 'Ainda não sei'] },
  ],
  'Folder': [
    { id: 'formato_entrega', label: 'Digital/Impresso ou os dois?', type: 'radio', options: ['Digital', 'Impresso', 'Os dois'] },
    { id: 'formato_aberto', label: 'Qual o formato aberto?', type: 'radio', options: ['A4', 'A3', 'Ofício', 'Outro'] },
    { id: 'formato_aberto_especificar', label: 'Especifique o formato:', type: 'text', condition: (data) => data.formato_aberto === 'Outro' },
    { id: 'num_paginas_faces', label: 'Número de páginas ou faces:', type: 'text' },
    { id: 'dobras', label: 'Quantas dobras?', type: 'radio', options: ['Sem dobra', '1 dobra (vincado ao meio)', '2 dobras (sanfona)', 'Carteira', 'Outro'] },
    { id: 'dobras_especificar', label: 'Especifique as dobras:', type: 'text', condition: (data) => data.dobras === 'Outro' },
  ],
  'Cartaz': [
    { id: 'tamanho_final', label: 'Qual o tamanho final da impressão?', type: 'radio', options: ['A5', 'A4', 'A3', '50x70cm', 'Outro'] },
    { id: 'tamanho_final_especificar', label: 'Especifique o tamanho:', type: 'text', condition: (data) => data.tamanho_final === 'Outro' },
    { id: 'info_destaque', label: 'Qual é a informação principal de leitura rápida que deve estar em destaque?', type: 'textarea' },
  ],
  'Evento': [
    { id: 'pecas_necessarias', label: 'Quais são as peças necessárias?', type: 'checkbox', options: ['Backdrop', 'Balcão', 'Testeira', 'Totem', 'Outro'] },
    { id: 'pecas_necessarias_especificar', label: 'Especifique as peças:', type: 'text', condition: (data) => data.pecas_necessarias?.includes('Outro') },
    { id: 'motivo_evento', label: 'Porque estamos indo ao evento?', type: 'select', options: ['Expansão de território', 'Institucional', 'Defesa de castelo', 'Posicionamento', 'Endomarketing', 'Venda de produto', 'Outro'] },
    { id: 'motivo_evento_especificar', label: 'Especifique o motivo:', type: 'text', condition: (data) => data.motivo_evento === 'Outro' },
    { id: 'tamanho_pecas', label: 'Qual o tamanho das peças?', type: 'textarea' },
    { id: 'precisa_mockup_evento', label: 'Precisamos de mockup com a arte aplicada?', type: 'radio', options: ['Sim', 'Não'] },
  ],
  'Brindes': [
    { id: 'objeto', label: 'Qual é o objeto?', type: 'radio', options: ['Caneca', 'Squeeze', 'Ecobag', 'Copo', 'Moleskine', 'Bloquinho', 'Outro'] },
    { id: 'outro_objeto', label: 'Especifique o brinde:', type: 'text', condition: (data) => data.objeto === 'Outro' },
    { id: 'mockup', label: 'Precisa de mockup com a arte aplicada?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'medidas', label: 'Quais são as medidas/formato específico?', type: 'text' },
    { id: 'logo_aplicado_brinde', label: 'Precisa de logo aplicado?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'frase_especifica_brinde', label: 'Precisa ter alguma frase específica nesse brinde?', type: 'textarea' },
  ],
  'Cartão de visita': [
    { id: 'nome_cartao', label: 'Qual o nome deve aparecer no cartão? Ex: Nome e o último sobrenome.', type: 'text' },
    { id: 'cargo', label: 'Qual é o seu cargo?', type: 'text' },
    { id: 'telefone', label: 'Qual telefone corporativo?', type: 'text' },
    { id: 'email', label: 'Qual e-mail corporativo?', type: 'text' },
    { id: 'quantidade_cartao', label: 'Quantidade para impressão:', type: 'text' },
    { id: 'acabamento_cartao', label: 'Acabamento (Ex: Laminação Fosca, Verniz Localizado):', type: 'text' },
    { id: 'qrcode_whatsapp', label: 'Você quer que o seu cartão tenha um QR Code para o seu WhatsApp?', type: 'radio', options: ['Sim', 'Não'] },
  ],
  'Apresentações': [
    { id: 'objetivo_ppt', label: 'Qual o objetivo dessa demanda?', type: 'radio', options: ['Vendas', 'Interno', 'Evento', 'Outro'] },
    { id: 'objetivo_ppt_especificar', label: 'Especifique o objetivo:', type: 'text', condition: (data) => data.objetivo_ppt === 'Outro' },
    { id: 'tipo_template', label: 'O template já existe ou precisa criar um novo?', type: 'radio', options: ['Template existente', 'Novo template'] },
    { id: 'num_slides', label: 'Número estimado de slides:', type: 'text' },
    { id: 'visual_ppt', label: 'Qual o estilo visual?', type: 'radio', options: ['Institucional Softplan', '1Doc', 'Softplan com produtos Saas'] },
    { id: 'formato_ppt', label: 'Qual o formato de entrega?', type: 'radio', options: ['Editável', 'Imagens no PPT'] },
  ],
  'Posts redes sociais': [
    { id: 'canal_post', label: 'Para qual canal?', type: 'checkbox', options: ['Instagram', 'LinkedIn', 'Facebook', 'YouTube', 'Outro'] },
    { id: 'canal_post_especificar', label: 'Especifique o canal:', type: 'text', condition: (data) => data.canal_post?.includes('Outro') },
    { 
      id: 'tipo_post_social', 
      label: 'Tipo de post:', 
      type: 'radio', 
      options: ['Post Único', 'Carrossel/Série'],
      condition: (data) => {
        const canais = data.canal_post || [];
        return canais.some((c: string) => ['Instagram', 'LinkedIn', 'Facebook', 'Outro'].includes(c));
      }
    },
    { 
      id: 'tamanho_instagram', 
      label: 'Tamanhos para Instagram:', 
      type: 'checkbox', 
      options: ['Feed Quadrado (1080x1080)', 'Feed Vertical (1080x1350)', 'Stories/Reels (1080x1920)', 'Outro'],
      condition: (data) => data.canal_post?.includes('Instagram')
    },
    { id: 'tamanho_instagram_especificar', label: 'Especifique o tamanho:', type: 'text', condition: (data) => data.tamanho_instagram?.includes('Outro') && data.canal_post?.includes('Instagram') },
    { 
      id: 'tamanho_facebook', 
      label: 'Tamanhos para Facebook (Meta Ads):', 
      type: 'checkbox', 
      options: ['Imagem Quadrada (1080x1080)', 'Imagem Horizontal (1200x628)', 'Stories/Reels (1080x1920)', 'Outro'],
      condition: (data) => data.canal_post?.includes('Facebook')
    },
    { id: 'tamanho_facebook_especificar', label: 'Especifique o tamanho:', type: 'text', condition: (data) => data.tamanho_facebook?.includes('Outro') && data.canal_post?.includes('Facebook') },
    { 
      id: 'tamanho_linkedin', 
      label: 'Tamanhos para LinkedIn:', 
      type: 'checkbox', 
      options: ['Post de Imagem (1200x627)', 'Post Quadrado (1080x1080)', 'Banner de Perfil (1584x396)', 'Outro'],
      condition: (data) => data.canal_post?.includes('LinkedIn')
    },
    { id: 'tamanho_linkedin_especificar', label: 'Especifique o tamanho:', type: 'text', condition: (data) => data.tamanho_linkedin?.includes('Outro') && data.canal_post?.includes('LinkedIn') },
    { 
      id: 'tamanho_youtube', 
      label: 'Tamanhos para YouTube (Thumbs de vídeos):', 
      type: 'checkbox', 
      options: ['Thumbnail Padrão (1280x720)', 'Banner do Canal (2560x1440)', 'Outro'],
      condition: (data) => data.canal_post?.includes('YouTube')
    },
    { id: 'tamanho_youtube_especificar', label: 'Especifique o tamanho:', type: 'text', condition: (data) => data.tamanho_youtube?.includes('Outro') && data.canal_post?.includes('YouTube') },
    { 
      id: 'tamanho_outro_canal', 
      label: 'Especifique o tamanho para o outro canal:', 
      type: 'text', 
      condition: (data) => data.canal_post?.includes('Outro')
    },
  ],
  'Material Rico': [
    { id: 'tipo_material_rico', label: 'Qual o tipo de material rico?', type: 'radio', options: ['E-book', 'Planilha', 'Modelo', 'Outro'] },
    { id: 'tipo_material_rico_especificar', label: 'Especifique o tipo:', type: 'text', condition: (data) => data.tipo_material_rico === 'Outro' },
    { id: 'num_paginas_estimado', label: 'Número estimado de páginas:', type: 'text' },
    { id: 'formato_material_rico', label: 'Algum formato específico? Ex: A4', type: 'text' },
  ],
  'Banner/Outras imagens': [
    { id: 'formato_banner', label: 'Algum formato específico?', type: 'text' },
  ],
  'Header/Footer para E-mail': [
    { id: 'conteudo_email', label: 'Qual o tipo de conteúdo?', type: 'radio', options: ['Imagem', 'Apenas texto'] },
    { id: 'tamanho_email', label: 'Tamanho em pixels (largura e altura)', type: 'text' },
  ],
  'Manual da marca': [
    { id: 'marca_existe', label: 'A marca/logo já existe?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'tipo_manual', label: 'Qual o tipo de manual?', type: 'radio', options: ['Básico (apenas logo, cores e fontes)', 'Completo (com aplicações gráficas, tom de voz, texturas)'] },
    { id: 'pontos_contato', label: 'Quais os pontos de contato imediatos que precisam ser criados?', type: 'checkbox', options: ['Assinatura de e-mail', 'Avatar de redes sociais', 'Papel timbrado', 'Nenhum', 'Outro'] },
    { id: 'pontos_contato_especificar', label: 'Especifique os pontos de contato:', type: 'text', condition: (data) => data.pontos_contato?.includes('Outro') },
  ],
  'Material de Implantação': [
    { id: 'marca_existe', label: 'A marca/logo já existe?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'tipo_manual', label: 'Qual o tipo de manual?', type: 'radio', options: ['Básico (apenas logo, cores e fontes)', 'Completo (com aplicações gráficas, tom de voz, texturas)'] },
    { id: 'pontos_contato', label: 'Quais os pontos de contato imediatos que precisam ser criados?', type: 'checkbox', options: ['Assinatura de e-mail', 'Avatar de redes sociais', 'Papel timbrado', 'Nenhum', 'Outro'] },
    { id: 'pontos_contato_impl_especificar', label: 'Especifique os pontos de contato:', type: 'text', condition: (data) => data.pontos_contato?.includes('Outro') },
  ],
  'Logo Simples': [
    { id: 'cores_preferencia', label: 'Preferência de cores:', type: 'text' },
    { id: 'detalhes_logo', label: 'Por favor, descreva os detalhes para a criação do logo:', type: 'textarea' }
  ],
  'KV para Eventos': [
    { id: 'detalhes_kv', label: 'Por favor, descreva os detalhes para a criação do KV:', type: 'textarea' }
  ],
  'Iconografia/Assets': [
    { id: 'tipo_asset', label: 'O que precisa ser criado?', type: 'checkbox', options: ['Ícones', 'Ilustrações', 'Gráficos', 'Outro'] },
    { id: 'tipo_asset_especificar', label: 'Especifique:', type: 'text', condition: (data) => data.tipo_asset?.includes('Outro') },
    { id: 'quantidade_assets', label: 'Quantidade estimada:', type: 'text' },
    { id: 'detalhes_assets', label: 'Detalhes adicionais:', type: 'textarea' }
  ],
  'Página com dev': [
    { id: 'objetivo_pagina', label: 'Qual o objetivo dessa demanda?', type: 'radio', options: ['Produto', 'Evento', 'Conteúdo', 'Outro'] },
    { id: 'objetivo_pagina_especificar', label: 'Especifique o objetivo:', type: 'text', condition: (data) => data.objetivo_pagina === 'Outro' },
    { id: 'acao_principal', label: 'Qual ação principal o usuário deve realizar?', type: 'textarea' },
    { id: 'conteudos_prontos', label: 'Quais conteúdos já estão prontos?', type: 'textarea' },
  ],
  'Página sem dev': [
    { id: 'plataforma_lp', label: 'Em qual plataforma iremos criar a LP?', type: 'radio', options: ['RD Station', 'Elementor', 'Outra'] },
    { id: 'plataforma_lp_especificar', label: 'Especifique a plataforma:', type: 'text', condition: (data) => data.plataforma_lp === 'Outra' },
    { id: 'objetivo_pagina', label: 'Qual o objetivo dessa demanda?', type: 'radio', options: ['Produto', 'Evento', 'Conteúdo', 'Outro'] },
    { id: 'objetivo_pagina_lp_especificar', label: 'Especifique o objetivo:', type: 'text', condition: (data) => data.objetivo_pagina === 'Outro' },
    { id: 'acao_principal', label: 'Qual ação principal o usuário deve realizar?', type: 'textarea' },
    { id: 'conteudos_prontos', label: 'Quais conteúdos já estão prontos?', type: 'textarea' },
  ],
  'Atualização de elementos': [
    { id: 'o_que_mudar', label: 'O que exatamente deve mudar?', type: 'textarea' },
  ],
  'Video tutorial': [
    { id: 'formato_video', label: 'Qual o formato?', type: 'checkbox', options: ['Vertical', 'Horizontal', 'Quadrado'] },
    { id: 'duracao_estimada', label: 'Duração estimada (em segundos/minutos):', type: 'text' },
    { id: 'necessita_locucao', label: 'Necessita de locução?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'detalhes_video', label: 'Por favor, descreva os detalhes adicionais para a criação do vídeo:', type: 'textarea' }
  ],
  'Video institucional': [
    { id: 'formato_video', label: 'Qual o formato?', type: 'checkbox', options: ['Vertical', 'Horizontal', 'Quadrado'] },
    { id: 'duracao_estimada', label: 'Duração estimada (em segundos/minutos):', type: 'text' },
    { id: 'necessita_locucao', label: 'Necessita de locução?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'detalhes_video', label: 'Por favor, descreva os detalhes adicionais para a criação do vídeo:', type: 'textarea' }
  ],
  'Video Case': [
    { id: 'formato_video', label: 'Qual o formato?', type: 'checkbox', options: ['Vertical', 'Horizontal', 'Quadrado'] },
    { id: 'duracao_estimada', label: 'Duração estimada (em segundos/minutos):', type: 'text' },
    { id: 'necessita_locucao', label: 'Necessita de locução?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'detalhes_video', label: 'Por favor, descreva os detalhes adicionais para a criação do vídeo:', type: 'textarea' }
  ],
  'Video curto/Reels': [
    { id: 'formato_video', label: 'Qual o formato?', type: 'checkbox', options: ['Vertical (9:16)', 'Quadrado (1:1)', 'Outro'] },
    { id: 'duracao_estimada', label: 'Duração estimada (em segundos):', type: 'text' },
    { id: 'necessita_locucao', label: 'Necessita de locução?', type: 'radio', options: ['Sim', 'Não'] },
    { id: 'detalhes_video', label: 'Por favor, descreva os detalhes adicionais para a criação do vídeo:', type: 'textarea' }
  ],
  'Vinhetas': [
    { id: 'duracao_vinheta', label: 'Duração estimada (segundos):', type: 'text' },
    { id: 'detalhes_vinheta', label: 'Detalhes da animação:', type: 'textarea' }
  ],
  'Motion Graphic': [
    { id: 'tipo_motion', label: 'Tipo de animação:', type: 'radio', options: ['Lettering', 'Ilustrações', 'Outro'] },
    { id: 'duracao_motion', label: 'Duração estimada:', type: 'text' },
    { id: 'detalhes_motion', label: 'Detalhes da animação:', type: 'textarea' }
  ],
  'GIFs': [
    { id: 'formato_gif', label: 'Formato/Tamanho:', type: 'text' },
    { id: 'detalhes_gif', label: 'O que deve ser animado?', type: 'textarea' }
  ],
  'Edição de Webinar/Mesacast': [
    { id: 'link_bruto', label: 'Link para o material bruto:', type: 'text' },
    { id: 'cortes_necessarios', label: 'Quais cortes/edições são necessários?', type: 'textarea' },
    { id: 'inserir_elementos', label: 'Precisa inserir letreiros, vinhetas ou GC?', type: 'textarea' }
  ],
  'Briefing de Ajuste': [
    { id: 'material_ajuste', label: 'Qual material precisa de ajuste?', type: 'text' },
    { id: 'tipo_ajuste', label: 'Qual tipo de ajuste precisa ser feito?', type: 'checkbox', options: ['Texto', 'Visual', 'Imagem', 'Atualização de informação', 'Outro'] },
    { id: 'tipo_ajuste_especificar', label: 'Especifique o ajuste:', type: 'text', condition: (data) => data.tipo_ajuste?.includes('Outro') },
    { id: 'o_que_mudar_exatamente', label: 'O que exatamente precisa mudar?', type: 'textarea' }
  ]
};

const GENERAL_QUESTIONS: Question[] = [
  { 
    id: 'copy_projeto', 
    label: 'Copy (texto) para o projeto:', 
    type: 'textarea',
    condition: (_, material) => material !== 'Brindes'
  },
  { 
    id: 'onde_veiculado', 
    label: 'Onde o material será veiculado/disponibilizado?', 
    type: 'textarea',
    condition: (_, material) => material !== 'Brindes' && material !== 'Posts redes sociais' && material !== 'Evento'
  },
  { id: 'produto_vertical', label: 'Qual produto/vertical?', type: 'text' },
  { id: 'arquivos_apoio', label: 'Link para arquivos de apoio (Drive, Dropbox, etc):', type: 'text' },
  { id: 'referencia', label: 'Referência?', type: 'textarea' },
  { id: 'objetivo', label: 'Qual o objetivo dessa demanda?', type: 'textarea' }
];

const getSLA = (material: string, data: any): string => {
  switch (material) {
    case 'Logo Simples': return '2 a 3 dias úteis';
    case 'Manual da marca': return '7 a 10 dias úteis';
    case 'Material de Implantação': return 'Até 20 dias úteis';
    case 'KV para Eventos': return '5 a 10 dias úteis';
    case 'Iconografia/Assets': return '2 a 5 dias úteis';
    
    case 'Institucionais': return '2 a 4 dias úteis';
    case 'Folder': 
      if (data.formato_entrega === 'Digital') return '2 a 3 dias úteis';
      if (data.formato_entrega === 'Impresso') return '4 a 5 dias úteis';
      return '4 a 5 dias úteis';
    case 'Cartaz': return '3 a 5 dias úteis';
    case 'Evento': return '3 a 7 dias úteis (a contar do recebimento dos tamanhos)';
    case 'Brindes': return '3 a 5 dias úteis';
    case 'Cartão de visita': return '2 a 3 dias úteis';
    
    case 'Apresentações':
      if (data.objetivo_ppt === 'Vendas') return '7 a 10 dias úteis (Pitch de vendas)';
      if (data.tipo_template === 'Novo template') return '5 a 7 dias úteis';
      if (data.tipo_template === 'Template existente') return '2 a 4 dias úteis';
      return '2 a 7 dias úteis';
      
    case 'Posts redes sociais':
      if (data.tipo_post_social === 'Carrossel/Série') return '2 a 5 dias úteis';
      return '2 a 3 dias úteis';
      
    case 'Material Rico': return '3 a 6 dias úteis';
    case 'Banner/Outras imagens': return '1 a 2 dias úteis';
    case 'Header/Footer para E-mail': return '1 a 2 dias úteis';
    
    case 'Página com dev': return '5 a 10 dias úteis';
    case 'Página sem dev': return '3 a 5 dias úteis';
    case 'Atualização de elementos': return '1 a 3 dias úteis';
    
    case 'Video tutorial': return '2 a 5 dias úteis';
    case 'Video institucional': return '5 a 10 dias úteis';
    case 'Video Case': return '4 a 8 dias úteis';
    case 'Video curto/Reels': return '2 a 4 dias úteis';
    case 'Vinhetas': return '2 a 4 dias úteis';
    case 'Motion Graphic': return '2 a 14 dias úteis';
    case 'GIFs': return '1 a 3 dias úteis';
    case 'Edição de Webinar/Mesacast': return '4 a 5 dias úteis';
    
    case 'Briefing de Ajuste': return 'Depende da complexidade (geralmente igual ao SLA original)';
    
    default: return 'Prazo a ser definido';
  }
};

export default function App() {
  const [step, setStep] = useState<Step>('macro');
  const [macroSubject, setMacroSubject] = useState<string>('');
  const [material, setMaterial] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [finalBriefing, setFinalBriefing] = useState<string>('');

  const generateBriefing = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sla = getSLA(material, formData);
      const prompt = `Você é um gestor de projetos de design experiente. 
Com base nas seguintes respostas do formulário para uma demanda de design:
${JSON.stringify(formData, null, 2)}

O produto/vertical selecionado foi: "${formData['produto_vertical']}".
O material solicitado foi: "${material}".
Prazo Estimado (SLA): ${sla}

Por favor, acesse os seguintes documentos para obter contexto:
1. Personas e Dores: https://docs.google.com/document/d/1N4_XAsRFWrDFl9UEhnXHOQNEEDPz4OI41ZeDT-_VmKU/edit?tab=t.0

Busque as informações sobre Personas, Dores e Público Alvo correspondentes a este produto/vertical no documento 1.

Gere um Briefing Final completo, extremamente bem estruturado, limpo e fácil de ler em Markdown.
Use formatação elegante com títulos (##, ###), listas (bullets) e negrito para destacar informações chave. Não use blocos de código para o texto.

**IMPORTANTE SOBRE A COPY:** Se houver um campo "copy_projeto", você deve transcrevê-lo INTEGRALMENTE na seção correspondente. NÃO altere o conteúdo, tom de voz ou estrutura do texto. A ÚNICA alteração permitida é a correção de erros óbvios de português (ortografia) e pontuação, mantendo a fidelidade total ao que foi escrito pelo usuário.

Estrutura obrigatória do Briefing:
## ⏱️ Prazo Estimado (SLA)
${sla}

## 📋 Resumo da Demanda
(Organize as respostas do formulário de forma clara e direta, agrupando informações semelhantes)

## ✍️ Copy do Projeto
(Transcreva aqui a "copy_projeto" enviada, aplicando APENAS correções de português e pontuação, sem alterar o sentido ou o texto original)

## 🎯 Público-Alvo e Personas
(Extraídos do documento com base no produto/vertical. Detalhe quem é o público e as personas de forma resumida e objetiva)

## 💔 Dores do Público
(Extraídas do documento. Quais problemas esse material deve ajudar a resolver?)

## 💡 Recomendações para o Design
(Suas recomendações como especialista de design para este material específico, considerando o formato, objetivo e público)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
        }
      });

      setFinalBriefing(response.text || "Não foi possível gerar o briefing.");
      setStep('success');
    } catch (err) {
      console.error(err);
      setFinalBriefing("Houve um erro ao gerar o briefing com a IA. Por favor, revise as informações e tente novamente.");
      setStep('success');
    }
  };

  const handleNext = async () => {
    if (step === 'macro' && macroSubject) setStep('material');
    else if (step === 'material' && material) setStep('questions');
    else if (step === 'questions') {
      setStep('generating');
      await generateBriefing();
    }
  };

  const handleBack = () => {
    if (step === 'material') setStep('macro');
    else if (step === 'questions') setStep('material');
    else if (step === 'success') {
      setStep('macro');
      setMacroSubject('');
      setMaterial('');
      setFormData({});
      setFinalBriefing('');
    }
  };

  const handleChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const currentQuestions = material 
    ? [...(materialsQuestions[material] || []), ...GENERAL_QUESTIONS].filter(q => !q.condition || q.condition(formData, material))
    : [];

  const isQuestionsValid = currentQuestions?.every(q => {
    const val = formData[q.id];
    if (q.type === 'checkbox') {
      return Array.isArray(val) && val.length > 0;
    }
    return val !== undefined && val !== '';
  });

  const renderQuestion = (q: Question) => {
    switch (q.type) {
      case 'text':
        return (
          <input 
            type="text" 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
            placeholder={q.placeholder || "Sua resposta..."}
            value={formData[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all min-h-[120px] resize-y"
            placeholder={q.placeholder || "Sua resposta..."}
            value={formData[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
          />
        );
      case 'radio':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options?.map(opt => (
              <label 
                key={opt} 
                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${formData[q.id] === opt ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              >
                <input 
                  type="radio" 
                  name={q.id} 
                  value={opt} 
                  checked={formData[q.id] === opt} 
                  onChange={(e) => handleChange(q.id, e.target.value)} 
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600" 
                />
                <span className={`ml-3 text-sm font-medium ${formData[q.id] === opt ? 'text-blue-900' : 'text-slate-700'}`}>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options?.map(opt => {
              const isChecked = Array.isArray(formData[q.id]) && formData[q.id].includes(opt);
              return (
                <label 
                  key={opt} 
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${isChecked ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <input 
                    type="checkbox" 
                    name={q.id} 
                    value={opt} 
                    checked={isChecked} 
                    onChange={(e) => {
                      const currentValues = Array.isArray(formData[q.id]) ? formData[q.id] : [];
                      if (e.target.checked) {
                        handleChange(q.id, [...currentValues, opt]);
                      } else {
                        handleChange(q.id, currentValues.filter((v: string) => v !== opt));
                      }
                    }} 
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600" 
                  />
                  <span className={`ml-3 text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-slate-700'}`}>{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case 'select':
        return (
          <select 
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all bg-white"
            value={formData[q.id] || ''}
            onChange={(e) => handleChange(q.id, e.target.value)}
          >
            <option value="" disabled>Selecione uma opção...</option>
            {q.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
    }
  };

  const stepIndex = ['macro', 'material', 'questions', 'success'].indexOf(step);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://res.cloudinary.com/drvtrbeky/image/upload/q_auto/f_auto/v1775486507/Cinza_lakfmo.png" 
              alt="Logo" 
              className="h-8" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Portal de Demandas de Design
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {step !== 'success' && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(stepIndex / 2) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
              
              {['Assunto', 'Material', 'Detalhes'].map((label, i) => {
                const isActive = i <= stepIndex;
                const isCurrent = i === stepIndex;
                return (
                  <div key={label} className="relative flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 z-10 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-200 text-slate-500'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-medium absolute -bottom-6 whitespace-nowrap ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 'macro' && (
              <motion.div
                key="macro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">O que você precisa?</h2>
                  <p className="text-slate-500 mt-1">Selecione a categoria principal da sua demanda.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MACRO_SUBJECTS.map((subject) => {
                    const Icon = subject.icon;
                    return (
                      <button
                        key={subject.id}
                        onClick={() => {
                          if (subject.available) {
                            setMacroSubject(subject.id);
                            setStep('material');
                          }
                        }}
                        disabled={!subject.available}
                        className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 group relative overflow-hidden
                          ${!subject.available ? 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50' : 
                            macroSubject === subject.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${macroSubject === subject.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'} transition-colors`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{subject.label}</h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{subject.description}</p>
                          </div>
                        </div>
                        {!subject.available && (
                          <div className="absolute top-4 right-4 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            Em breve
                          </div>
                        )}
                        {macroSubject === subject.id && (
                          <div className="absolute top-4 right-4 text-blue-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 'material' && (
              <motion.div
                key="material"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <button onClick={handleBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Qual o material?</h2>
                  <p className="text-slate-500 mt-1">Selecione o tipo específico de material que você precisa.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(MATERIALS_BY_MACRO[macroSubject] || []).map((mat) => (
                    <button
                      key={mat.id}
                      onClick={() => {
                        setMaterial(mat.id);
                        setStep('questions');
                      }}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1
                        ${material === mat.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                        }`}
                    >
                      <span className="font-semibold text-slate-900">{mat.label}</span>
                      {mat.description && <span className="text-xs text-slate-500">{mat.description}</span>}
                    </button>
                  ))}
                </div>

                <div className="pt-6 flex justify-start items-center">
                  <button
                    onClick={handleBack}
                    className="text-slate-500 font-medium hover:text-slate-900 transition-colors px-4 py-2"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'questions' && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <button onClick={handleBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Detalhes do pedido</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{material}</span>
                  </div>
                  <p className="text-slate-500 mt-1">Preencha as informações abaixo para que a equipe possa iniciar o trabalho.</p>
                </div>

                <div className="space-y-8">
                  {currentQuestions.map((q, index) => (
                    <motion.div 
                      key={q.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-3"
                    >
                      <label className="block text-sm font-semibold text-slate-800">
                        {q.label}
                      </label>
                      {renderQuestion(q)}
                    </motion.div>
                  ))}
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Prazo Estimado (SLA)</span>
                    <span className="text-sm font-medium text-slate-900">{getSLA(material, formData)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleBack}
                      className="text-slate-500 font-medium hover:text-slate-900 transition-colors px-4 py-2"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!isQuestionsValid}
                      className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                    >
                      <Send className="w-4 h-4" />
                      Enviar Demanda
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-24 text-center flex flex-col items-center justify-center"
              >
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Gerando Briefing com IA...</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  Aguarde enquanto analisamos o produto/vertical e buscamos as informações de personas e dores no documento de contexto.
                </p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: "spring" }}
                className="py-12 text-center flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Demanda enviada!</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  Sua solicitação de <strong>{material}</strong> foi encaminhada com sucesso para a equipe de design da Softplan.
                </p>
                
                <div className="bg-white rounded-2xl p-8 sm:p-10 w-full max-w-4xl text-left mb-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-2xl tracking-tight flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-blue-600" />
                      Briefing do Projeto
                    </h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(finalBriefing);
                        alert('Briefing copiado para a área de transferência!');
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto justify-center"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar Briefing
                    </button>
                  </div>

                  <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-blue-600 prose-li:text-slate-600 marker:text-blue-500">
                    <ReactMarkdown>{finalBriefing}</ReactMarkdown>
                  </div>
                </div>

                <button
                  onClick={handleBack}
                  className="text-slate-500 font-medium hover:text-slate-900 transition-colors"
                >
                  Abrir nova demanda
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
