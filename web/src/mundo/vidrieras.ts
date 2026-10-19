// La Taberna: lo que se ve por las ventanas de las salas. Un plano detrás del hueco de cada ventana con el color del
// cielo de la hora real (lo pone mundo/cielo.ts cuatro veces por segundo) y, de noche, estrellas. Materiales
// compartidos por todas las ventanas: cambiar el cielo no cuesta nada por sala.
import * as THREE from 'three';
import { lienzo, texturaDe } from '../motor/texturas';

const cielo = new THREE.MeshBasicMaterial({ color: '#1a2238', fog: false });
const TINTE = new THREE.Color('#6a5a3a');   // el vidrio emplomado amarillea un poco la luz
let estrellas: THREE.MeshBasicMaterial | null = null;
function matEstrellas() {
  if (estrellas) return estrellas;
  const { c, g } = lienzo(256, 256);
  let s = 31; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,248,230,${0.4 + r() * 0.6})`; const t = r() < 0.15 ? 2 : 1; g.fillRect(r() * 256, r() * 256, t, t); }
  estrellas = new THREE.MeshBasicMaterial({ map: texturaDe(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1, fog: false });
  return estrellas;
}

/** Cielo de una ventana (plano de `ancho` × `alto` centrado en x, y, z) */
export function vidriera(padre: THREE.Object3D, x: number, y: number, z: number, ancho: number, alto: number) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), cielo); p.position.set(x, y, z); padre.add(p);
  const e = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), matEstrellas()); e.position.set(x, y, z + 0.005); e.renderOrder = 1; padre.add(e);
  e.userData.estatico = false;
  return p;
}

/** Desde el cielo: color del cielo junto al horizonte y cuánto es de noche (0 día, 1 noche) */
export function ponerCieloVentanas(color: THREE.Color, noche: number) {
  // de día, el cielo pálido de fuera algo apagado (el cristal emplomado); de noche, azul oscuro con estrellas
  cielo.color.copy(color).multiplyScalar(0.5 - 0.25 * noche).lerp(TINTE, 0.25);
  matEstrellas().opacity = noche;
}
