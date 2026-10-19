// El panel de una sala de un paso del proceso de UX (shared/pasos.ts): el proyecto, las historias que están en ese
// paso, trabajar en una con el aventurero de la sala (su skill, en la carpeta del proyecto), la puerta de calidad para
// pasarla al siguiente (da oro) y, desde la Torre o el Salón, la vuelta a la Cocina con los ACs que corregir.
// En el Mostrador del BA, los supuestos se marcan a mano. Cada vista es su componente (con sus propios hooks).
import React, { useEffect, useRef, useState } from 'react';
import { juego } from './estadoJuego';
import { vivo, cliente } from '../red/cliente';
import { SFX } from '../audio/sonido';
import { Aparato, Opciones, Teclas, cerrarPanel, useMenu, useTeclas, type ItemMenu } from './aparato';
import { irA } from './Paneles';
import { PASOS, PASOS_IDS, siguiente, puedePasar, promptDePaso, type Historia, type PasoId, type Proyecto, type Supuesto } from '@shared/pasos';

type Vista = { v: 'menu' } | { v: 'proyecto' } | { v: 'nueva' } | { v: 'historia'; id: string } | { v: 'supuestos'; id: string } | { v: 'volver'; id: string };
const usarHistorias = () => vivo.usar(e => (e.estado?.historias ?? []) as Historia[]);
const usarProyecto = () => vivo.usar(e => e.estado?.proyecto as Proyecto | undefined);
const accion = (nombre: string, d: Record<string, unknown>) => cliente.accion<{ oro: number; id?: string }>(nombre, d);
const nombrePaso = (p: PasoId | 'hecha') => (p === 'hecha' ? 'cerrada' : `${PASOS[p].numero} · ${PASOS[p].sala}`);

export function PanelDePaso({ salaId, sala, generales }: { salaId: string; sala: any; generales: (ItemMenu & { f: () => void })[] }) {
  const [vista, setVista] = useState<Vista>({ v: 'menu' });
  const menu = () => setVista({ v: 'menu' });
  switch (vista.v) {
    case 'proyecto': return <ElegirProyecto volver={menu} />;
    case 'nueva': return <NuevaHistoria volver={menu} alCrear={id => setVista({ v: 'historia', id })} />;
    case 'historia': return <HistoriaEnPaso salaId={salaId} id={vista.id} volver={menu} ir={setVista} />;
    case 'supuestos': return <AnadirSupuestos id={vista.id} volver={() => setVista({ v: 'historia', id: vista.id })} />;
    case 'volver': return <VolverACocina id={vista.id} volver={() => setVista({ v: 'historia', id: vista.id })} hecho={menu} />;
    default: return <MenuDePaso salaId={salaId} sala={sala} generales={generales} ir={setVista} />;
  }
}

function MenuDePaso({ salaId, sala, generales, ir }: { salaId: string; sala: any; generales: (ItemMenu & { f: () => void })[]; ir: (v: Vista) => void }) {
  const paso = PASOS[sala.paso as PasoId];
  const proyecto = usarProyecto();
  const todas = usarHistorias();
  // en el Libro del Tabernero salen también las ya cerradas: es donde se apunta todo
  const aqui = todas.filter(h => h.paso === paso.id || (paso.id === 'libro' && h.paso === 'hecha'));
  const items: (ItemMenu & { f: () => void })[] = [
    ...(!proyecto ? [{ texto: <b>Elegir la carpeta del proyecto…</b>, pista: 'donde están sus reglas, componentes y personas', f: () => ir({ v: 'proyecto' }) }] : []),
    ...(paso.id === 'mapas' && proyecto ? [{ texto: <b>Nueva historia: pegar la historia y sus ACs…</b>, pista: 'entra por aquí, el paso 1', f: () => ir({ v: 'nueva' }) }] : []),
    ...aqui.map(h => ({ texto: <>📜 <b>{h.titulo}</b>{h.vuelta && <span className="aviso-consola"> · vuelve del paso {PASOS[h.vuelta.desde].numero}</span>}</>, pista: h.paso === 'hecha' ? 'cerrada' : paso.id === 'mostrador' ? `${h.supuestos.filter(s => s.estado === 'sin revisar').length} supuestos sin revisar` : 'trabajar o pasarla', f: () => ir({ v: 'historia', id: h.id }) })),
    ...(proyecto ? [{ texto: <>Proyecto: <b>{proyecto.nombre}</b></>, pista: 'cambiar de carpeta', f: () => ir({ v: 'proyecto' }) }] : []),
    ...generales,
  ];
  const [i, setI] = useMenu(items.length, k => items[k].f());
  return (
    <Aparato rotulo={`PASO ${paso.numero} · ${sala.nombre}`} ancho={60}>
      <div className="ficha"><dl>
        <dt>paso</dt><dd><b>{paso.etapa}</b>{paso.comando && <> · <code>{paso.comando}</code></>}</dd>
        <dt>para pasar</dt><dd>{paso.puerta.join(' ')} <span className="tenue">(+{paso.oro} de oro)</span></dd>
        <dt>proyecto</dt><dd>{proyecto ? <>{proyecto.nombre} <span className="tenue">· {proyecto.ruta}</span></> : <span className="aviso-consola">sin elegir: las salas no pueden trabajar hasta que elijas su carpeta</span>}</dd>
        <dt>aquí</dt><dd>{aqui.length ? `${aqui.length} ${aqui.length === 1 ? 'historia' : 'historias'}` : <span className="tenue">ninguna historia en este paso</span>} <span className="tenue">· en toda la taberna: {todas.filter(h => h.paso !== 'hecha').length} en curso</span></dd>
      </dl></div>
      <div className="lista-desplazable"><Opciones items={items} i={i} setI={setI} alElegir={k => items[k].f()} /></div>
      <Teclas><kbd>↑↓</kbd>elegir <kbd>Enter</kbd>usar <kbd>Esc</kbd>cerrar</Teclas>
    </Aparato>
  );
}

