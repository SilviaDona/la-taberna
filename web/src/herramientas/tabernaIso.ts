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
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 }); sol.shadow.bias = -0.0008; scene.add(sol);
const puntos: { luz: THREE.PointLight; base: number; vel: number }[] = [];
function luz(x: number, y: number, z: number, color: string, intensidad: number, distancia: number, parpadeo = 0) {
  const l = new THREE.PointLight(color, intensidad, distancia, 1.6); l.position.set(x, y, z); scene.add(l);
  if (parpadeo) puntos.push({ luz: l, base: intensidad, vel: parpadeo });
  return l;
}

// ---------------------------------------------------------------- estructura
const S = (ruta: string, c: Colocacion = {}) => colocar(sala, ruta, { sombra: true, recibe: true, ...c });
/** Coloca encima de la cara de arriba de `soporte` (mesas, cofres) */
async function sobre(soporte: THREE.Object3D, ruta: string, x: number, z: number, c: Colocacion = {}) {
  soporte.updateMatrixWorld(true);
  const tope = new THREE.Box3().setFromObject(soporte).max.y;
  return S(ruta, { ...c, pos: [x, tope, z] });
}

async function suelo() {
  const ps: Promise<unknown>[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    ps.push(S(R.dun('floor_wood_large'), { pos: [-L / 2 + 2 + i * 4, 0, -L / 2 + 2 + j * 4], ancho: 4, ancla: 'techo', rot: ((i * 3 + j) % 2) * Math.PI, sombra: false }));
  await Promise.all(ps);
}
function paredes() {
  // fondo (z = -6, con ventana) e izquierda (x = -6): entramado entero; delante y a la derecha, un murete con su viga
  muroEntramado(sala, -L / 2, L / 2, -L / 2, 0, { x: 3.4, y: H * 0.55, w: 1.8, h: 1.6 });
  const izq = muroEntramado(sala, 0, L, 0, 0); izq.rotation.y = Math.PI / 2; izq.position.set(-L / 2, 0, L / 2);
  const madera = materialAcero('#3a2414');
  for (const [w, d, x, z] of [[L, 0.25, 0, L / 2], [0.25, L, L / 2, 0]] as const) {
    sala.add(caja(w, BAJO, d, materialYeso(), x, BAJO / 2, z, true));
    sala.add(caja(w + 0.1, 0.16, d + 0.1, madera, x, BAJO + 0.08, z, true));
  }
  for (const [x, z] of [[L / 2, L / 2], [-L / 2, L / 2], [L / 2, -L / 2]]) sala.add(caja(0.34, x === -L / 2 || z === -L / 2 ? H : BAJO + 0.25, 0.34, madera, x, (x === -L / 2 || z === -L / 2 ? H : BAJO + 0.25) / 2, z, true));
  // el cielo detrás de la ventana
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2), new THREE.MeshBasicMaterial({ color: '#2b3a66' }));
  cielo.position.set(3.4, H * 0.55, -L / 2 - 0.05); sala.add(cielo);
}

