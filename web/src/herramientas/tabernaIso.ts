// Prueba de la taberna en isométrica (taberna.html): una sala cuadrada de 12 × 12 m vista desde arriba en diagonal,
// como en Tavern Keeper, para decidir el estilo antes de rehacer el mundo. La Sala de Mapas: paredes de entramado al
// fondo y a la izquierda, bajas por delante para ver dentro, chimenea, mesa larga de mapas bajo una araña de velas,
// librerías, estandarte, toneles y el puesto de Aurelia. Contrato de QA: window.__ready() / window.__step(dt).
// ?giro=45 (grados alrededor de la sala) ?alto=40 (inclinación) ?dist=30 ?hora=HH:MM
import * as THREE from 'three';
import { Motor } from '../motor/render';
import { colocar, R, type Colocacion } from '../motor/assets';
import { muroEntramado, materialYeso, materialAcero, caja } from '../mundo/salas/comun';
import { Personaje } from '../mundo/personaje';
import { PASOS } from '@shared/pasos';
import { aspectoDe } from '@shared/aspecto';
import { PACKS } from '@shared/decorado';
import { mercancia, type Adorno } from '@shared/mercader';
import type { PasoId } from '@shared/pasos';
import { vivo } from '../red/cliente';
import { juego } from '../ui/estadoJuego';
import { CapaEtiquetas } from '../mundo/etiquetas';
import { Retrato } from '../mundo/retrato';
import './tabernaIso.css';

const q = new URLSearchParams(location.search);
const L = 12, H = 4.43, BAJO = 1.1;           // lado de la sala, alto de las paredes del fondo y de las de delante
// en el juego (index.html) pinta en #mundo y se conecta a lo de verdad; en taberna.html es la maqueta suelta
const EN_JUEGO = !!document.getElementById('mundo');
export const motor = new Motor((document.getElementById('lienzo') ?? document.getElementById('mundo'))!);
const { scene, camera } = motor;
scene.background = new THREE.Color('#2b2420');
const sala = new THREE.Group(); scene.add(sala);

// ---------------------------------------------------------------- luz: penumbra cálida, fuego, araña y velas
const cielo = new THREE.HemisphereLight('#ffd9a8', '#3a2414', 0.55); scene.add(cielo);
const luna = new THREE.DirectionalLight('#9fb4ff', 0.35); luna.position.set(-8, 14, -4); scene.add(luna);
const sol = new THREE.DirectionalLight('#ffd7a0', 0.9); sol.position.set(10, 18, 8); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 }); sol.shadow.mapSize.set(4096, 4096); sol.shadow.bias = -0.0008; scene.add(sol);
const puntos: { luz: THREE.PointLight; base: number; vel: number }[] = [];
function luz(x: number, y: number, z: number, color: string, intensidad: number, distancia: number, parpadeo = 0) {
  const l = new THREE.PointLight(color, intensidad, distancia, 1.6); l.position.set(x, y, z); scene.add(l);
  if (parpadeo) puntos.push({ luz: l, base: intensidad, vel: parpadeo });
  return l;
}

// ---------------------------------------------------------------- día y noche con la hora real (?hora=HH:MM para probar)
// el sol sale por el este y cruza; de noche, luna azul y las velas y el fuego mandan. Las ventanas cambian de color.
const ventanas: THREE.MeshBasicMaterial[] = [];
const C = (c: string) => new THREE.Color(c);
const TRAMOS: [number, { cielo: string; suelo: string; sol: string; fondo: string; ventana: string; luzSol: number; luzCielo: number; luna: number; velas: number }][] = [
  [0, { cielo: '#4a5a8a', suelo: '#1a1410', sol: '#7a8cff', fondo: '#0d1020', ventana: '#141d3a', luzSol: 0.02, luzCielo: 0.12, luna: 0.4, velas: 1.35 }],
  [6, { cielo: '#c99a8a', suelo: '#3a2414', sol: '#ff9a5a', fondo: '#3a2a34', ventana: '#e89a6a', luzSol: 0.45, luzCielo: 0.4, luna: 0.2, velas: 1.05 }],
  [9, { cielo: '#ffe2b8', suelo: '#3a2414', sol: '#ffe0b0', fondo: '#2b2420', ventana: '#9fc8f0', luzSol: 0.95, luzCielo: 0.6, luna: 0, velas: 0.8 }],
  [17, { cielo: '#ffd9a8', suelo: '#3a2414', sol: '#ffd7a0', fondo: '#2b2420', ventana: '#a8c8e8', luzSol: 0.9, luzCielo: 0.55, luna: 0.05, velas: 0.85 }],
  [19.5, { cielo: '#e08a6a', suelo: '#2a1a10', sol: '#ff7a3a', fondo: '#3a2018', ventana: '#f08a4a', luzSol: 0.5, luzCielo: 0.4, luna: 0.2, velas: 1.05 }],
  [21.5, { cielo: '#4a5a8a', suelo: '#1a1410', sol: '#7a8cff', fondo: '#0d1020', ventana: '#141d3a', luzSol: 0.02, luzCielo: 0.12, luna: 0.4, velas: 1.35 }],
  [24, { cielo: '#4a5a8a', suelo: '#1a1410', sol: '#7a8cff', fondo: '#0d1020', ventana: '#141d3a', luzSol: 0.02, luzCielo: 0.12, luna: 0.4, velas: 1.35 }],
];
const horaFija = /^\d{1,2}:\d{2}$/.test(q.get('hora') ?? '') ? q.get('hora')!.split(':').map(Number) : null;
let factorVelas = 1;
function horaAhora() { if (horaFija) return horaFija[0] + horaFija[1] / 60; const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
function ponerHora(h: number) {
  let i = 0; while (i < TRAMOS.length - 2 && TRAMOS[i + 1][0] <= h) i++;
  const [h0, a] = TRAMOS[i], [h1, b] = TRAMOS[i + 1]; const k = THREE.MathUtils.clamp((h - h0) / (h1 - h0), 0, 1);
  const mez = (x: string, y: string) => C(x).lerp(C(y), k);
  cielo.color.copy(mez(a.cielo, b.cielo)); cielo.groundColor.copy(mez(a.suelo, b.suelo)); cielo.intensity = THREE.MathUtils.lerp(a.luzCielo, b.luzCielo, k);
  sol.color.copy(mez(a.sol, b.sol)); sol.intensity = THREE.MathUtils.lerp(a.luzSol, b.luzSol, k);
  luna.intensity = THREE.MathUtils.lerp(a.luna, b.luna, k);
  (scene.background as THREE.Color).copy(mez(a.fondo, b.fondo)); if (scene.fog) (scene.fog as THREE.Fog).color.copy(mez(a.fondo, b.fondo)).multiplyScalar(0.8);
  for (const m of ventanas) m.color.copy(mez(a.ventana, b.ventana));
  factorVelas = THREE.MathUtils.lerp(a.velas, b.velas, k);
  scene.environmentIntensity = 0.05 + 0.2 * Math.min(1, sol.intensity / 0.9);   // el reflejo del entorno también se apaga de noche
  // el sol da la vuelta: este (mañana) → sur (mediodía) → oeste (tarde); de noche, la luz que queda es la de la luna
  const ang = ((h - 6) / 12) * Math.PI; const dia = h > 6 && h < 20;
  sol.position.set(Math.cos(ang) * -22 + 4, dia ? 6 + Math.sin(ang) * 16 : 14, 10);
}

// ---------------------------------------------------------------- estructura
// cada sala es un grupo en su sitio; sus piezas se colocan en coordenadas de la sala (de -6 a 6)
function en(g: THREE.Group) {
  const S = (ruta: string, c: Colocacion = {}) => colocar(g, ruta, { sombra: true, recibe: true, ...c });
  /** Coloca encima de la cara de arriba de `soporte` (mesas, cofres, mostradores) */
  const sobre = async (soporte: THREE.Object3D, ruta: string, x: number, z: number, c: Colocacion = {}) => {
    soporte.updateMatrixWorld(true);
    const tope = new THREE.Box3().setFromObject(soporte).max.y - g.position.y;
    return S(ruta, { ...c, pos: [x, tope, z] });
  };
  return { S, sobre };
}
const { S, sobre } = en(sala);
// la sala de la izquierda (paso 2), pegada a la Sala de Mapas por su pared con chimenea
const OX = -L;
const mostrador = new THREE.Group(); mostrador.position.x = OX; scene.add(mostrador);
// la Forja (pasos 3 y 4), delante del Mostrador: la L de la taberna
const OZ = L;
const forja = new THREE.Group(); forja.position.set(OX, 0, OZ); scene.add(forja);
// las que faltan, alrededor del salón central (0, 12): Torre y Parroquianos delante, Mensajero y Libro a la derecha
const grupoEn = (x: number, z: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); return g; };
// (el salón central, por ahora solo su suelo: lo cierran los muretes de las salas de alrededor)
const central = grupoEn(0, L);
const torre = grupoEn(-L, 2 * L), salon = grupoEn(0, 2 * L), mensajero = grupoEn(L, 2 * L), libro = grupoEn(L, L);
/** Luz en coordenadas de una sala */
const luzEn = (g: THREE.Group, x: number, y: number, z: number, color: string, i: number, d: number, p = 0) => luz(g.position.x + x, y, g.position.z + z, color, i, d, p);

