// Los pasos del proceso de UX de la Tabernera, cada uno con su sala: una historia de usuario (con sus ACs) es un
// encargo que recorre la taberna en orden, de la Sala de Mapas al Libro del Tabernero. Cada sala lanza la skill de ese
// paso (las de la Tabernera, instaladas en su Claude Code: aquí solo se nombran sus comandos) en la carpeta del
// proyecto, que trae sus reglas, su mapa de componentes y sus personas. Ningún dato del proyecto entra en el juego.
//
//   1 Sala de Mapas          análisis de la historia         /ux-analysis (modo plan)
//   2 Mostrador del BA       supuestos                       a mano: confirmado o pendiente del BA
//   3 Forja                  prototipo y verificación (3–4)  la skill de prototipado del proyecto (se carga sola)
//   5 Torre del Vigía        revisión de ACs y principios    /ux-analysis (modo revisión)
//   6 Salón de Parroquianos  evaluación con participantes    /ux-testing
//   7 Puerta del Mensajero   documentos de handoff           /ux-edge-cases
//   8 Libro del Tabernero    registro de la sesión           /session-log
//
// Cumplir la puerta de calidad de un paso pasa la historia al siguiente y da oro. Desde la Torre o el Salón, lo que
// haya que corregir vuelve a la Forja con solo los ACs afectados, y luego solo se revisan esos.
import type { Decorado, PiezaDecorado } from './decorado.ts';
import { aspectoDeFuente, type Aspecto } from './aspecto.ts';
import { ORDEN_PASOS } from './disposicion.ts';

export type PasoId = 'mapas' | 'mostrador' | 'forja' | 'torre' | 'salon' | 'mensajero' | 'libro';
export const PASOS_IDS = ORDEN_PASOS as PasoId[];
export const esPaso = (v: unknown): v is PasoId => (PASOS_IDS as unknown[]).includes(v);

export interface Supuesto { id: string; texto: string; estado: 'sin revisar' | 'confirmado' | 'pendiente'; nota?: string }
/** Una historia de usuario en el proceso: en qué paso está, sus supuestos y, si vuelve a la Forja, qué ACs corregir */
export interface Historia {
  id: string; titulo: string; texto: string;      // texto: la historia y sus ACs, tal cual los pegó la Tabernera
  paso: PasoId | 'hecha';
  supuestos: Supuesto[];
  vuelta?: { desde: PasoId; acs: string };         // corrección pedida desde la Torre o el Salón
  hechos: PasoId[];                                 // pasos cumplidos (para las cuentas y el oro)
  creada: number; actualizada: number;
}
export interface Proyecto { nombre: string; ruta: string }

export interface AventureroPaso { nombre: string; mote: string; tipo: string; bio: string; voz: number; aspecto?: Aspecto }
export interface Paso {
  id: PasoId;
  numero: string;          // como en el proceso: «1», «3–4»…
  etapa: string;           // nombre del paso
  sala: string;            // nombre de la sala
  comando?: string;        // el comando de la skill de ese paso
  puerta: string[];        // la puerta de calidad: lo que tiene que cumplirse para pasar al siguiente
  oro: number;             // lo que da cumplirla
  aventurero: AventureroPaso;
  decorado: Decorado;
}

// ---------------------------------------------------------------- piezas comunes de los decorados
const ROBLE = '#8a5a34', NOGAL = '#5a3a22', AMBAR = '#ffb347', FUEGO = '#ff7a2a', PERGAMINO = '#f1dfb4';
const GRANATE = '#8c1c13', MUSGO = '#4a6b2f', AZUL = '#2c4a7a', HIERRO = '#3a3a40';
const P = (modelo: string, x: number, z: number, o: Omit<PiezaDecorado, 'modelo' | 'x' | 'z'> = {}): PiezaDecorado => ({ modelo, x, z, ...o });
/** Antorchas a los lados de la pared del fondo: luz de fuego en toda sala de oficio */
const antorchas = (xs: number[]) => xs.map(x => P('sv/Torch', x, -2.2, { y: 2.1, alto: 0.7, pared: true, luz: FUEGO }));

/** Lo común de toda sala de oficio: sala vacía, luz cálida baja, antorchas y la pantalla del repo como un tablón */
function decorado(d: Omit<Decorado, 'version' | 'base'> & { piezas: PiezaDecorado[] }): Decorado {
  return { version: 1, base: 'vacia', luz: 0.7, paleta: 'taller', paredes: ['Wall_4', 'Wall_Empty', 'Wall_4'], ...d, piezas: [...d.piezas, ...antorchas([-4.9, 4.9])] };
}


