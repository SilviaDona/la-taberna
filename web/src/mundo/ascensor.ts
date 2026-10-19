// Montacargas de la taberna (el «ascensor» del refugio): hueco de piedra con postes de madera, cuerdas y polea; una cabina que sube y baja de verdad entre plantas,
// con indicador de planta en cada rellano, campanilla y motor. Los personajes viajan dentro.
import * as THREE from 'three';
import { colocar, R } from '../motor/assets';
import { VARIANTES } from '../motor/paleta';
import { ALTO, LOSA, PLANTA, FONDO, MARCO, materialAcero, materialHormigon, caja, lampara, type Sala } from './salas/comun';
import { lienzo, texturaDe, FUENTES, rotuloNitido } from '../motor/texturas';
import { fusionarEstaticos } from './util3d';
import { SFX, sonido } from '../audio/sonido';
import { rotuloPlanta } from '@shared/disposicion';
import { sectorDePlanta } from '@shared/sectores';

export const ANCHO_ASCENSOR = 3.4;

export class Ascensor {
  grupo = new THREE.Group();
  cabina = new THREE.Group();
  plantaActual = 0; destino = 0; private y = 0; private v = 0;
  private cola: number[] = [];
  private esperas: { planta: number; f: () => void }[] = [];
  moviendose = false;
  private indicadores: { g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; planta: number }[] = [];
  anclas: Sala['anclas'] = [];
  constructor(public plantas: number, public plantaRepos?: number) {}

  yDe(planta: number) { return -planta * PLANTA; }

