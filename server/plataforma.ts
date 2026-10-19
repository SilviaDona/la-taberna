// Lo que depende del sistema (macOS o Windows), en un solo sitio: carpetas de la app, abrir cosas fuera del juego,
// la papelera, el shell de las terminales, el canal del anfitrión de terminales, la terminal del escritorio,
// las credenciales (llavero de macOS o Administrador de credenciales de Windows) y reducir imágenes.
// En Windows se usa PowerShell (viene con el sistema): nada de dependencias nativas nuevas. Los datos nunca van en la
// línea de órdenes de PowerShell: el guion es fijo (-EncodedCommand) y lo variable llega por stdin o por el entorno.
import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

export const ES_WINDOWS = process.platform === 'win32';
export const ES_MAC = process.platform === 'darwin';
export const NOMBRE_APP = 'work-shelter-public';

// ---------------------------------------------------------------- carpetas
/** Datos de la app fuera del repo: ~/Library/Application Support/<app> en macOS, %APPDATA%\<app> en Windows */
export function carpetaApp(): string {
  if (ES_WINDOWS) return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), NOMBRE_APP);
  if (ES_MAC) return path.join(os.homedir(), 'Library', 'Application Support', NOMBRE_APP);
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), NOMBRE_APP);
}
/** Registros: ~/Library/Logs/<app> en macOS; en Windows, Logs junto al código del juego (como shelter.ps1): si se
 *  mueve el juego a otro disco, sus registros van con él */
export function carpetaLogs(): string {
  if (ES_WINDOWS) return path.join(import.meta.dirname, '..', 'Logs');
  if (ES_MAC) return path.join(os.homedir(), 'Library', 'Logs', NOMBRE_APP);
  return path.join(carpetaApp(), 'logs');
}
/** Carpetas del sistema que no valen como sala */
export const CARPETAS_DEL_SISTEMA = ES_WINDOWS
  ? ['AppData', 'Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos', 'OneDrive', 'Escritorio', 'Documentos', 'Descargas', 'Música', 'Imágenes', 'Vídeos']
  : ['Applications', 'Desktop', 'Documents', 'Downloads', 'Library', 'Movies', 'Music', 'Pictures', 'Public'];

/** Canal del anfitrión de terminales: socket Unix en la carpeta temporal (macOS) o tubería con nombre (Windows) */
export function canalLocal(nombre: string, clave: string): string {
  const h = createHash('sha1').update(clave).digest('hex').slice(0, 10);
  return ES_WINDOWS ? `\\\\.\\pipe\\${nombre}-${os.userInfo().username}-${h}` : path.join(os.tmpdir(), `${nombre}-${h}.sock`);
}
export const esTuberia = (canal: string) => canal.startsWith('\\\\.\\pipe\\');

// ---------------------------------------------------------------- buscar programas
/** La ruta de un programa en el PATH (o null). En Windows prueba también .exe/.cmd */
export function buscarPrograma(nombre: string): string | null {
  try {
    const out = ES_WINDOWS
      ? execFileSync('where.exe', [nombre], { encoding: 'utf8', timeout: 5000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
      : execFileSync('/bin/sh', ['-c', 'command -v "$1"', 'sh', nombre], { encoding: 'utf8', timeout: 5000 });
    return out.split(/\r?\n/).map(l => l.trim()).find(Boolean) ?? null;
  } catch { return null; }
}
/** PowerShell disponible: el 7 (pwsh) si está, si no el del sistema */
export function powershell(): string {
  return buscarPrograma('pwsh.exe') ?? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}
// guion fijo codificado (UTF-16LE en base64): ni comillas ni datos del usuario en la línea de órdenes
const codificar = (guion: string) => Buffer.from(guion, 'utf16le').toString('base64');
/** Ejecuta un guion fijo de PowerShell con `entrada` por stdin y `env` extra; devuelve stdout */
export function ejecutarPowerShell(guion: string, o: { entrada?: string; env?: Record<string, string>; timeout?: number } = {}): Promise<{ codigo: number; salida: string; error: string }> {
  return new Promise(resolve => {
    const p = execFile(powershell(), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', codificar(guion)],
      { timeout: o.timeout ?? 30_000, maxBuffer: 8 << 20, windowsHide: true, env: { ...process.env, ...o.env } }, (err, salida, error) => {
        const codigo = err ? (typeof (err as any).code === 'number' ? (err as any).code : -1) : 0;
        resolve({ codigo, salida: String(salida), error: String(error) });
      });
    p.stdin?.end(o.entrada ?? '');
  });
}

// ---------------------------------------------------------------- shell de las terminales del juego
/** El shell de las terminales: el de login del usuario en macOS; PowerShell en Windows */
export function shellTerminal(): { shell: string; args: string[] } {
  if (ES_WINDOWS) return { shell: powershell(), args: ['-NoLogo'] };
  return { shell: process.env.SHELL || '/bin/zsh', args: ['-l'] };
}

// ---------------------------------------------------------------- abrir cosas fuera del juego
const suelto = (cmd: string, args: string[]) => spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false }).unref();
const explorer = () => path.join(process.env.SystemRoot || 'C:\\Windows', 'explorer.exe');