// cada sala, su suelo: tarima, tarima oscura, losas de piedra o tierra pisada
type Suelo = 'madera' | 'oscura' | 'piedra' | 'tierra';
const SUELO: Record<Suelo, string> = { madera: 'floor_wood_large', oscura: 'floor_wood_large_dark', piedra: 'floor_tile_large', tierra: 'floor_dirt_large' };
async function suelo(g: THREE.Group, tipo: Suelo = 'madera') {
  const { S } = en(g);
  const ps: Promise<unknown>[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    ps.push(S(R.dun(SUELO[tipo]), { pos: [-L / 2 + 2 + i * 4, 0, -L / 2 + 2 + j * 4], ancho: 4, ancla: 'techo', rot: ((i * 3 + j) % 2) * Math.PI, sombra: false }));
  await Promise.all(ps);
}
/** Las paredes de una sala. Fondo (z = -6) e izquierda (x = -6) son de entramado entero si dan afuera; las que dan a
 *  una sala vecina, y siempre la de delante y la de la derecha, son muretes (una pared alta taparía lo que hay detrás
 *  desde esta cámara). `paso`: dónde se abre el hueco para pasar en ese murete (en x para fondo y delante, en z para los
 *  lados); `false`: sin pared ahí (la pone la sala vecina). */
type Lado = 'entero' | false | { paso?: number };
function paredes(g: THREE.Group, o: { ventana?: number; fondo?: Lado; izquierda?: Lado; derecha?: Lado; frente?: Lado; tono?: { yeso?: string; madera?: string } }) {
  const tono = o.tono ?? {};
  const madera = materialAcero(tono.madera ?? '#3a2414');
  const fondo = o.fondo ?? 'entero', izquierda = o.izquierda ?? 'entero', derecha = o.derecha ?? {}, frente = o.frente ?? {};
  if (fondo === 'entero') muroEntramado(g, -L / 2, L / 2, -L / 2, 0, o.ventana !== undefined ? { x: o.ventana, y: H * 0.55, w: 1.8, h: 1.6 } : undefined, tono);
  if (izquierda === 'entero') { const izq = muroEntramado(g, 0, L, 0, 0, undefined, tono); izq.rotation.y = Math.PI / 2; izq.position.set(-L / 2, 0, L / 2); }
  // un murete a lo largo de x (en z) o de z (en x), partido por el hueco del paso, con pies derechos a los lados
  const murete = (enX: boolean, fijo: number, paso?: number) => {
    const tramos: [number, number][] = paso === undefined ? [[-L / 2, L / 2]] : [[-L / 2, paso - 0.9], [paso + 0.9, L / 2]];
    for (const [a, b] of tramos) {
      const largo = b - a, c = (a + b) / 2;
      const [w, d, x, z] = enX ? [largo, 0.25, c, fijo] : [0.25, largo, fijo, c];
      g.add(caja(w, BAJO, d, materialYeso(tono.yeso), x, BAJO / 2, z, true), caja(w + 0.1, 0.16, d + 0.1, madera, x, BAJO + 0.08, z, true));
    }
    if (paso !== undefined) for (const t of [paso - 0.9, paso + 0.9]) g.add(caja(0.3, BAJO + 0.6, 0.3, madera, enX ? t : fijo, (BAJO + 0.6) / 2, enX ? fijo : t, true));
  };
  if (fondo && fondo !== 'entero') murete(true, -L / 2, fondo.paso);
  if (izquierda && izquierda !== 'entero') murete(false, -L / 2, izquierda.paso);
  if (derecha && derecha !== 'entero') murete(false, L / 2, derecha.paso);
  if (frente && frente !== 'entero') murete(true, L / 2, frente.paso);
  // pies derechos en las esquinas: altos donde se juntan dos paredes enteras o una entera con la esquina de fuera
  for (const [x, z] of [[L / 2, L / 2], [-L / 2, L / 2], [L / 2, -L / 2], [-L / 2, -L / 2]]) {
    const alto = (x < 0 && izquierda === 'entero') || (z < 0 && fondo === 'entero') ? H : BAJO + 0.25;
    g.add(caja(0.34, alto, 0.34, madera, x, alto / 2, z, true));
  }
  if (o.ventana !== undefined && fondo === 'entero') {   // el cielo detrás de la ventana
    const vidrio = new THREE.MeshBasicMaterial({ color: '#2b3a66' }); ventanas.push(vidrio);
    const cielo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2), vidrio);
    cielo.position.set(o.ventana, H * 0.55, -L / 2 - 0.05); g.add(cielo);
  }
}

