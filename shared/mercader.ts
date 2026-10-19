// El mercader: un buhonero goblin que pasa por la taberna con objetos de decoración. Se pagan con el oro que se gana
// cumpliendo pasos; lo comprado va al baúl de la Tabernera y se pone en cualquier sala con el modo decorar (lo que
// se quita vuelve al baúl; venderlo de vuelta devuelve la mitad). Puro: lo usan el servidor y el cliente.
import type { PiezaDecorado } from './decorado.ts';

export type RarezaMercancia = 'común' | 'rara' | 'legendaria';
export interface Mercancia { id: string; nombre: string; modelo: string; precio: number; rareza: RarezaMercancia; texto: string; alto?: number; pared?: boolean; y?: number }

export const MERCADER = { nombre: 'Gorgo', mote: 'El Buhonero', bio: 'Goblin de caminos. Lo que no tiene, lo consigue; lo que tiene, lo cobra.' };

export const MERCANCIAS: Mercancia[] = [
  { id: 'vela', nombre: 'Vela encendida', modelo: 'dun/candle_lit', precio: 10, rareza: 'común', texto: 'Para trabajar hasta tarde.' },
  { id: 'candelabro', nombre: 'Candelabro triple', modelo: 'dun/candle_triple', precio: 18, rareza: 'común', texto: 'Tres llamas, ningún incendio (de momento).' },
  { id: 'farol', nombre: 'Farol de hierro', modelo: 'herr/lantern', precio: 15, rareza: 'común', texto: 'Luz de camino.' },
  { id: 'planta', nombre: 'Planta en maceta', modelo: 'casa/Houseplant_3', precio: 14, rareza: 'común', texto: 'Verde, que siempre alegra.' },
  { id: 'helecho', nombre: 'Helecho grande', modelo: 'casa/Houseplant_7', precio: 22, rareza: 'común', texto: 'Le gusta la penumbra de la taberna.' },
  { id: 'flores', nombre: 'Flores del campo', modelo: 'cultivo/Flower_2', precio: 12, rareza: 'común', texto: 'Cogidas esta mañana.' },
  { id: 'calabaza', nombre: 'Calabaza de feria', modelo: 'cultivo/Pumpkin_3', precio: 16, rareza: 'común', texto: 'Ganó un concurso. Dice.' },
  { id: 'banco', nombre: 'Banco de madera', modelo: 'dun/bench', precio: 30, rareza: 'común', texto: 'Para que los peregrinos esperen sentados.' },
  { id: 'barril', nombre: 'Barril decorado', modelo: 'dun/barrel_large_decorated', precio: 28, rareza: 'común', texto: 'Lleno de algo. Mejor no preguntar.' },
  { id: 'tonel', nombre: 'Tonel de cerveza', modelo: 'dun/keg_decorated', precio: 40, rareza: 'rara', texto: 'De la buena.' },
  { id: 'botellas', nombre: 'Botellas etiquetadas', modelo: 'dun/bottle_A_labeled_green', precio: 12, rareza: 'común', texto: 'Licor de hierbas.' },
  { id: 'alfombra', nombre: 'Alfombra ovalada', modelo: 'mueble/rug_oval_A', precio: 35, rareza: 'común', texto: 'Tejida en el valle.' },
  { id: 'alfombra-rayas', nombre: 'Alfombra de rayas', modelo: 'mueble/rug_rectangle_stripes_B', precio: 38, rareza: 'común', texto: 'Ata la sala entera.' },
  { id: 'estandarte-rojo', nombre: 'Estandarte rojo', modelo: 'dun/banner_patternB_red', precio: 45, rareza: 'rara', texto: 'Para colgar en la pared del fondo.', pared: true, y: 1.2 },
  { id: 'estandarte-verde', nombre: 'Estandarte verde', modelo: 'dun/banner_triple_green', precio: 45, rareza: 'rara', texto: 'Los colores del gremio.', pared: true, y: 1.2 },
  { id: 'escudo', nombre: 'Escudo de armas', modelo: 'dun/banner_shield_blue', precio: 55, rareza: 'rara', texto: 'De una casa noble que ya no existe.', pared: true, y: 1.4 },
  { id: 'espada-escudo', nombre: 'Espada y escudo', modelo: 'dun/sword_shield', precio: 60, rareza: 'rara', texto: 'Trofeo de un aventurero despistado.' },
  { id: 'pociones', nombre: 'Poción enorme', modelo: 'acc/potion_huge_blue', precio: 50, rareza: 'rara', texto: 'Brilla un poco. No te la bebas.' },
  { id: 'cofre', nombre: 'Cofre', modelo: 'dun/chest', precio: 48, rareza: 'rara', texto: 'Con cerradura y todo.' },
  { id: 'monedas', nombre: 'Montón de monedas', modelo: 'dun/coin_stack_large', precio: 90, rareza: 'rara', texto: 'Para que se vea que la taberna va bien.' },
  { id: 'estatua', nombre: 'Estatua antigua', modelo: 'sf/Props_Statue', precio: 140, rareza: 'legendaria', texto: 'Nadie sabe de quién es.' },
  { id: 'cofre-oro', nombre: 'Cofre de oro', modelo: 'dun/chest_large_gold', precio: 160, rareza: 'legendaria', texto: 'Brilla tanto que despierta a los goblins.' },
  { id: 'mimico', nombre: 'Cofre mímico', modelo: 'dun/chest_mimic', precio: 200, rareza: 'legendaria', texto: 'Muerde. Viene con garantía.' },
];
export const mercancia = (id: string) => MERCANCIAS.find(m => m.id === id);
export const precioVenta = (m: Mercancia) => Math.floor(m.precio / 2);

