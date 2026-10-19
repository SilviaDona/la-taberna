// Paleta del refugio y preparación de materiales por pack.
// Lenguaje (La Taberna): roble y nogal, piedra, latón y paños de color por sala; luz de fuego y vela.
import * as THREE from 'three';

export interface Variante {
  id: string;
  acento: string;        // pintura de la sala (bandas Accent de paredes y módulos)
  acentoOscuro: string;
  pared: string;         // Main de los módulos sci-fi
  paredOscura: string;   // DarkGrey
  pantalla: string;      // color de fósforo de las pantallas
  mugre?: number;        // fuerza de la mugre procedural (1 por defecto)
}

// La Taberna: lo que queda de los módulos del kit (muebles, armarios, aparatos) va en roble y nogal, con herrajes de
// latón; el acento es el paño del estandarte de cada sala y las «pantallas» brillan como runas (tinta luminosa cálida)
export const VARIANTES: Record<string, Variante> = {
  taller:   { id: 'taller',   acento: '#a8482e', acentoOscuro: '#5e2618', pared: '#7a5a3c', paredOscura: '#3d2a1a', pantalla: '#ffcf7a' },
  web:      { id: 'web',      acento: '#8c3a2a', acentoOscuro: '#4a1e16', pared: '#7d5c3e', paredOscura: '#3b2818', pantalla: '#ffd890' },
  marca:    { id: 'marca',    acento: '#9b2f3f', acentoOscuro: '#561a24', pared: '#7a5a3e', paredOscura: '#3e2a1c', pantalla: '#ffb36b' },
  video:    { id: 'video',    acento: '#5e3f86', acentoOscuro: '#35244d', pared: '#76583e', paredOscura: '#3a291c', pantalla: '#d8b8ff' },
  landing:  { id: 'landing',  acento: '#b8892e', acentoOscuro: '#6b4f1a', pared: '#80603f', paredOscura: '#40301e', pantalla: '#ffe28a' },
  comms:    { id: 'comms',    acento: '#4a6b2f', acentoOscuro: '#2a3d1b', pared: '#7a5c3d', paredOscura: '#3c2b1b', pantalla: '#c8f0a0' },
  plan:     { id: 'plan',     acento: '#2c4a7a', acentoOscuro: '#1a2c49', pared: '#785a3d', paredOscura: '#3a2a1c', pantalla: '#a8d0ff' },
  logistica: { id: 'logistica', acento: '#8c1c13', acentoOscuro: '#4e100b', pared: '#7e5e40', paredOscura: '#3f2c1d', pantalla: '#ffb08a' },
  acorazada: { id: 'acorazada', acento: '#b8892e', acentoOscuro: '#5e4416', pared: '#6b5038', paredOscura: '#2e2016', pantalla: '#ffe08a', mugre: 0.7 },
  puente:   { id: 'puente',   acento: '#3d2c6b', acentoOscuro: '#22183d', pared: '#5e4a3a', paredOscura: '#261b14', pantalla: '#b8a8ff', mugre: 0.7 },
  neutro:   { id: 'neutro',   acento: '#8a6a3a', acentoOscuro: '#4f3a1f', pared: '#7a5a3c', paredOscura: '#3d2a1a', pantalla: '#ffcf7a' },
};

const c = (h: string) => new THREE.Color(h);

export function prepararMaterial(m: THREE.Material, pack: string, v?: Variante): THREE.Material {
  const sm = m as THREE.MeshStandardMaterial;
  if (!sm.isMeshStandardMaterial) return m;
  if (sm.map) sm.map.colorSpace = THREE.SRGBColorSpace;
  if (sm.emissiveMap) sm.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  const n = sm.name;
  if (pack === 'modular_sci_fi' || pack === 'cyberpunk_pack') {
    sm.metalness = 0; sm.roughness = 0.78;   // madera
    const vv = v ?? VARIANTES.neutro;
    if (n === 'Main' || n === 'Main2') sm.color.copy(c(vv.pared));
    else if (n === 'DarkGrey' || n === 'Grey') sm.color.copy(c(vv.paredOscura));
    else if (n === 'Accent' || n === 'Orange') sm.color.copy(c(vv.acento));
    else if (n === 'DarkAccent' || n === 'Accent_Dark') sm.color.copy(c(vv.acentoOscuro));
    else if (n === 'Light' || n === 'LightGrey' || n === 'MetalLight') { sm.color.copy(c('#b8893a')); sm.metalness = 0.5; sm.roughness = 0.4; }   // latón
    else if (n === 'Black' || n === 'Dark') { sm.color.copy(c('#22170f')); sm.roughness = 0.6; }
    else if (n === 'Pipes') { sm.color.copy(c('#9a5a2e')); sm.metalness = 0.45; sm.roughness = 0.45; }   // cobre
    else if (n === 'Glass') { sm.color.copy(c('#9fc4c8')); sm.roughness = 0.15; sm.metalness = 0.1; sm.transparent = true; sm.opacity = 0.55; sm.depthWrite = false; }
    else if (n === 'Screen' || n === 'Eye') { sm.color.copy(c('#1a120a')); sm.emissive = c(vv.pantalla); sm.emissiveIntensity = 1.3; }
    else if (n === 'Texture_Signs') { sm.color.copy(c('#d8d2c4')); sm.roughness = 0.8; }
    if (!sm.transparent && !(sm.emissive && sm.emissive.getHex() !== 0)) conMugre(sm, (pack === 'modular_sci_fi' ? 1 : 0.6) * (vv.mugre ?? 1));
  } else if (pack === 'house_interior_pack') {
    sm.metalness = Math.min(sm.metalness, 0.2); sm.roughness = Math.max(sm.roughness, 0.6);
    if (/^(Metal|LightMetal|DarkMetal|Metal\.001)$/.test(n)) { sm.metalness = 0.45; sm.roughness = 0.45; }
    if (n === 'Light') { sm.emissive = c('#ffd9a0'); sm.emissiveIntensity = 2.2; sm.color.copy(c('#fff3dc')); }
    if (n === 'Glass') { sm.transparent = true; sm.opacity = 0.4; sm.depthWrite = false; }
    if (n === 'White' || n === 'White.001' || n === 'White.002') sm.color.copy(c('#b9b1a2')); // sábanas y loza en tono crudo: nunca blanco puro bajo un foco
  } else if (pack === 'survival_pack' || pack === 'crops_pack' || pack === 'nature_pack' || pack === 'simple_nature_pack') {
    sm.metalness = Math.min(sm.metalness, 0.15); sm.roughness = Math.max(sm.roughness, 0.65);
    if (/Metal/.test(n)) { sm.metalness = 0.4; sm.roughness = 0.45; }
    if (n === 'Fire') { sm.emissive = c('#ff8a2a'); sm.emissiveIntensity = 2.5; }
  } else if (pack === 'dungeon') {
    // KayKit Dungeon Remastered: su atlas es de piedra gris fría; en la taberna, piedra arenisca y madera más cálidas
    sm.metalness = 0; sm.roughness = 0.8; sm.color.copy(c('#f2d7b6'));
  } else {
    // KayKit (personajes y bits): atlas de gradientes. Más mate para que la luz los modele como en sus previews.
    sm.metalness = 0; sm.roughness = 0.62;
    if (sm.emissiveMap || (sm.emissive && sm.emissive.getHex() !== 0)) sm.emissiveIntensity = 1.4;
  }
  return sm;
}