// ---------------------------------------------------------------- muebles de la Sala de Mapas
async function muebles() {
  const ROBLE = '#8a5a34';
  // la chimenea, en la pared de la izquierda, con su fuego
  // la chimenea, en la pared del fondo, con su fuego, alfombra y dos sillas
  await S(R.casa('Fireplace'), { pos: [-3.8, 0, -L / 2 + 0.5], alto: 2.2 });
  luz(-3.8, 0.8, -L / 2 + 1.2, '#ff7a2a', 9, 9, 7);
  await S(R.sv('Bonfire_Fire'), { pos: [-3.8, 0.05, -L / 2 + 0.8], alto: 0.5 });
  await tinte(S(R.mueble('rug_oval_B'), { pos: [-3.8, 0.01, -3.4], ancho: 2.6, propios: true }), '#7a2a1e');
  await S(R.dun('chair'), { pos: [-4.9, 0, -3.3], alto: 0.95, rot: Math.PI * 0.85 });
  await S(R.dun('chair'), { pos: [-2.7, 0, -3.3], alto: 0.95, rot: -Math.PI * 0.85 });

  // la mesa larga de los mapas, en el centro, bajo la araña
  await tinte(S(R.mueble('rug_rectangle_stripes_A'), { pos: [0.6, 0.01, 0.6], ancho: 4.4, propios: true }), '#9c3b2a');
  const mesa = await S(R.dun('table_long_decorated_A'), { pos: [0.6, 0, 0.6], alto: 0.85 });
  await sobre(mesa, R.herr('map'), 0.4, 0.4, { ancho: 0.8 });
  await sobre(mesa, R.herr('map_empty'), 0.9, 1.3, { ancho: 0.7, rot: 0.3 });
  await sobre(mesa, R.dun('candle_triple'), 0.9, -0.2, { alto: 0.35 });
  await sobre(mesa, R.herr('drafting_compass'), 0.2, 1.1, { alto: 0.2 });
  for (const [x, z, r] of [[-0.6, 0, 1.6], [-0.6, 1.4, 1.6], [1.8, 0.3, -1.6], [1.8, 1.4, -1.6]]) await S(R.dun('stool_round'), { pos: [x, 0, z], alto: 0.5, rot: r });
  luz(0.6, H - 1.2, 0.6, '#ffb35c', 14, 12, 3);

  // librerías y estandarte en la pared del fondo
  await S(R.dun('bookcase_double_decoratedA'), { pos: [0.3, 0, -L / 2 + 0.3], alto: 2.4 });
  await S(R.dun('bookcase_single_decoratedB'), { pos: [2.1, 0, -L / 2 + 0.3], alto: 2.4 });
  await S(R.dun('banner_patternA_blue'), { pos: [-1.6, 1.4, -L / 2 + 0.12], alto: 2.2 });
  await S(R.dun('shelf_small_candles'), { pos: [3.4, 3.3, -L / 2 + 0.25], ancho: 1.2 });

  // el puesto de Aurelia, junto a la ventana: mesa, silla, libro, diario y vela
  const puesto = await S(R.dun('table_medium'), { pos: [3.6, 0, -4.4], alto: 0.8 });
  await sobre(puesto, R.dun('book_tan'), 3.2, -4.5, { alto: 0.1, rot: 0.4 });
  await sobre(puesto, R.herr('journal_open'), 3.7, -4.3, { ancho: 0.45 });
  await sobre(puesto, R.dun('candle_lit'), 4.2, -4.6, { alto: 0.3 });
  luz(4.2, 1.4, -4.6, '#ffb347', 3, 5, 9);
  await S(R.dun('chair'), { pos: [3.6, 0, -3.5], alto: 0.95, rot: Math.PI });

  // rincón de la derecha: toneles, barril y cajas; delante a la izquierda, el cofre de los planos
  await S(R.dun('barrel_large'), { pos: [4.9, 0, -0.6], alto: 1 });
  await S(R.dun('barrel_small_stack'), { pos: [5, 0, 0.6], alto: 0.8, rot: -Math.PI / 2 });
  await S(R.dun('keg_decorated'), { pos: [4.6, 0, 2.2], alto: 0.9, rot: -Math.PI / 2 });
  await S(R.dun('crates_stacked'), { pos: [4.7, 0, 4.4], alto: 1.1, rot: 0.3 });
  const cofre = await S(R.dun('chest'), { pos: [-4.7, 0, 5.1], ancho: 0.9, rot: Math.PI / 2 });
  await sobre(cofre, R.dun('candle_lit'), -4.7, 5.1, { alto: 0.25 });
  // la pared de la izquierda: otra librería, un estandarte y las armas del gremio
  await S(R.dun('sword_shield'), { pos: [-5.4, 2.6, -L / 2 + 0.15], alto: 1, rot: 0 });
  await S(R.dun('shelf_small_books'), { pos: [-1.6, 3.4, -L / 2 + 0.25], ancho: 1.1 });
  // mapas enrollados por el suelo y un baúl de planos junto al paso a la sala de al lado
  await S(R.herr('map_rolled'), { pos: [1.4, 0, -4.9], alto: 0.12, rot: 0.6 });
  await S(R.herr('map_rolled'), { pos: [1.7, 0, -4.7], alto: 0.12, rot: -0.3 });
  await S(R.dun('trunk_medium_A'), { pos: [-5.2, 0, 1.2], ancho: 0.9, rot: Math.PI / 2 });
  await S(R.casa('Houseplant_7'), { pos: [5.1, 0, -5.1], alto: 1.3 });
}
// ---------------------------------------------------------------- muebles del Mostrador del BA (paso 2)
// El escribano Dámaso lleva el libro de supuestos tras un mostrador de bar en L; detrás, estanterías con frascos de
// tinta y sellos; delante, taburetes; el tablón de supuestos clavado en la pared; sacas de cartas y un banco de espera
async function mueblesMostrador() {
  const { S, sobre } = en(mostrador);
  await tinte(S(R.mueble('rug_rectangle_stripes_A'), { pos: [0.8, 0.01, 1.2], ancho: 3.6, propios: true }), '#4a6b2f');
  // el mostrador, de una pieza: frente de tablones, encimera de roble más ancha y zócalo oscuro; en L hacia delante
  const madera = materialAcero('#5a3a22'), encimera = materialAcero('#8a5a34'), zocalo = materialAcero('#2a1a0e');
  const tramoBarra = (w: number, d: number, x: number, z: number) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); mostrador.add(g);
    g.add(caja(w, 1.0, d, madera, 0, 0.5, 0, true), caja(w + 0.2, 0.1, d + 0.25, encimera, 0, 1.05, 0.05, true), caja(w, 0.12, d + 0.04, zocalo, 0, 0.06, 0, true));
    return g;
  };
  const barra = [tramoBarra(6.4, 0.7, 0.2, -2.6), tramoBarra(0.7, 2.2, 3.05, -1.15)];
  await sobre(barra[0], R.dun('book_brown'), -0.4, -2.6, { alto: 0.12, rot: 0.3 });
  await sobre(barra[0], R.herr('journal_open'), 0.4, -2.55, { ancho: 0.5 });
  await sobre(barra[0], R.dun('candle_triple'), 1.8, -2.6, { alto: 0.35 });
  await sobre(barra[0], R.dun('bottle_A_labeled_brown'), -2.4, -2.6, { alto: 0.35 });
  await sobre(barra[0], R.dun('bottle_B_green'), -2.1, -2.7, { alto: 0.3 });
  await sobre(barra[0], R.herr('key_C'), -1.4, -2.55, { alto: 0.1, rot: 1 });
  await sobre(barra[1], R.dun('coin_stack_small'), 3.05, -0.6, { alto: 0.12 });
  luz(OX + 1.8, 1.6, -2.6, '#ffb347', 4, 6, 8);
  for (const [x, z] of [[-1.6, -1.5], [0.2, -1.5], [2, -1.5]]) await S(R.dun('stool'), { pos: [x, 0, z], alto: 0.75 });
  // detrás del mostrador: estanterías de frascos, sellos y legajos
  await S(R.dun('shelves_decorated'), { pos: [-2.4, 0, -L / 2 + 0.35], alto: 2.6 });
  await S(R.dun('shelves_decorated'), { pos: [1.4, 0, -L / 2 + 0.35], alto: 2.6 });
  await S(R.dun('keg_decorated'), { pos: [3.9, 0, -L / 2 + 0.6], alto: 1 });
  // el tablón de supuestos en la pared de la izquierda, con sus pergaminos y velas debajo
  await S(R.dun('shelves_decorated'), { pos: [-L / 2 + 0.35, 0, -1.2], alto: 2.4, rot: Math.PI / 2 });
  await S(R.dun('banner_patternB_yellow'), { pos: [-L / 2 + 0.12, 1.4, 2.6], alto: 2, rot: Math.PI / 2 });
  // espera: banco, sacas de cartas y cajas de envíos
  await S(R.dun('bench'), { pos: [-3.8, 0, 3.8], ancho: 2.2 });
  await S(R.sv('Backpack'), { pos: [-2.2, 0, 4.9], alto: 0.6, rot: 0.4 });
  await S(R.dun('crate_large_decorated'), { pos: [-5, 0, 4.9], alto: 0.9 });
  await S(R.dun('box_small_decorated'), { pos: [-4.2, 0, 5.1], alto: 0.5, rot: 0.6 });
  await S(R.dun('trunk_large_A'), { pos: [4.8, 0, 3.6], ancho: 1.1, rot: -Math.PI / 2 });
  await S(R.casa('Houseplant_5'), { pos: [5, 0, 5.1], alto: 1.2 });
  await S(R.dun('table_small_decorated_A'), { pos: [1, 0, 3.4], alto: 0.75 });
  for (const [x, z, r] of [[0.2, 3.4, Math.PI / 2], [1.8, 3.4, -Math.PI / 2]]) await S(R.dun('chair'), { pos: [x, 0, z], alto: 0.95, rot: r });
  luz(OX + 1, 2.4, 3, '#ffb35c', 6, 9, 3);
  luz(OX - 2, 2.8, -4, '#ffb35c', 6, 9, 2);
}
// ---------------------------------------------------------------- la Cocina (pasos 3 y 4): el prototipo es el plato
// Eulogio cocina cada prototipo con la receta del proyecto y lo cata antes de servirlo: hogar con el caldero al fuego,
// horno de leña, mesas de trabajo con tabla, cuchillo y rodillo, cajas de ingredientes, ollas y sartenes, escurridor
// de platos y los platos listos para el Comedor de los Peregrinos
async function mueblesForja() {
  const { S, sobre } = en(forja);
  const W = (x: number, z: number) => [OX + x, OZ + z] as const;
  const C = (n: string) => R.cocina(n);
  // el hogar: chimenea con fuego y el caldero del guiso encima
  await tinte(S(R.casa('Fireplace'), { pos: [-L / 2 + 0.55, 0, -2], rot: Math.PI / 2, alto: 2.4, propios: true }), '#8a6a52');
  await S(R.sv('Bonfire_Fire'), { pos: [-L / 2 + 0.9, 0.05, -2], alto: 0.55 });
  await S(C('stew_pot'), { pos: [-L / 2 + 0.95, 0.35, -2], alto: 0.55 }).catch(() => S(R.sv('Pot'), { pos: [-L / 2 + 0.95, 0.35, -2], alto: 0.55 }));
  { const [x, z] = W(-L / 2 + 1.3, -2); luz(x, 0.9, z, '#ff6a1a', 14, 10, 9); }
  await S(R.recurso('Wood_Log_Stack'), { pos: [-L / 2 + 0.8, 0, -4.3], ancho: 1.3, rot: Math.PI / 2 });
  // el horno de leña, en la esquina del fondo
  // (el horno del pack de cocina es de metal: el de leña es otra chimenea, de ladrillo, con su lumbre dentro)
  await tinte(S(R.casa('Fireplace'), { pos: [3.6, 0, -L / 2 + 0.6], alto: 2, propios: true }), '#a0503a');
  await S(R.sv('Bonfire_Fire'), { pos: [3.6, 0.05, -L / 2 + 0.95], alto: 0.4 });
  await S(C('food_ingredient_dough_base'), { pos: [3.6, 0.5, -L / 2 + 1.05], ancho: 0.4 }).catch(() => null);
  { const [x, z] = W(3.6, -4.2); luz(x, 0.8, z, '#ff7a2a', 8, 7, 8); }
  // las mesas de trabajo: la grande en el centro (donde se emplata el prototipo) y la de cortar
  const mesa = await S(R.dun('table_long_decorated_C'), { pos: [0, 0, -0.8], alto: 0.88, rot: Math.PI / 2 }).catch(() => S(R.dun('table_long'), { pos: [0, 0, -0.8], alto: 0.85, rot: Math.PI / 2 }));
  await sobre(mesa, C('cuttingboard'), -0.6, -0.8, { ancho: 0.5 }).catch(() => null);
  await sobre(mesa, C('knife'), -0.5, -0.6, { ancho: 0.3 }).catch(() => null);
  await sobre(mesa, C('food_dinner'), 0.5, -0.9, { ancho: 0.45 }).catch(() => null);
  await sobre(mesa, C('rollingpin'), 0.1, -0.5, { ancho: 0.45 }).catch(() => null);
  await sobre(mesa, R.dun('candle_lit'), 1, -1.1, { alto: 0.25 });
  { const [x, z] = W(0, -0.8); luz(x, 2.2, z, '#ffb35c', 6, 8, 3); }
  // el fregadero de madera: mesa con cubos de agua y la pila de platos limpios
  const pila = await S(R.dun('table_medium'), { pos: [-0.6, 0, -L / 2 + 0.8], alto: 0.85 });
  await sobre(pila, R.dun('bucket'), -1, -L / 2 + 0.8, { alto: 0.4 }).catch(() => null);
  await sobre(pila, R.dun('plate_stack'), -0.2, -L / 2 + 0.8, { alto: 0.25 }).catch(() => null);
  await S(R.dun('barrel_small'), { pos: [-2, 0, -L / 2 + 0.7], alto: 0.8 });
  for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, 0], [1, 0]]) await S(R.dun('stool'), { pos: [x, 0, z], alto: 0.55 });
  // ollas, sartenes y tarros en las baldas de la pared del fondo (la de la sala de al lado no: aquí no hay pared)
  await S(R.dun('shelves_decorated'), { pos: [-L / 2 + 0.4, 0, 1.4], alto: 2.3, rot: Math.PI / 2 });
  await S(C('pot_large'), { pos: [-3.8, 0, 0.2], alto: 0.7 }).catch(() => null);
  await S(C('pot_A_stew'), { pos: [-3.2, 0, -0.4], alto: 0.4 }).catch(() => null);
  // los ingredientes: cajas de verduras, queso, carne y pan, sacos y toneles
  const cajas: [string, number, number][] = [['crate_carrots', 2.6, 0.8], ['crate_tomatoes', 3.4, 1.4], ['crate_cheese', 4.4, 0.6], ['crate_potatoes', 4.6, 1.8], ['crate_onions', 2.8, 2.2], ['crate_buns', 4.4, -1.4]];
  for (const [n, x, z] of cajas) await S(C(n), { pos: [x, 0, z], ancho: 0.75, rot: x }).catch(() => null);
  await S(R.dun('barrel_large'), { pos: [4.8, 0, 4.4], alto: 1 });
  await S(R.dun('keg_decorated'), { pos: [3.8, 0, 4.8], alto: 0.9 });
  await S(R.recurso('Food_Basket_A_Berries'), { pos: [-4.6, 0, 3.6], ancho: 0.7 }).catch(() => null);
  // la mesa de catar: el plato listo, la cuchara y el taburete de quien prueba (la verificación, paso 4)
  const cata = await S(R.dun('table_small'), { pos: [-1.4, 0, 3], alto: 0.78 });
  await sobre(cata, C('stew_bowl'), -1.5, 3, { ancho: 0.35 }).catch(() => null);
  await sobre(cata, C('spoon'), -1.1, 3.1, { ancho: 0.25 }).catch(() => null);
  await S(R.dun('stool'), { pos: [-1.4, 0, 3.9], alto: 0.6 });
}

