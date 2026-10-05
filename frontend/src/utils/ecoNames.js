// Generador temático de identidades incógnitas e intereses para el Eco de Sófocles
// Basado en mitología griega, filósofos, grandes pintores/pintoras (sin Frida Kahlo) y arquitectos legendarios

export const NOMBRES_FEMENINOS = [
  // Diosas y figuras míticas
  'Atenea',
  'Artemisa',
  'Perséfone',
  'Hestia',
  'Deméter',
  'Selene',
  'Hebe',
  'Nix',
  'Némesis',
  // Filósofas y sabias clásicas
  'Hipatia de Alejandría',
  'Safo de Lesbos',
  'Diotima de Mantinea',
  'Arete de Cirene',
  'Aspasia de Mileto',
  // Pintoras y escultoras históricas (excluyendo estrictamente a Frida Kahlo)
  'Artemisia Gentileschi',
  'Sofonisba Anguissola',
  'Hilma af Klint',
  'Élisabeth Vigée Le Brun',
  'Mary Cassatt',
  'Berthe Morisot',
  'Lavinia Fontana',
  'Rosa Bonheur',
  'Camille Claudel',
  'Clara Peeters',
  // Arquitectas pioneras
  'Zaha Hadid',
  'Eileen Gray',
  'Marion Mahony Griffin',
  'Lilly Reich'
];

export const NOMBRES_MASCULINOS = [
  // Dioses y titanes griegos
  'Apolo',
  'Hermes',
  'Hefesto',
  'Dionisio',
  'Ares',
  'Poseidón',
  'Cronos',
  'Prometeo',
  // Filósofos clásicos
  'Sócrates',
  'Platón',
  'Aristóteles',
  'Epicuro',
  'Zenón de Citio',
  'Heráclito de Éfeso',
  'Pitágoras',
  'Diógenes el Cínico',
  // Pintores célebres
  'Leonardo da Vinci',
  'Caravaggio',
  'Miguel Ángel',
  'Rembrandt',
  'Rafael Sanzio',
  'Diego Velázquez',
  'Johannes Vermeer',
  'Francisco de Goya',
  // Arquitectos legendarios
  'Fidias',
  'Ictino',
  'Calícrates',
  'Filippo Brunelleschi',
  'Vitruvio',
  'Antoni Gaudí',
  'Andrea Palladio',
  'Le Corbusier'
];

export const NOMBRES_NEUTROS = [
  'Oráculo de Delfos',
  'Fénix de Tebas',
  'Esfinge del Ágora',
  'Quimera Alada',
  'Titán de Éter',
  'Cosmos Primordial',
  'Bóreas del Norte',
  'Céfiro del Crepúsculo',
  'Eco de Heliconia'
];

const EPITETOS = [
  'de la Penumbra',
  'del Ágora',
  'del Olimpo',
  'en Claroscuro',
  'de las Sombras',
  'de la Aurora',
  'del Laberinto',
  'de la Concordia'
];

const MASCARAS = ['🎭', '🏛️', '🎨', '📐', '📜', '✨', '🏺', '🦉'];

// Tópicos oficiales de intereses del Ágora
export const TOPICOS_INTERESES = [
  { id: 'filosofia', label: 'Filosofía Clásica', icono: '🏛️' },
  { id: 'pintura', label: 'Pintura y Bellas Artes', icono: '🎨' },
  { id: 'arquitectura', label: 'Arquitectura y Espacio', icono: '📐' },
  { id: 'poesia', label: 'Poesía y Tragedia', icono: '📜' },
  { id: 'historia', label: 'Historia Antigua', icono: '🏺' },
  { id: 'etica', label: 'Ética y Moral', icono: '⚖️' },
  { id: 'debate', label: 'Debate Dialéctico', icono: '🗣️' },
  { id: 'cosmologia', label: 'Cosmología y Astronomía', icono: '🌌' },
  { id: 'literatura', label: 'Literatura Universal', icono: '📖' },
  { id: 'politica', label: 'Filosofía Política', icono: '🗳️' },
  { id: 'musica', label: 'Armonía y Música', icono: '🎵' },
  { id: 'psicologia', label: 'Psicología y Mente', icono: '🧠' },
  { id: 'ciencia', label: 'Ciencia y Epistemología', icono: '🔬' },
  { id: 'cine', label: 'Cine de Autor', icono: '🎬' },
  { id: 'escultura', label: 'Escultura en Mármol', icono: '🗿' },
  { id: 'matematicas', label: 'Geometría y Números', icono: '🔢' },
  { id: 'mitologia', label: 'Mitos y Arquetipos', icono: '⚡' },
  { id: 'teatro', label: 'Dramaturgia Griega', icono: '🎭' }
];

export const MIN_INTERESES_ECO = 6;

export function interesesEcoValidos(intereses = []) {
  return Array.isArray(intereses) && new Set(intereses).size >= MIN_INTERESES_ECO;
}

export function generarIdentidadEco(genero = 'masculino') {
  let pool;
  if (genero === 'femenino') {
    pool = NOMBRES_FEMENINOS;
  } else if (genero === 'neutro') {
    pool = NOMBRES_NEUTROS;
  } else {
    pool = NOMBRES_MASCULINOS;
  }

  const baseNombre = pool[Math.floor(Math.random() * pool.length)];
  const epiteto = Math.random() > 0.4 ? ` ${EPITETOS[Math.floor(Math.random() * EPITETOS.length)]}` : '';
  const mascara = MASCARAS[Math.floor(Math.random() * MASCARAS.length)];

  return {
    genero,
    nombreBase: baseNombre,
    alias: `${baseNombre}${epiteto}`,
    mascara,
    fechaAsignacion: new Date().toISOString()
  };
}

// Algoritmo de compatibilidad dialéctica (Jaccard similarity ponderada)
export function calcularCompatibilidadDialectica(interesesA = [], interesesB = []) {
  if (!interesesA.length || !interesesB.length) return 50;
  const setA = new Set(interesesA);
  const setB = new Set(interesesB);
  let comunes = 0;
  for (const item of setA) {
    if (setB.has(item)) comunes++;
  }
  const union = new Set([...interesesA, ...interesesB]).size;
  if (union === 0) return 50;
  // Escala de 40% a 98% de compatibilidad
  const ratio = comunes / union;
  return Math.min(98, Math.round(40 + ratio * 58));
}
