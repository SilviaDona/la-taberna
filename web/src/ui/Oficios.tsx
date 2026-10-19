// Salas de oficio de UX en la Puerta (contratar un oficio o abrir una mesa de proyecto) y sus acciones rápidas en el
// panel de la sala. Las plantillas, los CLAUDE.md y los decorados, en shared/oficios.ts.
import React, { useEffect, useRef, useState } from 'react';
import { juego } from './estadoJuego';
import { vivo, cliente } from '../red/cliente';
import { SFX } from '../audio/sonido';
import { Aparato, Opciones, Teclas, cerrarPanel, useMenu, useTeclas, type ItemMenu } from './aparato';
import { irA } from './Paneles';
import { PLANTILLAS, COLORES_ESTANDARTE, NOMBRE_COLOR, accionesDeOficio, promptDeAccion, type AccionOficio, type Oficio } from '@shared/oficios';

const ORDEN = Object.keys(PLANTILLAS) as Exclude<Oficio, 'proyecto'>[];

/** La lista de oficios que se pueden contratar en la Puerta (los que ya tiene la taberna salen apagados) */
export function ContratarOficio({ volver }: { volver: () => void }) {
  const salas = vivo.usar(e => e.estado?.salas ?? []) as any[];
  const [paso, setPaso] = useState<'lista' | 'proyecto'>('lista');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const contratar = async (oficio: Oficio, datos: Record<string, unknown> = {}) => {
    if (enviando) return; setEnviando(true); setError('');
    try { const r = await cliente.accion<{ id: string }>('reclutarOficio', { oficio, ...datos }); SFX.exitoCorto(); cerrarPanel(); irA(r.id); }
    catch (e) { SFX.error(); setError((e as Error).message); setEnviando(false); }
  };
  const tiene = (o: Oficio) => salas.some(s => s.oficio === o);
  const items: (ItemMenu & { f: () => void })[] = [
    ...ORDEN.map(o => ({ texto: <><b>{PLANTILLAS[o].sala}</b> <span className="tenue">· {PLANTILLAS[o].oficio}</span></>, pista: tiene(o) ? 'ya está en la taberna' : PLANTILLAS[o].resumen, apagado: tiene(o), f: () => (tiene(o) ? SFX.noPermitido() : contratar(o)) })),
    { texto: <><b>Mesa de proyecto</b> <span className="tenue">· una por cliente o proyecto</span></>, pista: 'estandarte, carpeta y CLAUDE.md de contexto', f: () => setPaso('proyecto') },
    { texto: 'Volver', f: volver },
  ];
  const [i, setI] = useMenu(items.length, k => items[k].f(), undefined, volver);
  if (paso === 'proyecto') return <MesaDeProyecto volver={() => setPaso('lista')} crear={(nombre, color) => contratar('proyecto', { nombre, color })} error={error} />;
  return (
    <Aparato rotulo="PUERTA · OFICIOS DE LA TABERNA" ancho={56} alCerrar={volver}>
      <p className="voz">Cada oficio es una sala con su aventurero, su carpeta y su manera de trabajar (su CLAUDE.md y sus skills).</p>
      <p className="tenue">La carpeta va en los datos de la taberna; los entregables quedan en <code>entregables/</code>.</p>
      {error && <p className="aviso-consola">{error}</p>}
      <Opciones items={items} i={i} setI={setI} alElegir={k => items[k].f()} />
      <Teclas><kbd>↑↓</kbd>elegir <kbd>Enter</kbd>contratar <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}

function MesaDeProyecto({ volver, crear, error }: { volver: () => void; crear: (nombre: string, color: string) => void; error: string }) {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState<string>(COLORES_ESTANDARTE[0]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useTeclas(e => { if (e.code === 'Escape') volver(); });
  const valido = nombre.trim().length > 0;
  const mover = (d: number) => { const k = COLORES_ESTANDARTE.indexOf(color as any); setColor(COLORES_ESTANDARTE[(k + d + COLORES_ESTANDARTE.length) % COLORES_ESTANDARTE.length]); SFX.tick(); };
  return (
    <Aparato rotulo="PUERTA · MESA DE PROYECTO" ancho={52} alCerrar={volver}>
      <p>Nombre del cliente o del proyecto (sale en el estandarte):</p>
      <div className="linea-entrada activa">
        <span className="prompt-sim">⚑</span>
        <input ref={ref} className="campo" value={nombre} maxLength={32} placeholder="Reservas Ejemplo" onChange={e => setNombre(e.target.value)} spellCheck={false}
          onKeyDown={e => { if (e.key === 'Enter' && valido) { e.preventDefault(); SFX.clic(); crear(nombre.trim(), color); } else if (e.key === 'Escape') { e.preventDefault(); volver(); } else if (e.key === 'Tab') { e.preventDefault(); mover(e.shiftKey ? -1 : 1); } }} />
      </div>
      <div className="fila-chips activa"><span className="etq">estandarte</span>
        {COLORES_ESTANDARTE.map(c => <button key={c} className={'chip' + (c === color ? ' on' : '')} style={{ borderColor: c, boxShadow: c === color ? `inset 0 0 0 2px ${c}` : undefined }} onClick={() => setColor(c)}>{NOMBRE_COLOR[c]}</button>)}
      </div>
      <p className="tenue">Se crea su carpeta con un CLAUDE.md de contexto para rellenar con su senescal («Completar el contexto del proyecto»). Sin datos reales en los ejemplos.</p>
      {error && <p className="aviso-consola">{error}</p>}
      <Teclas><kbd>Enter</kbd>abrir la mesa <kbd>Tab</kbd>color <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}

// ---------------------------------------------------------------- acciones rápidas del panel de una sala de oficio
/** Arranca la acción con el aventurero de la sala: una conversación nueva con su prompt */
function lanzar(salaId: string, a: AccionOficio, valor = '') {
  const h = juego.get().habitantes.find(x => x.sala === salaId && !x.copia);
  if (!h) { SFX.noPermitido(); return; }
  cliente.enviar({ t: 'empezar', habitanteId: h.id, salaId, prompt: promptDeAccion(a, valor), opciones: {} });
  SFX.exitoCorto(); cerrarPanel(); irA(salaId, h.id, true);
}
/** Las acciones del oficio como opciones del menú del panel (las que piden un dato abren `pedir`) */
export function itemsDeOficio(salaId: string, oficio: Oficio, pedir: (a: AccionOficio) => void): (ItemMenu & { f: () => void })[] {
  return accionesDeOficio(oficio).map(a => ({ texto: <>⚔ {a.texto}</>, pista: a.adjunto ? a.pista + ' · luego pegas la captura' : a.pista, f: () => (a.pide ? pedir(a) : lanzar(salaId, a)) }));
}
/** El dato que pide una acción (una URL, una pantalla…) antes de lanzarla */
export function PedirDato({ salaId, sala, accion, volver }: { salaId: string; sala: any; accion: AccionOficio; volver: () => void }) {
  const [texto, setTexto] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useTeclas(e => { if (e.code === 'Escape') volver(); });
  const pide = accion.pide!;
  const t = texto.trim();
  const valido = t.length > 0 && (!pide.url || /^https?:\/\/\S+$/i.test(t) || !/^\w+:/.test(t));
  return (
    <Aparato rotulo={`${sala.nombre} · ${accion.texto.toUpperCase()}`} ancho={56} alCerrar={volver}>
      <p>{pide.etiqueta}</p>
      <div className="linea-entrada activa">
        <span className="prompt-sim">›</span>
        <input ref={ref} className="campo" value={texto} placeholder={pide.ejemplo} onChange={e => setTexto(e.target.value)} spellCheck={false}
          onKeyDown={e => { if (e.key === 'Enter' && valido) { e.preventDefault(); lanzar(salaId, accion, t); } else if (e.key === 'Escape') { e.preventDefault(); volver(); } }} />
      </div>
      {pide.url && t && !valido && <p className="aviso-consola">Tiene que ser una dirección http(s).</p>}
      <Teclas><kbd>Enter</kbd>encargar <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}
