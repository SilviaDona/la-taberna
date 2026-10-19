import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepararCarpetaOficio, idDeNombre } from './oficios.ts';
import { modeloAtrezo, ASSETS } from './atrezo.ts';
import { PLANTILLAS, decoradoProyecto } from '../shared/oficios.ts';
import { revisarDecorado, type PiezaDecorado } from '../shared/decorado.ts';

// con el material descargado: los decorados de las salas de oficio no tienen piezas que falten, floten, se salgan o
// se atraviesen (la misma revisión que ve el aventurero al decorar)
describe.skipIf(!existsSync(path.join(ASSETS, 'indice.json')))('decorados de las salas de oficio, medidos', () => {
  const tam = (p: PiezaDecorado): [number, number, number] | null => { const m = modeloAtrezo(p.modelo); if (!m) return null; const k = p.alto ? p.alto / m.tam[1] : p.ancho ? p.ancho / m.tam[0] : 1; return [m.tam[0] * k, m.tam[1] * k, m.tam[2] * k]; };
  for (const [id, d] of [...Object.entries(PLANTILLAS).map(([k, p]) => [k, p.decorado] as const), ['proyecto', decoradoProyecto('Reservas Ejemplo', '#4a6b2f')] as const])
    it(id, () => expect(revisarDecorado(d, tam)).toEqual([]));
});

describe('carpeta de una sala de oficio', () => {
  it('escribe CLAUDE.md, skills y entregables/, y no pisa lo que ya existe', () => {
    const dir = path.join(mkdtempSync(path.join(os.tmpdir(), 'oficio-')), 'torre-del-vigia');
    const escritos = prepararCarpetaOficio(dir, 'vigia');
    expect(escritos).toContain('CLAUDE.md'); expect(escritos).toContain('.claude/skills/auditoria-wcag/SKILL.md');
    expect(existsSync(path.join(dir, 'entregables'))).toBe(true);
    writeFileSync(path.join(dir, 'CLAUDE.md'), 'mío');
    expect(prepararCarpetaOficio(dir, 'vigia')).toEqual([]);
    expect(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8')).toBe('mío');
  });
  it('la mesa de proyecto lleva su CLAUDE.md de contexto con el nombre', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mesa-'));
    prepararCarpetaOficio(dir, 'proyecto', 'Reservas Ejemplo');
    expect(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8')).toContain('Reservas Ejemplo');
  });
  it('ids de carpeta sin tildes ni símbolos', () => {
    expect(idDeNombre('Torre del Vigía')).toBe('torre-del-vigia');
    expect(idDeNombre('¡Ñandú & Cía!')).toBe('nandu-cia');
    expect(idDeNombre('***')).toBe('sala');
  });
});