function decoradoMapas(): Decorado {
  // la primera sala con piel de taberna (entramado, mesa de madera con libro y vela): la mesa larga de los mapas, con
  // las historias extendidas, librerías de códices, el estandarte azul del gremio, toneles y el cofre de los planos
  return {
    version: 1, base: 'vacia', piel: 'taberna', luz: 1.05, paleta: 'taller', acento: AZUL,
    subtitulo: 'HISTORIAS Y ACS', resumen: 'Sala de Mapas: mesa larga con los mapas de cada historia, librerías de códices y el estandarte del gremio.',
    puesto: { x: -3.6, z: -1.2, giro: 180, mesa: 'dun/table_medium' },
    pieza: { x: 2.2, z: 0.15, giro: 180, gestos: ['Interact', 'Holding_A', 'Use_Item'] }, aficion: { x: -0.6, z: 0.2, giro: 160, gestos: ['Idle_A'] },
    lamparas: [{ x: -3.6, z: -0.6, color: AMBAR, intensidad: 90 }, { x: 2.2, z: -0.6, color: AMBAR, intensidad: 110 }, { x: 0, z: -1.6, color: FUEGO, intensidad: 50 }],
    piezas: [
      P('dun/table_long_decorated_A', 2.2, -1, { giro: 90, alto: 0.85, color: ROBLE }),       // 0 la mesa de los mapas
      P('herr/map', 1.7, -1, { sobre: 0, ancho: 0.8 }),
      P('herr/map_empty', 2.6, -1.1, { sobre: 0, ancho: 0.7, giro: 15 }),
      P('dun/candle_triple', 3.2, -1.15, { sobre: 0, alto: 0.35, luz: AMBAR }),
      P('herr/drafting_compass', 2.2, -0.85, { sobre: 0, alto: 0.2, tumbada: true }),
      P('dun/stool_round', 1.4, -0.2, { alto: 0.5, color: ROBLE }),
      P('dun/chair', 3, -0.15, { alto: 0.95, giro: 180, color: ROBLE }),
      P('mueble/rug_oval_B', 2.2, -0.5, { ancho: 3, color: AZUL }),
      P('dun/bookcase_double_decoratedA', -1.5, -1.95, { alto: 2, pared: true }),
      P('dun/bookcase_single_decoratedB', 5, -1.95, { alto: 2.3, pared: true }),
      P('dun/banner_patternA_blue', -5, -2.2, { y: 1.3, alto: 2.2, pared: true }),
      P('dun/shelf_small_candles', 3.2, -2.2, { y: 2.1, ancho: 1, pared: true, luz: AMBAR }),
      P('dun/barrel_large', 5.15, -0.3, { alto: 0.9, color: ROBLE }),
      P('dun/barrel_small_stack', 4.4, 0.25, { alto: 0.75, color: ROBLE }),
      P('dun/chest', 0.9, -1.75, { ancho: 0.8 }),
      P('dun/crates_stacked', -5.1, 0.1, { alto: 1 }),
      P('dun/candle_lit', 0.9, -1.75, { sobre: 14, alto: 0.25, luz: AMBAR }),
    ],
    carteles: [{ x: 0.6, y: 1.6, ancho: 0.55, titulo: 'PLAN', lineas: ['AC→pantalla', 'supuestos'], fondo: '#f1dfb4', tinta: '#3b2414' }],
  };
}

