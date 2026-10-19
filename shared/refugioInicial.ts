// Disposición inicial del refugio (compartida por el servidor y el cliente sin conexión).
// Las salas de repo de serie son cuatro repos públicos de ejemplo (`origen` en GitHub): el servidor los clona la primera
// vez en la carpeta de datos de la app y completa su ruta (server/ejemplos.ts).
import { tonosParaRepetidos } from './reclutas.ts';
import type { Aspecto } from './aspecto.ts';
import { distribuir } from './disposicion.ts';
import type { Decorado } from './decorado.ts';
import { TABERNA_ESTUDIO } from './tabernaEstudio.ts';
export interface SalaInicial { origen?: string; id: string; tipo: 'repo' | 'coordinacion' | 'comunicaciones' | 'planificacion' | 'logistica' | 'git' | 'puente' | 'camara' | 'puerta' | 'hidroponia' | 'galeria' | 'discoteca' | 'chapa'; nombre: string; carpeta?: string; planta: number; lado: 'izq' | 'der'; orden: number; variante: string; estilo?: string; decorado?: Decorado }
export interface HabitanteInicial { id: string; nombre: string; mote: string; tipo: string; bio: string; salaId: string; voz: number; tinte?: string; tono?: number; aspecto?: Aspecto }

// el sitio de cada sala (planta, lado, orden) lo decide `distribuir`: aquí solo qué salas hay
export const SALAS_INICIALES: SalaInicial[] = distribuir<Omit<SalaInicial, 'planta' | 'lado' | 'orden'>>([
  { id: 'puerta', tipo: 'puerta', nombre: 'Puerta de la Posada', variante: 'neutro' },
  { id: 'camara', tipo: 'camara', nombre: 'Cofre del Tesoro', variante: 'acorazada' },
  { id: 'puente', tipo: 'puente', nombre: 'Sótano del Mago', variante: 'puente' },
  { id: 'comunicaciones', tipo: 'comunicaciones', nombre: 'Tablón de Anuncios', variante: 'comms' },
  // el tipo 'planificacion' es la agenda (calendario) y 'logistica', la logística (tableros de Linear)
  { id: 'planificacion', tipo: 'planificacion', nombre: 'Almanaque del Cronista', variante: 'plan' },
  { id: 'logistica', tipo: 'logistica', nombre: 'Despensa del Intendente', variante: 'logistica' },
  // git y GitHub: el cliente de git del refugio para todos los repos, la matriz de contribuciones y los pull requests
  { id: 'git', tipo: 'git', nombre: 'Archivo del Escriba', variante: 'logistica' },
  // cuatro repos públicos muy conocidos, uno de cada clase, cada uno en la plantilla de su tipo de proyecto (la misma que
  // le toca a cualquier repo que recluta la Puerta). Se retiran o se vinculan a un repo tuyo desde el panel de la sala, y
  // su habitante la decora a su gusto con «Adaptar la sala al repo»
  { id: 'express', tipo: 'repo', nombre: 'express', carpeta: 'express', origen: 'expressjs/express', variante: 'web', estilo: 'estudio', decorado: TABERNA_ESTUDIO },
  { id: 'requests', tipo: 'repo', nombre: 'requests', carpeta: 'requests', origen: 'psf/requests', variante: 'comms', estilo: 'laboratorio' },
  { id: 'ripgrep', tipo: 'repo', nombre: 'ripgrep', carpeta: 'ripgrep', origen: 'BurntSushi/ripgrep', variante: 'logistica', estilo: 'fundicion' },
  { id: 'awesome', tipo: 'repo', nombre: 'awesome', carpeta: 'awesome', origen: 'sindresorhus/awesome', variante: 'taller', estilo: 'archivo' },
  { id: 'hidroponia', tipo: 'hidroponia', nombre: 'Huerto del Claustro', variante: 'comms' },
  // la discoteca, en la planta de ocio entre los cultivos y el ascensor: la música del refugio (Spotify) para currar
  { id: 'discoteca', tipo: 'discoteca', nombre: 'Escenario del Bardo', variante: 'neutro' },
  { id: 'galeria', tipo: 'galeria', nombre: 'Diana de los Arqueros', variante: 'logistica' },
  // barbería y ropería: aquí se cambia el aspecto del Supervisor y de cualquier habitante (humano o robot)
  { id: 'chapa', tipo: 'chapa', nombre: 'Sastre y Barbero', variante: 'neutro' },
]);

/** La sala donde empieza el Supervisor */
export const SALA_SUPERVISOR = 'express';

/** Qué es cada sala especial (por tipo): se lee en el plano y, en mayúsculas, bajo el nombre del cartel */
export const DESCRIPCION_SALA: Record<string, string> = {
  puerta: 'Libro de huéspedes', camara: 'Llaves, sellos y secretos', puente: 'Los conjuros del juego',
  comunicaciones: 'Cartas y pregones', planificacion: 'Calendario y agenda', logistica: 'Tableros de encargos', git: 'Git y GitHub',
  hidroponia: 'Hierbas y hortalizas', galeria: 'Tiro con arco', discoteca: 'Música para la faena', chapa: 'Ropa, pelo y aspecto', coordinacion: 'Coordinación',
};
/** Nombres de las salas especiales en el refugio original: un refugio guardado con ellos pasa a los de la taberna */
export const NOMBRES_ANTIGUOS: Record<string, string> = {
  'Puerta Principal': 'Puerta de la Posada', 'Cámara acorazada': 'Cofre del Tesoro', 'Puente de Mando': 'Sótano del Mago', 'Comunicaciones': 'Tablón de Anuncios',
  'Planificación': 'Almanaque del Cronista', 'Logística': 'Despensa del Intendente', 'Control de Versiones': 'Archivo del Escriba', 'Hidroponía': 'Huerto del Claustro',
  'Discoteca': 'Escenario del Bardo', 'Galería de tiro': 'Diana de los Arqueros', 'Chapa y Pintura': 'Sastre y Barbero',
};

