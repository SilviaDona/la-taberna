// Reparto de luces dinámicas: un número FIJO de focos y puntuales (los shaders nunca se recompilan) que se asignan,
// con fundido, a las lámparas y piezas luminosas más cercanas al centro de la cámara. Las lámparas sin luz real
// muestran su poza falsa (decal aditivo) para que de lejos el refugio siga pareciendo encendido.
import * as THREE from 'three';
import type { AnclaLuz, Sala } from './salas/comun';
import { graficos } from '../motor/ajustesGraficos';

interface Ranura<L extends THREE.Light> { luz: L; ancla: AnclaLuz | null; sala: Sala | null; actual: number }

export class RepartoLuces {
  private focos: Ranura<THREE.SpotLight>[] = [];
  private puntos: Ranura<THREE.PointLight>[] = [];
  private reloj = 0;
  private t = 0;
  private v = new THREE.Vector3();
  // sin sombra propia: los focos no proyectan (la del sol basta y es lo más caro)
  constructor(escena: THREE.Scene, nFocos = 6, nPuntos = 3) {
    for (let i = 0; i < nFocos; i++) {
      const l = new THREE.SpotLight('#ffbe73', 0, 10, 0.72, 0.65, 1.5);
      escena.add(l, l.target); this.focos.push({ luz: l, ancla: null, sala: null, actual: 0 });
    }
    for (let i = 0; i < nPuntos; i++) { const l = new THREE.PointLight('#ffffff', 0, 5, 2); escena.add(l); this.puntos.push({ luz: l, ancla: null, sala: null, actual: 0 }); }
  }

  actualizar(salas: Sala[], centro: THREE.Vector3, dt: number) {
    this.reloj -= dt;
    if (this.reloj <= 0) { this.reloj = 0.3; this.asignar(salas, centro); }
    // La Taberna: las llamas tiemblan (dos senos desfasados por ranura, sin ruido de un fotograma a otro); en la
    // taberna tranquila solo se usan las dos primeras ranuras de foco y una puntual, y nada parpadea
    this.t += dt;
    const quieto = graficos.quieto, tranquila = graficos.tranquila;
    const todas = [...this.focos, ...this.puntos] as Ranura<any>[];
    todas.forEach((r, k) => {
      const usable = !tranquila || (k < 2 || k === this.focos.length);
      const objetivo = r.ancla && usable ? r.ancla.intensidad : 0;
      r.actual = THREE.MathUtils.damp(r.actual, objetivo, 6, dt);
      const llama = quieto ? 1 : 1 + 0.07 * Math.sin(this.t * 7.3 + k * 1.7) + 0.05 * Math.sin(this.t * 13.1 + k * 2.9);
      r.luz.intensity = r.actual * llama;
      if (r.ancla) { r.luz.color.copy(r.ancla.color); }
    });
  }

  private mundo(s: Sala, p: THREE.Vector3) { return this.v.copy(p).add(s.grupo.position); }

  private asignar(salas: Sala[], centro: THREE.Vector3) {
    const candidatos: { a: AnclaLuz; s: Sala; d: number }[] = [];
    for (const s of salas) for (const a of s.anclas) {
      const w = this.mundo(s, a.pos);
      const d = Math.hypot(w.x - centro.x, (w.y - centro.y) * 1.6) - (a.prioridad ?? 0) - (a.sombra ? 0.5 : 0);
      candidatos.push({ a, s, d });
    }
    candidatos.sort((x, y) => x.d - y.d);
    const focos = candidatos.filter(c => c.a.tipo === 'foco');
    const puntos = candidatos.filter(c => c.a.tipo === 'punto');
    // el foco con sombra va a la lámpara con sombra más cercana
    const conSombra = focos.find(c => c.a.sombra) ?? focos[0];
    const elegidos = [conSombra, ...focos.filter(c => c !== conSombra)].filter(Boolean).slice(0, this.focos.length);
    this.colocar(this.focos, elegidos, true);
    this.colocar(this.puntos, puntos.slice(0, this.puntos.length), false);
    // pozas falsas: visibles donde no hay luz real
    const reales = new Set(elegidos.map(c => c.a));
    for (const c of focos) if (c.a.poza) c.a.poza.visible = !reales.has(c.a);
  }

  private colocar<L extends THREE.SpotLight | THREE.PointLight>(ranuras: Ranura<L>[], elegidos: { a: AnclaLuz; s: Sala }[], esFoco: boolean) {
    const libres = new Set(ranuras);
    const pendientes: { a: AnclaLuz; s: Sala }[] = [];
    // mantener las que siguen elegidas en su ranura (sin parpadeo)
    for (const e of elegidos) { const r = ranuras.find(x => x.ancla === e.a); if (r) libres.delete(r); else pendientes.push(e); }
    for (const r of ranuras) if (r.ancla && !elegidos.some(e => e.a === r.ancla)) { r.ancla = null; }
    const orden = [...libres];
    for (const e of pendientes) {
      const r = orden.shift(); if (!r) break;
      r.ancla = e.a; r.sala = e.s; r.actual = 0;
      r.luz.position.copy(e.a.pos).add(e.s.grupo.position);
      if (esFoco) {
        const f = r.luz as unknown as THREE.SpotLight;
        f.target.position.copy(e.a.objetivo ?? e.a.pos).add(e.s.grupo.position).setY(e.s.grupo.position.y + (e.a.objetivo?.y ?? 0));
        f.angle = e.a.angulo ?? 0.72; f.penumbra = e.a.penumbra ?? 0.65; f.distance = e.a.distancia ?? 10;
      } else (r.luz as unknown as THREE.PointLight).distance = e.a.distancia ?? 5;
    }
  }
}