// ---------------------------------------------------------------- Torre del Vigía (paso 5)
// Casiano revisa cada AC desde su atalaya: plataforma de madera con escalera, catalejo (la lupa grande) y brasero de
// guardia arriba; abajo, la mesa de los mapas de lo auditado con lámpara, estandartes, escudos y la armería de guardia
async function mueblesTorre() {
  const { S, sobre } = en(torre);
  await S(R.dun('scaffold_frame_large'), { pos: [-3.6, 0, -3.6], alto: 3 }).catch(() => null);
  await S(R.dun('stairs_wood_decorated'), { pos: [-0.9, 0, -3.8], alto: 3, rot: -Math.PI / 2 }).catch(() => null);
  await S(R.sv('Bonfire_Fire'), { pos: [-3.6, 3, -3.6], alto: 0.6 }).catch(() => null);
  luzEn(torre, -3.6, 3.6, -3.6, '#ff7a2a', 9, 10, 8);
  const mesa = await S(R.dun('table_long_decorated_B'), { pos: [1.8, 0, 0.4], alto: 0.85 });
  await sobre(mesa, R.herr('map'), 1.6, 0.2, { ancho: 0.8 });
  await sobre(mesa, R.herr('magnifying_glass'), 2.1, 0.8, { alto: 0.3, rotZ: Math.PI / 2 });
  await sobre(mesa, R.herr('lantern'), 2.2, -0.4, { alto: 0.45 });
  await sobre(mesa, R.herr('journal_open'), 1.4, 1.1, { ancho: 0.45 });
  luzEn(torre, 2.2, 1.6, -0.4, '#ffb347', 5, 7, 7);
  for (const [x, z, r] of [[0.8, 0.4, Math.PI / 2], [2.8, 0.4, -Math.PI / 2]]) await S(R.dun('chair'), { pos: [x, 0, z], alto: 0.95, rot: r });
  await S(R.dun('banner_triple_blue'), { pos: [-L / 2 + 0.12, 1.3, 2.4], alto: 2.3, rot: Math.PI / 2 }).catch(() => null);
  await S(R.dun('banner_shield_white'), { pos: [-L / 2 + 0.12, 1.5, -0.3], alto: 1.8, rot: Math.PI / 2 });
  // delante: el puesto de guardia, con su mesa de partes, alfombra azul, armero y cajas de flechas
  await tinte(S(R.mueble('rug_rectangle_stripes_A'), { pos: [1.8, 0.01, 0.6], ancho: 4.2, propios: true }), '#2c4a7a');
  const partes = await S(R.dun('table_small_decorated_B'), { pos: [-2.4, 0, 3.4], alto: 0.75 });
  await sobre(partes, R.dun('candle_lit'), -2.2, 3.3, { alto: 0.25 });
  await S(R.dun('stool'), { pos: [-2.4, 0, 4.4], alto: 0.6 });
  await S(R.acc('ammo_crate_withLid'), { pos: [3.6, 0, 4.6], ancho: 0.9, rot: 0.3 });
  await S(R.acc('ammo_crate'), { pos: [4.7, 0, 3.9], ancho: 0.8, rot: -0.4 });
  await S(R.dun('crates_stacked'), { pos: [4.8, 0, 5], alto: 1 });
  await S(R.dun('banner_thin_blue'), { pos: [-L / 2 + 0.12, 1.6, -4.6], alto: 1.8, rot: Math.PI / 2 }).catch(() => null);
  await S(R.dun('sword_shield'), { pos: [-L / 2 + 0.5, 0, 4.6], alto: 1.2, rot: Math.PI / 2 });
  await S(R.dun('chest_large'), { pos: [4.6, 0, -4.6], ancho: 1.1, rot: -Math.PI / 4 });
  await S(R.dun('torch_lit'), { pos: [4.9, 0, 1.6], alto: 1.8 }).catch(() => null);
  luzEn(torre, 4.9, 1.8, 1.6, '#ff8a3a', 4, 6, 10);
  await S(R.dun('keg'), { pos: [-4.9, 0, 4.9], alto: 0.9 });
}
// ---------------------------------------------------------------- Comedor de los Peregrinos (paso 6)
// Los peregrinos prueban el plato (el prototipo): mesas redondas con manteles y el guiso servido en cada una, jarras
// y pan; la pizarra del menú, toneles de bebida y el banco de los que esperan mesa. Fabricio sirve y apunta
async function mueblesSalon() {
  const { S, sobre } = en(salon);
  const C = (n: string) => R.cocina(n);
  await tinte(S(R.mueble('rug_rectangle_stripes_A'), { pos: [0, 0.01, 0.4], ancho: 7.4, propios: true }), '#8c1c13');
  const mesas: THREE.Object3D[] = [];
  for (const [x, z, n] of [[-3, -2.2, 'table_round_B_tablecloth_red'], [1.6, -2.4, 'table_round_B_tablecloth_green'], [-2.4, 2.4, 'table_round_B_tablecloth_green'], [2.6, 2.2, 'table_round_B_tablecloth_red_decorated']] as const) {
    const m = await S(C(n), { pos: [x, 0, z], alto: 0.8 }).catch(() => S(R.dun('table_round_medium'), { pos: [x, 0, z], alto: 0.8 })); mesas.push(m);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + x; await S(R.dun('stool_round'), { pos: [x + Math.cos(a) * 1.05, 0, z + Math.sin(a) * 1.05], alto: 0.5 }); }
    // en cada mesa, el plato del día (el prototipo que prueban) y algo de beber
    await sobre(m, C('stew_bowl'), x - 0.15, z, { ancho: 0.32 }).catch(() => null);
    await sobre(m, R.mueble('mug_A'), x + 0.25, z - 0.15, { alto: 0.16 });
  }
  await sobre(mesas[1], C('food_dinner'), 1.9, -2.3, { ancho: 0.35 }).catch(() => null);
  await sobre(mesas[3], R.dun('candle_lit'), 2.9, 2, { alto: 0.25 });
  // la pizarra del menú, colgada en la pared de la Torre (es la izquierda)
  await S(C('menu'), { pos: [-L / 2 + 0.2, 1.3, -0.4], alto: 1.2, rot: Math.PI / 2 }).catch(() => null);
  // el rincón de las bebidas y el banco de los que esperan
  await S(R.dun('barrel_large_decorated'), { pos: [-5, 0, -4.8], alto: 1.1 });
  await S(R.dun('keg_decorated'), { pos: [-3.8, 0, -5], alto: 1 });
  await S(R.dun('barrel_small_stack'), { pos: [4.8, 0, -4.8], alto: 0.8 });
  await S(R.dun('bench'), { pos: [0, 0, 4.9], ancho: 2.6 });
  await S(C('crate_buns'), { pos: [4.6, 0, 4.6], ancho: 0.7 }).catch(() => null);
  luzEn(salon, 0, 3, 0, '#ffb35c', 10, 14, 2);
  luzEn(salon, 2.9, 1.2, 2, '#ffb347', 3, 5, 9);
}
// ---------------------------------------------------------------- Puerta del Mensajero (paso 7)
// La salida de la taberna hacia el camino: sacas y paquetes listos para el gremio de constructores y para el BA,
// mesa de embalar con planos y cuerda, cofres de envíos y farolillos
async function mueblesMensajero() {
  const { S, sobre } = en(mensajero);
  const mesa = await S(R.dun('table_long'), { pos: [-1.4, 0, -2.6], alto: 0.85, rot: Math.PI / 2 });
  await sobre(mesa, R.herr('blueprint_stacked'), -2, -2.6, { ancho: 0.7 });
  await sobre(mesa, R.herr('rope_bundle_A'), -0.7, -2.5, { ancho: 0.5 });
  await sobre(mesa, R.herr('map_rolled'), -1.2, -2.2, { alto: 0.12 });
  await sobre(mesa, R.dun('candle_lit'), -2.6, -2.8, { alto: 0.3 });
  luzEn(mensajero, -2.6, 1.6, -2.8, '#ffb347', 4, 6, 8);
  for (const [x, z, n, a] of [[3.6, -4.6, 'crate_large_decorated', 1], [4.7, -4.4, 'crate_small', 0.6], [4.4, -3.4, 'box_small_decorated', 0.5], [-4.6, -4.6, 'trunk_large_B', 1], [-4.8, 1.2, 'crates_stacked', 1.1]] as const) await S(R.dun(n), { pos: [x, 0, z], alto: a, rot: x });
  await S(R.sv('Backpack'), { pos: [2.6, 0, 1], alto: 0.7, rot: 0.6 });
  await S(R.sv('Backpack'), { pos: [3.4, 0, 1.6], alto: 0.6, rot: -0.4 });
  await S(R.recurso('Containers_Box_Medium'), { pos: [-3.4, 0, 2.6], ancho: 0.8 });
  await S(R.dun('bench'), { pos: [4.8, 0, 3], ancho: 2, rot: Math.PI / 2 });
  // la estantería de los envíos clasificados y la mesa de las cartas, con su pluma y lacre
  await S(R.dun('shelves_decorated'), { pos: [1.8, 0, -L / 2 + 0.6], alto: 2.4 });
  const cartas = await S(R.dun('table_medium'), { pos: [2.6, 0, -1.4], alto: 0.8 });
  await sobre(cartas, R.dun('book_tan'), 2.3, -1.4, { alto: 0.1, rot: 0.6 });
  await sobre(cartas, R.herr('journal_closed'), 2.9, -1.3, { alto: 0.18 });
  await sobre(cartas, R.dun('candle_thin_lit'), 3.1, -1.6, { alto: 0.3 }).catch(() => null);
  await S(R.dun('chair'), { pos: [2.6, 0, -0.5], alto: 0.95, rot: Math.PI });
  await S(R.recurso('Food_Crate_Small_Empty'), { pos: [-4.6, 0, -1.4], ancho: 0.8 });
  await S(R.dun('keg'), { pos: [-4.8, 0, 4.6], alto: 0.9 });
  await S(R.herr('rope_bundle_B'), { pos: [-3.6, 0, 4.8], ancho: 0.6 });
  await S(R.dun('torch_lit'), { pos: [-0.9, 0, 5.4], alto: 1.8 }).catch(() => null);
  await S(R.dun('torch_lit'), { pos: [0.9, 0, 5.4], alto: 1.8 }).catch(() => null);
  luzEn(mensajero, 0, 1.9, 5.3, '#ff8a3a', 6, 8, 10);
  await tinte(S(R.mueble('rug_oval_B'), { pos: [0, 0.01, 3.4], ancho: 2.4, propios: true }), '#4a6b2f');
}
// ---------------------------------------------------------------- Libro del Tabernero (paso 8)
// El despacho de las cuentas: escritorio con el libro mayor, cofre de oro y montones de monedas, librerías de registros
async function mueblesLibro() {
  const { S, sobre } = en(libro);
  await tinte(S(R.mueble('rug_oval_B'), { pos: [0.6, 0.01, -1.4], ancho: 3.6, propios: true }), '#5b3a7a');
  const mesa = await S(R.dun('table_medium_tablecloth_decorated_B'), { pos: [0.6, 0, -1.6], alto: 0.85 }).catch(() => S(R.dun('table_medium'), { pos: [0.6, 0, -1.6], alto: 0.85 }));
  await sobre(mesa, R.dun('book_grey'), 0.2, -1.6, { alto: 0.14, rot: 0.3 });
  await sobre(mesa, R.herr('journal_open'), 0.9, -1.5, { ancho: 0.5 });
  await sobre(mesa, R.dun('coin_stack_medium'), 1.3, -1.9, { alto: 0.18 });
  await sobre(mesa, R.dun('candle_triple'), -0.1, -2, { alto: 0.35 });
  luzEn(libro, -0.1, 1.6, -2, '#ffb347', 5, 7, 7);
  await S(R.dun('chair'), { pos: [0.6, 0, -2.6], alto: 0.95 });
  for (const x of [-3.2, -1.2, 3.6]) await S(R.dun(x > 0 ? 'bookcase_single_decoratedA' : 'bookcase_double_decoratedB'), { pos: [x, 0, -L / 2 + 0.3], alto: 2.4 });
  await S(R.dun('chest_large_gold'), { pos: [4.6, 0, 1.4], ancho: 1.2, rot: -Math.PI / 2 });
  await S(R.dun('coin_stack_large'), { pos: [4.6, 0, 2.8], alto: 0.4 });
  await S(R.dun('chest_gold'), { pos: [-4.6, 0, 3.8], ancho: 0.9, rot: Math.PI / 2 });
  await S(R.dun('shelf_small_candles'), { pos: [3.8, 3.2, -L / 2 + 0.25], ancho: 1 });
  await S(R.casa('Houseplant_8'), { pos: [-5, 0, -1], alto: 1.2 });
  // delante: la mesa de las cuentas del día, con dos sillas, ábaco de monedas y legajos; y el arca de los registros
  const cuentas = await S(R.dun('table_long_tablecloth_decorated_A'), { pos: [0.4, 0, 2.6], alto: 0.85 }).catch(() => S(R.dun('table_long'), { pos: [0.4, 0, 2.6], alto: 0.85 }));
  await sobre(cuentas, R.dun('coin_stack_small'), 0, 2.4, { alto: 0.12 });
  await sobre(cuentas, R.dun('book_brown'), 0.8, 2.8, { alto: 0.12, rot: -0.4 });
  await sobre(cuentas, R.dun('candle_lit'), 1.2, 2.3, { alto: 0.25 });
  for (const [x, r] of [[-0.8, Math.PI / 2], [1.6, -Math.PI / 2]]) await S(R.dun('chair'), { pos: [x, 0, 2.6], alto: 0.95, rot: r });
  await S(R.dun('trunk_large_C'), { pos: [-4.6, 0, 1.4], ancho: 1.1, rot: Math.PI / 2 });
  await S(R.dun('shelf_small_books'), { pos: [-1.2, 3.2, -L / 2 + 0.25], ancho: 1.1 });
  luzEn(libro, 0.4, 2.4, 2.6, '#ffb35c', 4, 7, 3);
  luzEn(libro, 0, 3, 1.5, '#ffb35c', 6, 10, 2);
}
async function tinte(o: Promise<THREE.Object3D>, color: string) { const x = await o; x.traverse((m: any) => { if (m.isMesh) for (const mm of [].concat(m.material) as THREE.MeshStandardMaterial[]) mm.color?.set(color); }); return x; }
// fuera: un prado con árboles y matas alrededor de la taberna (sin él, la sala flotaría en negro)
async function exterior() {
  const prado = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#4a6b2f', roughness: 1 }));
  prado.rotation.x = -Math.PI / 2; prado.position.y = -0.02; prado.receiveShadow = true; scene.add(prado);
  const camino = new THREE.Mesh(new THREE.PlaneGeometry(3, 30), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 }));
  camino.rotation.x = -Math.PI / 2; camino.position.set(L, -0.01, 2.5 * L + 15); scene.add(camino);
  const N = (n: string) => `kaykit-extra/forest-nature-pack-1.0/Assets/gltf/Color1/${n}.gltf`;
  // (la taberna ocupa de x = -18 a 6 y de z = -6 a 6: todo lo de fuera queda lejos de ese rectángulo)
  const cosas: [string, number, number, number][] = [['Tree_1_A_Color1', -14, -10, 5], ['Tree_2_B_Color1', -9, -13, 6], ['Tree_5_A_Color1', 9, -11, 5.5], ['Tree_6_A_Color1', -22, 1, 5], ['Tree_7_A_Color1', 12, -4, 4.5], ['Bush_1_A_Color1', -21, 8.5, 1.2], ['Bush_2_A_Color1', 21, 7.5, 1.1], ['Bush_4_C_Color1', -20.5, -6.5, 1], ['Rock_3_A_Color1', 21, 3, 0.8], ['Grass_1_A_Color1', -22, 14, 0.5], ['Grass_2_B_Color1', 9.6, -2, 0.5], ['Tree_4_B_Color1', 0, -15, 6], ['Tree_2_C_Color1', -20, -11, 5.5]];
  await Promise.all(cosas.map(([n, x, z, a]) => colocar(scene, N(n), { pos: [x, 0, z], alto: a, rot: x * 0.7, sombra: true }).catch(() => null)));
  scene.fog = new THREE.Fog('#1a120c', 120, 200);
}

