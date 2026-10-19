// Tablón de encargos (Tab): cada conversación abierta de cualquier sala es un encargo. Primero los que esperan al
// tabernero (un permiso, una pregunta, un plan, una avería o algo terminado sin leer), luego los que están en faena.
import type { ResumenSesion } from './protocolo.ts';

export interface Encargo { s: ResumenSesion; quien: string; sala: string; espera: string | null; orden: number }
const ESPERA: Record<string, string> = { permiso: 'pide permiso', pregunta: 'te pregunta', plan: 'presenta un plan', confianza: 'pide confianza en la carpeta' };
export function encargos(sesiones: ResumenSesion[], habitantes: { id: string; nombre: string }[], salas: { id: string; nombre: string }[]): Encargo[] {
  const nombre = (l: { id: string; nombre: string }[], id: string) => l.find(x => x.id === id)?.nombre ?? id;
  return sesiones.filter(s => s.estado !== 'cerrada' && (s.estado !== 'ociosa' || s.sinLeer || s.pendiente)).map(s => {
    const espera = s.pendiente ? ESPERA[s.pendiente.tipo] ?? 'te espera' : s.estado === 'error' ? 'avería' : s.estado === 'esperando' ? 'te espera' : s.sinLeer && (s.estado === 'terminada' || s.estado === 'ociosa') ? 'terminó: sin leer' : null;
    const orden = s.pendiente || s.estado === 'esperando' ? 0 : s.estado === 'error' ? 1 : espera ? 2 : 3;
    return { s, quien: nombre(habitantes, s.habitanteId), sala: nombre(salas, s.salaId), espera, orden };
  }).sort((a, b) => a.orden - b.orden || b.s.actualizada - a.s.actualizada);
}
