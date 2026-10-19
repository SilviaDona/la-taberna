// Abrir cosas del refugio en el escritorio (macOS o Windows: server/plataforma.ts) sin ejecutar nada por el camino. `open <archivo>` usa la app por defecto de su tipo,
// y para un .app, .command, .terminal, .tool, .fileloc, .webloc, .workflow o .pkg de un repo clonado (o de un adjunto)
// eso es ejecutarlo. Por eso: el editor (Cursor o VS Code) si lo hay; si no, el editor de texto del sistema (`open -t`)
// para un archivo y el Finder (`open -R`, que solo lo enseña) para una carpeta o un paquete. Y antes de nada, la ruta
// real (con los enlaces resueltos) tiene que seguir dentro de la raíz que toca.
import fs from 'node:fs/promises';
import path from 'node:path';
import { abrirEnEditor as abrirEnEditorDelSistema, abrirTexto, abrirVisor, revelar } from './plataforma.ts';


/** La ruta real de `abs`, que tiene que caer dentro de la ruta real de `raiz` */
export async function realDentro(raiz: string, abs: string) {
  const [r, a] = await Promise.all([fs.realpath(raiz), fs.realpath(abs)]);
  if (a !== r && !a.startsWith(r.endsWith(path.sep) ? r : r + path.sep)) throw new Error('Esa ruta sale de la carpeta de la sala.');
  return a;
}
// paquetes: carpetas que el Finder trata como un archivo (abrirlas puede ejecutarlas)
const PAQUETE = /\.(app|bundle|framework|plugin|kext|prefpane|appex|xpc|workflow|action|saver|qlgenerator|mdimporter|pkg|mpkg|xcodeproj|xcworkspace|playground)$/i;
export const esPaquete = (ruta: string) => PAQUETE.test(ruta.replace(/\/+$/, ''));

/** Un archivo o carpeta de `raiz` en el editor; sin editor, el de texto del sistema (carpetas y paquetes: en el Finder) */
export async function abrirEnEditor(raiz: string, abs: string) {
  const real = await realDentro(raiz, abs);
  const carpeta = (await fs.stat(real)).isDirectory();
  if (carpeta && esPaquete(real)) { revelar(real); return; }
  abrirEnEditorDelSistema(real, carpeta);
}

// adjuntos: imágenes y PDF en Vista Previa, texto en el editor de texto; lo demás (un .docx, un .zip, un .command…),
// enseñado en el Finder para que lo abra el Supervisor sabiendo qué es
const DE_VISTA_PREVIA = /\.(png|jpe?g|gif|webp|heic|heif|bmp|tiff?|pdf)$/i;
const DE_TEXTO = /\.(txt|md|markdown|json|jsonl|csv|tsv|log|ya?ml|toml|ini|conf|xml|html?|css|[cm]?[jt]sx?|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|sh|zsh|sql|diff|patch)$/i;
export async function abrirAdjunto(raiz: string, abs: string) {
  const real = await realDentro(raiz, abs);
  if (!(await fs.stat(real)).isFile()) { revelar(real); return; }
  if (DE_VISTA_PREVIA.test(real)) abrirVisor(real); else if (DE_TEXTO.test(real)) abrirTexto(real); else revelar(real);
}