/** La carpeta del proyecto (una ruta de este equipo): la escribe la Tabernera; el juego no la guarda en el código */
function ElegirProyecto({ volver }: { volver: () => void }) {
  const proyecto = usarProyecto();
  const [ruta, setRuta] = useState(proyecto?.ruta ?? '');
  const [error, setError] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useTeclas(e => { if (e.code === 'Escape') volver(); });
  const elegir = async () => {
    try { await cliente.accion('proyecto.elegir', { ruta }); SFX.exitoCorto(); volver(); }
    catch (e) { SFX.error(); setError((e as Error).message); }
  };
  return (
    <Aparato rotulo="PROYECTO · CARPETA" ancho={60} alCerrar={volver}>
      <p>Ruta de la carpeta del proyecto (la que tiene sus reglas, el mapa de componentes y las personas):</p>
      <div className="linea-entrada activa">
        <span className="prompt-sim">›</span>
        <input ref={ref} className="campo" value={ruta} placeholder="D:\Proyectos\Mi proyecto" onChange={e => setRuta(e.target.value)} spellCheck={false}
          onKeyDown={e => { if (e.key === 'Enter' && ruta.trim()) { e.preventDefault(); elegir(); } else if (e.key === 'Escape') { e.preventDefault(); volver(); } }} />
      </div>
      <p className="tenue">Todas las salas de los pasos trabajarán ahí, con tus skills y las reglas del proyecto. Puedes pegar la ruta con comillas.</p>
      {error && <p className="aviso-consola">{error}</p>}
      <Teclas><kbd>Enter</kbd>elegir <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}

/** Un texto largo (historia y ACs, supuestos, ACs a corregir): Ctrl+Enter lo manda, Esc vuelve */
function Texto({ rotulo, etiqueta, ejemplo, boton, alMandar, volver, titulo }: { rotulo: string; etiqueta: string; ejemplo: string; boton: string; alMandar: (texto: string, titulo: string) => Promise<void>; volver: () => void; titulo?: boolean }) {
  const [texto, setTexto] = useState('');
  const [tit, setTit] = useState('');
  const [error, setError] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { area.current?.focus(); }, []);
  const mandar = async () => { if (!texto.trim()) return; try { await alMandar(texto, tit); } catch (e) { SFX.error(); setError((e as Error).message); } };
  const teclas = (e: React.KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); mandar(); } else if (e.key === 'Escape') { e.preventDefault(); volver(); } };
  return (
    <Aparato rotulo={rotulo} ancho={64} alCerrar={volver}>
      {titulo && <><p>Título (si lo dejas vacío, la primera línea):</p>
        <div className="linea-entrada activa"><span className="prompt-sim">›</span><input className="campo" value={tit} onChange={e => setTit(e.target.value)} onKeyDown={teclas} spellCheck={false} /></div></>}
      <p>{etiqueta}</p>
      <textarea ref={area} className="campo" rows={12} style={{ width: '100%', resize: 'vertical' }} value={texto} placeholder={ejemplo} onChange={e => setTexto(e.target.value)} onKeyDown={teclas} />
      {error && <p className="aviso-consola">{error}</p>}
      <p><button className="chip on" onClick={mandar} disabled={!texto.trim()}>{boton}</button></p>
      <Teclas><kbd>Ctrl</kbd>+<kbd>Enter</kbd>{boton.toLowerCase()} <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}
