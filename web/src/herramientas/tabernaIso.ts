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

const q = new URLSearchParams(location.search);
const L = 12, H = 4.43, BAJO = 1.1;           // lado de la sala, alto de las paredes del fondo y de las de delante
const motor = new Motor(document.getElementById('lienzo')!);
const { scene, camera } = motor;
scene.background = new THREE.Color('#2b2420');
const sala = new THREE.Group(); scene.add(sala);

// ---------------------------------------------------------------- luz: penumbra cálida, fuego, araña y velas
scene.add(new THREE.HemisphereLight('#ffd9a8', '#3a2414', 0.55));
const luna = new THREE.DirectionalLight('#9fb4ff', 0.35); luna.position.set(-8, 14, -4); scene.add(luna);
const sol = new THREE.DirectionalLight('#ffd7a0', 0.9); sol.position.set(10, 18, 8); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 }); sol.shadow.mapSize.set(4096, 4096); sol.shadow.bias = -0.0008; scene.add(sol);
const puntos: { luz: THREE.PointLight; base: number; vel: number }[] = [];
function luz(x: number, y: number, z: number, color: string, intensidad: number, distancia: number, parpadeo = 0) {
  const l = new THREE.PointLight(color, intensidad, distancia, 1.6); l.position.set(x, y, z); scene.add(l);
  if (parpadeo) puntos.push({ luz: l, base: intensidad, vel: parpadeo });
  return l;
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

async function suelo(g: THREE.Group) {
  const { S } = en(g);
  const ps: Promise<unknown>[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    ps.push(S(R.dun('floor_wood_large'), { pos: [-L / 2 + 2 + i * 4, 0, -L / 2 + 2 + j * 4], ancho: 4, ancla: 'techo', rot: ((i * 3 + j) % 2) * Math.PI, sombra: false }));
  await Promise.all(ps);
}
/** Las paredes de una sala. Fondo (z = -6) e izquierda (x = -6) son de entramado entero si dan afuera; las que dan a
 *  una sala vecina, y siempre la de delante y la de la derecha, son muretes (una pared alta taparía lo que hay detrás
 *  desde esta cámara). `paso`: dónde se abre el hueco para pasar en ese murete (en x para fondo y delante, en z para los
 *  lados); `false`: sin pared ahí (la pone la sala vecina). */
type Lado = 'entero' | false | { paso?: number };
function paredes(g: THREE.Group, o: { ventana?: number; fondo?: Lado; izquierda?: Lado; derecha?: Lado; frente?: Lado }) {
  const madera = materialAcero('#3a2414');
  const fondo = o.fondo ?? 'entero', izquierda = o.izquierda ?? 'entero', derecha = o.derecha ?? {}, frente = o.frente ?? {};
  if (fondo === 'entero') muroEntramado(g, -L / 2, L / 2, -L / 2, 0, o.ventana !== undefined ? { x: o.ventana, y: H * 0.55, w: 1.8, h: 1.6 } : undefined);
  if (izquierda === 'entero') { const izq = muroEntramado(g, 0, L, 0, 0); izq.rotation.y = Math.PI / 2; izq.position.set(-L / 2, 0, L / 2); }
  // un murete a lo largo de x (en z) o de z (en x), partido por el hueco del paso, con pies derechos a los lados
  const murete = (enX: boolean, fijo: number, paso?: number) => {
    const tramos: [number, number][] = paso === undefined ? [[-L / 2, L / 2]] : [[-L / 2, paso - 0.9], [paso + 0.9, L / 2]];
    for (const [a, b] of tramos) {
      const largo = b - a, c = (a + b) / 2;
      const [w, d, x, z] = enX ? [largo, 0.25, c, fijo] : [0.25, largo, fijo, c];
      g.add(caja(w, BAJO, d, materialYeso(), x, BAJO / 2, z, true), caja(w + 0.1, 0.16, d + 0.1, madera, x, BAJO + 0.08, z, true));
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
    const cielo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2), new THREE.MeshBasicMaterial({ color: '#2b3a66' }));
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
// ---------------------------------------------------------------- muebles de la Forja (pasos 3 y 4)
// Eulogio forja los prototipos: fragua con fuego en la pared de fuera, yunque con martillo y tenazas delante, banco de
// trabajo con los planos del prototipo (lo que se construye) y la piedra de afilar, tinas de temple, lingotes y armas
async function mueblesForja() {
  const { S, sobre } = en(forja);
  const W = (x: number, z: number) => [OX + x, OZ + z] as const;
  // la fragua: una chimenea oscura en la pared de la izquierda, con fuego vivo y su resplandor
  await tinte(S(R.casa('Fireplace'), { pos: [-L / 2 + 0.55, 0, -1.5], rot: Math.PI / 2, alto: 2.4, propios: true }), '#4a3a32');
  await S(R.sv('Bonfire_Fire'), { pos: [-L / 2 + 0.9, 0.05, -1.5], alto: 0.6 });
  { const [x, z] = W(-L / 2 + 1.3, -1.5); luz(x, 0.9, z, '#ff6a1a', 16, 11, 9); }
  await S(R.recurso('Wood_Log_Stack'), { pos: [-L / 2 + 0.8, 0, -3.6], ancho: 1.3, rot: Math.PI / 2 });
  // el yunque, con tenazas y martillo, y la tina de temple
  const yunque = await S(R.herr('anvil'), { pos: [-2.6, 0, -1.4], ancho: 1.1, rot: Math.PI / 2 });
  await sobre(yunque, R.herr('hammer'), -2.6, -1.2, { alto: 0.12, rotZ: Math.PI / 2 });
  await S(R.herr('tongs'), { pos: [-2, 0, -2.4], alto: 0.6, rot: 0.4 });
  await S(R.herr('bucket_metal'), { pos: [-3.6, 0, -0.1], alto: 0.6 });
  await S(R.dun('barrel_large'), { pos: [-4.8, 0, 1.2], alto: 1 });
  // el banco de trabajo con los planos del prototipo
  const banco = await S(R.dun('table_long'), { pos: [1.8, 0, -3.4], alto: 0.85, rot: Math.PI / 2 });
  await sobre(banco, R.herr('blueprint'), 1.3, -3.4, { ancho: 0.8 });
  await sobre(banco, R.herr('blueprint_stacked'), 2.5, -3.5, { ancho: 0.6 });
  await sobre(banco, R.herr('saw'), 2.9, -3.2, { ancho: 0.6, rotZ: Math.PI / 2 });
  await sobre(banco, R.dun('candle_lit'), 0.7, -3.6, { alto: 0.3 });
  { const [x, z] = W(1.8, -3.4); luz(x, 1.8, z, '#ffb347', 5, 7, 6); }
  await S(R.dun('stool_round'), { pos: [1.8, 0, -2.4], alto: 0.5 });
  await S(R.herr('grindstone'), { pos: [4.7, 0, -4.3], alto: 1 });
  // materiales y armas: lingotes, cajas de piezas, armero y escudos
  await S(R.recurso('Iron_Bars_Stack_Large'), { pos: [4.6, 0, -1.6], ancho: 1 });
  await S(R.recurso('Gold_Bars_Stack_Small'), { pos: [4.9, 0, -0.4], ancho: 0.6 });
  await S(R.recurso('Containers_Crate_Small_Grey'), { pos: [4.6, 0, 2.4], ancho: 0.7 });
  await S(R.dun('crates_stacked'), { pos: [4.5, 0, 4.4], alto: 1.1 });
  await S(R.dun('sword_shield'), { pos: [-L / 2 + 0.15, 1.7, 2.2], alto: 1.1, rot: Math.PI / 2 });
  await S(R.dun('sword_shield_gold'), { pos: [-L / 2 + 0.15, 1.7, 3.8], alto: 1.1, rot: Math.PI / 2 });
  await S(R.dun('pickaxe'), { pos: [-L / 2 + 0.5, 0, 5], alto: 1, rot: 0.3 });
  // suelo de tierra pisada delante de la fragua y el yunque (la chispa no prende en la madera)
  for (const [x, z] of [[-3.2, -2], [-3.2, 0.4], [-0.8, -2]]) await S(R.dun('floor_dirt_large'), { pos: [x, 0.012, z], ancho: 2.4, ancla: 'techo', sombra: false }).catch(() => null);
  // segundo banco: el de las herramientas finas, con limas, cinceles, llave y tenazas colgadas
  const banco2 = await S(R.dun('table_medium'), { pos: [-0.6, 0, 3.2], alto: 0.85 });
  for (const [n, x, z, a] of [['file', -0.9, 3.1, 0.25], ['chisel', -0.6, 3.3, 0.22], ['wrench_A', -0.2, 3.1, 0.25], ['screwdriver_A_long_color', -0.5, 2.95, 0.25]] as const) await sobre(banco2, R.herr(n), x, z, { alto: a, rotZ: Math.PI / 2, rot: 0.4 });
  await sobre(banco2, R.recurso('Iron_Nuggets'), 0.1, 3.3, { ancho: 0.4 });
  await S(R.dun('stool'), { pos: [-0.6, 0, 4.1], alto: 0.6 });
  // pila de piedras y montones de mineral, pico y cubo de picos junto a la pared de fuera
  await S(R.recurso('Stone_Bricks_Stack_Large'), { pos: [-4.6, 0, 3.4], ancho: 1.1 });
  await S(R.dun('bucket_pickaxes'), { pos: [-3.4, 0, 4.8], alto: 0.9 });
  await S(R.recurso('Copper_Bars_Stack_Medium'), { pos: [2.8, 0, -0.6], ancho: 0.8 });
  await S(R.dun('rocks_gold'), { pos: [3, 0, 1.2], ancho: 0.9 }).catch(() => null);
  // la segunda lumbre: el brasero de templar, con su resplandor
  await S(R.sv('Bonfire_Fire'), { pos: [1.2, 0, 0.6], alto: 0.7 });
  { const [x, z] = W(1.2, 0.6); luz(x, 0.8, z, '#ff6a1a', 8, 7, 11); }
  await S(R.herr('bucket_metal'), { pos: [2, 0, 1.4], alto: 0.5 });
  // más armas y escudos recién forjados en la pared del fondo de la sala de al lado no; en un armero propio
  await S(R.dun('shelves'), { pos: [-L / 2 + 0.4, 0, 0.6], alto: 2.2, rot: Math.PI / 2 }).catch(() => null);
  for (const [y, z, n] of [[1, 0.2, 'sword_shield_broken'], [1.7, 1, 'sword_shield']] as const) await S(R.dun(n), { pos: [-L / 2 + 0.5, y, z], alto: 0.6, rot: Math.PI / 2 }).catch(() => null);
  { const [x, z] = W(0, 1.5); luz(x, 2.8, z, '#ffb35c', 6, 10, 2); }
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
// ---------------------------------------------------------------- Salón de los Parroquianos (paso 6)
// Donde los parroquianos prueban los prototipos: mesas redondas con jarras y comida, tarima con el banco del posadero,
// toneles; Fabricio va de mesa en mesa y los parroquianos (goblins y gente del pueblo) se sientan a probar
async function mueblesSalon() {
  const { S, sobre } = en(salon);
  await tinte(S(R.mueble('rug_rectangle_stripes_A'), { pos: [0, 0.01, 0.8], ancho: 7, propios: true }), '#8c1c13');
  const mesas: THREE.Object3D[] = [];
  for (const [x, z] of [[-3, -2.2], [1.6, -2.4], [-2.4, 2.4], [2.6, 2.2]]) {
    const m = await S(R.dun('table_round_medium'), { pos: [x, 0, z], alto: 0.8 }); mesas.push(m);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + x; await S(R.dun('stool_round'), { pos: [x + Math.cos(a) * 1.05, 0, z + Math.sin(a) * 1.05], alto: 0.5 }); }
  }
  await sobre(mesas[0], R.dun('plate_food_A'), -3, -2.2, { ancho: 0.4 });
  await sobre(mesas[1], R.cocina('jar_A_large'), 1.6, -2.4, { alto: 0.3 }).catch(() => null);
  await sobre(mesas[2], R.mueble('mug_A'), -2.3, 2.3, { alto: 0.18 });
  await sobre(mesas[3], R.dun('plate_food_B'), 2.6, 2.2, { ancho: 0.4 });
  await sobre(mesas[3], R.dun('candle_lit'), 2.9, 2, { alto: 0.25 });
  // el rincón de las bebidas: barriles y tonel con espita junto a la pared de la izquierda (es la de la Torre)
  await S(R.dun('barrel_large_decorated'), { pos: [-5, 0, -4.8], alto: 1.1 });
  await S(R.dun('keg_decorated'), { pos: [-3.8, 0, -5], alto: 1 });
  await S(R.dun('barrel_small_stack'), { pos: [4.8, 0, -4.8], alto: 0.8 });
  await S(R.dun('bench'), { pos: [0, 0, 4.9], ancho: 2.6 });
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
async function personas() {
  const aurelia = new Personaje('Hiker', PASOS.mapas.aventurero.aspecto);
  await aurelia.cargar(); aurelia.raiz.position.set(-0.3, 0, 0.8); aurelia.raiz.rotation.y = Math.PI / 2; scene.add(aurelia.raiz);
  aurelia.reproducir('Interact', 0); gente.push(aurelia);
  const tu = new Personaje('Protagonist_B', aspectoDe({ tipo: 'Protagonist_B' }));
  await tu.cargar(); tu.raiz.position.set(2.2, 0, 3.4); tu.raiz.rotation.y = -Math.PI * 0.75; scene.add(tu.raiz); gente.push(tu);
  // Dámaso, el escribano del Mostrador, tras la barra con el libro de supuestos
  const damaso = new Personaje('Hiker', PASOS.mostrador.aventurero.aspecto);
  await damaso.cargar(); damaso.raiz.position.set(OX + 0, 0, -3.5); scene.add(damaso.raiz); damaso.reproducir('Interact', 0); gente.push(damaso);
  const goblin2 = new Personaje('Goblin_B', aspectoDe({ tipo: 'Goblin_B' }));
  await goblin2.cargar(); goblin2.raiz.scale.multiplyScalar(0.62); goblin2.raiz.position.set(OX - 3, 0, 3.1); goblin2.raiz.rotation.y = 0.3; scene.add(goblin2.raiz); gente.push(goblin2);
  // Eulogio, el forjador, martillando en el yunque
  const eulogio = new Personaje('Hiker', PASOS.forja.aventurero.aspecto);
  await eulogio.cargar(); eulogio.raiz.position.set(OX - 2.6, 0, OZ - 0.3); eulogio.raiz.rotation.y = Math.PI; scene.add(eulogio.raiz); eulogio.reproducir('Hammering', 0); gente.push(eulogio);
  // los de las salas nuevas y los parroquianos del Salón, sentados a probar
  const poner = async (tipo: string, aspecto: any, g: THREE.Group, x: number, z: number, rot: number, clip: string, escala = 1) => {
    const p = new Personaje(tipo, aspecto); await p.cargar(); if (escala !== 1) p.raiz.scale.multiplyScalar(escala);
    p.raiz.position.set(g.position.x + x, 0, g.position.z + z); p.raiz.rotation.y = rot; scene.add(p.raiz); p.reproducir(clip, 0); gente.push(p); return p;
  };
  await poner('Hiker', PASOS.torre.aventurero.aspecto, torre, 1.8, 1.5, Math.PI, 'Interact');
  await poner('Hiker', PASOS.salon.aventurero.aspecto, salon, -0.2, 0.4, 0.4, 'Idle_A');
  await poner('Hiker', PASOS.mensajero.aventurero.aspecto, mensajero, -1.4, -1.4, Math.PI, 'Working_A');
  await poner('Hiker', PASOS.libro.aventurero.aspecto, libro, 0.6, -0.7, Math.PI, 'Interact');
  const PARROQUIANOS: [string, number, number, number][] = [['Goblin', -3.9, -1.6, 2.2], ['Survivalist', -2, -1.6, -2.3], ['Goblin_B', 0.7, -1.7, 2.3], ['Hoarder', -3, 3.4, Math.PI], ['Goblin', 3.5, 1.5, -2.2], ['Driver', 1.6, 2.8, 2]];
  for (const [t, x, z, r] of PARROQUIANOS) await poner(t, aspectoDe({ tipo: t }), salon, x, z, r, 'Idle_A', t.startsWith('Goblin') ? 0.7 : 1);
  const goblin = new Personaje('Goblin', aspectoDe({ tipo: 'Goblin' }));
  await goblin.cargar(); goblin.raiz.scale.multiplyScalar(0.62); goblin.raiz.position.set(4, 0, 1.4); goblin.raiz.rotation.y = -Math.PI / 2; scene.add(goblin.raiz);
  goblin.reproducir('Working_A', 0); gente.push(goblin);
}

// ---------------------------------------------------------------- cámara isométrica y salas: entrar y salir
// En la vista general, cada sala lleva su cartel flotante (paso y nombre). Al entrar en una (clic, o 1, 2, 3), la cámara
// se acerca y arriba sale su título: paso, sala y qué se hace en ella. Esc vuelve a la vista general.
const giro = THREE.MathUtils.degToRad(+(q.get('giro') ?? 45));
const alto = THREE.MathUtils.degToRad(+(q.get('alto') ?? 38));
camera.fov = 22; camera.near = 1; camera.far = 200;
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
let dentro: (typeof SALAS)[number] | null = null;
const camObjetivo = GENERAL.centro.clone(), camMirada = GENERAL.centro.clone();
let camDist = GENERAL.dist, camDistAhora = GENERAL.dist;
function colocarCamara() {
  camera.position.set(camMirada.x + Math.sin(giro) * Math.cos(alto) * camDistAhora, camMirada.y + Math.sin(alto) * camDistAhora, camMirada.z + Math.cos(giro) * Math.cos(alto) * camDistAhora);
  camera.lookAt(camMirada); camera.updateProjectionMatrix();
}
colocarCamara();

// la interfaz: carteles de las salas y el título de la sala en la que estás
const capa = document.createElement('div'); capa.className = 'capa'; document.body.appendChild(capa);
const titulo = document.createElement('div'); titulo.className = 'titulo-sala'; document.body.appendChild(titulo);
const carteles = SALAS.map(sl => {
  const p = PASOS[sl.id];
  const c = document.createElement('button'); c.className = 'cartel-sala';
  c.innerHTML = `<b>${p.numero}</b><span>${p.sala}</span>`;
  c.onclick = () => entrar(sl); capa.appendChild(c);
  return c;
});
function entrar(sl: (typeof SALAS)[number] | null) {
  dentro = sl;
  if (sl) { camObjetivo.set(sl.grupo.position.x, 0.6, sl.grupo.position.z + 0.6); camDist = 30; }
  else { camObjetivo.copy(GENERAL.centro); camDist = GENERAL.dist; }
  const p = sl && PASOS[sl.id];
  titulo.innerHTML = p ? `<small>PASO ${p.numero}</small><h1>${p.sala}</h1><p>${p.etapa}${p.comando ? ` · <code>${p.comando}</code>` : ''}</p><kbd>Esc</kbd> volver a la taberna` : '';
  titulo.classList.toggle('visible', !!p);
  capa.classList.toggle('oculta', !!p);
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') entrar(null);
  const sl = SALAS.find(x => x.tecla === e.key); if (sl) entrar(sl);
});
// un clic en el suelo de una sala entra en ella
const rayo = new THREE.Raycaster(), raton = new THREE.Vector2();
motor.renderer.domElement.addEventListener('click', ev => {
  const r = motor.renderer.domElement.getBoundingClientRect();
  raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  rayo.setFromCamera(raton, camera);
  const p = rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (!p) return;
  const sl = SALAS.find(x => Math.abs(p.x - x.grupo.position.x) < L / 2 && Math.abs(p.z - x.grupo.position.z) < L / 2);
  if (sl && sl !== dentro) entrar(sl);
});
const v = new THREE.Vector3();
function moverCarteles() {
  const r = motor.renderer.domElement.getBoundingClientRect();
  SALAS.forEach((sl, i) => {
    v.set(sl.grupo.position.x, H + 1.2, sl.grupo.position.z - L / 2 + 0.4).project(camera);
    carteles[i].style.transform = `translate(-50%, -100%) translate(${(v.x + 1) / 2 * r.width}px, ${(1 - v.y) / 2 * r.height}px)`;
  });
}
if (q.get('sala')) { const sl = SALAS.find(x => x.id === q.get('sala')); if (sl) { entrar(sl); camMirada.copy(camObjetivo); camDistAhora = camDist; colocarCamara(); } }

motor.cadaFotograma((dt, t) => {
  for (const p of gente) p.actualizar(dt);
  for (const l of puntos) l.luz.intensity = l.base * (0.85 + 0.15 * Math.sin(t * l.vel) * Math.sin(t * l.vel * 0.37 + 1.3));
  camMirada.x = THREE.MathUtils.damp(camMirada.x, camObjetivo.x, 4, dt); camMirada.z = THREE.MathUtils.damp(camMirada.z, camObjetivo.z, 4, dt);
  camDistAhora = THREE.MathUtils.damp(camDistAhora, camDist, 4, dt);
  colocarCamara(); moverCarteles();
});

const listo = (async () => {
  // la L: Sala de Mapas y Mostrador al fondo, la Forja delante del Mostrador (la esquina libre será el salón)
  // las salas rodean el salón central (0, 12): cada pared que da a otra sala o al salón es un murete con paso
  paredes(sala, { ventana: 3.4, izquierda: { paso: 3.4 }, frente: { paso: 0 } });
  paredes(mostrador, { ventana: -1.5, derecha: false, frente: { paso: -2.5 } });
  paredes(forja, { fondo: false, derecha: { paso: 0 }, frente: { paso: -2 } });
  paredes(torre, { fondo: false, derecha: { paso: 2 } });
  paredes(salon, { fondo: { paso: 0 }, izquierda: false, derecha: { paso: 0 } });
  paredes(mensajero, { fondo: { paso: 0 }, izquierda: false, frente: { paso: 0 } });
  paredes(libro, { ventana: 2.6, izquierda: { paso: 0 }, frente: false });
  await Promise.all([...[sala, mostrador, forja, torre, salon, mensajero, libro, central].map(suelo), muebles(), mueblesMostrador(), mueblesForja(), mueblesTorre(), mueblesSalon(), mueblesMensajero(), mueblesLibro(), personas(), exterior()]);
  sala.traverse((o: any) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  motor.renderer.shadowMap.needsUpdate = true;
})();
(window as any).__ready = () => listo;
(window as any).__step = (dt: number) => motor.paso(dt);
if (!(window as any).__noLoop) listo.then(() => motor.alCambiarPrimerPlano(true));
