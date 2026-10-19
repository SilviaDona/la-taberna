import { describe, it, expect } from 'vitest';
import { distribuir, rotuloPlanta, ordenAlfabetico, REPOS_POR_PLANTA, ORDEN_PASOS } from './disposicion.ts';
import { SALAS_INICIALES } from './refugioInicial.ts';

const sitio = (s: { planta: number; lado: string; orden: number }) => `${s.planta}${s.lado}${s.orden}`;
const repo = (nombre: string) => ({ id: nombre, tipo: 'repo', nombre });

describe('disposición del refugio', () => {
  it('la inicial: PB puerta; -1 cofre | sótano del mago; -2 los siete pasos del proceso, en su orden; -3 el sastre', () => {
    const en = (id: string) => sitio(SALAS_INICIALES.find(s => s.id === id)!);
    expect(SALAS_INICIALES.filter(s => s.planta === 0).map(s => s.id)).toEqual(['puerta']);
    expect([en('camara'), en('puente')]).toEqual(['1izq0', '1der0']);
    // de izquierda a derecha, en el orden del proceso: cuatro a un lado del montacargas y tres al otro
    expect(ORDEN_PASOS.map(en)).toEqual(['2izq3', '2izq2', '2izq1', '2izq0', '2der0', '2der1', '2der2']);
    expect(en('chapa')).toMatch(/^3/);
  });
  it('un repo propio entra detrás de los pasos y nadie comparte hueco', () => {
    const s = distribuir([...SALAS_INICIALES, repo('Banco')]);
    // cabe en la planta de los pasos (8 por planta), el último
    expect(s.find(x => x.id === 'Banco')).toMatchObject({ planta: 2, lado: 'der', orden: 3 });
    expect(s.find(x => x.id === 'chapa')!.planta).toBe(3);
    expect(new Set(s.map(sitio)).size).toBe(s.length);
  });
  it('con más repos de los que caben, siguen en la planta de debajo y el ocio baja con ellos', () => {
    const s = distribuir([...SALAS_INICIALES, ...Array.from({ length: REPOS_POR_PLANTA }, (_, i) => repo('z' + i))]);
    expect(s.filter(x => x.planta === 2)).toHaveLength(REPOS_POR_PLANTA);
    expect(s.find(x => x.id === 'chapa')!.planta).toBe(4);
    expect(new Set(s.map(sitio)).size).toBe(s.length);
  });
  it('con las salas de enlace, los repos bajan a la -3 como en el refugio original', () => {
    const s = distribuir([...SALAS_INICIALES, { id: 'git', tipo: 'git', nombre: 'git' }]);
    expect(s.find(x => x.id === 'mapas')!.planta).toBe(3);
  });
  it('rótulos de planta', () => {
    expect([0, 1, 4].map(rotuloPlanta)).toEqual(['PB', '-1', '-4']);
  });
  it('el número de las placas sigue el orden alfabético, sin mayúsculas ni tildes de por medio', () => {
    expect(['zeta', 'Banco', 'árbol', 'app10', 'app9'].map(repo).sort(ordenAlfabetico).map(r => r.nombre)).toEqual(['app9', 'app10', 'árbol', 'Banco', 'zeta']);
  });
});
