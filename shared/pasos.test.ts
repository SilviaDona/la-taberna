import { describe, it, expect } from 'vitest';
import { PASOS, PASOS_IDS, accionHistoria, promptDePaso, siguiente, sanearHistorias, type Historia } from './pasos.ts';
import { sanearDecorado, LIMITES } from './decorado.ts';
import { sanearAspecto, TIPOS_DE_SERIE } from './aspecto.ts';

describe('pasos del proceso de UX', () => {
  it('siete salas en el orden del proceso: 1, 2, 3–4, 5, 6, 7, 8', () => {
    expect(PASOS_IDS.map(p => PASOS[p].numero)).toEqual(['1', '2', '3–4', '5', '6', '7', '8']);
    expect(PASOS_IDS.map(siguiente)).toEqual([...PASOS_IDS.slice(1), 'hecha']);
  });
  it('cada sala usa la skill de su paso (el Mostrador no lanza nada: lo marca la Tabernera)', () => {
    expect(PASOS.mapas.comando).toBe('/ux-analysis'); expect(PASOS.torre.comando).toBe('/ux-analysis');
    expect(PASOS.salon.comando).toBe('/ux-testing'); expect(PASOS.mensajero.comando).toBe('/ux-edge-cases'); expect(PASOS.libro.comando).toBe('/session-log');
    const h: Historia = { id: 'h', titulo: 'Pedir permiso', texto: 'Como empleada…\nAC1: …', paso: 'mapas', supuestos: [], hechos: [], creada: 0, actualizada: 0 };
    expect(promptDePaso('mapas', h)).toMatch(/^\/ux-analysis\n[\s\S]*Modo plan[\s\S]*AC1/);
    expect(promptDePaso('mostrador', h)).toBeNull();
    for (const p of PASOS_IDS.filter(x => PASOS[x].comando)) expect(promptDePaso(p, h)!.startsWith(PASOS[p].comando!)).toBe(true);
  });
  it('decorados válidos tal cual y aventureros con aspecto por piezas', () => {
    for (const p of PASOS_IDS) {
      const r = sanearDecorado(PASOS[p].decorado); expect(r.avisos, p).toEqual([]);
      expect(PASOS[p].decorado.piezas!.length).toBeLessThanOrEqual(LIMITES.piezas);
      const a = PASOS[p].aventurero; expect(TIPOS_DE_SERIE).toContain(a.tipo);
      expect(sanearAspecto(a.aspecto)?.piezas).toEqual(Object.fromEntries(Object.entries(a.aspecto!.piezas).filter(([, v]) => v)));
    }
  });
  it('sin nombres de cliente ni de proyecto en el juego', () => {
    expect(JSON.stringify(PASOS)).not.toMatch(/DEY|HCM/);
  });
});

describe('una historia recorre la taberna', () => {
  it('crear, supuestos, pasar con oro, vuelta a la Forja y cierre', () => {
    const hs: Historia[] = [];
    const { id } = accionHistoria(hs, 'crear', { texto: 'Como empleada quiero pedir un permiso\nAC1: …' });
    const h = hs[0];
    expect(h).toMatchObject({ id, titulo: 'Como empleada quiero pedir un permiso', paso: 'mapas' });
    expect(accionHistoria(hs, 'pasar', { id }).oro).toBe(PASOS.mapas.oro);
    // el Mostrador no se pasa con supuestos sin revisar
    accionHistoria(hs, 'supuesto.anadir', { id, texto: '- ¿Se recalcula el saldo?\n2. ¿Aprueba quien pide?' });
    expect(h.supuestos.map(s => s.texto)).toEqual(['¿Se recalcula el saldo?', '¿Aprueba quien pide?']);
    expect(() => accionHistoria(hs, 'pasar', { id })).toThrow(/sin revisar/);
    accionHistoria(hs, 'supuesto.estado', { id, supuesto: h.supuestos[0].id, estado: 'confirmado' });
    accionHistoria(hs, 'supuesto.estado', { id, supuesto: h.supuestos[1].id, estado: 'pendiente' });
    accionHistoria(hs, 'pasar', { id });
    expect(h.paso).toBe('forja');
    expect(promptDePaso('forja', h)).toMatch(/Pendiente de confirmación del BA/);
    accionHistoria(hs, 'pasar', { id }); expect(h.paso).toBe('torre');
    // desde la Torre, vuelta a la Forja con los ACs afectados; la Forja no vuelve a cobrar
    expect(() => accionHistoria(hs, 'volver', { id, acs: '' })).toThrow();
    accionHistoria(hs, 'volver', { id, acs: 'AC3' });
    expect(h).toMatchObject({ paso: 'forja', vuelta: { desde: 'torre', acs: 'AC3' } });
    expect(promptDePaso('forja', h)).toMatch(/corrige solo estos ACs: AC3/);
    expect(accionHistoria(hs, 'pasar', { id }).oro).toBe(0);
    expect(promptDePaso('torre', h)).toMatch(/revisa solo estos ACs: AC3/);
    expect(accionHistoria(hs, 'pasar', { id }).oro).toBe(PASOS.torre.oro);
    expect(h.vuelta).toBeUndefined();
    expect(() => accionHistoria(hs, 'volver', { id, acs: 'x' })).not.toThrow();   // también desde el Salón
    accionHistoria(hs, 'mover', { id, paso: 'libro' });
    expect(accionHistoria(hs, 'pasar', { id }).oro).toBe(PASOS.libro.oro + 25);
    expect(h.paso).toBe('hecha');
    expect(() => accionHistoria(hs, 'pasar', { id })).toThrow();
  });
  it('lo guardado se valida', () => {
    const [h] = sanearHistorias([{ id: 'a', titulo: 'x', paso: 'nada', supuestos: [{ id: 's', estado: 'raro' }, null], hechos: ['mapas', 'otro'], vuelta: { desde: 'mostrador', acs: 'AC1' } }, null]);
    expect(h).toMatchObject({ paso: 'mapas', supuestos: [{ id: 's', estado: 'sin revisar' }], hechos: ['mapas'], vuelta: { desde: 'mostrador' } });
  });
});