function NuevaHistoria({ volver, alCrear }: { volver: () => void; alCrear: (id: string) => void }) {
  return <Texto rotulo="SALA DE MAPAS · NUEVA HISTORIA" titulo etiqueta="La historia de usuario y sus ACs, tal cual:" ejemplo={'Como empleada quiero solicitar un permiso…\n\nAC1: …\nAC2: …'} boton="Abrir la historia" volver={volver}
    alMandar={async (texto, titulo) => { const r = await accion('historia.crear', { texto, titulo }); SFX.exitoCorto(); alCrear(r.id!); }} />;
}
function AnadirSupuestos({ id, volver }: { id: string; volver: () => void }) {
  return <Texto rotulo="MOSTRADOR DEL BA · SUPUESTOS" etiqueta="Un supuesto por línea (los del plan del paso 1):" ejemplo={'¿El saldo se recalcula al cancelar?\n¿Puede aprobar quien solicita?'} boton="Añadir" volver={volver}
    alMandar={async texto => { await accion('historia.supuesto.anadir', { id, texto }); SFX.exitoCorto(); volver(); }} />;
}
function VolverACocina({ id, volver, hecho }: { id: string; volver: () => void; hecho: () => void }) {
  return <Texto rotulo="VUELTA A LA COCINA" etiqueta="¿Qué ACs hay que corregir? (solo esos se vuelven a revisar)" ejemplo="AC3 y AC5: …" boton="Mandar a la Cocina" volver={volver}
    alMandar={async acs => { await accion('historia.volver', { id, acs }); SFX.exitoCorto(); hecho(); }} />;
}

/** Arranca el paso con el aventurero de su sala: una conversación nueva con su skill, en la carpeta del proyecto */
function trabajar(paso: PasoId, h: Historia) {
  const salaId = paso;
  const hab = juego.get().habitantes.find(x => x.sala === salaId && !x.copia);
  const prompt = promptDePaso(paso, h);
  if (!hab || !prompt) { SFX.noPermitido(); return; }
  cliente.enviar({ t: 'empezar', habitanteId: hab.id, salaId, prompt, opciones: {} });
  SFX.exitoCorto(); cerrarPanel(); irA(salaId, hab.id, true);
}

const SIGUIENTE_ESTADO: Record<Supuesto['estado'], Supuesto['estado']> = { 'sin revisar': 'confirmado', confirmado: 'pendiente', pendiente: 'sin revisar' };
const TEXTO_ESTADO: Record<Supuesto['estado'], string> = { 'sin revisar': '○ sin revisar', confirmado: '✔ confirmado', pendiente: '… pendiente del BA' };

