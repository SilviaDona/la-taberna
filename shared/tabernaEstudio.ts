// La Taberna, fase 0: la sala Estudio vestida de taberna con el sistema de decorados (solo datos, atrezo ya existente).
// Plan completo en docs/plan-taberna.md.
import type { Decorado } from './decorado.ts';

const MADERA = '#8a5a34', AMBAR = '#ffb347', FUEGO = '#ff7a2a';
export const TABERNA_ESTUDIO: Decorado = {
  version: 1, base: 'vacia', subtitulo: 'LA JARRA Y EL DRAGÓN', acento: AMBAR, paleta: 'taller', luz: 0.6,
  paredes: ['Wall_4', 'Wall_Empty', 'Wall_4'],
  resumen: 'Taberna de la fase 0: hoguera de hogar, barra de barriles, mesas con jarras y antorchas.',
  pantallaRepo: { x: 0, y: 2.3, ancho: 2.2 },
  puesto: { x: -3.6, z: -1.4, giro: 0, pantalla: 'monitor', mesa: 'mueble/table_medium' },
  pieza: { x: 3.6, z: -0.6, giro: 180, gestos: ['Working_A', 'Use_Item'] },
  aficion: { x: 0.2, z: 0.2, giro: 180, gestos: ['Idle_A', 'Cheering'] },
  lamparas: [
    { x: 0, z: -1, color: FUEGO, intensidad: 120 },
    { x: -4.5, z: -1.6, color: AMBAR, intensidad: 60 },
    { x: 4.5, z: -1.6, color: AMBAR, intensidad: 60 },
  ],
  piezas: [
    { modelo: 'sv/Bonfire_Fire', x: 0, z: -1.2, luz: FUEGO },                       // 0 hogar
    { modelo: 'mueble/rug_oval_B', x: 0, z: -0.1, color: '#a0402a' },             // 1 alfombra
    { modelo: 'mueble/table_medium', x: -1.6, z: -0.2, color: MADERA },          // 2 mesa
    { modelo: 'mueble/chair_stool_wood', x: -2.3, z: 0.1, color: MADERA },
    { modelo: 'mueble/chair_A_wood', x: -0.9, z: 0.1, giro: -30, color: MADERA },
    { modelo: 'mueble/mug_A', x: -1.7, z: -0.2, sobre: 2, color: '#d9a35a' },
    { modelo: 'herr/lantern', x: -1.4, z: -0.3, sobre: 2, luz: AMBAR },
    { modelo: 'mueble/table_medium', x: 1.6, z: -0.2, color: MADERA },            // 7 mesa
    { modelo: 'mueble/chair_stool_wood', x: 2.3, z: 0.1, color: MADERA },
    { modelo: 'acc/potion_large_red', x: 1.5, z: -0.2, sobre: 7 },
    { modelo: 'mueble/mug_A', x: 1.8, z: -0.3, sobre: 7, color: '#d9a35a' },
    { modelo: 'recurso/Fuel_A_Barrels', x: 4.4, z: -1.6, color: MADERA },        // barra de barriles
    { modelo: 'recurso/Fuel_C_Barrels', x: 3.2, z: -1.8, color: MADERA },
    { modelo: 'acc/ammo_crate_withLid', x: 5.3, z: -0.9, color: MADERA },
    { modelo: 'mueble/shelf_B_large_decorated', x: -5.2, z: -1.9, pared: true, color: MADERA },
    { modelo: 'acc/shield_round_color', x: -1.6, z: -2.25, y: 2.6, pared: true },  // escudo colgado
    { modelo: 'sv/Torch', x: -2.9, z: -2.2, y: 2.2, pared: true, luz: FUEGO },
    { modelo: 'sv/Torch', x: 2.9, z: -2.2, y: 2.2, pared: true, luz: FUEGO },
    { modelo: 'cocina/jar_A_large', x: 5.2, z: -1.9 },
  ],
  carteles: [{ x: 2.2, y: 2.5, ancho: 1.4, titulo: 'HOY', lineas: ['Hidromiel', 'Estofado'], fondo: '#3b2414', tinta: '#ffcf7a' }],
};
