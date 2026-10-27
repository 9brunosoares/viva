import type { BoardRules } from "./engine";
export const themes = [
  "Química",
  "Ensino Infantil",
  "Praia",
  "Kung Fu",
  "Meu Pet",
  "Espiritismo",
  "Roma",
  "Pagode",
  "Tatuagens",
  "Família",
];
export const names = [
  [
    "Tubo de ensaio rosa",
    "Frasco verde",
    "Molécula",
    "Gota azul",
    "Átomo",
    "Béquer laranja",
  ],
  [
    "Cubo A",
    "Lápis vermelho",
    "Tesoura verde",
    "Paleta",
    "Desenho do sol",
    "Estrela amarela",
  ],
  [
    "Sol sorridente",
    "Concha",
    "Bebida tropical",
    "Guarda-sol",
    "Chinelos",
    "Onda",
  ],
  [
    "Faixa preta",
    "Leque vermelho",
    "Nunchaku",
    "Bastão",
    "Yin-yang",
    "Medalha",
  ],
  [
    "Patinha",
    "Biscoito canino",
    "Bola verde",
    "Coleira vermelha",
    "Osso",
    "Rosto do pet",
  ],
  [
    "Livro aberto",
    "Flor branca",
    "Estrela dourada",
    "Pomba",
    "Coração luminoso",
    "Chama dourada",
  ],
  [
    "Massa italiana",
    "Aperol Spritz",
    "Coluna romana",
    "Fonte",
    "Janela italiana",
    "Lanterna",
  ],
  [
    "Pandeiro",
    "Cavaquinho",
    "Microfone",
    "Nota musical",
    "Bebida com limão",
    "Banquinho",
  ],
  [
    "Lutadora de Kung Fu",
    "Livros ornamentados",
    "Xícara de café",
    "Leoa e filhote",
    "Infinito mãe",
    "Coluna grega",
    "Quadrado de contorno",
  ],
  ["Coração vermelho", "Casa", "Mãos dadas", "Xícara de café", "Flor", "Laço"],
];
export type Level = {
  id: number;
  name: string;
  moves: number;
  targets: { kind: number; amount: number }[];
  powers: number;
  cascades: number;
  difficulty: string;
  rules?: BoardRules;
  character?: string;
};
// Frozen goals/rules for already-saved sessions; completion/book keys stay unchanged.
export const legacyLevels: Level[] = themes.map((name, i) => ({
  id: i + 1,
  name,
  moves: 36 + i * 2,
  targets: (i === 0
    ? [0, 1]
    : i === 1
      ? [1, 5, 3]
      : i === 2
        ? [1, 2]
        : i === 4
          ? [0, 2, 4]
          : i === 5
            ? [0, 1, 2]
            : i === 9
              ? [0, 2, 4]
              : [0, 3]
  ).map((kind) => ({ kind, amount: i === 0 ? 12 : 16 + i })),
  powers: i === 3 || i === 8 ? 1 : 0,
  cascades: i === 7 ? 3 : 0,
  difficulty: i < 3 ? "Suave" : i < 7 ? "Tranquila" : "Moderada",
}));
const profiles = [
  {
    kinds: [0, 1, 2, 3],
    powerTier: 1,
    moves: 28,
    targets: [
      [0, 16],
      [1, 16],
    ],
    powers: 0,
    cascades: 0,
    character: "Primeiras descobertas",
  },
  {
    kinds: [0, 1, 2, 3, 5],
    powerTier: 1,
    moves: 34,
    targets: [
      [1, 15],
      [5, 15],
      [3, 15],
    ],
    powers: 1,
    cascades: 0,
    character: "Organizar as cores",
  },
  {
    kinds: [0, 1, 2, 3, 4],
    powerTier: 1,
    moves: 38,
    targets: [
      [1, 20],
      [2, 20],
    ],
    powers: 1,
    cascades: 2,
    character: "Ondas e linhas",
  },
  {
    kinds: [0, 1, 2, 3, 4, 5],
    powerTier: 2,
    moves: 44,
    targets: [
      [0, 21],
      [4, 21],
    ],
    powers: 3,
    cascades: 0,
    character: "Poderes e concentração",
  },
  {
    kinds: [0, 1, 2, 3, 4],
    powerTier: 2,
    moves: 40,
    targets: [
      [0, 16],
      [2, 16],
      [4, 16],
    ],
    powers: 0,
    cascades: 0,
    character: "Um cantinho de carinho",
  },
  {
    kinds: [0, 1, 2, 3, 4, 5],
    weights: [0.9, 0.9, 1, 1.15, 1.15, 1],
    powerTier: 3,
    moves: 48,
    targets: [
      [0, 20],
      [1, 20],
    ],
    powers: 0,
    cascades: 0,
    character: "Escolhas tranquilas",
  },
  {
    kinds: [0, 1, 2, 3, 4, 5],
    powerTier: 3,
    moves: 48,
    targets: [
      [0, 22],
      [2, 22],
      [4, 22],
    ],
    powers: 2,
    cascades: 0,
    character: "Descobertas especiais",
  },
  {
    kinds: [0, 1, 2, 3, 4],
    powerTier: 3,
    moves: 44,
    targets: [
      [0, 20],
      [1, 20],
    ],
    powers: 0,
    cascades: 5,
    character: "No ritmo das cascatas",
  },
  {
    kinds: [0, 1, 2, 3, 4, 5, 6],
    powerTier: 3,
    moves: 58,
    targets: [
      [0, 20],
      [3, 20],
      [4, 20],
    ],
    powers: 0,
    cascades: 0,
    character: "Histórias na pele",
  },
  {
    kinds: [0, 1, 2, 3, 4, 5],
    powerTier: 3,
    moves: 50,
    targets: [
      [0, 24],
      [2, 24],
      [4, 24],
    ],
    powers: 3,
    cascades: 3,
    character: "Tudo o que aprendemos",
  },
] as const;
export const levels: Level[] = themes.map((name, i) => {
  const p = profiles[i];
  return {
    id: i + 1,
    name,
    moves: p.moves,
    targets: p.targets.map(([kind, amount]) => ({ kind, amount })),
    powers: p.powers,
    cascades: p.cascades,
    difficulty: legacyLevels[i].difficulty,
    character: p.character,
    rules: {
      kinds: p.kinds,
      powerTier: p.powerTier,
      ...("weights" in p ? { weights: p.weights } : {}),
    },
  };
});
export const books = [
  {
    id: 1,
    title: "O Código Da Vinci",
    author: "Dan Brown",
    synopsis:
      "Após um assassinato misterioso no Museu do Louvre, em Paris, o especialista em símbolos Robert Langdon se envolve em uma investigação repleta de enigmas escondidos em obras de arte, documentos históricos e tradições religiosas. Ao lado da criptógrafa Sophie Neveu, ele precisa decifrar pistas que podem revelar um segredo guardado há séculos, enquanto forças perigosas tentam impedi-los.",
  },
  {
    id: 2,
    title: "O Caçador de Pipas",
    author: "Khaled Hosseini",
    synopsis:
      "No Afeganistão, Amir e Hassan crescem juntos, unidos pela infância e pela paixão por pipas, apesar das diferenças sociais que os separam. Um acontecimento doloroso transforma para sempre essa amizade. Anos depois, Amir recebe a oportunidade de enfrentar seu passado. Uma história emocionante sobre culpa, lealdade, perdão e a possibilidade de reparar antigos erros.",
  },
  {
    id: 3,
    title: "A Paciente Silenciosa",
    author: "Alex Michaelides",
    synopsis:
      "Alicia Berenson é uma pintora de sucesso que, após ser acusada de matar o marido, deixa de pronunciar uma única palavra. Seu silêncio transforma o crime em um mistério. Fascinado pelo caso, o psicoterapeuta Theo Faber decide descobrir o que realmente aconteceu. Mas, quanto mais se aproxima da verdade, mais percebe que alguns segredos são perigosos demais para permanecer escondidos.",
  },
  {
    id: 4,
    title: "O Livro dos Espíritos",
    author: "Allan Kardec",
    synopsis:
      "Uma das obras fundamentais do Espiritismo, apresenta 1.019 perguntas e respostas organizadas por Allan Kardec sobre a existência de Deus, a natureza dos espíritos, a vida após a morte, a reencarnação e as leis morais. O livro convida o leitor a refletir sobre a existência humana, a responsabilidade pelas próprias escolhas e a relação entre o mundo material e o espiritual, segundo a doutrina espírita.",
  },
  {
    id: 5,
    title: "Se Houver Amanhã",
    author: "Sidney Sheldon",
    synopsis:
      "Tracy Whitney é uma jovem inteligente e apaixonada, com um futuro aparentemente perfeito. Tudo muda quando ela se torna vítima de uma armação e é presa por um crime que não cometeu. Determinada a reconstruir sua vida e acertar contas com o passado, Tracy mergulha em um universo de disfarces, golpes sofisticados e perigosas disputas de inteligência.",
  },
  {
    id: 6,
    title: "Nosso Lar",
    author: "André Luiz / Francisco Cândido Xavier",
    synopsis:
      "Após sua morte, o médico André Luiz desperta em uma realidade desconhecida, enfrentando medo, sofrimento e muitas perguntas. Ao receber ajuda, é conduzido à colônia espiritual Nosso Lar, onde descobre uma comunidade dedicada ao trabalho, ao aprendizado e à transformação interior. Uma narrativa espírita sobre a continuidade da existência, a solidariedade e as oportunidades de evolução espiritual.",
  },
  {
    id: 7,
    title: "A Biblioteca da Meia-Noite",
    author: "Matt Haig",
    synopsis:
      "Nora Seed sente que sua vida foi marcada por escolhas erradas e oportunidades perdidas. Em um momento de profunda desesperança, ela chega a uma biblioteca extraordinária, onde cada livro permite experimentar uma vida diferente daquela que conhece. Entre caminhos possíveis e sonhos abandonados, Nora começa a descobrir o que realmente importa para encontrar sentido na própria existência.",
  },
  {
    id: 8,
    title: "Verity",
    author: "Colleen Hoover",
    synopsis:
      "A escritora Lowen Ashleigh recebe uma proposta inesperada: terminar a série de livros de Verity Crawford, uma autora famosa impossibilitada de continuar escrevendo após um acidente. Ao pesquisar os manuscritos na casa da família, Lowen encontra um documento perturbador que revela segredos íntimos. Entre a curiosidade, o medo e uma atração inesperada, ela precisa decidir em quem realmente pode confiar.",
  },
  {
    id: 9,
    title: "A Sombra do Vento",
    author: "Carlos Ruiz Zafón",
    synopsis:
      "Na Barcelona de 1945, o jovem Daniel Sempere é levado pelo pai a um lugar secreto chamado Cemitério dos Livros Esquecidos. Ali encontra um romance que mudará sua vida. Fascinado pelo misterioso autor Julián Carax, Daniel começa uma investigação que o conduz por ruas antigas, amores interrompidos e segredos sombrios, descobrindo que algumas histórias nunca permanecem apenas dentro dos livros.",
  },
  {
    id: 10,
    title: "Comer, Rezar, Amar",
    author: "Elizabeth Gilbert",
    synopsis:
      "Depois de um divórcio e de um período de insatisfação pessoal, Elizabeth Gilbert decide viajar sozinha durante um ano em busca de novos significados para sua vida. Na Itália, redescobre os prazeres cotidianos; na Índia, explora a espiritualidade; e na Indonésia, procura equilíbrio e afeto. Um relato autobiográfico sobre recomeços, autoconhecimento e a coragem de construir a própria felicidade.",
  },
];
export const tattooPieces = [
  "warrior",
  "books",
  "coffee",
  "lioness",
  "mother-infinity",
  "ionic-column",
  "outline-square",
] as const;
export const asset = (name: string) => {
  const match = /^tile-9-(\d+)$/.exec(name);
  const path =
    name === "scene-9"
      ? "scenes/tattoo-studio"
      : match
        ? `tattoos/${tattooPieces[Number(match[1])]}`
        : name;
  return `${import.meta.env.BASE_URL}assets/${path}.webp`;
};