// ---------------------------------------------------------------- gente: Aurelia en la mesa de mapas y la Tabernera
const gente: Personaje[] = [];
// los que se pueden seleccionar con el ratón, con su ficha
interface Npc { p: Personaje; nombre: string; mote: string; rol: string; paso?: PasoId; mercader?: boolean }
const npcs: Npc[] = [];
let jugador: Personaje | undefined;
const ficha = (p: Personaje, nombre: string, mote: string, rol: string, extra: Partial<Npc> = {}) => { npcs.push({ p, nombre, mote, rol, ...extra }); return p; };
async function personas() {
  const aurelia = new Personaje('Hiker', PASOS.mapas.aventurero.aspecto);
  await aurelia.cargar(); aurelia.raiz.position.set(-0.3, 0, 0.8); aurelia.raiz.rotation.y = Math.PI / 2; scene.add(aurelia.raiz);
  aurelia.reproducir('Interact', 0); gente.push(aurelia); ficha(aurelia, 'Aurelia', PASOS.mapas.aventurero.mote, 'Paso 1 · Sala de Mapas', { paso: 'mapas' });
  const tu = new Personaje('Protagonist_B', aspectoDe({ tipo: 'Protagonist_B' }));
  await tu.cargar(); tu.raiz.position.set(0, 0, L); tu.raiz.rotation.y = -Math.PI * 0.75; scene.add(tu.raiz); gente.push(tu); jugador = tu;
  // Dámaso, el escribano del Mostrador, tras la barra con el libro de supuestos
  const damaso = new Personaje('Hiker', PASOS.mostrador.aventurero.aspecto);
  await damaso.cargar(); damaso.raiz.position.set(OX + 0, 0, -3.5); scene.add(damaso.raiz); damaso.reproducir('Interact', 0); gente.push(damaso); ficha(damaso, 'Dámaso', PASOS.mostrador.aventurero.mote, 'Paso 2 · Mostrador del BA', { paso: 'mostrador' });
  const goblin2 = new Personaje('Goblin_B', aspectoDe({ tipo: 'Goblin_B' }));
  await goblin2.cargar(); goblin2.raiz.scale.multiplyScalar(0.62); goblin2.raiz.position.set(OX - 3, 0, 3.1); goblin2.raiz.rotation.y = 0.3; scene.add(goblin2.raiz); gente.push(goblin2);
  // Eulogio, el cocinero, emplatando en la mesa grande
  const eulogio = new Personaje('Hiker', PASOS.forja.aventurero.aspecto);
  await eulogio.cargar(); eulogio.raiz.position.set(OX, 0, OZ + 0.2); eulogio.raiz.rotation.y = Math.PI; scene.add(eulogio.raiz); eulogio.reproducir('Working_A', 0); gente.push(eulogio); ficha(eulogio, 'Eulogio', PASOS.forja.aventurero.mote, 'Pasos 3–4 · Cocina', { paso: 'forja' });
  // los de las salas nuevas y los parroquianos del Salón, sentados a probar
  const poner = async (tipo: string, aspecto: any, g: THREE.Group, x: number, z: number, rot: number, clip: string, escala = 1) => {
    const p = new Personaje(tipo, aspecto); await p.cargar(); if (escala !== 1) p.raiz.scale.multiplyScalar(escala);
    p.raiz.position.set(g.position.x + x, 0, g.position.z + z); p.raiz.rotation.y = rot; scene.add(p.raiz); p.reproducir(clip, 0); gente.push(p); return p;
  };
  for (const [id, g, x, z, rot, clip] of [['torre', torre, 1.8, 1.5, Math.PI, 'Interact'], ['salon', salon, -0.2, 0.4, 0.4, 'Idle_A'], ['mensajero', mensajero, -1.4, -1.4, Math.PI, 'Working_A'], ['libro', libro, 0.6, -0.7, Math.PI, 'Interact']] as const) {
    const a = PASOS[id].aventurero;
    ficha(await poner('Hiker', a.aspecto, g, x, z, rot, clip), a.nombre, a.mote, `Paso ${PASOS[id].numero} · ${PASOS[id].sala}`, { paso: id });
  }
  // los peregrinos del Comedor, probando el plato: caminantes con sombrero y mochila, gente del camino y goblins
  const PEREGRINOS: [string, number, number, number, string, string][] = [['Hiker', -3.9, -1.6, 2.2, 'Romero', 'Peregrino de larga ruta'], ['Survivalist', -2, -1.6, -2.3, 'Brígida', 'Peregrina con prisa'], ['Goblin_B', 0.7, -1.7, 2.3, 'Trasgo', 'Goblin que lo prueba todo'], ['Protagonist_A', -3, 3.4, Math.PI, 'Elvira', 'Peregrina primeriza'], ['Goblin', 3.5, 1.5, -2.2, 'Nabo', 'Goblin de paladar fino'], ['Hiker', 1.6, 2.8, 2, 'Tomás', 'Peregrino veterano']];
  for (const [t, x, z, r, n, m] of PEREGRINOS) ficha(await poner(t, aspectoDe({ tipo: t, tono: t === 'Hiker' ? Math.round(x * 50 + 200) : undefined }), salon, x, z, r, 'Interact', t.startsWith('Goblin') ? 0.7 : 1), n, m, 'Prueba el plato en el Comedor (paso 6)');
  const goblin = new Personaje('Goblin', aspectoDe({ tipo: 'Goblin' }));
  await goblin.cargar(); goblin.raiz.scale.multiplyScalar(0.62); goblin.raiz.position.set(4, 0, 1.4); goblin.raiz.rotation.y = -Math.PI / 2; scene.add(goblin.raiz);
  goblin.reproducir('Working_A', 0); gente.push(goblin); ficha(goblin, 'Grisko', 'Goblin recadero', 'Lleva y trae entre salas');
  // Gorgo, el buhonero, con su fardo en el salón central: vende adornos por el oro de los pasos
  const gorgo = new Personaje('Goblin_B', aspectoDe({ tipo: 'Goblin_B' }));
  await gorgo.cargar(); gorgo.raiz.scale.multiplyScalar(0.7); gorgo.raiz.position.set(-3.2, 0, 13.5); gorgo.raiz.rotation.y = 0.6; scene.add(gorgo.raiz);
  gorgo.reproducir('Idle_A', 0); gente.push(gorgo); ficha(gorgo, 'Gorgo', 'El Buhonero', 'Vende adornos por oro (cambia cada día)', { mercader: true });
  await colocar(scene, R.dun('chest'), { pos: [-2.2, 0, 13.1], ancho: 0.9, rot: 0.6, sombra: true }).catch(() => null);
  await colocar(scene, `${PACKS.sv.carpeta}/Backpack${PACKS.sv.ext}`, { pos: [-3.9, 0, 12.9], alto: 0.6, sombra: true }).catch(() => null);
}

