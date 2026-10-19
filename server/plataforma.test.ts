// Lo específico de cada sistema (server/plataforma.ts). Las de Windows corren en el CI (windows-latest): ahí se
// guarda, lee y borra una credencial de verdad, se manda algo a la papelera y se reduce una imagen.
import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { carpetaApp, carpetaLogs, canalLocal, shellTerminal, aLaPapelera, medidasImagen, convertirImagen, ES_WINDOWS } from './plataforma.ts';
import { llaveroWindows } from './integraciones/llavero.ts';

// PNG de 2×1 píxeles
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP4z8DAwPAfAAcAAf9+CLHQAAAAAElFTkSuQmCC', 'base64');

describe('plataforma: carpetas y canales', () => {
  it('cada sistema tiene sus carpetas de la app', () => {
    if (process.platform === 'win32') { expect(carpetaApp()).toBe(path.join(process.env.APPDATA!, 'work-shelter-public')); expect(carpetaLogs()).toBe(path.resolve(import.meta.dirname, '..', 'Logs')); }
    else if (process.platform === 'darwin') { expect(carpetaApp()).toContain('Library/Application Support/work-shelter-public'); expect(carpetaLogs()).toContain('Library/Logs'); }
    else expect(carpetaApp()).toContain('work-shelter-public');
  });
  it('el canal del anfitrión: tubería con nombre en Windows, socket en la carpeta temporal en los demás', () => {
    const c = canalLocal('work-shelter', '/datos');
    if (ES_WINDOWS) expect(c).toMatch(/^\\\\\.\\pipe\\work-shelter-.+-[0-9a-f]{10}$/);
    else expect(c).toBe(path.join(os.tmpdir(), c.slice(os.tmpdir().length + 1))), expect(c.endsWith('.sock')).toBe(true);
    expect(canalLocal('work-shelter', '/otros')).not.toBe(c);
  });
  it('el shell de las terminales', () => {
    const { shell, args } = shellTerminal();
    if (ES_WINDOWS) { expect(shell.toLowerCase()).toMatch(/(pwsh|powershell)\.exe$/); expect(existsSync(shell)).toBe(true); }
    else expect(args).toEqual(['-l']);
  });
});

describe.runIf(process.platform === 'win32')('plataforma en Windows', () => {
  it('Administrador de credenciales: guarda, lee y borra', async () => {
    const cuenta = 'prueba.ci' + process.pid;
    try {
      expect(await llaveroWindows.leer(cuenta)).toBeNull();
      await llaveroWindows.guardar(cuenta, 'sécret «con» acentos y "comillas" $(no)');
      expect(await llaveroWindows.leer(cuenta)).toBe('sécret «con» acentos y "comillas" $(no)');
      await llaveroWindows.guardar(cuenta, 'otro');
      expect(await llaveroWindows.leer(cuenta)).toBe('otro');
    } finally { await llaveroWindows.borrar(cuenta); }
    expect(await llaveroWindows.leer(cuenta)).toBeNull();
    await llaveroWindows.borrar(cuenta);   // borrar lo que no está no es un error
  }, 60_000);
  it('papelera: archivos y carpetas, también con comillas en el nombre', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'ws-papelera-'));
    try {
      const a = path.join(dir, "it's a.txt"), b = path.join(dir, 'carpeta');
      writeFileSync(a, 'x'); mkdtempSync(b + '-'); writeFileSync(path.join(dir, 'otro.txt'), 'y');
      await aLaPapelera([a, path.join(dir, 'otro.txt')]);
      expect(existsSync(a)).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
  it('imágenes: mide y convierte con System.Drawing', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'ws-img-'));
    try {
      const png = path.join(dir, 'a.png'), jpg = path.join(dir, 'b.jpg');
      writeFileSync(png, PNG);
      expect(await medidasImagen(png)).toEqual({ ancho: 2, alto: 1 });
      await convertirImagen(png, jpg, { formato: 'jpeg', calidad: 80 });
      expect(readFileSync(jpg).subarray(0, 2).toString('hex')).toBe('ffd8');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});