/** Lo que trae el buhonero hoy: seis cosas (cambia cada día, igual para todos los que miren ese día) */
export function existencias(dia = Math.floor(Date.now() / 86_400_000)): string[] {
  let x = (dia * 2654435761) >>> 0; const r = () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const comunes = MERCANCIAS.filter(m => m.rareza === 'común'), raras = MERCANCIAS.filter(m => m.rareza === 'rara'), legendarias = MERCANCIAS.filter(m => m.rareza === 'legendaria');
  const coger = (l: Mercancia[], n: number) => { const c = [...l]; const out: string[] = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(r() * c.length), 1)[0].id); return out; };
  const leg = r() < 0.5 ? 1 : 0;
  return [...coger(comunes, 4 - leg), ...coger(raras, 2), ...coger(legendarias, leg)];
}

/** Un objeto puesto en una sala por la Tabernera (se suma a la escena de la sala) */
export interface Adorno { id: string; mercancia: string; x: number; z: number; giro: number }
export function piezaDeAdorno(a: Adorno): PiezaDecorado | null {
  const m = mercancia(a.mercancia); if (!m) return null;
  return { modelo: m.modelo, x: a.x, z: a.z, giro: a.giro, ...(m.alto ? { alto: m.alto } : {}), ...(m.pared ? { pared: true, y: m.y } : {}) };
}
/** Límites del suelo de una sala en el que se pueden poner adornos (en metros, como los decorados) */
export const SUELO_ADORNOS = { x0: -5.5, x1: 5.5, z0: -2.1, z1: 2.0 };
export function sanearAdornos(v: unknown): Adorno[] {
  if (!Array.isArray(v)) return [];
  const n = (x: unknown, a: number, b: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(a, Math.min(b, x)) : 0);
  return v.filter(a => a && typeof a.id === 'string' && mercancia(a.mercancia)).slice(0, 40)
    .map((a: any) => ({ id: a.id.slice(0, 40), mercancia: a.mercancia, x: n(a.x, SUELO_ADORNOS.x0, SUELO_ADORNOS.x1), z: n(a.z, SUELO_ADORNOS.z0, SUELO_ADORNOS.z1), giro: Math.round(n(a.giro, -360, 360)) }));
}
/** La escena de una sala con los adornos de la Tabernera encima */
export function conAdornos<D extends { piezas?: PiezaDecorado[] }>(d: D, adornos: Adorno[]): D {
  const extra = adornos.map(piezaDeAdorno).filter((p): p is PiezaDecorado => !!p);
  return extra.length ? { ...d, piezas: [...(d.piezas ?? []), ...extra] } : d;
}