/** Una dirección web en el navegador del sistema (solo http/https) */
export function abrirUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Solo se abren direcciones web.');
  if (ES_WINDOWS) suelto(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe'), ['url.dll,FileProtocolHandler', url]);
  else if (ES_MAC) suelto('/usr/bin/open', [url]);
  else suelto('xdg-open', [url]);
}
/** Enseña un archivo o carpeta seleccionado en el Finder o en el Explorador (sin abrirlo: nunca ejecuta nada) */
export function revelar(ruta: string) {
  if (ES_WINDOWS) suelto(explorer(), [`/select,${ruta}`]);
  else if (ES_MAC) suelto('open', ['-R', ruta]);
  else suelto('xdg-open', [path.dirname(ruta)]);
}
/** Abre una carpeta en el Finder o el Explorador */
export function abrirCarpeta(ruta: string) {
  if (ES_WINDOWS) suelto(explorer(), [ruta]);
  else if (ES_MAC) suelto('open', [ruta]);
  else suelto('xdg-open', [ruta]);
}

const EDITORES_MAC = [['/Applications/Cursor.app', 'Cursor'], ['/Applications/Visual Studio Code.app', 'Visual Studio Code']];
function editorWindows(): string | null {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  return [path.join(local, 'Programs', 'cursor', 'Cursor.exe'), path.join(local, 'Programs', 'Microsoft VS Code', 'Code.exe'), path.join(pf, 'Microsoft VS Code', 'Code.exe')].find(existsSync) ?? null;
}
/** ¿Hay editor de código (Cursor o VS Code)? */
export const hayEditor = () => (ES_WINDOWS ? !!editorWindows() : EDITORES_MAC.some(([r]) => existsSync(r)));
/** Abre en el editor de código; sin él, un archivo en el editor de texto del sistema y una carpeta en el explorador */
export function abrirEnEditor(ruta: string, esCarpeta: boolean) {
  if (ES_WINDOWS) {
    const ed = editorWindows();
    if (ed) suelto(ed, [ruta]); else if (esCarpeta) abrirCarpeta(ruta); else suelto(path.join(process.env.SystemRoot || 'C:\\Windows', 'notepad.exe'), [ruta]);
    return;
  }
  const ed = EDITORES_MAC.find(([r]) => existsSync(r))?.[1];
  if (esCarpeta && !ed) { suelto('open', ['-R', ruta]); return; }
  suelto('open', ed ? ['-a', ed, ruta] : ['-t', ruta]);
}
/** Abre un archivo de texto en el editor de texto del sistema */
export function abrirTexto(ruta: string) {
  if (ES_WINDOWS) suelto(path.join(process.env.SystemRoot || 'C:\\Windows', 'notepad.exe'), [ruta]);
  else suelto('open', ['-t', ruta]);
}
/** Una imagen o un PDF en el visor del sistema (Vista Previa en macOS). En Windows, revelado: abrirlo con la app por
 *  defecto de su extensión podría ejecutar algo */
export function abrirVisor(ruta: string) {
  if (ES_WINDOWS) revelar(ruta); else suelto('open', ['-a', 'Preview', ruta]);
}
/** Una carpeta de sala en una terminal del escritorio */
export function abrirTerminalEn(ruta: string) {
  if (ES_WINDOWS) {
    const wt = buscarPrograma('wt.exe');
    if (wt) suelto(wt, ['-w', '0', 'new-tab', '-d', ruta]);
    else spawn(powershell(), ['-NoExit', '-NoLogo'], { cwd: ruta, detached: true, stdio: 'ignore' }).unref();
    return;
  }
  suelto('open', ['-a', 'Terminal', ruta]);
}

