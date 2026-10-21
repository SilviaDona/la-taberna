import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buscarCambios, carpetaComun, apuntar } from './entregables.ts';

describe('entregables', () => {
  it('encuentra lo nuevo y salta .git y node_modules', () => {
    const d = mkdtempSync(path.join(os.tmpdir(), 'entregables-'));
    writeFileSync(path.join(d, 'viejo.md'), 'x'); const antes = new Date(Date.now() - 3600_000); utimesSync(path.join(d, 'viejo.md'), antes, antes);
    const desde = Date.now();
    mkdirSync(path.join(d, 'historia-login', 'docs'), { recursive: true });
    writeFileSync(path.join(d, 'historia-login', 'prototipo.html'), '<p>');
    writeFileSync(path.join(d, 'historia-login', 'docs', 'plan.md'), '#');
    for (const x of ['.git', 'node_modules']) { mkdirSync(path.join(d, x)); writeFileSync(path.join(d, x, 'a.txt'), 'a'); }
    const r = buscarCambios(d, desde);
    expect(r.sort()).toEqual(['historia-login/docs/plan.md', 'historia-login/prototipo.html']);
    expect(carpetaComun(r)).toBe('historia-login');
    expect(carpetaComun(['a/x', 'b/y'])).toBeUndefined();
  });
});

describe('apuntar lo nuevo de un turno', () => {
  const historia = (id: string, paso: any, actualizada = 1) => ({ id, titulo: id, texto: '', paso, supuestos: [], hechos: [], entregables: [], creada: 0, actualizada } as any);
  it('una conversación suelta con el aventurero va a la historia que está en su paso', () => {
    const e = { historias: [historia('a', 'forja', 1), historia('b', 'forja', 5), historia('c', 'torre')] };
    const h = apuntar(e, 'forja', undefined, ['permiso/prototipo.html']);
    expect(h?.id).toBe('b');
    expect(e.historias[1].entregables).toMatchObject([{ ruta: 'permiso/prototipo.html', paso: 'forja', tipo: 'html' }]);
    expect(e.historias[1].carpeta).toBe('permiso');
  });
  it('con la historia dicha, a esa; sin ninguna en el paso (o en La Barra), a lo suelto de la sala', () => {
    const e: any = { historias: [historia('a', 'mapas')] };
    expect(apuntar(e, 'mapas', 'a', ['plan.md'])?.id).toBe('a');
    expect(apuntar(e, 'torre', undefined, ['informe.md'])).toBeUndefined();
    expect(apuntar(e, 'barra', undefined, ['notas.txt'])).toBeUndefined();
    expect(e.sueltos.torre[0]).toMatchObject({ ruta: 'informe.md', tipo: 'md' });
    expect(e.sueltos.barra[0].nombre).toBe('notas.txt');
  });
});