const DECORADOS: Record<Exclude<PasoId, 'mapas'>, Decorado> = {
  mostrador: decorado({
      subtitulo: 'SUPUESTOS DEL BA', acento: '#c8a24a', resumen: 'Mostrador del BA: mostrador con el libro de supuestos, cartas lacradas y sacas de correo.',
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.5, giro: 180, gestos: ['PickUp', 'Interact'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Waving'] },
      lamparas: [{ x: 2.8, z: -1.2, color: AMBAR, intensidad: 70 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('cocina/kitchencounter_straight_B', 2.8, -1.5, { ancho: 1.6, color: ROBLE }), // 0 mostrador
        P('herr/journal_closed', 2.3, -1.5, { sobre: 0, alto: 0.25 }),
        P('herr/key_C', 3.2, -1.5, { sobre: 0, alto: 0.15, tumbada: true }),
        P('dun/candle_lit', 2.8, -1.6, { sobre: 0, alto: 0.25, luz: AMBAR }),
        P('recurso/Food_Crate_Small_Empty', 4.6, -1.7, { ancho: 0.7, color: ROBLE }),
        P('sv/Backpack', 5.3, -0.9, { alto: 0.6 }),
        P('herr/rope_bundle_A', 4.5, -0.6, { ancho: 0.5 }),
        P('herr/map', -1.6, -2.25, { y: 2.4, ancho: 1, pared: true }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
        P('mueble/rug_oval_B', 0.2, 0.1, { ancho: 2, color: MUSGO }),
      ],
      carteles: [{ x: -1.6, y: 2.5, ancho: 0.9, titulo: 'SUPUESTOS', lineas: ['confirmado', 'pendiente BA'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  forja: decorado({
      subtitulo: 'PROTOTIPOS A FUEGO', acento: '#b0b4bc', resumen: 'Forja: yunque y tenazas donde se forja cada prototipo con las reglas del proyecto.',
      paredes: ['Wall_3', 'Wall_4', 'Wall_3'],
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.4, giro: 180, gestos: ['Hammering', 'Working_B'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 2.8, z: -1, color: FUEGO, intensidad: 90 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 50 }],
      piezas: [
        P('herr/anvil', 2.8, -1.1, { ancho: 0.9, color: HIERRO }),
        P('herr/tongs', 3.7, -1.5, { alto: 0.5 }),
        P('herr/bucket_metal', 1.6, -1.6, { alto: 0.5 }),
        P('acc/shield_round_color', -1.8, -2.25, { y: 2.7, alto: 0.6, pared: true }),
        P('acc/shield_round_color', 4.3, -2.25, { y: 2.7, alto: 0.6, pared: true }),
        P('recurso/Iron_Bars_Stack_Large', 5.1, -1.6, { ancho: 0.9 }),
        P('recurso/Containers_Crate_Small_Grey', 4.4, -0.5, { ancho: 0.55 }),
        P('recurso/Containers_Crate_Small_Green', 5.2, -0.4, { ancho: 0.55 }),
        P('mueble/cabinet_medium', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: -1.8, y: 1.9, ancho: 1, titulo: 'REGLAS', lineas: ['tokens', 'radios', 'estados'], fondo: HIERRO, tinta: PERGAMINO, simbolo: 'engranaje' }],
    }),
  torre: decorado({
      subtitulo: 'ACS Y PRINCIPIOS', acento: '#7fb0d9', luz: 0.65, resumen: 'Torre del Vigía: mesa de mapas, catalejo y brasero; aquí se revisa cada AC con su evidencia.',
      paredes: ['Wall_4', 'Wall_3', 'Wall_4'],
      pantallaRepo: { x: -0.2, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 3, z: -0.6, giro: 180, gestos: ['Interact', 'Use_Item'] }, aficion: { x: 0.6, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 0.8, z: -1.2, color: FUEGO, intensidad: 90 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 50 }],
      piezas: [
        P('sv/Bonfire_Fire', 0.8, -1.5, { luz: FUEGO, alto: 0.6 }),
        P('mueble/table_medium', 3, -1.2, { ancho: 1.3, color: NOGAL }),             // 1 mesa de mapas
        P('herr/map', 3, -1.2, { sobre: 1, ancho: 0.8 }),
        P('herr/magnifying_glass', 3.4, -1, { sobre: 1, alto: 0.25 }),
        P('herr/lantern', 2.6, -1.4, { sobre: 1, alto: 0.4, luz: AMBAR }),
        P('herr/map_rolled', 4, -1.6, { alto: 0.12, giro: 90 }),
        P('acc/shield_round_color', -1.6, -2.25, { y: 2.6, alto: 0.6, pared: true }),
        P('mueble/shelf_B_large', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('recurso/Containers_Crate_Large', 5.2, -0.9, { ancho: 0.9, color: ROBLE }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: 2, y: 2.5, ancho: 1.1, titulo: 'REVISIÓN', lineas: ['6 estados', 'grav. 1–4'], fondo: AZUL, tinta: PERGAMINO, simbolo: 'ojo' }],
    }),
  salon: decorado({
      subtitulo: 'PARROQUIANOS DE PRUEBA', acento: '#d96aa0', resumen: 'Salón de los Parroquianos: tarima, mesas y jarras para los participantes simulados.',
      pantallaRepo: { x: -0.3, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 2.6, z: -0.4, giro: 180, gestos: ['Cheering', 'Holding_B'] }, aficion: { x: 0.2, z: 0.2, giro: 180, gestos: ['Waving'] },
      lamparas: [{ x: 2.6, z: -1, color: '#ffb0d0', intensidad: 70 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/rug_rectangle_stripes_A', 2.6, -1, { ancho: 2.2, color: GRANATE }),
        P('mueble/chair_stool_wood', 2.6, -1.4, { alto: 0.5, color: ROBLE }),
        P('herr/journal_open', 1.4, -1.6, { ancho: 0.4 }),
        P('mueble/table_small', 4.6, -0.5, { alto: 0.75, color: ROBLE }),         // 3 mesa del público
        P('mueble/mug_A', 4.5, -0.5, { sobre: 3, alto: 0.15, color: '#d9a35a' }),
        P('mueble/mug_B', 4.8, -0.6, { sobre: 3, alto: 0.15, color: '#d9a35a' }),
        P('recurso/Fuel_C_Barrels', 5.2, -1.7, { ancho: 0.9, color: ROBLE }),
        P('mueble/shelf_B_large_decorated', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: 2.6, y: 2.5, ancho: 1.1, titulo: 'HOY PRUEBAN', lineas: ['50 por rol', '3 subgrupos'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  mensajero: decorado({
      subtitulo: 'PLANOS PARA ENTREGAR', acento: '#d9a35a', resumen: 'Puerta del Mensajero: banco con planos y herramientas; los casos límite salen hacia desarrollo y el BA.',
      pantallaRepo: { x: 0.2, y: 2.4, ancho: 2.2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'doble', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.5, giro: 180, gestos: ['Working_A', 'Hammering'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 2.8, z: -1.2, color: AMBAR, intensidad: 80 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/table_medium_long', 2.6, -1.3, { ancho: 1.8, color: ROBLE }),       // 0 banco
        P('herr/saw', 2, -1.3, { sobre: 0, ancho: 0.5, tumbada: true }),
        P('herr/hammer', 2.6, -1.4, { sobre: 0, alto: 0.3, tumbada: true }),
        P('herr/chisel', 3, -1.2, { sobre: 0, alto: 0.25, tumbada: true }),
        P('herr/blueprint', 3.2, -1.4, { sobre: 0, ancho: 0.5 }),
        P('herr/blueprint_stacked', -1.4, -1.8, { ancho: 0.8, color: PERGAMINO }),
        P('herr/drafting_compass', -0.6, -1.8, { alto: 0.3 }),
        P('mueble/shelf_B_large', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('recurso/Wood_Log_Stack', 5.1, -1.7, { ancho: 1, color: ROBLE }),
        P('herr/grindstone', 4.8, -0.5, { alto: 0.9 }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
        P('mueble/rug_rectangle_stripes_A', 0.2, 0.1, { ancho: 2, color: '#a0402a' }),
      ],
      carteles: [{ x: -1.6, y: 2.5, ancho: 0.9, titulo: 'ENTREGA', lineas: ['desarrollo', 'BA'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  libro: decorado({
      subtitulo: 'EL LIBRO DE CUENTAS', acento: AMBAR, resumen: 'Libro del Tabernero: estanterías de registros y mesa con el libro de cuentas de cada paso.',
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 2.6, z: -0.6, giro: 180, gestos: ['Interact', 'Holding_A'] }, aficion: { x: 0.4, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: -3.4, z: -1.2, color: AMBAR, intensidad: 70 }, { x: 2.6, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/shelf_B_large_decorated', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('casa/Bookshelf', -1.8, -1.9, { alto: 2.4, pared: true, color: NOGAL }),
        P('casa/Bookshelf', 4.9, -1.9, { alto: 2.4, pared: true, color: NOGAL }),
        P('mueble/table_medium_long', 2.4, -1.2, { ancho: 1.8, color: ROBLE }),        // 3 mesa de lectura
        P('herr/journal_open', 2.1, -1.2, { sobre: 3, ancho: 0.4 }),
        P('mueble/book_set', 2.8, -1.3, { sobre: 3, ancho: 0.35 }),
        P('dun/candle_lit', 2.5, -1, { sobre: 3, alto: 0.25, luz: AMBAR }),
        P('mueble/chair_A_wood', 2.4, 0.1, { giro: 180, alto: 0.95, color: ROBLE }),
        P('mueble/rug_oval_B', 0.4, 0, { ancho: 2, color: GRANATE }),
        P('herr/map_rolled', -0.4, -1.6, { alto: 0.12, giro: 90 }),
        P('herr/magnifying_glass', 0.9, -1.7, { alto: 0.3 }),
      ],
      carteles: [{ x: -1.8, y: 2.5, ancho: 1, titulo: 'REGISTRO', lineas: ['cada paso', 'al tracker'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
};

const H = (nombre: string, mote: string, fuente: string, voz: number, bio: string, extra = {}): AventureroPaso => ({ nombre, mote, tipo: 'Hiker', voz, bio, aspecto: aspectoDeFuente(fuente, extra) });
export const PASOS: Record<PasoId, Paso> = {
  mapas: { id: 'mapas', numero: '1', etapa: 'Análisis de la historia', sala: 'Sala de Mapas', comando: '/ux-analysis', oro: 20,
    puerta: ['Cada AC está asignado a una pantalla o a un componente.', 'Cada ambigüedad está apuntada como supuesto.'],
    aventurero: H('Aurelia', 'La Cartógrafa', 'Mage', 175, 'Convierte cada historia en un mapa: pantallas, caminos y componentes. Lo que no está claro lo apunta en el margen, nunca lo inventa.'), decorado: decoradoMapas() },
  mostrador: { id: 'mostrador', numero: '2', etapa: 'Supuestos', sala: 'Mostrador del BA', oro: 10,
    puerta: ['Cada supuesto está confirmado o marcado «Pendiente de confirmación del BA».'],
    aventurero: H('Dámaso', 'El Escribano', 'Rogue', 140, 'Lleva el libro de supuestos del mostrador. No deja salir una historia con una duda sin apuntar.'), decorado: DECORADOS.mostrador },
  forja: { id: 'forja', numero: '3–4', etapa: 'Prototipo y verificación', sala: 'Forja', oro: 30,
    puerta: ['El prototipo cumple las reglas del proyecto: tokens, radios, colores de estado y comportamiento responsive.', 'La consola está limpia y las validaciones se han comprobado ejecutándolas.'],
    aventurero: H('Eulogio', 'El Forjador', 'Knight', 95, 'Forja cada prototipo en un solo archivo, con las reglas del proyecto a fuego. Si una validación no la ha visto funcionar, no está hecha.'), decorado: DECORADOS.forja },
  torre: { id: 'torre', numero: '5', etapa: 'Revisión de ACs y principios', sala: 'Torre del Vigía', comando: '/ux-analysis', oro: 25,
    puerta: ['Cada AC tiene uno de los seis estados, con su evidencia.', 'Cada hallazgo de principios tiene una gravedad del 1 al 4.'],
    aventurero: H('Casiano', 'El Vigía', 'Ranger', 105, 'Desde lo alto de la torre ve un AC sin evidencia a tres leguas, y un contraste flojo a cinco.'), decorado: DECORADOS.torre },
  salon: { id: 'salon', numero: '6', etapa: 'Evaluación de usabilidad', sala: 'Salón de los Parroquianos', comando: '/ux-testing', oro: 30,
    puerta: ['Cada tarea del alcance tiene éxito, éxito sin ayuda, errores, tiempo y satisfacción por subgrupo.'],
    aventurero: H('Fabricio', 'El Posadero', 'Druid', 160, 'Sienta a cincuenta parroquianos por rol a probar cada prototipo y apunta quién se pierde y dónde.', { cara: 'cara.Helper_A', cejas: 'cejas.Helper_A', pelo: 'pelo.Rogue', sombrero: 'sombrero.Mage.Hat' }), decorado: DECORADOS.salon },
  mensajero: { id: 'mensajero', numero: '7', etapa: 'Documentos de handoff', sala: 'Puerta del Mensajero', comando: '/ux-edge-cases', oro: 20,
    puerta: ['Cada caso límite sale de una regla de la fuente.', 'Lo que no está confirmado aparece como pregunta abierta.'],
    aventurero: H('Brunilda', 'La Mensajera', 'Engineer', 150, 'Lleva los planos al gremio de los constructores y al BA, cada uno en su idioma, sin que se pierda un caso límite.'), decorado: DECORADOS.mensajero },
  libro: { id: 'libro', numero: '8', etapa: 'Registro de la sesión', sala: 'Libro del Tabernero', comando: '/session-log', oro: 10,
    puerta: ['Cada cifra del registro sale de lo que produjo su paso.', 'El registro solo lleva cifras y etiquetas.'],
    aventurero: H('Gonzalo', 'El Contable', 'Barbarian', 100, 'Apunta en el libro de cuentas lo que salió de cada paso. Cifras y etiquetas: nada más, nada menos.'), decorado: DECORADOS.libro },
};

/** El paso siguiente (la Forja hace el 3 y el 4; tras la Torre o el Salón, una corrección vuelve a la Forja) */
export function siguiente(p: PasoId): PasoId | 'hecha' {
  const i = PASOS_IDS.indexOf(p); return i < PASOS_IDS.length - 1 ? PASOS_IDS[i + 1] : 'hecha';
}
/** Para pasar el Mostrador, cada supuesto tiene que estar confirmado o pendiente del BA (ninguno sin revisar) */
export const puedePasar = (h: Historia) => h.paso !== 'hecha' && (h.paso !== 'mostrador' || h.supuestos.every(s => s.estado !== 'sin revisar'));

/** Lo que se le pide al aventurero de cada paso para una historia (lo que no tiene comando, no lanza nada) */
export function promptDePaso(p: PasoId, h: Historia): string | null {
  const supuestos = h.supuestos.length ? '\n\nSupuestos del paso 2:\n' + h.supuestos.map(s => `- ${s.texto} — ${s.estado === 'confirmado' ? 'confirmado' : 'Pendiente de confirmación del BA'}${s.nota ? ` (${s.nota})` : ''}`).join('\n') : '';
  const vuelta = h.vuelta ? `\n\nVuelve del paso ${PASOS[h.vuelta.desde].numero} (${PASOS[h.vuelta.desde].etapa}): ${p === 'forja' ? 'corrige solo' : 'revisa solo'} estos ACs: ${h.vuelta.acs}` : '';
  const de = `la historia «${h.titulo}»`;
  switch (p) {
    case 'mapas': return `/ux-analysis\n\nModo plan (paso 1, análisis de la historia) para ${de}. Historia y ACs:\n\n${h.texto}`;
    case 'mostrador': return null;
    case 'forja': return `Pasos 3 y 4 del proceso para ${de}: construye el prototipo HTML a partir del plan del paso 1, con la skill de prototipado y las reglas del proyecto, y verifícalo ejecutando su lógica (consola limpia y validaciones comprobadas).${supuestos}${vuelta}`;
    case 'torre': return `/ux-analysis\n\nModo revisión (paso 5) del prototipo de ${de}: estado y evidencia por AC, navegación, principios y auditoría de tokens.${vuelta}\n\nHistoria y ACs:\n\n${h.texto}`;
    case 'salon': return `/ux-testing\n\nPaso 6, evaluación de usabilidad del prototipo de ${de}, reutilizando los hallazgos del paso 5.${vuelta}`;
    case 'mensajero': return `/ux-edge-cases\n\nPaso 7, documentos de handoff de ${de}: el técnico para desarrollo y el legible para el BA.${supuestos}`;
    case 'libro': return `/session-log\n\nRegistro de ${de} (pasos cumplidos: ${h.hechos.map(x => PASOS[x].numero).join(', ') || 'ninguno'}).`;
  }
}

// ---------------------------------------------------------------- validación de lo guardado
const txt = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
export function sanearHistorias(v: unknown): Historia[] {
  if (!Array.isArray(v)) return [];
  return v.filter(h => h && typeof h === 'object' && typeof h.id === 'string').slice(0, 500).map((h: any): Historia => ({
    id: txt(h.id, 40), titulo: txt(h.titulo, 120) || 'Historia', texto: txt(h.texto, 40000),
    paso: esPaso(h.paso) || h.paso === 'hecha' ? h.paso : 'mapas',
    supuestos: (Array.isArray(h.supuestos) ? h.supuestos : []).filter((s: any) => s && typeof s.id === 'string').slice(0, 200).map((s: any) => ({ id: txt(s.id, 40), texto: txt(s.texto, 1000), estado: ['confirmado', 'pendiente'].includes(s.estado) ? s.estado : 'sin revisar', ...(s.nota ? { nota: txt(s.nota, 500) } : {}) })),
    ...(h.vuelta && esPaso(h.vuelta.desde) ? { vuelta: { desde: h.vuelta.desde, acs: txt(h.vuelta.acs, 2000) } } : {}),
    hechos: (Array.isArray(h.hechos) ? h.hechos : []).filter(esPaso),
    creada: Number.isFinite(h.creada) ? h.creada : Date.now(), actualizada: Number.isFinite(h.actualizada) ? h.actualizada : Date.now(),
  }));
}
export function sanearProyecto(v: any): Proyecto | undefined {
  return v && typeof v.ruta === 'string' && v.ruta.trim() ? { ruta: v.ruta.slice(0, 500), nombre: txt(v.nombre, 60) || v.ruta.split(/[\\/]/).filter(Boolean).pop() || 'Proyecto' } : undefined;
}

// ---------------------------------------------------------------- lo que se hace con una historia (puro: lo usa el servidor)
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
/** Aplica una acción sobre la lista de historias. Devuelve el oro ganado (0 si ninguno). Lanza si no se puede. */
export function accionHistoria(hs: Historia[], nombre: string, d: Record<string, any>): { oro: number; id?: string } {
  const ahora = Date.now();
  if (nombre === 'crear') {
    const texto = txt(d.texto, 40000).trim(); if (!texto) throw new Error('Pega la historia y sus ACs.');
    const titulo = txt(d.titulo, 120).trim() || texto.split('\n').find(l => l.trim())!.trim().slice(0, 80);
    const h: Historia = { id: nuevoId(), titulo, texto, paso: 'mapas', supuestos: [], hechos: [], creada: ahora, actualizada: ahora };
    hs.push(h); return { oro: 0, id: h.id };
  }
  const h = hs.find(x => x.id === d.id); if (!h) throw new Error('Esa historia ya no está.');
  h.actualizada = ahora;
  switch (nombre) {
    case 'pasar': {
      if (h.paso === 'hecha') throw new Error('Esa historia ya está cerrada.');
      if (!puedePasar(h)) throw new Error('Quedan supuestos sin revisar: márcalos como confirmados o pendientes del BA.');
      const p = h.paso;
      // la primera vez que se cumple un paso, da su oro; las vueltas por correcciones no lo repiten
      const oro = h.hechos.includes(p) ? 0 : PASOS[p].oro;
      if (!h.hechos.includes(p)) h.hechos.push(p);
      if (h.vuelta && p === h.vuelta.desde) delete h.vuelta;   // revisados los ACs corregidos, la vuelta se cierra
      h.paso = siguiente(p);
      return { oro: oro + (h.paso === 'hecha' ? 25 : 0) };   // y un premio por cerrar la historia entera
    }
    case 'volver': {
      if (h.paso !== 'torre' && h.paso !== 'salon') throw new Error('Solo se vuelve a la Forja desde la Torre del Vigía o el Salón de los Parroquianos.');
      const acs = txt(d.acs, 2000).trim(); if (!acs) throw new Error('Di qué ACs hay que corregir.');
      h.vuelta = { desde: h.paso, acs }; h.paso = 'forja'; return { oro: 0 };
    }
    case 'mover': { if (!esPaso(d.paso) && d.paso !== 'hecha') throw new Error('Ese paso no existe.'); h.paso = d.paso; return { oro: 0 }; }
    case 'borrar': hs.splice(hs.indexOf(h), 1); return { oro: 0 };
    case 'supuesto.anadir': {
      const texto = txt(d.texto, 1000).trim(); if (!texto) throw new Error('Escribe el supuesto.');
      for (const t of texto.split('\n').map(x => x.replace(/^\s*[-*•\d.)]+\s*/, '').trim()).filter(Boolean)) h.supuestos.push({ id: nuevoId() + h.supuestos.length, texto: t, estado: 'sin revisar' });
      return { oro: 0 };
    }
    case 'supuesto.estado': {
      const s = h.supuestos.find(x => x.id === d.supuesto); if (!s) throw new Error('Ese supuesto ya no está.');
      if (!['sin revisar', 'confirmado', 'pendiente'].includes(d.estado)) throw new Error('Estado no válido.');
      s.estado = d.estado; if (typeof d.nota === 'string') { if (d.nota.trim()) s.nota = txt(d.nota, 500); else delete s.nota; }
      return { oro: 0 };
    }
    case 'supuesto.quitar': h.supuestos = h.supuestos.filter(x => x.id !== d.supuesto); return { oro: 0 };
  }
  throw new Error('Acción desconocida: ' + nombre);
}