// Colores de la interfaz y de la señalética (diegética y de pantalla)
export const UI = {
  fosforo: '#ffd890', fosforoTenue: '#a0804a', ambar: '#ffb347', rojo: '#ff5a4a', papel: '#e8dcc0', tinta: '#1a1712',
};

// Mugre en el shader: manchas y churretes leídos de una textura de ruido en espacio de mundo (proyección biplanar),
// suciedad cerca del suelo y hollín bajo el techo. Rompe la limpieza de plástico de los módulos sin pintar nada a mano.
// (Ruido 3D por píxel sería demasiado caro a resolución retina.)
export const MUGRE = { planta: 5.28, alto: 4.43 };
let _texRuido: THREE.DataTexture | null = null;
function texturaRuido() {
  if (_texRuido) return _texRuido;
  const N = 256; const datos = new Uint8Array(N * N * 4);
  const rnd = (() => { let s = 12345; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
  const capa = (f: number) => { const g = Array.from({ length: f * f }, () => rnd()); return (x: number, y: number) => { const fx = x / N * f, fy = y / N * f; const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j; const a = g[(j % f) * f + (i % f)], b = g[(j % f) * f + ((i + 1) % f)], c = g[((j + 1) % f) * f + (i % f)], d = g[((j + 1) % f) * f + ((i + 1) % f)]; const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; }; };
  const c1 = capa(4), c2 = capa(8), c3 = capa(16), c4 = capa(32), v1 = capa(24), v2 = capa(48);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const manchas = c1(x, y) * 0.5 + c2(x, y) * 0.25 + c3(x, y) * 0.15 + c4(x, y) * 0.1;
    const vetas = v1(x, y) * 0.6 + v2(x, y) * 0.4;
    const i = (y * N + x) * 4; datos[i] = manchas * 255; datos[i + 1] = vetas * 255; datos[i + 2] = rnd() * 255; datos[i + 3] = 255;
  }
  _texRuido = new THREE.DataTexture(datos, N, N, THREE.RGBAFormat);
  _texRuido.wrapS = _texRuido.wrapT = THREE.RepeatWrapping; _texRuido.magFilter = THREE.LinearFilter; _texRuido.minFilter = THREE.LinearMipmapLinearFilter; _texRuido.generateMipmaps = true; _texRuido.needsUpdate = true;
  return _texRuido;
}
export function conMugre(m: THREE.MeshStandardMaterial, fuerza = 1) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uMugre = { value: fuerza };
    sh.uniforms.uPlanta = { value: MUGRE.planta };
    sh.uniforms.uAlto = { value: MUGRE.alto };
    sh.uniforms.uRuido = { value: texturaRuido() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying vec3 vNormMundo;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz; vNormMundo = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo; varying vec3 vNormMundo;\nuniform float uMugre; uniform float uPlanta; uniform float uAlto; uniform sampler2D uRuido;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 nb = abs(vNormMundo);
        vec2 uvp = nb.z > nb.x ? vMundo.xy : vMundo.zy;
        vec2 rA = texture2D(uRuido, uvp * 0.11).rg;
        float rB = texture2D(uRuido, vec2(uvp.x * 0.5, uvp.y * 0.045)).g;
        float manchas = smoothstep(0.42, 0.78, rA.r);
        float churretes = smoothstep(0.55, 0.85, rB);
        float yl = mod(vMundo.y + 0.2, uPlanta) - 0.2;
        float suelo = 1.0 - smoothstep(0.0, 0.9, yl);
        float hollin = smoothstep(uAlto - 1.1, uAlto, yl);
        float m = clamp(manchas * 0.28 + churretes * 0.16 + suelo * 0.32 + hollin * 0.3, 0.0, 0.62) * uMugre;
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.5, 0.38, 0.28), m * 0.6);   // hollín y años de uso, más suave sobre la madera`);
  };
  m.customProgramCacheKey = () => 'mugre2-' + fuerza;
  return m;
}
