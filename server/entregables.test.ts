import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buscarCambios, carpetaComun } from './entregables.ts';

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