// ---------------------------------------------------------------- muebles de la Sala de Mapas
async function muebles() {
  const ROBLE = '#8a5a34';
  // la chimenea, en la pared de la izquierda, con su fuego
  await S(R.casa('Fireplace'), { pos: [-L / 2 + 0.5, 0, -1.2], rot: Math.PI / 2, alto: 2.2 });
  luz(-L / 2 + 1.2, 0.8, -1.2, '#ff7a2a', 9, 9, 7);
  await S(R.sv('Bonfire_Fire'), { pos: [-L / 2 + 0.8, 0.05, -1.2], alto: 0.5 });
  await tinte(S(R.mueble('rug_oval_B'), { pos: [-3.6, 0.01, -1.2], ancho: 2.6, rot: Math.PI / 2, propios: true }), '#7a2a1e');
  await S(R.dun('chair'), { pos: [-3.7, 0, -2.3], alto: 0.95, rot: Math.PI * 0.35 });
  await S(R.dun('chair'), { pos: [-3.7, 0, -0.1], alto: 0.95, rot: Math.PI * 0.65 });

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
  await S(R.dun('bookcase_double_decoratedA'), { pos: [-2.2, 0, -L / 2 + 0.3], alto: 2.4 });
  await S(R.dun('bookcase_single_decoratedB'), { pos: [0.6, 0, -L / 2 + 0.3], alto: 2.4 });
  await S(R.dun('banner_patternA_blue'), { pos: [-4.6, 1.4, -L / 2 + 0.12], alto: 2.2 });
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
  const cofre = await S(R.dun('chest'), { pos: [-4.7, 0, 3.6], ancho: 0.9, rot: Math.PI / 2 });
  await sobre(cofre, R.dun('candle_lit'), -4.7, 3.6, { alto: 0.25 });
  await S(R.dun('box_stacked'), { pos: [-4.8, 0, 4.9], alto: 0.9 });
  // la pared de la izquierda: otra librería, un estandarte y las armas del gremio
  await S(R.dun('bookcase_double_decoratedB'), { pos: [-L / 2 + 0.3, 0, -4.2], alto: 2.4, rot: Math.PI / 2 });
  await S(R.dun('banner_shield_blue'), { pos: [-L / 2 + 0.12, 1.5, 1.8], alto: 1.8, rot: Math.PI / 2 });
  await S(R.dun('sword_shield'), { pos: [-L / 2 + 0.15, 1.6, 3.4], alto: 1.1, rot: Math.PI / 2 });
  await S(R.dun('shelf_small_books'), { pos: [-1.8, 2.9, -L / 2 + 0.25], ancho: 1.1 });
  // un rincón de lectura junto a la librería del fondo y mapas enrollados por el suelo
  await S(R.dun('table_small'), { pos: [-0.9, 0, -4.4], alto: 0.75 });
  await S(R.dun('chair'), { pos: [-0.9, 0, -3.6], alto: 0.95, rot: Math.PI });
  await S(R.herr('map_rolled'), { pos: [1.6, 0, -4.9], alto: 0.12, rot: 0.6 });
  await S(R.herr('map_rolled'), { pos: [1.9, 0, -4.7], alto: 0.12, rot: -0.3 });
  await S(R.dun('candle_melted'), { pos: [-1.1, 0.78, -4.5], alto: 0.2 });
  await S(R.casa('Houseplant_7'), { pos: [5.1, 0, -5.1], alto: 1.3 });
}
async function tinte(o: Promise<THREE.Object3D>, color: string) { const x = await o; x.traverse((m: any) => { if (m.isMesh) for (const mm of [].concat(m.material) as THREE.MeshStandardMaterial[]) mm.color?.set(color); }); return x; }
// fuera: un prado con árboles y matas alrededor de la taberna (sin él, la sala flotaría en negro)
async function exterior() {
  const prado = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#4a6b2f', roughness: 1 }));
  prado.rotation.x = -Math.PI / 2; prado.position.y = -0.02; prado.receiveShadow = true; scene.add(prado);
  const camino = new THREE.Mesh(new THREE.PlaneGeometry(3, 30), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 }));
  camino.rotation.x = -Math.PI / 2; camino.position.set(2.5, -0.01, L / 2 + 15); scene.add(camino);
  const N = (n: string) => `kaykit-extra/forest-nature-pack-1.0/Assets/gltf/Color1/${n}.gltf`;
  const cosas: [string, number, number, number][] = [['Tree_1_A_Color1', -11, -9, 5], ['Tree_2_B_Color1', -9, -13, 6], ['Tree_5_A_Color1', 9, -11, 5.5], ['Tree_6_A_Color1', -13, 3, 5], ['Tree_7_A_Color1', 12, -4, 4.5], ['Bush_1_A_Color1', -8, 8, 1.2], ['Bush_2_A_Color1', 8.5, 7.5, 1.1], ['Bush_4_C_Color1', -8.5, -6.5, 1], ['Rock_3_A_Color1', 9, 3, 0.8], ['Grass_1_A_Color1', -7.5, 1.5, 0.5], ['Grass_2_B_Color1', 7.6, -2, 0.5], ['Tree_4_B_Color1', 0, -15, 6]];
  await Promise.all(cosas.map(([n, x, z, a]) => colocar(scene, N(n), { pos: [x, 0, z], alto: a, rot: x * 0.7, sombra: true }).catch(() => null)));
  scene.fog = new THREE.Fog('#1a120c', 55, 95);
}

// ---------------------------------------------------------------- gente: Aurelia en la mesa de mapas y la Tabernera
const gente: Personaje[] = [];
async function personas() {
  const aurelia = new Personaje('Hiker', PASOS.mapas.aventurero.aspecto);
  await aurelia.cargar(); aurelia.raiz.position.set(-0.3, 0, 0.8); aurelia.raiz.rotation.y = Math.PI / 2; scene.add(aurelia.raiz);
  aurelia.reproducir('Interact', 0); gente.push(aurelia);
  const tu = new Personaje('Protagonist_B', aspectoDe({ tipo: 'Protagonist_B' }));
  await tu.cargar(); tu.raiz.position.set(2.2, 0, 3.4); tu.raiz.rotation.y = -Math.PI * 0.75; scene.add(tu.raiz); gente.push(tu);
  const goblin = new Personaje('Goblin', aspectoDe({ tipo: 'Goblin' }));
  await goblin.cargar(); goblin.raiz.scale.multiplyScalar(0.62); goblin.raiz.position.set(4, 0, 1.4); goblin.raiz.rotation.y = -Math.PI / 2; scene.add(goblin.raiz);
  goblin.reproducir('Working_A', 0); gente.push(goblin);
}

// ---------------------------------------------------------------- cámara isométrica (perspectiva cerrada desde arriba)
const giro = THREE.MathUtils.degToRad(+(q.get('giro') ?? 45));
const alto = THREE.MathUtils.degToRad(+(q.get('alto') ?? 38));
const dist = +(q.get('dist') ?? 36);
camera.fov = 22; camera.near = 1; camera.far = 200;
const objetivo = new THREE.Vector3(0, 0.6, 0.4);
camera.position.set(objetivo.x + Math.sin(giro) * Math.cos(alto) * dist, objetivo.y + Math.sin(alto) * dist, objetivo.z + Math.cos(giro) * Math.cos(alto) * dist);
camera.lookAt(objetivo); camera.updateProjectionMatrix();

motor.cadaFotograma((dt, t) => {
  for (const p of gente) p.actualizar(dt);
  for (const l of puntos) l.luz.intensity = l.base * (0.85 + 0.15 * Math.sin(t * l.vel) * Math.sin(t * l.vel * 0.37 + 1.3));
});

const listo = (async () => {
  paredes();
  await Promise.all([suelo(), muebles(), personas(), exterior()]);
  sala.traverse((o: any) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  motor.renderer.shadowMap.needsUpdate = true;
})();
(window as any).__ready = () => listo;
(window as any).__step = (dt: number) => motor.paso(dt);
if (!(window as any).__noLoop) listo.then(() => motor.alCambiarPrimerPlano(true));