// ---------------------------------------------------------------- papelera
const PAPELERA_WIN = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$rutas = [Console]::In.ReadToEnd() | ConvertFrom-Json
foreach ($r in $rutas) {
  if (Test-Path -LiteralPath $r -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($r, 'OnlyErrorDialogs', 'SendToRecycleBin') }
  else { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($r, 'OnlyErrorDialogs', 'SendToRecycleBin') }
}`;
/** A la papelera del sistema (se puede recuperar) */
export async function aLaPapelera(rutas: string[]): Promise<void> {
  if (!rutas.length) return;
  const mal = (m: string) => new Error('No he podido mandarlo a la papelera: ' + m);
  if (ES_WINDOWS) {
    const r = await ejecutarPowerShell(PAPELERA_WIN, { entrada: JSON.stringify(rutas), timeout: 60_000 });
    if (r.codigo !== 0) throw mal(r.error.trim().split('\n')[0] || `código ${r.codigo}`);
    return;
  }
  await new Promise<void>((ok, ko) => {
    if (existsSync('/usr/bin/trash')) return execFile('/usr/bin/trash', rutas, err => (err ? ko(mal(err.message)) : ok()));
    // macOS anteriores a /usr/bin/trash: el Finder
    const lista = rutas.map(a => `POSIX file ${JSON.stringify(a)}`).join(', ');
    execFile('osascript', ['-e', `tell application "Finder" to delete {${lista}}`], err => (err ? ko(mal(err.message)) : ok()));
  });
}

// ---------------------------------------------------------------- procesos (conversaciones abiertas fuera)
let cacheProcesos: { t: number; lineas: string[] } | null = null;
/** Líneas «<pid padre> <órdenes>» de los procesos del usuario. En Windows es lento (CIM): se guarda 3 s */
export function procesos(): { padre: number; args: string }[] {
  try {
    if (ES_WINDOWS) {
      if (!cacheProcesos || Date.now() - cacheProcesos.t > 3000) {
        const out = execFileSync(powershell(), ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar("Get-CimInstance Win32_Process -Filter \"Name like '%node%' or Name like '%claude%'\" | ForEach-Object { \"$($_.ParentProcessId) $($_.CommandLine)\" }")],
          { encoding: 'utf8', timeout: 8000, maxBuffer: 8 << 20, windowsHide: true });
        cacheProcesos = { t: Date.now(), lineas: out.split(/\r?\n/) };
      }
      return parsear(cacheProcesos.lineas);
    }
    return parsear(execFileSync('ps', ['-axo', 'ppid=,args='], { encoding: 'utf8', timeout: 3000, maxBuffer: 8 << 20 }).split('\n'));
  } catch { return []; }
}
const parsear = (lineas: string[]) => lineas.map(l => /^\s*(\d+)\s+(.*)$/.exec(l)).filter((m): m is RegExpExecArray => !!m).map(m => ({ padre: Number(m[1]), args: m[2] }));

// ---------------------------------------------------------------- imágenes (adjuntos)
const IMAGEN_WIN = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($env:SHELTER_IMG_ENTRADA)
try {
  if (-not $env:SHELTER_IMG_SALIDA) { "$($img.Width) $($img.Height)"; exit 0 }
  $lado = [int]$env:SHELTER_IMG_LADO; $w = $img.Width; $h = $img.Height
  if ($lado -gt 0 -and [Math]::Max($w, $h) -gt $lado) { $k = $lado / [Math]::Max($w, $h); $w = [int][Math]::Round($w * $k); $h = [int][Math]::Round($h * $k) }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  if ($env:SHELTER_IMG_FORMATO -eq 'jpeg') { $g.Clear([System.Drawing.Color]::White) }
  $g.DrawImage($img, 0, 0, $w, $h); $g.Dispose()
  if ($env:SHELTER_IMG_FORMATO -eq 'png') { $bmp.Save($env:SHELTER_IMG_SALIDA, [System.Drawing.Imaging.ImageFormat]::Png) }
  else {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $p = New-Object System.Drawing.Imaging.EncoderParameters 1
    $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$env:SHELTER_IMG_CALIDAD)
    $bmp.Save($env:SHELTER_IMG_SALIDA, $codec, $p)
  }
  $bmp.Dispose()
} finally { $img.Dispose() }`;
const sips = (args: string[]) => new Promise<string>((ok, ko) => execFile('/usr/bin/sips', args, { timeout: 30_000 }, (e, o) => (e ? ko(e) : ok(String(o)))));

/** Ancho y alto de una imagen (0 si no se puede leer) */
export async function medidasImagen(ruta: string): Promise<{ ancho: number; alto: number }> {
  if (ES_WINDOWS) {
    const r = await ejecutarPowerShell(IMAGEN_WIN, { env: { SHELTER_IMG_ENTRADA: ruta, SHELTER_IMG_SALIDA: '' } });
    const [a, b] = r.salida.trim().split(/\s+/).map(Number);
    return { ancho: a || 0, alto: b || 0 };
  }
  const info = await sips(['-g', 'pixelWidth', '-g', 'pixelHeight', ruta]);
  return { ancho: Number(/pixelWidth: (\d+)/.exec(info)?.[1] ?? 0), alto: Number(/pixelHeight: (\d+)/.exec(info)?.[1] ?? 0) };
}
/** Convierte una imagen a PNG o JPEG, con el lado mayor como mucho `lado` (0: sin reducir) */
export async function convertirImagen(ruta: string, salida: string, o: { lado?: number; formato: 'png' | 'jpeg'; calidad?: number }) {
  if (ES_WINDOWS) {
    const r = await ejecutarPowerShell(IMAGEN_WIN, { env: { SHELTER_IMG_ENTRADA: ruta, SHELTER_IMG_SALIDA: salida, SHELTER_IMG_LADO: String(o.lado ?? 0), SHELTER_IMG_FORMATO: o.formato, SHELTER_IMG_CALIDAD: String(o.calidad ?? 85) } });
    if (r.codigo !== 0) throw new Error(r.error.trim().split('\n')[0] || 'No he podido convertir la imagen.');
    return;
  }
  await sips([...(o.lado ? ['-Z', String(o.lado)] : []), '-s', 'format', o.formato, ...(o.calidad ? ['-s', 'formatOptions', String(o.calidad)] : []), ruta, '--out', salida]);
}
