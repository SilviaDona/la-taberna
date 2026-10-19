import { describe, it, expect } from 'vitest';
import { OFICIOS, PLANTILLAS, archivosDeOficio, accionesDeOficio, decoradoProyecto, claudeMdProyecto, promptDeAccion, COLORES_ESTANDARTE, AVENTURERO_PROYECTO } from './oficios.ts';
import { sanearDecorado, LIMITES } from './decorado.ts';
import { TIPOS_DE_SERIE, sanearAspecto } from './aspecto.ts';
import { encargos } from './encargos.ts';
import type { ResumenSesion } from './protocolo.ts';

const plantillas = Object.values(PLANTILLAS);
describe('salas de oficio', () => {
  it('hay una plantilla por oficio (más la mesa de proyecto) y nombres de sala distintos', () => {
    expect(plantillas.map(p => p.id).sort()).toEqual(OFICIOS.filter(o => o !== 'proyecto').sort());
    expect(new Set(plantillas.map(p => p.sala)).size).toBe(plantillas.length);
  });
  it('los decorados son válidos tal cual: el servidor no corrige ni quita nada', () => {
    for (const d of [...plantillas.map(p => p.decorado), decoradoProyecto('Reservas Ejemplo', COLORES_ESTANDARTE[1])]) {
      const r = sanearDecorado(d);
      expect(r.avisos).toEqual([]);
      expect(r.decorado?.piezas?.length).toBe(d.piezas?.length);
      expect(d.piezas!.length).toBeLessThanOrEqual(LIMITES.piezas);
    }
  });
  it('cada CLAUDE.md trae rol, entregables y criterios de calidad, y cada oficio sus skills y 3–4 acciones', () => {
    for (const p of plantillas) {
      for (const t of ['## Rol', '## Entregables', '## Criterios de calidad']) expect(p.claudeMd).toContain(t);
      expect(p.skills.length).toBeGreaterThan(0);
      expect(p.acciones.length).toBeGreaterThanOrEqual(3); expect(p.acciones.length).toBeLessThanOrEqual(4);
    }
    expect(accionesDeOficio('proyecto').length).toBe(3);
  });
  it('las skills llevan nombre válido para Claude Code y su frontmatter', () => {
    for (const p of plantillas) {
      const a = archivosDeOficio(p.id);
      expect(a['CLAUDE.md']).toBe(p.claudeMd);
      for (const s of p.skills) {
        expect(s.nombre).toMatch(/^[a-z0-9-]{1,64}$/);
        expect(a[`.claude/skills/${s.nombre}/SKILL.md`]).toMatch(new RegExp(`^---\\nname: ${s.nombre}\\ndescription: .+\\n---\\n`));
      }
    }
  });
  it('las acciones que piden un dato lo ponen en el prompt; las que nombran una skill, la traen', () => {
    for (const p of plantillas) for (const a of p.acciones) {
      if (a.pide) { expect(a.prompt).toContain('{valor}'); expect(promptDeAccion(a, ' https://x.example ')).toContain('https://x.example'); }
      const m = a.prompt.match(/skill ([a-z0-9-]+)/); if (m) expect(p.skills.map(s => s.nombre)).toContain(m[1]);
    }
  });
  it('la mesa de proyecto: su CLAUDE.md de contexto y su estandarte con el color elegido', () => {
    expect(claudeMdProyecto('Reservas Ejemplo')).toContain('# Mesa de proyecto: Reservas Ejemplo');
    expect(archivosDeOficio('proyecto', 'X')['CLAUDE.md']).toContain('## Objetivos');
    expect(decoradoProyecto('Reservas', '#4a6b2f').carteles?.[0]).toMatchObject({ titulo: 'RESERVAS', fondo: '#4a6b2f' });
  });
  it('los aventureros tienen un modelo que el servidor acepta', () => {
    for (const a of [...plantillas.map(p => p.aventurero), AVENTURERO_PROYECTO]) {
      expect(TIPOS_DE_SERIE).toContain(a.tipo);
      // y su aspecto por piezas pasa la validación entero (sin piezas que falten)
      const llenas = Object.fromEntries(Object.entries(a.aspecto!.piezas).filter(([, v]) => v));
      expect(sanearAspecto(a.aspecto)?.piezas).toEqual(llenas);
    }
  });
  it('sin datos reales: los dominios de los ejemplos son *.example (y Figma, el del MCP)', () => {
    const todo = JSON.stringify(PLANTILLAS) + claudeMdProyecto('X');
    for (const u of todo.match(/https?:\/\/[^\s"')<>\\]+/g) ?? []) expect(new URL(u).hostname).toMatch(/(^|\.)example$|^www\.figma\.com$/);
    expect(todo).not.toMatch(/@[a-z0-9-]+\.(com|es|org|net)\b/i);
  });
});

describe('tablón de encargos', () => {
  const ses = (id: string, x: Partial<ResumenSesion>): ResumenSesion => ({ id, habitanteId: 'h', salaId: 's', cwd: '/', estado: 'trabajando', sinLeer: false, titulo: id, pendientes: 0, ayudantes: [], herramientas: 0, turnos: 1, creada: 0, actualizada: 0, ...x });
  it('primero lo que te espera, luego las averías, lo terminado sin leer y lo que está en faena; lo cerrado y lo leído, fuera', () => {
    const l = encargos([
      ses('faena', { actualizada: 9 }), ses('cerrada', { estado: 'cerrada' }), ses('leida', { estado: 'ociosa' }),
      ses('sinleer', { estado: 'terminada', sinLeer: true }), ses('averia', { estado: 'error' }),
      ses('permiso', { estado: 'esperando', pendiente: { id: 'p', tipo: 'permiso', herramienta: 'Bash', titulo: '¿?', puedeSiempre: true } }),
    ], [{ id: 'h', nombre: 'Aurelia' }], [{ id: 's', nombre: 'Biblioteca' }]);
    expect(l.map(x => x.s.id)).toEqual(['permiso', 'averia', 'sinleer', 'faena']);
    expect(l[0]).toMatchObject({ quien: 'Aurelia', sala: 'Biblioteca', espera: 'pide permiso' });
    expect(l[3].espera).toBeNull();
  });
});

describe('goblins', () => {
  it('los goblins de serie son humanos de piel verde con todas sus piezas válidas', async () => {
    const { DE_SERIE, GOBLINS } = await import('./aspecto.ts');
    for (const g of GOBLINS) {
      const a = DE_SERIE[g];
      expect(a.colores.piel).toMatch(/^#[0-9a-f]{6}$/);
      expect(sanearAspecto(a)?.piezas).toEqual(Object.fromEntries(Object.entries(a.piezas).filter(([, v]) => v)));
    }
  });
});
