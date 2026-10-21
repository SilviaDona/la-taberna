// Entregables: lo que un aventurero deja en la carpeta del proyecto mientras trabaja en un paso. Al terminar el turno se
// buscan los archivos nuevos o cambiados desde que empezó, se apuntan en la historia y se pueden abrir en el juego.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SALTAR = new Set(['.git', 'node_modules', '.claude', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv']);

/** Archivos (rutas relativas, con /) cambiados en `raiz` desde `desde` (ms). Como mucho 6 niveles y 60 archivos. */
export function buscarCambios(raiz: string, desde: number, max = 60): string[] {
  const res: { rel: string; t: number }[] = [];
  const andar = (dir: string, nivel: number) => {
    if (nivel > 6 || res.length > 500) return;
    let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('.') && e.name !== '.') { if (SALTAR.has(e.name) || e.isDirectory()) continue; }
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SALTAR.has(e.name)) andar(abs, nivel + 1); continue; }
      if (!e.isFile()) continue;
      try { const t = statSync(abs).mtimeMs; if (t >= desde - 1000) res.push({ rel: path.relative(raiz, abs).split(path.sep).join('/'), t }); } catch {}
    }
  };
  andar(raiz, 0);
  return res.sort((a, b) => b.t - a.t).slice(0, max).map(x => x.rel);
}

/** La carpeta de primer nivel que tienen en común los archivos (la carpeta nueva de la historia), si la hay. */
export function carpetaComun(rutas: string[]): string | undefined {
  const tops = new Set(rutas.filter(r => r.includes('/')).map(r => r.split('/')[0]));
  return tops.size === 1 ? [...tops][0] : undefined;
}

// ---------------------------------------------------------------- apuntarlos
import { esPaso, tipoEntregable, type Historia, type PasoId } from '../shared/pasos.ts';
export interface Suelto { ruta: string; nombre: string; tipo: string; fecha: number }
/** Apunta lo nuevo de un turno: en la historia que se trabajaba o, si no se dijo (una conversación suelta con el
 *  aventurero), en la última historia que está en ese paso; si no hay ninguna (o es La Barra), en lo suelto de la sala.
 *  Devuelve la historia en la que ha quedado (si alguna). */
export function apuntar(e: { historias: Historia[]; sueltos?: Record<string, Suelto[]> }, salaId: string, historiaId: string | undefined, rutas: string[], ahora = Date.now()): Historia | undefined {
  if (!rutas.length) return undefined;
  const paso = esPaso(salaId) ? (salaId as PasoId) : undefined;
  const h = (historiaId && e.historias.find(x => x.id === historiaId)) || (paso ? e.historias.filter(x => x.paso === paso).sort((a, b) => b.actualizada - a.actualizada)[0] : undefined);
  if (h && paso) {
    if (!h.carpeta) { const c = carpetaComun(rutas); if (c) h.carpeta = c; }
    for (const ruta of rutas) {
      const previo = h.entregables.find(y => y.ruta === ruta);
      if (previo) { previo.fecha = ahora; previo.paso = paso; }
      else h.entregables.push({ ruta, nombre: ruta.split('/').pop() || ruta, paso, tipo: tipoEntregable(ruta), fecha: ahora });
    }
    h.entregables = h.entregables.slice(-200); h.actualizada = ahora;
    return h;
  }
  const lista = ((e.sueltos ??= {})[salaId] ??= []);
  for (const ruta of rutas) {
    const previo = lista.find(y => y.ruta === ruta);
    if (previo) previo.fecha = ahora; else lista.push({ ruta, nombre: ruta.split('/').pop() || ruta, tipo: tipoEntregable(ruta), fecha: ahora });
  }
  e.sueltos[salaId] = lista.slice(-50);
  return undefined;
}
export function sanearSueltos(v: unknown): Record<string, Suelto[]> {
  const out: Record<string, Suelto[]> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, l] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(l) || k.length > 40) continue;
    out[k] = l.filter((x: any) => x && typeof x.ruta === 'string' && !x.ruta.split(/[\\/]/).includes('..')).slice(-50)
      .map((x: any) => ({ ruta: x.ruta.slice(0, 400), nombre: String(x.nombre || x.ruta).slice(0, 120), tipo: tipoEntregable(x.ruta), fecha: Number.isFinite(x.fecha) ? x.fecha : Date.now() }));
  }
  return out;
}
