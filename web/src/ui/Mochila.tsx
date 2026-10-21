// Lo que lleva la Tabernera: un entregable recogido de la mesa de una sala. Se lleva andando al aventurero del paso
// siguiente y entregárselo es pasar la historia de paso (con su puerta de calidad) y ponerle a trabajar.
// Llevarlo no mueve el archivo: es el mismo de la carpeta del proyecto.
import React, { useState } from 'react';
import { vivo, cliente } from '../red/cliente';
import { SFX } from '../audio/sonido';
import { Almacen } from './almacen';
import { verEntregable, trabajar } from './Pasos';
import { PASOS, siguiente, puedePasar, type Historia, type PasoId } from '@shared/pasos';

export interface Llevado { historia: string; ruta: string; nombre: string; tipo: string; paso: PasoId }
const GUARDADO = 'taberna.mochila';
const leer = (): Llevado | null => { try { return JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch { return null; } };
export const mochila = new Almacen<{ e: Llevado | null; confirmar: { e: Llevado; a: PasoId } | null; aviso: string }>({ e: leer(), confirmar: null, aviso: '' });
mochila.suscribir(() => { try { localStorage.setItem(GUARDADO, JSON.stringify(mochila.get().e)); } catch {} });

export const ICONO: Record<string, string> = { html: '🍲', md: '📜', json: '🗂', texto: '📄', imagen: '🖼', otro: '📦' };
const historia = (id: string) => ((vivo.get().estado?.historias ?? []) as Historia[]).find(h => h.id === id);
const avisar = (aviso: string) => { mochila.set({ aviso }); setTimeout(() => { if (mochila.get().aviso === aviso) mochila.set({ aviso: '' }); }, 6000); };

export function recoger(e: Llevado) { SFX.exitoCorto(); mochila.set({ e, aviso: '' }); }
export function dejar() { SFX.tick(); mochila.set({ e: null, confirmar: null }); }

/** A quién hay que llevar lo que se lleva (el paso siguiente al suyo) */
export function destinoDe(e: Llevado): PasoId | 'hecha' | null { return PASOS[e.paso] ? siguiente(e.paso) : null; }

/** Entregar al aventurero de la sala `a`: si es el del paso siguiente, se pide la puerta de calidad y se pasa */
export function entregar(a: string): boolean {
  const e = mochila.get().e; if (!e) return false;
  if (!PASOS[e.paso]) { avisar('Esto es de La Barra: no va a ningún paso. Puedes verlo o dejarlo.'); return true; }
  const dest = destinoDe(e);
  // lo que se generó en una conversación suelta va con la historia que esté en su paso
  const h = historia(e.historia) ?? ((vivo.get().estado?.historias ?? []) as Historia[]).filter(x => x.paso === e.paso).sort((a, b) => b.actualizada - a.actualizada)[0];
  if (h && !e.historia) { e.historia = h.id; mochila.set({ e: { ...e } }); }
  if (!h) { avisar(`No hay ninguna historia en ${PASOS[e.paso].sala}: crea o mueve una allí para llevarle esto.`); return true; }
  if (!dest || dest === 'hecha') { avisar('Este ya es el final del proceso: no hay a quién llevárselo.'); return true; }
  if (a !== dest) { SFX.noPermitido(); avisar(`Esto no es para ${PASOS[a as PasoId]?.aventurero.nombre ?? 'él'}: llévaselo a ${PASOS[dest].aventurero.nombre}, en ${PASOS[dest].sala}.`); return true; }
  if (h.paso === dest) { empezarEn(dest, h); return true; }   // ya estaba pasada: solo le pone a trabajar
  if (h.paso !== e.paso) { avisar(`La historia está en ${h.paso === 'hecha' ? 'cerrada' : PASOS[h.paso].sala}: esto ya no le toca.`); return true; }
  if (!puedePasar(h)) { SFX.noPermitido(); avisar('Quedan supuestos sin revisar en el Mostrador: márcalos antes de seguir.'); return true; }
  mochila.set({ confirmar: { e, a: dest } });
  return true;
}
function empezarEn(dest: PasoId, h: Historia) {
  mochila.set({ e: null, confirmar: null });
  if (PASOS[dest].comando || dest === 'forja') trabajar(dest, h);
  else { SFX.exito(); avisar(`Entregado a ${PASOS[dest].aventurero.nombre}.`); }
}

/** Abajo, en el centro: lo que llevas, a quién llevárselo y, al entregar, la puerta de calidad */
export function Mochila() {
  const { e, confirmar, aviso } = mochila.usar(x => x);
  const [error, setError] = useState('');
  if (!e && !aviso) return null;
  if (confirmar) {
    const p = PASOS[confirmar.e.paso];
    const pasar = () => cliente.accion<{ oro: number }>('historia.pasar', { id: confirmar.e.historia }).then(r => {
      SFX.exito(); const h = historia(confirmar.e.historia); setError('');
      if (h) empezarEn(confirmar.a, h); if (r.oro) avisar(`+${r.oro} de oro por cumplir el paso`);
    }).catch(err => { SFX.error(); setError((err as Error).message); });
    return (
      <div className="mochila interactivo confirmar">
        <b>¿Cumple la puerta de calidad del paso {p.numero}?</b>
        <ul>{p.puerta.map((x, k) => <li key={k}>☐ {x}</li>)}</ul>
        {error && <p className="aviso-consola">{error}</p>}
        <button onClick={pasar}>✔ Sí: entregar a {PASOS[confirmar.a].aventurero.nombre} (+{p.oro} de oro)</button>
        <button onClick={() => mochila.set({ confirmar: null })}>Aún no</button>
      </div>
    );
  }
  const dest = e ? destinoDe(e) : null;
  return (
    <div className="mochila interactivo">
      {e && <><span className="icono">{ICONO[e.tipo] ?? '📦'}</span> Llevas <b>{e.nombre}</b>
        <span className="tenue"> · {dest && dest !== 'hecha' && PASOS[dest] ? <>llévaselo a <b>{PASOS[dest].aventurero.nombre}</b> ({PASOS[dest].sala}) y pulsa E</> : 'último paso'}</span>
        <button onClick={() => verEntregable(e)}>Ver</button><button onClick={dejar}>Dejar</button></>}
      {aviso && <div className="aviso-consola">{aviso}</div>}
    </div>
  );
}
