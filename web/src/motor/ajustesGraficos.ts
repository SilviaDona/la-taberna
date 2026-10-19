// Ajustes gráficos de La Taberna (por navegador):
// - «Taberna tranquila», para equipos modestos: menos luces dinámicas, sin parpadeo de velas, sin partículas ni
//   resplandor, sombras a menos ritmo y resolución sin escalar. Se aplica al momento, sin recargar.
// - Movimiento reducido: si el sistema pide `prefers-reduced-motion`, nada parpadea ni se mueve por adorno (las velas
//   quietas, sin polvo flotando); la animación de los personajes se queda (es información: quién trabaja).
const CLAVE = 'taberna.tranquila';
let tranquila = (() => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } })();
const consulta = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const oyentes = new Set<() => void>();
consulta?.addEventListener?.('change', () => oyentes.forEach(f => f()));

export const graficos = {
  get tranquila() { return tranquila; },
  /** sin adornos en movimiento: modo tranquilo o el sistema pide menos movimiento */
  get quieto() { return tranquila || !!consulta?.matches; },
  ponerTranquila(v: boolean) { tranquila = v; try { localStorage.setItem(CLAVE, v ? '1' : '0'); } catch {} oyentes.forEach(f => f()); },
  alCambiar(f: () => void) { oyentes.add(f); return () => oyentes.delete(f); },
};
(globalThis as any).__graficos = graficos;   // QA
