// Carga y preparación del material artístico (KayKit + Quaternius, CC0).
// - Un GLTF se carga una vez y se clona (la geometría se comparte).
// - Los materiales se preparan y se comparten por (archivo, nombre de material, variante de paleta).
// - Las medidas siempre con Box3 sobre el objeto ya instanciado (los accessors de Quaternius mienten).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { prepararMaterial, type Variante } from './paleta';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

// una ruta puede llevar una versión (`?v=2`): cambia la URL cuando cambia el archivo y el navegador (o Electron) no sirve
// la copia vieja de su caché (el servidor manda max-age de un día, sin validación)
export function urlAsset(ruta: string) {
  const [archivo, version] = ruta.split('?');
  return '/assets/' + archivo.split('/').map(encodeURIComponent).join('/') + (version ? '?' + version : '');
}

export function gltf(ruta: string): Promise<GLTF> {
  let p = cache.get(ruta);
  if (!p) {
    p = loader.loadAsync(urlAsset(ruta));
    p.catch(e => console.error('FALLO al cargar ' + ruta, e));
    cache.set(ruta, p);
  }
  return p;
}

// Atajos de rutas por pack
export const R = {
  sf: (n: string) => `quaternius/modular_sci_fi/${n}.glb`,
  casa: (n: string) => `quaternius/house_interior_pack/${n}.glb`,
  sv: (n: string) => `quaternius/survival_pack/${n}.glb`,
  cy: (n: string) => `quaternius/cyberpunk_pack/${n}.glb`,
  cultivo: (n: string) => `quaternius/crops_pack/${n}.glb`,
  roca: (n: string) => `quaternius/nature_pack/${n}.glb`,
  mueble: (n: string) => `kaykit-extra/furniture-bits-1.0/Assets/gltf/${n}.gltf`,
  herr: (n: string) => `kaykit-extra/rpg-tools-bits-1.0/Assets/gltf/${n}.gltf`,
  recurso: (n: string) => `kaykit-extra/resource-bits-1.0/Assets/gltf/${n}.gltf`,
  cocina: (n: string) => `kaykit-extra/restaurant-bits-1.0/Assets/gltf/${n}.gltf`,
  base: (n: string) => `kaykit-extra/space-base-bits-1.0/Assets/gltf/${n}.gltf`,
  acc: (n: string) => `kaykit/adventurers-2.0/Assets/gltf/${n}.gltf`,
  // La Taberna: KayKit Dungeon Remastered (muros, barras de bar, barriles, velas, antorchas, escaleras de madera, estandartes)
  dun: (n: string) => `kaykit-extra/dungeon-remastered-1.1/Assets/gltf/${n}.gltf`,
};

const matCache = new Map<string, THREE.Material>();

export interface OpcionesModelo {
  variante?: Variante;          // paleta de la sala (recoloreo por nombre de material)
  sombra?: boolean;             // proyecta sombra
  recibe?: boolean;             // recibe sombra
  propios?: boolean;            // materiales propios (no compartidos) para animarlos aparte
}

// La Taberna: las piezas de ciencia ficción que solo eran ambiente se cambian por su equivalente de taberna (KayKit
// Dungeon Remastered) al cargarlas; `colocar` las deja del mismo tamaño que pedía la sala. Con null, la pieza no se
// pinta (un hueco invisible del mismo tamaño: lo que se apoya en ella sigue en su sitio). Las que llevan pantalla con
// datos reales (ordenadores) se quedan: con la paleta de madera y latón son atriles con runas.
const dun = (n: string) => `kaykit-extra/dungeon-remastered-1.1/Assets/gltf/${n}.gltf`;
export const SUSTITUTOS: Record<string, string | null> = {
  [R.sf('Props_Shelf')]: dun('shelves_decorated'), [R.sf('Props_Shelf_Tall')]: dun('bookcase_double_decoratedA'),
  [R.sf('Props_Crate')]: dun('crate_small'), [R.sf('Props_CrateLong')]: dun('crate_large'), [R.sf('Props_Chest')]: dun('chest'),
  [R.sf('Props_Vessel_Tall')]: dun('barrel_large'), [R.sf('Props_Pod')]: dun('keg_decorated'),
  [R.cy('Support_Short')]: dun('post'), [R.cy('Support_Long')]: dun('post'), [R.sf('Column_Slim')]: dun('post'), [R.sf('Column_1')]: dun('post'),
  [R.cy('Sign_1')]: dun('banner_shield_red'), [R.cy('Sign_2')]: dun('banner_patternA_brown'), [R.cy('Sign_Small_1')]: dun('banner_thin_red'), [R.cy('Sign_Corner_Hazard')]: dun('banner_thin_yellow'),
  [R.cy('AC_Stacked')]: dun('barrel_small_stack'), [R.cy('AC')]: dun('barrel_small'), [R.cy('Tank')]: dun('barrel_large'),
  [R.cy('Rail_Long')]: dun('barrier'), [R.cy('Fence')]: dun('barrier'),
  [R.casa('Light_Floor1')]: dun('candle_lit'), [R.casa('Light_Floor3')]: dun('candle_lit'), [R.casa('Light_Stand1')]: dun('candle_triple'), [R.casa('Light_Desk')]: dun('candle_thin_lit'),
  [R.cy('Cable_Thick')]: null, [R.cy('Cable_Long')]: null, [R.cy('Cable_Small')]: null, [R.cy('Pipe_1')]: null, [R.cy('Pipe_2')]: null, [R.sf('Pipes')]: null,
  [R.sf('Details_Pipes_Long')]: null, [R.sf('Details_Pipes_Medium')]: null, [R.sf('Details_Output')]: null, [R.sf('Details_Output_Small')]: null,
  [R.sf('Details_Cylinder')]: null, [R.sf('Details_Cylinder_Long')]: null, [R.sf('Details_Vent_1')]: null, [R.sf('Details_Vent_2')]: null, [R.sf('Details_Vent_3')]: null,
  [R.sf('Details_Plate_Small')]: null, [R.sf('Details_Plate_Long')]: null, [R.sf('Details_Plate_Details')]: null, [R.sf('Details_Plate_Large')]: null,
  [R.cy('Antenna_1')]: null, [R.cy('Antenna_2')]: null,
};
const HUECO = new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false });   // estándar: quien la retoca (color, emisivo) puede
function hueco() {
  // (no basta con visible = false: la fusión estática de la sala junta mallas sin mirarlo; este material no pinta nada)
  // (y la fusión estática no la junta con nada: userData.hueco, mundo/util3d.ts)
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HUECO); m.castShadow = m.receiveShadow = false; m.userData.hueco = true; g.add(m); return g;
}

