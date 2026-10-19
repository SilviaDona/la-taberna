// Salas de oficio (shared/oficios.ts): la carpeta de cada una, en los datos de la app (como las salas de servicio),
// con su CLAUDE.md, sus skills y la carpeta de entregables. Lo que ya existe no se pisa: el CLAUDE.md o una skill que
// el tabernero haya retocado se quedan como están.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { archivosDeOficio, type Oficio } from '../shared/oficios.ts';

/** Prepara la carpeta de una sala de oficio; devuelve los archivos que ha escrito (rutas relativas) */
export function prepararCarpetaOficio(dir: string, oficio: Oficio, nombreProyecto?: string): string[] {
  const escritos: string[] = [];
  mkdirSync(dir, { recursive: true });
  for (const [rel, contenido] of Object.entries(archivosDeOficio(oficio, nombreProyecto))) {
    const destino = path.join(dir, ...rel.split('/'));
    if (existsSync(destino)) continue;
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, contenido, 'utf8');
    escritos.push(rel);
  }
  return escritos;
}

/** Id de carpeta (y de sala) a partir de un nombre: minúsculas, sin tildes, solo letras, cifras y guiones */
export const idDeNombre = (n: string) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'sala';