function HistoriaEnPaso({ salaId, id, volver, ir }: { salaId: string; id: string; volver: () => void; ir: (v: Vista) => void }) {
  const h = usarHistorias().find(x => x.id === id);
  const proyecto = usarProyecto();
  const [confirmar, setConfirmar] = useState<'pasar' | 'borrar' | null>(null);
  const [aviso, setAviso] = useState('');
  const hacer = (nombre: string, d: Record<string, unknown> = {}) => accion(nombre, { id, ...d }).then(r => { if (r.oro) SFX.exito(); return r; }).catch(e => { SFX.error(); setAviso((e as Error).message); throw e; });
  const p = h && h.paso !== 'hecha' ? PASOS[h.paso] : null;
  const sig = h && h.paso !== 'hecha' ? siguiente(h.paso) : 'hecha';
  const items: (ItemMenu & { f: () => void })[] = !h ? [] : [
    ...(p && p.comando ? [{ texto: <>Trabajar con <b>{p.aventurero.nombre}</b> <code>{p.comando}</code></>, pista: proyecto ? 'en la carpeta del proyecto' : 'antes, elige el proyecto', apagado: !proyecto, f: () => (proyecto ? trabajar(p.id, h) : SFX.noPermitido()) }] : []),
    ...(p?.id === 'forja' ? [{ texto: <>Trabajar con <b>{p.aventurero.nombre}</b>: construir y verificar</>, pista: proyecto ? 'skill de prototipado del proyecto' : 'antes, elige el proyecto', apagado: !proyecto, f: () => (proyecto ? trabajar('forja', h) : SFX.noPermitido()) }] : []),
    ...(p?.id === 'mostrador' ? [
      ...h.supuestos.map(s => ({ texto: <>{s.texto}</>, pista: TEXTO_ESTADO[s.estado], clase: s.estado === 'sin revisar' ? 'esperando' : '', f: () => { SFX.tick(); hacer('historia.supuesto.estado', { supuesto: s.id, estado: SIGUIENTE_ESTADO[s.estado] }).catch(() => {}); } })),
      { texto: 'Añadir supuestos…', pista: 'uno por línea', f: () => ir({ v: 'supuestos', id }) },
    ] : []),
    ...(p ? [{ texto: confirmar === 'pasar' ? <>¿Cumple la puerta de calidad? <b>Enter otra vez</b> para pasarla a {nombrePaso(sig)}</> : <>✔ Paso cumplido: pasar a <b>{nombrePaso(sig)}</b></>, pista: h.hechos.includes(p.id) ? 'ya se cobró su oro' : `+${p.oro} de oro${sig === 'hecha' ? ' y 25 por cerrarla' : ''}`, apagado: !puedePasar(h), f: () => {
      if (!puedePasar(h)) { SFX.noPermitido(); setAviso('Quedan supuestos sin revisar: márcalos como confirmados o pendientes del BA.'); return; }
      if (confirmar !== 'pasar') { setConfirmar('pasar'); return; }
      hacer('historia.pasar').then(r => { setAviso(r.oro ? `+${r.oro} de oro` : 'Pasada.'); setConfirmar(null); volver(); }).catch(() => setConfirmar(null));
    } }] : []),
    ...(p && (p.id === 'torre' || p.id === 'salon') ? [{ texto: '↩ Hay que corregir: volver a la Cocina con los ACs afectados…', f: () => ir({ v: 'volver', id }) }] : []),
    { texto: confirmar === 'borrar' ? '¿Seguro? Enter otra vez para borrar la historia' : 'Borrar la historia', peligro: true, f: () => { if (confirmar !== 'borrar') { setConfirmar('borrar'); return; } hacer('historia.borrar').then(volver).catch(() => {}); } },
    { texto: 'Volver', f: volver },
  ];
  const [i, setI] = useMenu(items.length, k => items[k].f(), undefined, volver);
  if (!h) return <Aparato rotulo="HISTORIA" ancho={50} alCerrar={volver}><p className="tenue">Esa historia ya no está.</p></Aparato>;
  return (
    <Aparato rotulo={`HISTORIA · ${h.titulo.toUpperCase().slice(0, 50)}`} ancho={64} alCerrar={volver}>
      <div className="ficha"><dl>
        <dt>paso</dt><dd>{h.paso === 'hecha' ? 'cerrada' : <><b>{PASOS[h.paso].numero} · {PASOS[h.paso].etapa}</b> <span className="tenue">en {PASOS[h.paso].sala}</span></>}{h.paso !== 'hecha' && h.paso !== salaId && <span className="aviso-consola"> (no está en esta sala)</span>}</dd>
        <dt>recorrido</dt><dd>{PASOS_IDS.map(x => <span key={x} className={h.hechos.includes(x) ? '' : 'tenue'} title={PASOS[x].etapa}>{h.hechos.includes(x) ? '✔' : h.paso === x ? '▶' : '·'} {PASOS[x].numero}&nbsp; </span>)}</dd>
        {p && <><dt>para pasar</dt><dd>{p.puerta.map((x, k) => <div key={k}>☐ {x}</div>)}</dd></>}
        {h.vuelta && <><dt>vuelta</dt><dd className="aviso-consola">desde el paso {PASOS[h.vuelta.desde].numero}: {h.vuelta.acs}</dd></>}
        {p?.id === 'mostrador' && <><dt>supuestos</dt><dd>{h.supuestos.length ? `${h.supuestos.filter(s => s.estado === 'confirmado').length} confirmados, ${h.supuestos.filter(s => s.estado === 'pendiente').length} pendientes del BA, ${h.supuestos.filter(s => s.estado === 'sin revisar').length} sin revisar · Enter cambia el estado` : 'ninguno apuntado'}</dd></>}
      </dl></div>
      {aviso && <p className="aviso-consola">{aviso}</p>}
      <div className="lista-desplazable"><Opciones items={items} i={i} setI={k => { setI(k); setConfirmar(null); }} alElegir={k => items[k].f()} /></div>
      <Teclas><kbd>↑↓</kbd>elegir <kbd>Enter</kbd>usar <kbd>Esc</kbd>volver</Teclas>
    </Aparato>
  );
}