export async function modelo(ruta: string, o: OpcionesModelo = {}): Promise<THREE.Object3D> {
  if (ruta in SUSTITUTOS) { const otra = SUSTITUTOS[ruta]; if (otra === null) return hueco(); ruta = otra; }
  const g = await gltf(ruta);
  const obj = SkeletonUtils.clone(g.scene);
  const pack = ruta.includes('dungeon-remastered') ? 'dungeon' : ruta.split('/')[0] === 'quaternius' ? ruta.split('/')[1] : ruta.split('/')[0];
  obj.traverse((n: any) => {
    if (!n.isMesh) return;
    n.castShadow = o.sombra ?? true;
    n.receiveShadow = o.recibe ?? true;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    const nuevos = mats.map((m: THREE.Material) => {
      // misma pieza de material (nombre, color y atlas) en modelos distintos del mismo pack → un solo material:
      // así la fusión estática junta cientos de mallas en pocas llamadas de dibujo
      const mm = m as THREE.MeshStandardMaterial;
      const tex = mm.map ? (mm.map.name || String((mm.map.image as any)?.src ?? '').split('/').pop() || mm.map.uuid) : '-';
      // en los packs que se repintan con la paleta, el color original no cuenta (todos acaban igual)
      const repintado = (pack === 'modular_sci_fi' || pack === 'cyberpunk_pack') && /^(Main|Main2|DarkGrey|Grey|Accent|Orange|DarkAccent|Accent_Dark|Light|LightGrey|MetalLight|Black|Dark|Pipes)$/.test(m.name);
      const clave = `${pack}|${m.name}|${repintado ? '' : mm.color?.getHexString?.() ?? ''}|${tex}|${mm.vertexColors ? 'vc' : ''}|${o.variante?.id ?? '-'}`;
      if (o.propios) return prepararMaterial(m.clone(), pack, o.variante);
      let pm = matCache.get(clave);
      if (!pm) { pm = prepararMaterial(m.clone(), pack, o.variante); matCache.set(clave, pm); }
      return pm;
    });
    n.material = Array.isArray(n.material) ? nuevos : nuevos[0];
  });
  return obj;
}

export function medir(obj: THREE.Object3D) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  return { box, tam: box.getSize(new THREE.Vector3()), centro: box.getCenter(new THREE.Vector3()) };
}

export interface Colocacion extends OpcionesModelo {
  pos?: [number, number, number];
  rot?: number;                  // giro en Y (radianes)
  rotX?: number; rotZ?: number;
  escala?: number;               // escala uniforme directa
  alto?: number; ancho?: number; fondo?: number; // o ajustar por una dimensión real (tras girar 0)
  ancla?: 'base' | 'origen' | 'centro' | 'techo' | 'atras';
  nombre?: string;
  estatico?: boolean;            // se puede fusionar con el resto de la sala
}

// Instancia un modelo, lo escala por la dimensión que fija su tamaño y lo apoya en su base (centrado en x/z).
export async function colocar(padre: THREE.Object3D, ruta: string, c: Colocacion = {}) {
  const obj = await modelo(ruta, c);
  const envoltorio = new THREE.Group();
  envoltorio.name = c.nombre || ruta.split('/').pop()!.replace(/\.(glb|gltf)$/, '');
  envoltorio.add(obj);
  const { tam, box } = medir(obj);
  let s = c.escala ?? 1;
  if (c.alto) s = c.alto / tam.y; else if (c.ancho) s = c.ancho / tam.x; else if (c.fondo) s = c.fondo / tam.z;
  obj.scale.multiplyScalar(s);
  const ancla = c.ancla ?? 'base';
  if (ancla !== 'origen') {
    const cx = (box.min.x + box.max.x) / 2 * s, cz = (box.min.z + box.max.z) / 2 * s;
    let y = -box.min.y * s;
    if (ancla === 'centro') y = -(box.min.y + box.max.y) / 2 * s;
    if (ancla === 'techo') y = -box.max.y * s;
    obj.position.set(obj.position.x * s - cx, obj.position.y * s + y, obj.position.z * s - (ancla === 'atras' ? box.min.z * s : cz));
    if (ancla === 'atras') obj.position.x = obj.position.x; // apoyado contra la pared (z mínima en 0)
  }
  if (c.pos) envoltorio.position.set(...c.pos);
  envoltorio.rotation.set(c.rotX ?? 0, c.rot ?? 0, c.rotZ ?? 0);
  envoltorio.userData.estatico = c.estatico ?? true;
  envoltorio.userData.tam = new THREE.Vector3(tam.x * s, tam.y * s, tam.z * s);
  padre.add(envoltorio);
  return envoltorio;
}
