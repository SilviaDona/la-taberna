// El buhonero (Gorgo, goblin de caminos) y el modo decorar: con el oro de los pasos se compran adornos, van al baúl
// y se ponen en las salas de los pasos (shared/mercader.ts; acciones mercader.* y decorar.* del servidor).
import React, { useEffect, useRef, useState } from 'react';
import { vivo, cliente } from '../red/cliente';
import { SFX } from '../audio/sonido';
import { Almacen } from './almacen';
import { Aparato, Opciones, Teclas, cerrarPanel, useMenu, type ItemMenu } from './aparato';
import { MERCADER, MERCANCIAS, existencias, mercancia, precioVenta, type Adorno } from '@shared/mercader';

const usarOro = () => vivo.usar(e => (e.estado?.jugador?.chatarra ?? 0) as number);
const usarBaul = () => vivo.usar(e => (e.estado?.jugador?.baul ?? {}) as Record<string, number>);
const RAREZA: Record<string, string> = { común: '', rara: '◆ rara', legendaria: '★ legendaria' };

export function Mercader({ volver, salaId }: { volver: () => void; salaId: string }) {
  const oro = usarOro(); const baul = usarBaul();
  const [aviso, setAviso] = useState('');
  const hoy = existencias().map(id => mercancia(id)!);
  const enBaul = MERCANCIAS.filter(m => baul[m.id]);
  const hacer = (n: string, id: string) => cliente.accion<{ oro: number }>(n, { id }).then(async r => {
    SFX.exito();
    if (r.oro >= 0) { setAviso(`Vendido por ${r.oro} de oro.`); return; }
    // lo comprado se coloca al momento: sigue al ratón hasta que haces clic donde lo quieres
    await cliente.accion('decorar.poner', { salaId, mercancia: id, x: 0, z: 0.6, giro: 0 });
    const a = (vivo.get().estado?.salas?.find((s: any) => s.id === salaId)?.adornos ?? []) as Adorno[];
    cerrarPanel(); modo.set({ salaId, id: a[a.length - 1]?.id ?? null });
  }).catch(e => { SFX.error(); setAviso((e as Error).message); });
  const items: (ItemMenu & { f: () => void })[] = [
    ...hoy.map(m => ({ texto: <>{m.nombre} <span className="tenue">{RAREZA[m.rareza]}</span></>, pista: <>{m.precio} de oro{baul[m.id] ? ` · tienes ${baul[m.id]}` : ''}</>, apagado: oro < m.precio, clase: m.rareza === 'legendaria' ? 'esperando' : '', f: () => hacer('mercader.comprar', m.id) })),
    ...enBaul.map(m => ({ texto: <>Vender {m.nombre} <span className="tenue">(×{baul[m.id]} en el baúl)</span></>, pista: `+${precioVenta(m)} de oro`, f: () => hacer('mercader.vender', m.id) })),
    { texto: 'Volver', f: volver },
  ];
  const [i, setI] = useMenu(items.length, k => items[k].f(), undefined, volver);
  const sel = hoy[i];
  return (
    <Aparato rotulo={`${MERCADER.nombre.toUpperCase()} · ${MERCADER.mote.toUpperCase()}`} ancho={60} alCerrar={volver}>
      <div className="ficha"><dl>
        <dt>buhonero</dt><dd>{MERCADER.bio} <span className="tenue">Trae otras cosas cada día.</span></dd>
        <dt>tu oro</dt><dd><b>{oro}</b> <span className="tenue">· se gana cumpliendo pasos</span></dd>
        {sel && <><dt>{sel.nombre}</dt><dd>{sel.texto}</dd></>}
      </dl></div>
      {aviso && <p className="aviso-consola">{aviso}</p>}
      <div className="lista-desplazable"><Opciones items={items} i={i} setI={setI} alElegir={k => items[k].f()} /></div>
      <Teclas><kbd>↑↓</kbd>elegir <kbd>Enter</kbd>comprar o vender <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}

// ---------------------------------------------------------------- decorar: elegir qué poner o qué mover
export function Decorar({ salaId, volver }: { salaId: string; volver: () => void }) {
  const baul = usarBaul();
  const adornos = vivo.usar(e => (e.estado?.salas?.find((s: any) => s.id === salaId)?.adornos ?? []) as Adorno[]);
  const [aviso, setAviso] = useState('');
  const poner = (id: string) => cliente.accion('decorar.poner', { salaId, mercancia: id, x: 0, z: 0.6, giro: 0 }).then(() => {
    const a = (vivo.get().estado?.salas?.find((s: any) => s.id === salaId)?.adornos ?? []) as Adorno[];
    SFX.exitoCorto(); cerrarPanel(); modo.set({ salaId, id: a[a.length - 1]?.id ?? null });
  }).catch(e => { SFX.error(); setAviso((e as Error).message); });
  const items: (ItemMenu & { f: () => void })[] = [
    ...MERCANCIAS.filter(m => baul[m.id]).map(m => ({ texto: <>Poner <b>{m.nombre}</b> <span className="tenue">(×{baul[m.id]})</span></>, pista: 'del baúl a la sala', f: () => poner(m.id) })),
    ...adornos.map(a => ({ texto: <>Mover {mercancia(a.mercancia)?.nombre}</>, pista: 'ya está en la sala', f: () => { cerrarPanel(); modo.set({ salaId, id: a.id }); } })),
    { texto: 'Volver', f: volver },
  ];
  const [i, setI] = useMenu(items.length, k => items[k].f(), undefined, volver);
  return (
    <Aparato rotulo="DECORAR LA SALA" ancho={54} alCerrar={volver}>
      {!MERCANCIAS.some(m => baul[m.id]) && !adornos.length && <p className="tenue">Tu baúl está vacío: compra algo al buhonero con el oro de los pasos.</p>}
      {aviso && <p className="aviso-consola">{aviso}</p>}
      <div className="lista-desplazable"><Opciones items={items} i={i} setI={setI} alElegir={k => items[k].f()} /></div>
      <Teclas><kbd>↑↓</kbd>elegir <kbd>Enter</kbd>usar <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}

// ---------------------------------------------------------------- el modo decorar, con la sala a la vista
export const modo = new Almacen<{ salaId: string | null; id: string | null }>({ salaId: null, id: null });

export function ModoDecorar() {
  const m = modo.usar(x => x);
  const adornos = vivo.usar(e => (m.salaId ? e.estado?.salas?.find((s: any) => s.id === m.salaId)?.adornos ?? [] : []) as Adorno[]);
  const a = adornos.find(x => x.id === m.id) ?? null;
  const pos = useRef<{ x: number; z: number; giro: number } | null>(null);
  const envio = useRef<number>(0);
  useEffect(() => { pos.current = a ? { x: a.x, z: a.z, giro: a.giro } : null; }, [a?.id]);
  useEffect(() => {
    if (!m.salaId) return;
    const mandar = () => { clearTimeout(envio.current); envio.current = window.setTimeout(() => { if (pos.current && m.id) cliente.accion('decorar.mover', { salaId: m.salaId, id: m.id, ...pos.current }).catch(() => SFX.error()); }, 120); };
    const k = (ev: KeyboardEvent) => {
      const p = pos.current; const paso = ev.shiftKey ? 0.1 : 0.3;
      let usado = true;
      switch (ev.code) {
        case 'ArrowLeft': if (p) { p.x -= paso; mandar(); SFX.tick(); } break;
        case 'ArrowRight': if (p) { p.x += paso; mandar(); SFX.tick(); } break;
        case 'ArrowUp': if (p) { p.z -= paso; mandar(); SFX.tick(); } break;
        case 'ArrowDown': if (p) { p.z += paso; mandar(); SFX.tick(); } break;
        case 'KeyQ': if (p) { p.giro = (p.giro - 45) % 360; mandar(); SFX.tick(); } break;
        case 'KeyE': if (p) { p.giro = (p.giro + 45) % 360; mandar(); SFX.tick(); } break;
        case 'Tab': { const i = adornos.findIndex(x => x.id === m.id); const sig = adornos[(i + (ev.shiftKey ? adornos.length - 1 : 1)) % Math.max(1, adornos.length)]; if (sig) { modo.set({ id: sig.id }); SFX.tick(); } break; }
        case 'Delete': case 'Backspace': if (m.id) { cliente.accion('decorar.quitar', { salaId: m.salaId, id: m.id }).then(() => { SFX.exitoCorto(); const resto = adornos.filter(x => x.id !== m.id); modo.set({ id: resto[resto.length - 1]?.id ?? null }); }).catch(() => SFX.error()); } break;
        case 'Enter': case 'Escape': SFX.exitoCorto(); modo.set({ salaId: null, id: null }); break;
        default: usado = false;
      }
      if (usado) { ev.preventDefault(); ev.stopPropagation(); }
    };
    addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true);
  }, [m.salaId, m.id, adornos.length]);
  if (!m.salaId) return null;
  const nombre = a ? mercancia(a.mercancia)?.nombre : null;
  return (
    <div className="modo-decorar interactivo">
      <b>🔨 Modo decorar</b> {nombre ? <>· moviendo <b>{nombre}</b></> : <span className="tenue">· no hay nada puesto</span>}
      <div className="teclas-decorar"><b>clic</b> colocar <kbd>←→↑↓</kbd>mover <kbd>⇧</kbd>fino <kbd>Q</kbd><kbd>E</kbd>girar <kbd>Tab</kbd>otro <kbd>Supr</kbd>al baúl <kbd>Enter</kbd>listo</div>
    </div>
  );
}
