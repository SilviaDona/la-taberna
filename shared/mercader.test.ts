import { describe, it, expect } from 'vitest';
import { MERCANCIAS, existencias, sanearAdornos, conAdornos } from './mercader.ts';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { catalogo, ASSETS } from '../server/atrezo.ts';

describe('mercader', () => {
  // (el material se descarga con ./shelter; en la CI no está)
  it.skipIf(!existsSync(path.join(ASSETS, 'indice.json')))('todo lo que vende está en el atrezo', () => {
    const ids = new Set(catalogo().map(m => m.id));
    for (const m of MERCANCIAS) expect(ids.has(m.modelo), m.modelo).toBe(true);
  });
  it('trae seis cosas distintas cada día, y cambia', () => {
    for (let d = 20000; d < 20010; d++) { const e = existencias(d); expect(e.length).toBe(6); expect(new Set(e).size).toBe(6); }
    expect(existencias(20000)).not.toEqual(existencias(20001));
  });
  it('los adornos se sanean y se suman a la escena', () => {
    const a = sanearAdornos([{ id: 'a', mercancia: 'vela', x: 99, z: 0, giro: 90 }, { id: 'b', mercancia: 'nada', x: 0, z: 0 }]);
    expect(a).toHaveLength(1); expect(a[0].x).toBeLessThan(6);
    expect(conAdornos({ piezas: [] }, a).piezas).toHaveLength(1);
  });
});