const H = (id: string, nombre: string, mote: string, tipo: string, salaId: string, bio: string, voz: number, aspecto?: Aspecto): HabitanteInicial => ({ id, nombre, mote, tipo, salaId, bio, voz, ...(aspecto ? { aspecto } : {}) });
/** El guardián de la puerta: un androide como el de la cámara acorazada (del mismo tamaño que todos), en acero
 *  pavonado y con las luces rojas de vigilancia */
export const ASPECTO_GUARDIAN: Aspecto = { especie: 'robot', piezas: { cabeza: 'cabeza.4GTN', torso: 'torso.4GTN', brazos: 'brazos.4GTN', piernas: 'piernas.4GTN' }, colores: { cabeza1: '#4a4f57', torso1: '#4a4f57', torso2: '#2b2d33', piernas1: '#33363b', piernas2: '#2b2d33', luz: '#ff5a4a' } };
/** El barbero y sastre de Chapa y Pintura */
export const ASPECTO_FITO: Aspecto = { especie: 'humano', piezas: { cara: 'cara.ToySoldier', cejas: 'cejas.Vampire', pelo: 'pelo.Vampire', barba: 'barba.ToySoldier', torso: 'torso.Vampire', brazos: 'brazos.Vampire', piernas: 'piernas.Vampire', gafas: 'gafas.Witch.Glasses' }, colores: { pelo: '#2a1f1a', torso1: '#2b3f6b', torso2: '#d8d2c4', piernas1: '#2b2d33' } };
// una sala, un habitante (lleva varios trabajos a la vez, cada uno en su pestaña).
// Quien comparte modelo con otro habitante lleva otro tono de ropa y pelo: el reparto no tiene gemelos
export const HABITANTES_INICIALES: HabitanteInicial[] = tonosParaRepetidos([
  H('nestor', 'Néstor', 'El Archimago', 'Mage', 'puente', 'Trazó los planos de la taberna con tiza de luna cuando aún era una cueva. Perdió un ojo leyendo un grimorio minificado; con el otro ve la taberna entera en sus conjuros.', 85),
  H('hanzo', 'Hanzo', 'Guardasellos', 'Knight', 'camara', 'Caballero del Cofre del Tesoro. Parte en dos cualquier llave que asome en un commit y pide santo y seña hasta para darte los buenos días.', 95),
  H('remi', 'Remi', 'Martillo de Runas', 'Engineer', 'express', 'Forja sus propias herramientas por si acaso. No se fía de ningún conjuro que no haya probado tres veces.', 110),
  H('lola', 'Lola', 'Prueba y Error', 'Druid', 'requests', 'Prueba cada pócima dos veces antes de servirla. Habla con los oráculos como otros hablan con las plantas, y le contestan.', 220),
  H('marga', 'Marga', 'Lista de Listas', 'Hoarder', 'awesome', 'Lo guarda todo: mapas, frascos, cuerdas y rumores. Si existe, lo tiene apuntado; si no existe, también.', 180),
  H('vera', 'Vera', 'Aguja en el Pajar', 'Rogue_Hooded', 'ripgrep', 'Rastrea una línea en cien mil pergaminos antes de que acabes de pedírsela. Afila sus propias expresiones regulares.', 200),
  H('ondina', 'Ondina', 'Bandeja de Entrada', 'Rogue', 'comunicaciones', 'Clava en el tablón las cartas, los pregones y los rumores. Sobre todo los rumores.', 190),
  H('calixto', 'Calixto', 'Reunión Que Pudo Ser Una Carta', 'Engineer', 'planificacion', 'Lleva el almanaque más ordenado de la taberna y ningún hueco libre.', 120),
  H('mona', 'Octocat', 'La Octogata', 'Octocat', 'git', 'Familiar del escriba: mitad gata, mitad pulpo, toda control de versiones. Con un tentáculo prepara, con otro hace commit y con un tercero ya está haciendo push.', 205),
  H('cmd', 'CM-4', 'Gólem de los Encargos', 'Clanker', 'logistica', 'Gólem de hierro despertado por un hechizo de intendencia. Mueve encargos como antes movía piedras.', 90),
  H('fermin', 'Fermín', 'Refactor Eterno', 'Hiker', 'hidroponia', 'Fue el hortelano de la taberna antes de que llegara el Archimago. Riega las hierbas y sigue diciendo que la taberna se mantiene sola. Sigue mintiendo.', 115),
  H('guardian', 'Guardián', 'Portero', 'Barbarian', 'puerta', 'Vigila la puerta de la posada. No deja pasar a nadie sin un package.json.', 80),
  H('dj80', 'Trovador', 'Laúd Eterno', 'Rogue', 'discoteca', 'Bardo errante que se quedó por la comida. Asegura que no hay bug que aguante una balada a 120 BPM. Antes de las doce, nada con letra.', 70),
  H('fito', 'Fito', 'Navaja Suave', 'Hiker', 'chapa', 'Corta el pelo, cose dobladillos y remienda capas. Dice que a todo el mundo le sienta bien el verde bosque. Miente con mucho cariño.', 130, ASPECTO_FITO),
  H('dora', 'Dora', 'Pulso Firme', 'Ranger', 'galeria', 'Campeona de arquería de la taberna. Afina la puntería con los bugs de producción.', 190),
]);
