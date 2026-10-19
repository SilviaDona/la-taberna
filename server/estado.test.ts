import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { sanear, estadoInicial, carpetaDe, CARPETAS_SALAS, anadirSalasDeServicio, migrarATabernaUX, ponerProyecto } from './estado.ts';
import { rutaEjemplo } from './ejemplos.ts';

describe('estado guardado', () => {
  it('una sala de servicio que falte en un refugio guardado entra en su sitio, sin tocar sus repos', () => {
    const viejo: any = estadoInicial();
    viejo.salas = viejo.salas.filter((s: any) => s.id !== 'chapa').concat([{ id: 'mio', tipo: 'repo', nombre: 'mio', ruta: '/tmp/mio', planta: 3, lado: 'izq', orden: 0, variante: 'taller' }]);
    const s = sanear(viejo);
    expect(anadirSalasDeServicio(s)).toBe(true);
    expect(s.salas.find(x => x.id === 'chapa')).toMatchObject({ tipo: 'chapa', nombre: 'Sastre y Barbero' });
    expect(s.salas.find(x => x.id === 'mio')?.ruta).toBe('/tmp/mio');
    expect(anadirSalasDeServicio(s)).toBe(false);
  });
  it('La Taberna: las salas especiales con su nombre de refugio pasan al de la taberna; las renombradas, no', () => {
    const viejo: any = estadoInicial();
    for (const s of viejo.salas) { if (s.id === 'chapa') s.nombre = 'Chapa y Pintura'; if (s.id === 'puente') s.nombre = 'Mi sótano'; }
    const s = sanear(viejo);
    expect(s.salas.find(x => x.id === 'chapa')?.nombre).toBe('Sastre y Barbero');
    expect(s.salas.find(x => x.id === 'puente')?.nombre).toBe('Mi sótano');
  });
  it('sin salas no se acepta (el almacén aparta la copia y arranca de cero)', () => {
    expect(() => sanear({ salas: null })).toThrow();
    expect(() => sanear(null)).toThrow();
  });
  it('descarta habitantes nulos o sin sala y repara el jugador', () => {
    const e: any = estadoInicial();
    e.habitantes = [null, { id: 'x', salaId: 'no-existe' }, ...e.habitantes];
    e.jugador = { chatarra: 'mucha', cultivos: null, inventario: { 'pieza:tornillo': 2, roto: 'x' } };
    const s = sanear(e);
    expect(s.habitantes.every(h => h && s.salas.some(sl => sl.id === h.salaId))).toBe(true);
    expect(s.jugador.chatarra).toBe(estadoInicial().jugador.chatarra);
    expect(s.jugador.cultivos.length).toBeGreaterThan(0);
    expect(s.jugador.inventario).toEqual({ 'pieza:tornillo': 2 });
  });
  it('limita los ajustes a valores válidos', () => {
    const s = sanear({ ...estadoInicial(), limiteSesiones: 9999, salas: estadoInicial().salas.concat([{ id: 'mala', tipo: 'repo', planta: -1, lado: 'arriba', orden: 0 } as any]) });
    expect(s.limiteSesiones).toBe(20);
    expect(s.salas.some(x => x.id === 'mala')).toBe(false);
  });
  it('respeta el nombre que el jugador haya puesto a una sala', () => {
    const e: any = estadoInicial();
    e.salas = e.salas.map((x: any) => x.id === 'camara' ? { ...x, nombre: 'Mi cofre' } : x);
    expect(sanear(e).salas.find(x => x.id === 'camara')?.nombre).toBe('Mi cofre');
  });
  it('una taberna de antes pasa al proceso de UX: fuera las salas de enlace, el ocio, los ejemplos y los oficios; dentro los pasos', () => {
    const viejo: any = estadoInicial(); delete viejo.ajustes.tabernaUX;
    viejo.salas.push({ id: 'git', tipo: 'git', nombre: 'Archivo del Escriba', planta: 2, lado: 'der', orden: 1, variante: 'x' }, { id: 'galeria', tipo: 'galeria', nombre: 'Diana', planta: 4, lado: 'der', orden: 0, variante: 'x' },
      { id: 'express', tipo: 'repo', nombre: 'express', ruta: rutaEjemplo('express'), planta: 3, lado: 'izq', orden: 0, variante: 'x' }, { id: 'biblioteca', tipo: 'repo', oficio: 'erudita', nombre: 'Biblioteca', ruta: '/tmp/b', planta: 3, lado: 'der', orden: 0, variante: 'x' },
      { id: 'mio', tipo: 'repo', nombre: 'mio', ruta: '/tmp/mio', planta: 3, lado: 'der', orden: 1, variante: 'x' });
    viejo.salas = viejo.salas.filter((x: any) => x.id !== 'forja');
    viejo.habitantes.push({ id: 'remi', nombre: 'Remi', salaId: 'express', tipo: 'Hiker', bio: '', voz: 100 });
    const s = sanear(JSON.parse(JSON.stringify(viejo)));
    expect(migrarATabernaUX(s)).toBe(true);
    const ids = s.salas.map(x => x.id);
    for (const fuera of ['git', 'galeria', 'express', 'biblioteca']) expect(ids).not.toContain(fuera);
    expect(ids).toContain('mio'); expect(ids).toContain('forja');
    expect(s.habitantes.some(h => h.id === 'remi')).toBe(false);
    expect(migrarATabernaUX(s)).toBe(false);
  });
  it('las salas de los pasos trabajan en la carpeta del proyecto; las de servicio, en una propia', () => {
    const e = estadoInicial();
    expect(carpetaDe(e.salas.find(s => s.id === 'forja')!)).toBe(path.join(CARPETAS_SALAS, 'forja'));
    e.proyecto = { nombre: 'P', ruta: '/tmp/proyecto' }; ponerProyecto(e);
    expect(e.salas.filter(s => s.paso).every(s => carpetaDe(s) === '/tmp/proyecto')).toBe(true);
    expect(carpetaDe(e.salas.find(s => s.id === 'chapa')!)).toBe(path.join(CARPETAS_SALAS, 'chapa'));
  });
  it('toda sala tiene carpeta de trabajo, fuera del repo del juego (salvo el sótano del mago, que es el juego)', () => {
    const e = estadoInicial();
    expect(e.salas.every(s => !!carpetaDe(s))).toBe(true);
    expect(e.salas.filter(s => s.tipo !== 'puente').every(s => !carpetaDe(s).startsWith(path.resolve(import.meta.dirname, '..') + path.sep))).toBe(true);
  });
});
