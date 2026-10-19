import { describe, it, expect } from 'vitest';
import { comandoReanudar, comandoEnganchar, guionEscritorio, comillas, comillasPS, PROMPT_CONTINUAR } from './escritorio.ts';

const ID = '0f8a2c1e-4b6d-4e2f-9a1b-3c5d7e9f1a2b';

describe('salir a la superficie: comandos', () => {
  it('retoma la conversación en su carpeta, con sus permisos y modelo', () => {
    expect(comandoReanudar({ claudeId: ID, cwd: '/Users/x/mi repo', permisos: 'acceptEdits', modelo: 'opus' }, false))
      .toBe(`cd '/Users/x/mi repo' && claude --resume ${ID} --model 'opus' --permission-mode acceptEdits`);
    expect(comandoReanudar({ claudeId: ID, cwd: '/a', permisos: 'default' }, false)).toBe(`cd '/a' && claude --resume ${ID}`);
    expect(comandoReanudar({ claudeId: ID, cwd: '/a', permisos: 'bypassPermissions' }, false)).toContain('--dangerously-skip-permissions');
    expect(comandoReanudar({ claudeId: ID, cwd: '/a', permisos: 'inventado; rm -rf /' }, false)).toBe(`cd '/a' && claude --resume ${ID}`);
  });
  it('si estaba trabajando, le pide que siga', () => {
    expect(comandoReanudar({ claudeId: ID, cwd: '/a', continuar: true }, false)).toBe(`cd '/a' && claude --resume ${ID} ${comillas(PROMPT_CONTINUAR)}`);
  });
  it('no acepta identificadores raros ni deja escapar las comillas', () => {
    expect(() => comandoReanudar({ claudeId: 'x; rm -rf ~', cwd: '/a' }, false)).toThrow();
    expect(comillas("it's")).toBe(`'it'\\''s'`);
    expect(comandoEnganchar('/r/shelter', '/tmp/s.sock', "sala:a'b::2", false)).toBe(`exec '/r/shelter' enganchar 'sala:a'\\''b::2' --socket '/tmp/s.sock'`);
  });
});

describe('salir a la superficie: Windows (PowerShell)', () => {
  it('retoma en su carpeta con Set-Location y comillas de PowerShell', () => {
    expect(comandoReanudar({ claudeId: ID, cwd: "C:\\Users\\x\\mi 'repo'", modelo: 'opus' }, true))
      .toBe(`Set-Location -LiteralPath 'C:\\Users\\x\\mi ''repo''' ; claude --resume ${ID} --model 'opus'`);
    expect(comillasPS("it's")).toBe("'it''s'");
  });
  it('engancha la terminal con shelter.cmd y la tubería', () => {
    expect(comandoEnganchar('C:\\r\\shelter', '\\\\.\\pipe\\s', 'sala:a', true)).toBe(`& 'C:\\r\\shelter.cmd' enganchar 'sala:a' --socket '\\\\.\\pipe\\s'; exit`);
  });
});

describe('salir a la superficie: AppleScript', () => {
  const items = [{ titulo: 'Néstor · "arreglo"', comando: `cd '/a' && echo "hola\\n"` }, { titulo: 'Terminal · b', comando: 'exec x' }];
  it('iTerm: una pestaña por cosa, en ventana nueva si se pide', () => {
    const g = guionEscritorio(items, 'iTerm', true);
    expect(g).toContain('tell application "iTerm"');
    expect(g).toContain('else if true or (count of windows) is 0 then');
    expect(g.match(/write text/g)).toHaveLength(2);
    expect(g.match(/tell w to create tab/g)).toHaveLength(2);   // la del else de la primera y la segunda
    // las comillas y barras del comando se escapan para AppleScript
    expect(g).toContain(`write text "cd '/a' && echo \\"hola\\\\n\\""`);
    expect(g).toContain('set name to "Néstor · \\"arreglo\\""');
  });
  it('Terminal: una ventana por cosa', () => {
    const g = guionEscritorio(items, 'Terminal', false);
    expect(g.match(/do script/g)).toHaveLength(2);
  });
});
