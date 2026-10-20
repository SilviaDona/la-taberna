// Disposición inicial del refugio (compartida por el servidor y el cliente sin conexión).
// Las salas de repo de serie son cuatro repos públicos de ejemplo (`origen` en GitHub): el servidor los clona la primera
// vez en la carpeta de datos de la app y completa su ruta (server/ejemplos.ts).
import { tonosParaRepetidos } from './reclutas.ts';
import type { Aspecto } from './aspecto.ts';
import { distribuir } from './disposicion.ts';
import type { Decorado } from './decorado.ts';
import { PASOS, PASOS_IDS, type PasoId } from './pasos.ts';
export interface SalaInicial { origen?: string; id: string; tipo: 'repo' | 'coordinacion' | 'comunicaciones' | 'planificacion' | 'logistica' | 'git' | 'puente' | 'camara' | 'puerta' | 'hidroponia' | 'galeria' | 'discoteca' | 'chapa'; nombre: string; carpeta?: string; planta: number; lado: 'izq' | 'der'; orden: number; variante: string; estilo?: string; decorado?: Decorado; paso?: PasoId }
export interface HabitanteInicial { id: string; nombre: string; mote: string; tipo: string; bio: string; salaId: string; voz: number; tinte?: string; tono?: number; aspecto?: Aspecto }

// el sitio de cada sala (planta, lado, orden) lo decide `distribuir`: aquí solo qué salas hay.
// La taberna es el proceso de UX de la Tabernera: una sala por paso (shared/pasos.ts), que trabaja en la carpeta del
// proyecto en cuanto se elige; y alrededor, la puerta, el cofre (ajustes y llaves), el sótano del mago (el propio
// juego) y el sastre (aspectos, que se pagan con el oro que dan los pasos)
export const SALAS_INICIALES: SalaInicial[] = distribuir<Omit<SalaInicial, 'planta' | 'lado' | 'orden'>>([
  { id: 'puerta', tipo: 'puerta', nombre: 'Puerta de la Posada', variante: 'neutro' },
  { id: 'camara', tipo: 'camara', nombre: 'Cofre del Tesoro', variante: 'acorazada' },
  { id: 'puente', tipo: 'puente', nombre: 'Sótano del Mago', variante: 'puente' },
  ...PASOS_IDS.map(p => ({ id: p, tipo: 'repo' as const, paso: p, nombre: PASOS[p].sala, variante: 'taller', estilo: 'archivo', decorado: PASOS[p].decorado })),
  // la barra, en el salón central: el tabernero, para cualquier encargo fuera del proceso (sin skill de UX)
  { id: 'barra', tipo: 'coordinacion', nombre: 'La Barra', variante: 'taller', estilo: 'archivo' },
  // barbería y ropería: aquí se cambia el aspecto del Supervisor y de cualquier habitante
  { id: 'chapa', tipo: 'chapa', nombre: 'Sastre y Barbero', variante: 'neutro' },
]);

/** La sala donde empieza el Supervisor: la del primer paso */
export const SALA_SUPERVISOR = 'mapas';

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
  H('bartolo', 'Bartolo', 'El Tabernero', 'Hiker', 'barra', 'Atiende la barra desde que la taberna era una cueva. Lo mismo te sirve un consejo que te ordena una carpeta: para todo lo que no es del proceso.', 100),
  H('nestor', 'Néstor', 'El Archimago', 'Mage', 'puente', 'Trazó los planos de la taberna con tiza de luna cuando aún era una cueva. Perdió un ojo leyendo un grimorio minificado; con el otro ve la taberna entera en sus conjuros.', 85),
  H('hanzo', 'Hanzo', 'Guardasellos', 'Knight', 'camara', 'Caballero del Cofre del Tesoro. Guarda el oro, las llaves y los sellos, y pide santo y seña hasta para darte los buenos días.', 95),
  H('guardian', 'Guardián', 'Portero', 'Barbarian', 'puerta', 'Vigila la puerta de la posada. Apunta en el libro de huéspedes a quien entra.', 80),
  H('fito', 'Fito', 'Navaja Suave', 'Hiker', 'chapa', 'Corta el pelo, cose dobladillos y remienda capas, a buen precio en oro. Dice que a todo el mundo le sienta bien el verde bosque. Miente con mucho cariño.', 130, ASPECTO_FITO),
  ...PASOS_IDS.map(p => { const a = PASOS[p].aventurero; return H(a.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), a.nombre, a.mote, a.tipo, p, a.bio, a.voz, a.aspecto); }),
]);