  async construir() {
    const g = this.grupo; g.name = 'ascensor';
    const v = VARIANTES.neutro;
    const alto = this.plantas * PLANTA + 1.5;
    const acero = materialAcero('#2b2a27'), hormigon = materialHormigon();
    // hueco: pared trasera de hormigón, pilares del corte, raíles y cables
    const yTop = ALTO + LOSA; const yBot = this.yDe(this.plantas - 1) - LOSA;
    const h = yTop - yBot;
    g.add(caja(ANCHO_ASCENSOR, h, 0.3, hormigon, 0, yBot + h / 2, -FONDO / 2 - 0.2));
    for (const s of [-1, 1]) g.add(caja(MARCO, h, 0.7, acero, s * (ANCHO_ASCENSOR / 2 + MARCO / 2), yBot + h / 2, FONDO / 2 - 0.1));
    const ps: Promise<unknown>[] = [];
    for (let p = 0; p < this.plantas; p++) {
      const y = this.yDe(p);
      for (const s of [-1, 1]) ps.push(colocar(g, R.cy('Support_Long'), { pos: [s * 1.25, y, -FONDO / 2 + 0.25], alto: PLANTA, sombra: false, variante: v }));
      // rellano: losa con franja y número de planta
      g.add(caja(ANCHO_ASCENSOR + MARCO * 2, LOSA * 0.38, 0.7, acero, 0, y - 0.16 - LOSA * 0.19, FONDO / 2 - 0.1));
      g.add(caja(ANCHO_ASCENSOR + MARCO * 2, LOSA * 0.62, 0.7, acero, 0, y + ALTO + LOSA * 0.31, FONDO / 2 - 0.1));
      const ind = this.indicador(p); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), rotuloNitido(new THREE.MeshStandardMaterial({ map: ind.tex, emissiveMap: ind.tex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.6 })));
      m.position.set(0, y + ALTO + LOSA * 0.31, FONDO / 2 + 0.26); g.add(m);
      this.indicadores.push(ind);
      // suelo del rellano (a cada lado de la cabina se pisa la losa de la planta)
      ps.push(colocar(g, R.dun('floor_wood_small'), { pos: [0, y, 0.6], ancho: ANCHO_ASCENSOR, sombra: false, ancla: 'techo' }).then(o => { o.scale.z *= (FONDO + 0.4) / ANCHO_ASCENSOR; }));
    }
    // cables de tracción y contrapeso
    // cuerdas de cáñamo
    const cuerda = new THREE.MeshStandardMaterial({ color: '#a8875a', roughness: 0.95 });
    for (const x of [-0.25, 0.25]) g.add(caja(0.045, h, 0.045, cuerda, x, yBot + h / 2, -0.4));
    // maquinaria arriba (en lo alto de la torre, a pie de calle)
    // polea y torno arriba (en lo alto del hueco, a pie de calle)
    const polea = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 20), acero); polea.rotation.z = Math.PI / 2; polea.position.set(0, yTop + 0.6, -0.4); g.add(polea);
    g.add(caja(1.6, 0.18, 0.18, acero, 0, yTop + 0.6, -0.4));
    ps.push(colocar(g, R.dun('barrel_small_stack'), { pos: [-0.9, yTop + 0.05, -1.2], alto: 1.0 }));
    await Promise.all(ps);
    fusionarEstaticos(g);
    // cabina
    const c = this.cabina; c.name = 'cabina';
    const vc = VARIANTES.landing;
    const cps: Promise<unknown>[] = [];
    // plataforma de tablones con barandilla de madera
    cps.push(colocar(c, R.dun('floor_wood_small'), { pos: [0, 0.1, 0.3], ancho: 2.5, ancla: 'techo' }).then(o => { o.scale.z *= 3.0 / 2.5; }));
    for (const [x, z] of [[-1.15, -1.1], [1.15, -1.1], [-1.15, 1.6], [1.15, 1.6]] as const) cps.push(colocar(c, R.sf('Column_Slim'), { pos: [x, 0, z], alto: 3.1, variante: vc }));
    c.add(caja(2.6, 0.18, 3.0, materialAcero('#3b3732'), 0, 3.15, 0.25));
    c.add(caja(2.3, 0.08, 0.08, materialAcero('#3a2414'), 0, 1.0, 1.65));
    cps.push(colocar(c, R.dun('torch_mounted'), { pos: [1.05, 2.1, -1.0], alto: 0.6, sombra: false }));
    await Promise.all(cps);
    // luz interior visible desde lejos: plafón emisivo y resplandor cálido en el fondo de la cabina
    const plafon = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a2414') }));
    plafon.rotation.x = Math.PI / 2; plafon.position.set(0, 3.04, 0.3); c.add(plafon);
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.9), new THREE.MeshBasicMaterial({ color: '#6a4a2a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    fondo.position.set(0, 1.5, -1.25); c.add(fondo);
    c.userData.estatico = false;
    g.add(c);
    this.y = this.yDe(0); c.position.y = this.y;
    this.anclas.push({ tipo: 'foco', pos: new THREE.Vector3(0, 2.9, 0.3), objetivo: new THREE.Vector3(0, -3, 0.5), intensidad: 70, color: new THREE.Color('#ffa850'), angulo: 0.9, penumbra: 0.6, distancia: 7 });
    this.pintarIndicadores();
  }

  private indicador(p: number) {
    const { c, g } = lienzo(256, 96); const tex = texturaDe(c);
    return { g, tex, planta: p };
  }
  // cada rellano rotula SU planta (PB, -1, -2…): verde con la cabina parada ahí; si viaja, una flecha pequeña al lado
  // dice hacia dónde va
  private pintarIndicadores() {
    for (const ind of this.indicadores) {
      const g = ind.g; g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 256, 96);
      g.strokeStyle = '#4a443b'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 90);
      // a la izquierda, la letra del sector de la planta sobre su color (shared/sectores.ts)
      const sec = sectorDePlanta(ind.planta, this.plantas, this.plantaRepos);
      g.fillStyle = sec.color; g.fillRect(9, 9, 64, 78);
      g.fillStyle = sec.tinta; g.font = `900 58px ${FUENTES.titulo}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sec.codigo, 41, 52);
      const aqui = this.plantaActual === ind.planta && !this.moviendose;
      g.fillStyle = aqui ? '#5dff8a' : '#ffb000'; g.shadowColor = g.fillStyle; g.shadowBlur = 4;
      g.font = `800 66px ${FUENTES.titulo}`;
      g.fillText(rotuloPlanta(ind.planta), 152, 52);
      if (this.moviendose) { g.font = `800 30px ${FUENTES.titulo}`; g.fillText(this.destino > this.plantaActual ? '▼' : '▲', 230, 50); }
      g.shadowBlur = 0; ind.tex.needsUpdate = true;
    }
  }

  // Pide la cabina a una planta; `alLlegar` se llama cuando está parada ahí con las puertas abiertas
  llamar(planta: number, alLlegar?: () => void) {
    planta = THREE.MathUtils.clamp(planta, 0, this.plantas - 1);
    if (alLlegar) this.esperas.push({ planta, f: alLlegar });
    if (!this.moviendose && this.plantaActual === planta) { this.atender(); return; }
    if (!this.cola.includes(planta)) this.cola.push(planta);
    if (!this.moviendose) this.siguiente();
  }

  private siguiente(): void {
    const p = this.cola.shift(); if (p === undefined) return;
    if (p === this.plantaActual) { this.atender(); return this.siguiente(); }
    this.destino = p; this.moviendose = true; SFX.clank();
    sonido.bucle('ascensor', 'amb_generador', { bus: 'sfx', vol: 0.12, rate: 1.25 });
    this.pintarIndicadores();
  }

  private atender() {
    const listos = this.esperas.filter(e => e.planta === this.plantaActual);
    this.esperas = this.esperas.filter(e => e.planta !== this.plantaActual);
    for (const e of listos) e.f();
  }

  get yCabina() { return this.cabina.position.y; }

  actualizar(dt: number) {
    if (!this.moviendose) return;
    const yObj = this.yDe(this.destino);
    const d = yObj - this.y; const dir = Math.sign(d);
    const vMax = 3.2, acel = 3.5;
    const frenar = Math.sqrt(2 * acel * Math.abs(d));
    this.v = Math.min(vMax, frenar, Math.abs(this.v) + acel * dt) * dir;
    this.y += this.v * dt;
    const pl = Math.round(-this.y / PLANTA); if (pl !== this.plantaActual) { this.plantaActual = THREE.MathUtils.clamp(pl, 0, this.plantas - 1); this.pintarIndicadores(); }
    if (Math.abs(yObj - this.y) < 0.01 || Math.sign(yObj - this.y) !== dir) {
      this.y = yObj; this.v = 0; this.moviendose = false; this.plantaActual = this.destino;
      sonido.pararBucle('ascensor'); SFX.ascensorDing(); setTimeout(() => SFX.ascensorPuerta(), 250);
      this.pintarIndicadores(); this.atender(); setTimeout(() => this.siguiente(), 600);
    }
    this.cabina.position.y = this.y;
  }
}
