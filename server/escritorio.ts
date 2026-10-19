// Salir a la superficie: lo que estaba en el juego sigue en una terminal de tu escritorio (iTerm, o Terminal si no
// hay iTerm). Las conversaciones de los habitantes se retoman con `claude --resume` en su carpeta; las terminales del
// juego se enganchan tal cual (el mismo PTY: lo que corra dentro sigue igual) con `./shelter enganchar`.
// Cada cosa se escribe en el shell de una pestaña nueva, como si la hubieras tecleado tú: con tu entorno, en tu
// historial, y al salir de Claude Code te quedas en la carpeta del proyecto.
import os from 'node:os';
import path from 'node:path';
import { existsSync, appendFileSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { ES_WINDOWS, buscarPrograma, powershell, procesos } from './plataforma.ts';

export interface ItemEscritorio { titulo: string; comando: string }
export type AppTerminal = 'iTerm' | 'Terminal' | 'Windows Terminal' | 'PowerShell';

export const comillasSh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
// PowerShell (Windows): entre comillas simples, que se escapan doblándolas
export const comillasPS = (s: string) => `'${s.replace(/'/g, "''")}'`;
const cadena = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODOS_CLI = ['acceptEdits', 'auto', 'plan', 'dontAsk', 'manual'];
// si estaba trabajando, se interrumpe en el juego y sigue fuera sin que haga falta pedírselo
export const PROMPT_CONTINUAR = 'Sigue con lo que estabas haciendo: te he sacado de la taberna a esta terminal a mitad de trabajo.';

export interface Reanudar { claudeId: string; cwd: string; continuar?: boolean; modelo?: string; esfuerzo?: string; permisos?: string }
export function comandoReanudar(r: Reanudar, windows = ES_WINDOWS) {
  if (!UUID.test(r.claudeId)) throw new Error('Identificador de conversación no válido.');
  const comillas = windows ? comillasPS : comillasSh;
  const a = windows ? ['Set-Location', '-LiteralPath', comillas(r.cwd), ';', 'claude', '--resume', r.claudeId] : ['cd', comillas(r.cwd), '&&', 'claude', '--resume', r.claudeId];
  if (r.modelo) a.push('--model', comillas(r.modelo));
  if (r.esfuerzo) a.push('--effort', comillas(r.esfuerzo));
  if (r.permisos === 'bypassPermissions') a.push('--dangerously-skip-permissions');
  else if (r.permisos && MODOS_CLI.includes(r.permisos)) a.push('--permission-mode', r.permisos);
  if (r.continuar) a.push(comillas(PROMPT_CONTINUAR));
  return a.join(' ');
}
// `exec`: la pestaña es la terminal del juego; si esta termina (exit), la pestaña también
export const comandoEnganchar = (shelter: string, socket: string, id: string, windows = ES_WINDOWS) => windows
  ? `& ${comillasPS(shelter + '.cmd')} enganchar ${comillasPS(id)} --socket ${comillasPS(socket)}; exit`
  : `exec ${comillasSh(shelter)} enganchar ${comillasSh(id)} --socket ${comillasSh(socket)}`;
export const comillas = comillasSh;

export function appTerminal(): AppTerminal {
  if (ES_WINDOWS) return buscarPrograma('wt.exe') ? 'Windows Terminal' : 'PowerShell';
  const pref = (process.env.SHELTER_TERMINAL ?? '').toLowerCase();
  if (pref === 'terminal') return 'Terminal';
  if (pref === 'iterm') return 'iTerm';
  return ['/Applications/iTerm.app', path.join(os.homedir(), 'Applications/iTerm.app')].some(existsSync) ? 'iTerm' : 'Terminal';
}

// AppleScript que abre una pestaña por cosa: en una ventana nueva (pánico, varias cosas) o en la ventana de delante
export function guionEscritorio(items: ItemEscritorio[], app: AppTerminal, ventanaNueva: boolean): string {
  if (app === 'Terminal') {
    // Terminal no crea pestañas por AppleScript: cada cosa en su ventana
    const l = ['tell application "Terminal"', 'activate'];
    for (const it of items) l.push(`set t to do script ${cadena(it.comando)}`, `set custom title of t to ${cadena(it.titulo)}`);
    return [...l, 'end tell'].join('\n');
  }
  const l = ['set estaba to application "iTerm" is running', 'tell application "iTerm"', 'activate', 'if not estaba then delay 0.6'];
  items.forEach((it, i) => {
    // recién abierto, iTerm ya trae su ventana vacía: se aprovecha
    if (i === 0) l.push(
      'if (not estaba) and (count of windows) > 0 then', 'set w to current window',
      `else if ${ventanaNueva ? 'true' : 'false'} or (count of windows) is 0 then`, 'set w to (create window with default profile)',
      'else', 'set w to current window', 'tell w to create tab with default profile', 'end if');
    else l.push('tell w to create tab with default profile');
    l.push('tell current session of w', `set name to ${cadena(it.titulo)}`, `write text ${cadena(it.comando)}`, 'end tell');
  });
  return [...l, 'end tell'].join('\n');
}

export function abrirEnEscritorio(items: ItemEscritorio[], o: { ventanaNueva?: boolean } = {}): Promise<AppTerminal> {
  const app = appTerminal();
  if (!items.length) return Promise.resolve(app);
  // QA: en vez de abrir ventanas, se apunta lo que se abriría (una línea JSON por llamada)
  if (process.env.SHELTER_ESCRITORIO_PRUEBA) { appendFileSync(process.env.SHELTER_ESCRITORIO_PRUEBA, JSON.stringify({ app, ventanaNueva: !!o.ventanaNueva, items }) + '\n'); return Promise.resolve(app); }
  if (ES_WINDOWS) return abrirEnWindows(items, app);
  return new Promise((ok, ko) => execFile('osascript', ['-e', guionEscritorio(items, app, !!o.ventanaNueva)], { timeout: 20_000 }, (err, _out, errOut) => {
    if (!err) { ok(app); return; }
    const texto = String(errOut || err.message);
    ko(new Error(/-1743|not authori[sz]ed|no autorizad/i.test(texto)
      ? `macOS no deja que La Taberna maneje ${app}: permítelo en Ajustes del Sistema › Privacidad y seguridad › Automatización.`
      : `No he podido abrir ${app}: ${texto.trim().split('\n').pop()}`));
  }));
}

// Windows: una pestaña de Windows Terminal (o una ventana de PowerShell) por cosa. La orden va codificada
// (-EncodedCommand), así no hay que escapar nada para wt.exe ni para cmd
async function abrirEnWindows(items: ItemEscritorio[], app: AppTerminal): Promise<AppTerminal> {
  const ps = powershell();
  for (const it of items) {
    const cod = Buffer.from(it.comando, 'utf16le').toString('base64');
    const args = ['-NoExit', '-NoLogo', '-EncodedCommand', cod];
    try {
      if (app === 'Windows Terminal') spawn(buscarPrograma('wt.exe')!, ['-w', '0', 'new-tab', '--title', it.titulo.replace(/;/g, ','), ps, ...args], { detached: true, stdio: 'ignore' }).unref();
      else spawn(ps, args, { detached: true, stdio: 'ignore' }).unref();
    } catch (e) { throw new Error(`No he podido abrir ${app}: ${(e as Error).message}`); }
    await new Promise(r => setTimeout(r, 300));
  }
  return app;
}

// Conversaciones abiertas ahora mismo en una terminal (un `claude --resume <id>` que no es del propio servidor):
// retomarlas a la vez en el juego las corrompería, así que el refugio se espera a que salgas de ellas
export function abiertasFuera(propio = process.pid): Set<string> {
  const r = new Set<string>();
  try {
    for (const { padre, args } of procesos()) {
      if (padre === propio) continue;
      for (const x of args.matchAll(/(?:--resume|-r)[ =]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) r.add(x[1].toLowerCase());
    }
  } catch {}
  return r;
}
