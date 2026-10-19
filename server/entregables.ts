// Entregables: lo que un aventurero deja en la carpeta del proyecto mientras trabaja en un paso. Al terminar el turno se
// buscan los archivos nuevos o cambiados desde que empezó, se apuntan en la historia y se pueden abrir en el juego.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SALTAR = new Set(['.git', 'node_modules', '.claude', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv']);

/** Archivos (rutas relativas, con /) cambiados en `raiz` desde `desde` (ms). Como mucho 4 niveles y 60 archivos. */
export function buscarCambios(raiz: string, desde: number, max = 60): string[] {
  const res: { rel: string; t: number }[] = [];
  const andar = (dir: string, nivel: number) => {
    if (nivel > 4 || res.length > 500) return;
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
