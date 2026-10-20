import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { Motor } from './motor/render';
import { vigilarPrimerPlano } from './motor/foco';
import { Refugio } from './mundo/refugio';
import { Hud } from './ui/Hud';
import { Dialogo, intercoms } from './ui/Dialogo';
import { Paneles } from './ui/Paneles';
import { Terminales } from './ui/Terminales';
import { Barra } from './ui/Barra';
import { Navegadores, navegadores, abrirNavegador } from './ui/Navegadores';
import { ClienteGit } from './ui/git/ClienteGit';
import { ventanaGit, abrirGit } from './ui/git/ventana';
import { Explorador } from './ui/archivos/Explorador';
import { ventanaArchivos, abrirArchivos } from './ui/archivos/ventana';
import { Avisos, Carga, CargaSalas } from './ui/Puente';
import { Hechos, Visor } from './ui/Pasos';
import { ModoDecorar } from './ui/Mercader';
import { Mochila } from './ui/Mochila';
import { Pletina } from './ui/Discoteca';
import { Buscador } from './ui/Buscador';
import { cliente, vivo } from './red/cliente';
import { juego } from './ui/estadoJuego';

async function cargarFuentes() {
  const familias = ['800 40px "Refugio Titulo"', '500 40px "Refugio Titulo"', '600 40px "Refugio Rotulo"', '500 40px "Refugio Rotulo"', '400 20px "Taberna Texto"', '700 20px "Taberna Texto"', '400 20px "Refugio Mono"', '500 20px "Refugio Mono"', '600 20px "Refugio Mono"', '20px "Refugio CRT"'];
  await Promise.all(familias.map(f => document.fonts.load(f, 'ÁÑáñ¿¡')));
}

const fuentes = cargarFuentes();
// La Taberna se ve en isométrica (herramientas/tabernaIso.ts, conectada a las sesiones de verdad); la vista de
// refugio de antes sigue con ?vista=refugio mientras se termina de pasar todo
const VISTA_REFUGIO = new URLSearchParams(location.search).get('vista') === 'refugio';
const motorListo: Promise<Motor> = VISTA_REFUGIO ? Promise.resolve(new Motor(document.getElementById('mundo')!)) : import('./herramientas/tabernaIso').then(m => m.motor);
if (VISTA_REFUGIO) motorListo.then(motor => {
  let refugio: Refugio;
  const listo = fuentes.then(() => { refugio = new Refugio(motor); (window as any).__refugio = refugio; return refugio.listo; });
  (window as any).__ready = () => listo;
  motor.arrancar();
});
motorListo.then(motor => {
  (window as any).__motor = motor;
  // fuera de primer plano el motor deja de pintar y la interfaz deja de animarse
  vigilarPrimerPlano(activo => motor.alCambiarPrimerPlano(activo));
});
import('./mundo/animaciones').then(m => { (window as any).__anim = m; });   // QA: componer y probar clips desde la página
(window as any).__THREE = THREE;   // para la QA (rayos, cajas)
createRoot(document.getElementById('ui')!).render(<><Hud /><Dialogo /><Paneles /><Terminales /><Navegadores /><ClienteGit /><Explorador /><div className="columna-izquierda"><Pletina /><Barra /></div><Avisos /><Hechos /><Visor /><ModoDecorar /><Mochila /><Buscador /><CargaSalas /><Carga /></>);
cliente.conectar();
Object.assign(window as any, { __juego: juego, __cliente: cliente, __vivo: vivo, __intercoms: intercoms, __navegadores: { navegadores, abrirNavegador }, __git: { ventanaGit, abrirGit }, __archivos: { ventanaArchivos, abrirArchivos } }); // para QA y depuración
(window as any).__salirRefugio = () => new Promise<void>(ok => { cliente.enviar({ t: 'salir' }); setTimeout(ok, 300); });
// tecla de pánico (Electron): lo abierto sale a tu escritorio. Contesta al momento; si no hay conexión, Electron se lo
// pide al servidor por su cuenta (./shelter superficie)
(window as any).__superficie = () => { if (!vivo.get().conectado) return Promise.reject(new Error('Sin conexión')); cliente.accion('superficie.sacar', { todo: true, ventanaNueva: true }).catch(() => {}); return Promise.resolve(true); };