// ---------------------------------------------------------------- cámara, ratón y salas
// El ratón lleva a la Tabernera: clic en el suelo y va andando; clic en alguien y lo selecciona (su ficha abajo). Los
// carteles de las salas solo salen al pasar el ratón por encima de una o con la Tabernera dentro; al entrar en una sala
// sale arriba su título. Las teclas 1 a 8 acercan la cámara a cada sala y Esc vuelve a la vista general.
const giro = THREE.MathUtils.degToRad(+(q.get('giro') ?? 45));
const alto = THREE.MathUtils.degToRad(+(q.get('alto') ?? 38));
camera.fov = 22; camera.near = 1; camera.far = 260;
const GENERAL = { centro: new THREE.Vector3(+(q.get('x') ?? -1), 0.6, +(q.get('z') ?? 13)), dist: +(q.get('dist') ?? 96) };
const SALAS = [
  { id: 'mapas' as const, grupo: sala, tecla: '1' },
  { id: 'mostrador' as const, grupo: mostrador, tecla: '2' },
  { id: 'forja' as const, grupo: forja, tecla: '3' },
  { id: 'torre' as const, grupo: torre, tecla: '5' },
  { id: 'salon' as const, grupo: salon, tecla: '6' },
  { id: 'mensajero' as const, grupo: mensajero, tecla: '7' },
  { id: 'libro' as const, grupo: libro, tecla: '8' },
];
type SalaIso = (typeof SALAS)[number];
const salaEn = (x: number, z: number) => SALAS.find(sl => Math.abs(x - sl.grupo.position.x) < L / 2 && Math.abs(z - sl.grupo.position.z) < L / 2) ?? null;
const camObjetivo = GENERAL.centro.clone(), camMirada = GENERAL.centro.clone();
let camDist = GENERAL.dist, camDistAhora = GENERAL.dist;
function colocarCamara() {
  camera.position.set(camMirada.x + Math.sin(giro) * Math.cos(alto) * camDistAhora, camMirada.y + Math.sin(alto) * camDistAhora, camMirada.z + Math.cos(giro) * Math.cos(alto) * camDistAhora);
  camera.lookAt(camMirada); camera.updateProjectionMatrix();
}
colocarCamara();
function enfocar(sl: SalaIso | null) {
  if (sl) { camObjetivo.set(sl.grupo.position.x, 0.6, sl.grupo.position.z + 0.6); camDist = 34; }
  else { camObjetivo.copy(GENERAL.centro); camDist = GENERAL.dist; }
}

