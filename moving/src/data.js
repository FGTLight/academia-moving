export const info = {
  name: 'Academia Moving',
  address: 'Rua Carlos Kehlers, 95 - Centro, Erechim - RS, 99700-400',
  phone: '(54) 99194-8904',
  whatsapp: '5554991948904',
  instagram: 'https://www.instagram.com/aacademiamoving',
  instagramHandle: '@aacademiamoving',
  mapsUrl:
    'https://www.google.com/maps/place/Academia+Moving/@-27.633052,-52.269487,17z/data=!4m6!3m5!1s0x94e3138c43a9f7ad:0x723d81f621b79089',
  embed: 'https://maps.google.com/maps?q=-27.633052,-52.269487&z=17&output=embed',
}

// days: getDay() values (0 = domingo); slots: [abre, fecha] em minutos desde 00:00
export const hours = [
  { label: 'Segunda à quinta', days: [1, 2, 3, 4], text: 'das 06h às 23h', slots: [[360, 1380]] },
  { label: 'Sexta', days: [5], text: 'das 06h às 21:30h', slots: [[360, 1290]] },
  { label: 'Sábado', days: [6], text: 'das 09h às 12h e das 14h às 17h', slots: [[540, 720], [840, 1020]] },
  { label: 'Domingo', days: [0], text: 'Fechado', slots: [] },
]

export const features = [
  { icon: '🏋️', title: 'Equipamentos modernos', text: 'Aparelhos novos e sempre regulados para você treinar com segurança.' },
  { icon: '❄️', title: 'Ambiente climatizado', text: 'Espaço amplo, com bom fluxo de circulação e muito conforto.' },
  { icon: '🤝', title: 'Instrutores prestativos', text: 'Acompanhamento próximo para tirar dúvidas e corrigir a execução.' },
  { icon: '📍', title: 'No centro de Erechim', text: 'Localização de fácil acesso, perto de tudo.' },
]

export const testimonials = [
  { name: 'Brithyo Oliveira', text: 'Moving, melhor academia de Erechim em minha opinião! Frequentei todas as academias da cidade e fiquei na Moving.' },
  { name: 'Darlei Maestri', text: 'Muito bom! Academia boa, bem equipada e climatizada.' },
  { name: 'Cliente Google', text: 'Um ótimo lugar com pessoas agradáveis e aparelhos modernos.' },
]