// la interfaz: carteles (ocultos salvo con el ratón encima o la Tabernera dentro), título y ficha de quien se selecciona
const capa = document.createElement('div'); capa.className = 'capa-taberna'; document.body.appendChild(capa);
const titulo = document.createElement('div'); titulo.className = 'titulo-sala'; document.body.appendChild(titulo);
const fichaNpc = document.createElement('div'); fichaNpc.className = 'ficha-npc'; document.body.appendChild(fichaNpc);
const carteles = SALAS.map(sl => {
  const p = PASOS[sl.id];
  const c = document.createElement('button'); c.className = 'cartel-sala';
  c.innerHTML = `<b>${p.numero}</b><span>${p.sala}</span>`;
  c.onclick = () => { if (EN_JUEGO && camObjetivo.distanceTo(new THREE.Vector3(sl.grupo.position.x, 0.6, sl.grupo.position.z + 0.6)) < 1) abrirPanel(sl.id); else enfocar(sl); }; capa.appendChild(c);
  return c;
});
let salaRaton: SalaIso | null = null, salaJugador: SalaIso | null = null;
function ponerTitulo(sl: SalaIso | null) {
  const p = sl && PASOS[sl.id];
  titulo.innerHTML = p ? `<small>PASO ${p.numero}</small><h1>${p.sala}</h1><p>${p.etapa}${p.comando ? ` · <code>${p.comando}</code>` : ''}</p>` : '';
  titulo.classList.toggle('visible', !!p);
}
// selección: anillo dorado a los pies y la ficha
const anillo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 40), new THREE.MeshBasicMaterial({ color: '#ffcf4a', transparent: true, opacity: 0.9, depthWrite: false }));
anillo.rotation.x = -Math.PI / 2; anillo.visible = false; anillo.renderOrder = 3; scene.add(anillo);
let elegido: Npc | null = null;
function seleccionar(n: Npc | null) {
  elegido = n; anillo.visible = !!n;
  pintarFicha();
}
function pintarFicha() {
  const n = elegido;
  const hab = n && habitanteDe(n);
  const puede = EN_JUEGO && n && (hab || n.mercader);
  const est = hab ? juego.get().habitantes.find(x => x.id === hab.id) : null;
  fichaNpc.innerHTML = n ? `<h2>${escapar(hab?.nombre ?? n.nombre)}</h2><em>«${escapar(hab?.mote || n.mote)}»</em>${est && est.estado !== 'ocioso' ? `<span class="estado-npc">${TEXTO_ESTADO[est.estado] ?? est.estado}${est.detalle ? ': ' + escapar(est.detalle).slice(0, 80) : ''}</span>` : ''}<p>${n.rol}</p>`
    + (puede ? `<button class="activo" data-a="hablar">${n.mercader ? 'Ver lo que trae' : 'Hablar'} <small style="color:#ffcf7a">E</small></button>${n.paso ? '<button class="activo" data-a="panel">Historias <small style="color:#ffcf7a">Enter</small></button>' : ''}` : '<button disabled>Hablar</button>')
    + '<small>Esc para soltar</small>' : '';
  fichaNpc.classList.toggle('visible', !!n);
  fichaNpc.querySelector('[data-a=hablar]')?.addEventListener('click', () => n && hablarCon(n));
  fichaNpc.querySelector('[data-a=panel]')?.addEventListener('click', () => n?.paso && abrirPanel(n.paso));
}
const TEXTO_ESTADO: Record<string, string> = { pensando: '… pensando', trabajando: '⚙ trabajando', esperando: '? te espera', terminado: '✓ ha terminado', error: '✕ avería' };
const escapar = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
addEventListener('keydown', e => {
  // con una conversación, un panel o escribiendo, las teclas no son de la taberna
  const t = e.target as HTMLElement | null;
  if (EN_JUEGO && (juego.get().hablandoCon || juego.get().panel || t?.closest?.('input, textarea, [contenteditable], .intercom, .ventana'))) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape' && (elegido || camDist !== GENERAL.dist)) { seleccionar(null); enfocar(null); if (EN_JUEGO) e.stopImmediatePropagation(); return; }
  if (EN_JUEGO && elegido && e.code === 'KeyE') { hablarCon(elegido); e.preventDefault(); return; }
  if (EN_JUEGO && elegido?.paso && e.code === 'Enter') { abrirPanel(elegido.paso); e.preventDefault(); return; }
  const sl = SALAS.find(x => x.tecla === e.key); if (sl) enfocar(sl);
}, true);
// el ratón: qué sala hay debajo, a quién se apunta y adónde se va
const rayo = new THREE.Raycaster(), raton = new THREE.Vector2(), SUELO_Y = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function apuntar(ev: MouseEvent) {
  const r = motor.renderer.domElement.getBoundingClientRect();
  raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  rayo.setFromCamera(raton, camera);
}
/** El personaje más cercano al rayo (un cilindro de 0,5 m de radio y su altura), o null */
function npcBajoRaton(): Npc | null {
  let mejor: Npc | null = null, dMejor = Infinity;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), enRayo = new THREE.Vector3(), enSeg = new THREE.Vector3();
  for (const n of npcs) {
    const k = n.p.raiz.scale.y;
    a.copy(n.p.raiz.position); b.copy(a).setY(a.y + 1.7 * k);
    const d2 = rayo.ray.distanceSqToSegment(a, b, enRayo, enSeg);
    if (d2 < (0.5 * k) ** 2 && enRayo.distanceTo(rayo.ray.origin) < dMejor) { dMejor = enRayo.distanceTo(rayo.ray.origin); mejor = n; }
  }
  return mejor;
}
const lienzo = motor.renderer.domElement;
lienzo.addEventListener('mousemove', ev => {
  apuntar(ev);
  const p = rayo.ray.intersectPlane(SUELO_Y, new THREE.Vector3());
  salaRaton = p ? salaEn(p.x, p.z) : null;
  lienzo.style.cursor = npcBajoRaton() ? 'pointer' : 'default';
});
lienzo.addEventListener('mouseleave', () => { salaRaton = null; });
lienzo.addEventListener('click', ev => {
  apuntar(ev);
  const n = npcBajoRaton(); if (n) { if (n === elegido && ev.detail >= 2 && EN_JUEGO) hablarCon(n); else seleccionar(n); return; }
  const p = rayo.ray.intersectPlane(SUELO_Y, new THREE.Vector3()); if (!p) return;
  // dentro de la taberna (las salas y el salón central): la Tabernera va andando hasta ahí
  if (p.x > -L * 1.5 && p.x < L * 1.5 && p.z > -L / 2 && p.z < L * 2.5) jugador?.irA(new THREE.Vector3(p.x, 0, p.z));
});
const v = new THREE.Vector3();
function moverCarteles() {
  const r = lienzo.getBoundingClientRect();
  SALAS.forEach((sl, i) => {
    v.set(sl.grupo.position.x, H + 1.2, sl.grupo.position.z - L / 2 + 0.4).project(camera);
    carteles[i].style.transform = `translate(-50%, -100%) translate(${(v.x + 1) / 2 * r.width}px, ${(1 - v.y) / 2 * r.height}px)`;
    carteles[i].classList.toggle('visible', sl === salaRaton || sl === salaJugador);
  });
}
if (q.get('sala')) { const sl = SALAS.find(x => x.id === q.get('sala')); if (sl) { enfocar(sl); camMirada.copy(camObjetivo); camDistAhora = camDist; colocarCamara(); } }
// (QA: ?raton=<id de sala> simula el ratón encima de esa sala; ?yo=<id> pone a la Tabernera dentro; ?elegir=<nombre> selecciona)

motor.cadaFotograma((dt, t) => {
  for (const p of gente) p.actualizar(dt);
  if (Math.floor(t * 2) !== Math.floor((t - dt) * 2) || t < 0.1) ponerHora(horaAhora());   // dos veces por segundo basta
  for (const l of puntos) l.luz.intensity = factorVelas * l.base * (0.85 + 0.15 * Math.sin(t * l.vel) * Math.sin(t * l.vel * 0.37 + 1.3));
  camMirada.x = THREE.MathUtils.damp(camMirada.x, camObjetivo.x, 4, dt); camMirada.z = THREE.MathUtils.damp(camMirada.z, camObjetivo.z, 4, dt);
  camDistAhora = THREE.MathUtils.damp(camDistAhora, camDist, 4, dt);
  colocarCamara();
  // en qué sala está la Tabernera: su título arriba (y su cartel)
  if (jugador) { const sl = salaEn(jugador.raiz.position.x, jugador.raiz.position.z); if (sl !== salaJugador) { salaJugador = sl; ponerTitulo(sl); } }
  if (elegido) { anillo.position.set(elegido.p.raiz.position.x, 0.03, elegido.p.raiz.position.z); anillo.material.opacity = 0.65 + 0.3 * Math.sin(t * 4); }
  moverCarteles();
  if (EN_JUEGO) alFotograma(t);
});

const listo = (async () => {
  // la L: Sala de Mapas y Mostrador al fondo, la Forja delante del Mostrador (la esquina libre será el salón)
  // las salas rodean el salón central (0, 12): cada pared que da a otra sala o al salón es un murete con paso
  // cada sala con su suelo y el tono de su yeso y su madera
  paredes(sala, { ventana: 3.4, izquierda: { paso: 3.4 }, frente: { paso: 0 } });
  paredes(mostrador, { ventana: -1.5, derecha: false, frente: { paso: -2.5 }, tono: { yeso: '#f3e3c0', madera: '#5a3a22' } });
  paredes(forja, { fondo: false, derecha: { paso: 0 }, frente: { paso: -2 }, tono: { yeso: '#d9c9b0', madera: '#2a1a0e' } });
  paredes(torre, { fondo: false, derecha: { paso: 2 }, tono: { yeso: '#c9cfd6', madera: '#2b2a30' } });
  paredes(salon, { fondo: { paso: 0 }, izquierda: false, derecha: { paso: 0 }, tono: { yeso: '#f0d6a8' } });
  paredes(mensajero, { fondo: { paso: 0 }, izquierda: false, frente: { paso: 0 }, tono: { yeso: '#e3d3b8', madera: '#4a3020' } });
  paredes(libro, { ventana: 2.6, izquierda: { paso: 0 }, frente: false, tono: { yeso: '#e6d2c6', madera: '#3b1f1a' } });
  const suelos: [THREE.Group, Suelo][] = [[sala, 'madera'], [mostrador, 'oscura'], [forja, 'piedra'], [torre, 'piedra'], [salon, 'madera'], [mensajero, 'piedra'], [libro, 'oscura'], [central, 'madera']];
  await Promise.all([...suelos.map(([g, t]) => suelo(g, t)), muebles(), mueblesMostrador(), mueblesForja(), mueblesTorre(), mueblesSalon(), mueblesMensajero(), mueblesLibro(), personas(), exterior()]);
  sala.traverse((o: any) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  motor.renderer.shadowMap.needsUpdate = true;
  // QA: estados fijos para las capturas
  const porId = (id: string | null) => SALAS.find(x => x.id === id) ?? null;
  if (q.get('yo')) { const sl = porId(q.get('yo')); if (sl && jugador) jugador.raiz.position.set(sl.grupo.position.x + 1.5, 0, sl.grupo.position.z + 2.5); }
  if (q.get('raton')) salaRaton = porId(q.get('raton'));
  if (q.get('elegir')) seleccionar(npcs.find(n => n.nombre === q.get('elegir')) ?? null);
})();
if (EN_JUEGO) listo.then(() => { conectar(); dispatchEvent(new CustomEvent('refugio:carga', { detail: { progreso: 1, sala: '' } })); });
(window as any).__ready = () => listo;
(window as any).__step = (dt: number) => motor.paso(dt);
if (!(window as any).__noLoop) listo.then(() => motor.alCambiarPrimerPlano(true));

// ---------------------------------------------------------------- conexión con el juego de verdad
// Cada aventurero de un paso es el habitante real de su sala: hablar con él abre el intercomunicador del juego (la
// conversación con Claude Code, con adjuntos, dictado y los comandos de sus skills); su estado sale encima, con la
// barra de progreso mientras trabaja. Los adornos comprados al buhonero se ponen en su sala.
type HabVivo = { id: string; nombre: string; mote: string; tipo: string; bio: string; salaId: string };
function habitanteDe(n: Npc): HabVivo | undefined {
  if (!n.paso) return undefined;
  return ((vivo.get().estado?.habitantes ?? []) as HabVivo[]).find(h => h.salaId === n.paso);
}
const sesionDe = (hid: string) => Object.values(vivo.get().sesiones).filter((s: any) => s.habitanteId === hid && s.estado !== 'cerrada')
  .sort((a: any, b: any) => urg(a) - urg(b) || b.actualizada - a.actualizada)[0] as any;
const urg = (s: any) => s.estado === 'esperando' ? 0 : s.estado === 'error' ? 1 : s.estado === 'terminada' && s.sinLeer ? 2 : s.estado === 'trabajando' || s.estado === 'arrancando' ? 3 : 4;
function estadoDe(s: any): [string, string] {
  if (!s) return ['ocioso', ''];
  if (s.estado === 'arrancando') return ['pensando', 'preparándose…'];
  if (s.estado === 'trabajando') return [s.actividad?.modo && s.actividad.modo !== 'pensar' ? 'trabajando' : 'pensando', s.actividad?.texto ?? ''];
  if (s.estado === 'esperando') return ['esperando', s.pendiente?.titulo ?? 'te espera'];
  if (s.estado === 'terminada' && s.sinLeer) return ['terminado', 'listo: ' + (s.titulo ?? '')];
  if (s.estado === 'error') return ['error', s.error ?? 'avería'];
  return ['ocioso', s.titulo ?? ''];
}
const inicios = new Map<string, number>();
function progresoDe(s: any): number | undefined {
  if (!s || !['arrancando', 'trabajando'].includes(s.estado)) { if (s) inicios.delete(s.id); return undefined; }
  const t0 = inicios.get(s.id) ?? (inicios.set(s.id, Date.now()), Date.now());
  const x = (Date.now() - t0) / 1000 / 25 + (s.herramientas ?? 0) / 12;
  return Math.min(0.95, 0.04 + (1 - Math.exp(-x / 3)));
}
function publicar() {
  const salas: any[] = vivo.get().estado?.salas ?? [];
  const lista = ((vivo.get().estado?.habitantes ?? []) as HabVivo[]).map(h => {
    const s = sesionDe(h.id); const [estado, detalle] = estadoDe(s); const sala = salas.find(x => x.id === h.salaId);
    return { id: h.id, nombre: h.nombre, mote: h.mote, tipo: h.tipo, bio: h.bio, sala: h.salaId, salaNombre: sala?.nombre ?? h.salaId, ruta: sala?.ruta, carpeta: sala?.carpeta ?? sala?.ruta, estado, detalle, sesionId: s?.id, robot: false };
  });
  juego.set({ habitantes: lista as any, salaActual: salaJugador?.id ?? '' });
}
let retrato: Retrato | null = null;
function hablarCon(n: Npc) {
  if (n.mercader) { juego.set({ panel: 'sala', panelDatos: { salaId: salaJugador?.id ?? 'mapas', vista: 'mercader' } }); return; }
  const h = habitanteDe(n); if (!h) return;
  retrato?.destruir(); retrato = new Retrato(n.p); (window as any).__retrato = retrato.canvas;
  const sl = SALAS.find(x => x.id === n.paso); if (sl) enfocar(sl);
  etiquetas.raiz.style.display = 'none';
  juego.set({ hablandoCon: h.id, indicacion: null });
}
function abrirPanel(salaId: string) { juego.set({ panel: 'sala', panelDatos: { salaId } }); }
const etiquetas = EN_JUEGO ? new CapaEtiquetas() : (null as unknown as CapaEtiquetas);
let ultimaPublicacion = 0;
function alFotograma(t: number) {
  if (t - ultimaPublicacion > 0.5) { ultimaPublicacion = t; publicar(); if (elegido) pintarFichaSiCambia(); }
  fichaNpc.style.visibility = juego.get().hablandoCon ? 'hidden' : '';
  if (juego.get().hablandoCon) return;
  if (etiquetas.raiz.style.display === 'none') etiquetas.raiz.style.display = '';
  const items = npcs.filter(n => n.paso).map(n => {
    const h = habitanteDe(n); const s = h && sesionDe(h.id); const [estado, detalle] = estadoDe(s);
    const pos = n.p.raiz.position.clone(); pos.y += 1.75 * n.p.raiz.scale.y;
    return { k: n, pos, alto: 0, nombre: h?.nombre ?? n.nombre, estado, detalle: n === elegido && estado !== 'ocioso' ? detalle.slice(0, 50) : '', cerca: n === elegido, prompt: n === elegido ? 'Hablar' : '', progreso: progresoDe(s) };
  });
  etiquetas.actualizar(camera, items as any);
}
let fichaFirma = '';
function pintarFichaSiCambia() {
  const h = elegido && habitanteDe(elegido); const e = h && juego.get().habitantes.find(x => x.id === h.id);
  const f = (elegido?.nombre ?? '') + (e ? e.estado + e.detalle : '');
  if (f !== fichaFirma) { fichaFirma = f; pintarFicha(); }
}
// los adornos de cada sala (modo decorar): x de la escena (±5,8 m) a lo ancho, z de fondo (−2,25) a frente (2,1) a lo hondo
const adornosEn = new Map<string, THREE.Group>();
let firmaAdornos = '';
function ponerAdornos() {
  const salas: any[] = vivo.get().estado?.salas ?? [];
  const f = JSON.stringify(salas.map(s => [s.id, s.adornos ?? []]));
  if (f === firmaAdornos) return; firmaAdornos = f;
  for (const sl of SALAS) {
    adornosEn.get(sl.id)?.removeFromParent();
    const ads: Adorno[] = salas.find(s => s.id === sl.id)?.adornos ?? [];
    const g = new THREE.Group(); g.position.copy(sl.grupo.position); scene.add(g); adornosEn.set(sl.id, g);
    for (const a of ads) {
      const m = mercancia(a.mercancia); if (!m) continue;
      const [pack, nombre] = m.modelo.split('/'); const pk = PACKS[pack]; if (!pk) continue;
      const x = THREE.MathUtils.clamp(a.x, -5.2, 5.2), z = m.pared ? -L / 2 + 0.3 : THREE.MathUtils.mapLinear(a.z, -2.25, 2.1, -4.6, 4.6);
      colocar(g, `${pk.carpeta}/${nombre}${pk.ext}`, { pos: [x, m.pared ? (m.y ?? 1.2) + 0.6 : 0, z], rot: THREE.MathUtils.degToRad(a.giro), sombra: true, ...(m.alto ? { alto: m.alto } : {}) })
        .then(() => { motor.renderer.shadowMap.needsUpdate = true; }).catch(() => null);
    }
  }
}
function conectar() {
  publicar(); ponerAdornos(); vivo.suscribir(() => ponerAdornos());
  addEventListener('refugio:fin-dialogo', () => { retrato?.destruir(); retrato = null; (window as any).__retrato = undefined; });
  // viaje rápido (plano, tablón, buscador): a la sala y, con `hablar`, la conversación con su aventurero
  addEventListener('refugio:ir', (ev: any) => {
    const { salaId, habitanteId, hablar } = ev.detail ?? {};
    const sl = SALAS.find(x => x.id === salaId); if (sl) { enfocar(sl); jugador?.irA(new THREE.Vector3(sl.grupo.position.x + 1.5, 0, sl.grupo.position.z + 2.5)); }
    const hab = ((vivo.get().estado?.habitantes ?? []) as HabVivo[]).find(h => h.id === habitanteId);
    const n = hab && npcs.find(x => x.paso === hab.salaId);
    if (n) { seleccionar(n); if (hablar) hablarCon(n); }
  });
}
