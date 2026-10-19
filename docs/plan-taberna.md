# La Taberna — plan

Fork de work-shelter con la misma base técnica (Electron + servidor local + Agent SDK + Three.js) y una piel de
taberna fantasy medieval, que funcione en Windows 11. Fase 0: este plan y una prueba de concepto en la sala Estudio.

## 1. Lo que depende de macOS y su sustituto en Windows

| Pieza (archivo) | Hoy en macOS | En Windows 11 |
|---|---|---|
| Arranque `./shelter`, `instalar.sh`, `scripts/instalar-app.mjs` | bash, `.app` en `/Applications` | `shelter.cmd`/`shelter.ps1`; acceso directo en el menú Inicio (o instalador con electron-builder, NSIS) |
| Rutas de datos (`userData`, `Application Support`, `Library/Logs`) | `~/Library/...` | `app.getPath('userData')` → `%APPDATA%\la-taberna`; logs en `%LOCALAPPDATA%` |
| Terminales: anfitrión PTY por socket Unix (`server/anfitrionTerminales.ts`) | `node-pty` + socket Unix | `node-pty` con ConPTY + named pipe `\\.\pipe\la-taberna-pty`; shell por defecto PowerShell 7 / `cmd` |
| Salir a la superficie (`server/escritorio.ts`, `superficie.ts`) | iTerm / Terminal por AppleScript | Windows Terminal (`wt.exe new-tab …`); reserva: `conhost` |
| Llavero (`server/integraciones/llavero.ts`) | `security` (Keychain) | Credential Manager (`keytar` o PowerShell `CredentialManager`) / DPAPI |
| Papelera (borrar en Archivos, copias de ejemplo) | papelera de macOS | `shell.trashItem` de Electron (multiplataforma) |
| Dictado (`server/voz.ts`, `voz/transcriptor.swift`) | Swift + Speech de macOS 26 | `Windows.Media.SpeechRecognition` vía PowerShell/WinRT, o desactivado al principio |
| Reducir imágenes (`server/adjuntos.ts`, `sips`) | `sips` | `sharp` (npm) o reducir en el cliente con canvas |
| Captura de sala (`server/capturaSala.ts`) y Chrome sin ventana de Spotify (`electron/chromeRemoto.cjs`, `loginChrome.cjs`) | rutas de Chrome en macOS | rutas de Chrome/Edge en `Program Files`; Edge vale para lo que no necesita Widevine de Chrome |
| Tecla de pánico ⇧⌥⌘Esc y atajos ⌘ | Cmd | Ctrl / Ctrl+Shift+Alt+Esc; repasar todos los `metaKey` del cliente |
| Señales y reinicio (`server/supervisor.mjs`, código 76) | SIGTERM, `kill` | `process.kill` sin señales POSIX; reinicio por IPC |
| `entornoGit()`, `gh`, `claude` | binarios en `PATH` de Homebrew | `git.exe`, `gh.exe`, `claude.cmd` (npm global); `where` en vez de `which` |
| Audio, Monaco, Three.js, React, Vite | — | sin cambios |

## 2. Biblia de la taberna

**Premisa.** El refugio subterráneo pasa a ser una taberna-posada de varios pisos, con bodega y torreón. Cada
habitante es un parroquiano con oficio (escriba, alquimista, herrera, bardo) que trabaja en su mesa. Tú eres el
tabernero (el Supervisor).

| Hoy | En la taberna | Notas |
|---|---|---|
| Puerta Principal (reclutar) | Puerta de la posada / libro de huéspedes | Reclutar = apuntar a un huésped |
| Puente de Mando | Sótano del mago | Círculo arcano, atril, orbe; «Aplicar cambios» = conjuro |
| Comunicaciones (tablón de avisos) | Tablón de anuncios | Corcho con pergaminos clavados; los avisos llegan como cartas |
| Planificación (agenda) | Almanaque del cronista | Calendario de pared, reloj de arena |
| Logística (Linear) | Despensa del intendente | Estanterías con sacos y cajas etiquetadas |
| Control de Versiones (git) | Archivo del escriba | Pupitre, códices encadenados; la Octocat se queda como familiar del escriba |
| Cámara acorazada | Cofre del tesoro / cámara de la bodega | Monedas y gemas (economía) |
| Hidroponía | Huerto del claustro | Cultivos del pack ya existente |
| Discoteca | Escenario del bardo | Laúd, tambores; mismo Spotify por debajo |
| Galería de tiro | Diana de dardos / tiro con arco | Primera iteración, se puede quitar |
| Chapa y Pintura | Sastre y barbero | Probador de aspecto |
| Salas de repo | Mesas con estandarte | Estandarte con nombre y color del repo; el tipo de repo elige el oficio (Estudio→taberna, Laboratorio→alquimista, Fundición→herrería, Archivo→biblioteca) |
| Hologramas (worktrees) | Ecos/espíritus del parroquiano | Mismo efecto, tono ámbar en vez de cian |
| Ascensor | Escalera de caracol / montacargas de poleas | |
| Calle con hora real | Plaza del pueblo con cielo real | |
| Terminales e intercomunicador | Pergaminos y tubo de voz | Solo el marco: el contenido sigue siendo texto fijo |

**Paleta.** Madera oscura `#3b2414`, roble `#8a5a34`, ámbar `#ffb347`, fuego `#ff7a2a`, pergamino `#f1dfb4`,
hierro `#3a3a40`, piedra `#6b625a`, acentos de estandarte (granate `#8c1c13`, verde musgo `#4a6b2f`, azul real
`#2c4a7a`). Interfaz: fondo pergamino oscuro, tipografía con serifa (OFL, p. ej. *IM Fell* o *Cinzel* para títulos).

**Iluminación.** Sin fluorescentes ni pilotos: luz puntual cálida (2200–2800 K) de chimeneas, antorchas y velas,
con parpadeo suave; ambiente bajo y azulado por las ventanas de noche, dorado de día; niebla ligera de humo.
El presupuesto de luces de `docs/diseno-refugio.md` sigue igual (pocas luces reales, el resto emisivas).

**Material CC0 (mismo autor y estilo, ya contemplado en `docs/assets.md`).**
- KayKit *Dungeon Remastered* (`GeorgeQLe/assets-kaykit-3d-environments`): muros de piedra, suelos, antorchas,
  barriles, cofres, estandartes, mesas, velas.
- KayKit *Medieval Builder / Medieval Hexagon* (mismo mirror): fachadas, tejados, calle.
- KayKit *Restaurant Bits* y *Furniture Bits* (ya en el repo): jarras, mesas, taburetes.
- KayKit *Adventurers 2.0* y *Skeletons* (personajes y armas: ya en el repo; esqueletos para guardias).
- Quaternius *Medieval Village*, *RPG Items*, *Fantasy Props MegaKit* y *Ultimate Fantasy RTS* (mirror
  `trebeljahr/quaternius-showcase`): hogueras, calderos, pociones, estanterías, estandartes.
- Fijar commit de cada mirror en `scripts/manifest_assets.json` antes de usarlo.

## 3. Fases

| Fase | Contenido | Tamaño |
|---|---|---|
| 0 (hecha) | Este plan; Estudio vestido de taberna con un decorado de datos (`shared/tabernaEstudio.ts`) | S |
| 1 — Windows | Rutas, arranque `.cmd`/`.ps1`, ConPTY + named pipe, Windows Terminal para la superficie, Credential Manager, `trashItem`, `sharp`, atajos Ctrl, búsqueda de binarios; dictado desactivado; CI en `windows-latest` con `npm test` y `tsc` | L (2–3 semanas) |
| 2 — Material | Descargar y fijar Dungeon/Medieval/RPG; añadir packs a `PACKS` de `shared/decorado.ts`; medirlos en `server/atrezo.ts`; licencias en `docs/assets.md` | M (3–5 días) |
| 3 — Piel de taberna | Estructura (muros de piedra, vigas, escalera), paletas nuevas en `PALETAS_DECORADO`, luz cálida con parpadeo en `web/src/motor`, bases de serie de las cuatro plantillas (taberna, alquimista, herrería, biblioteca), cielo y calle medievales, aspectos de parroquianos | L (3–4 semanas) |
| 4 — Salas de servicio | Rehacer Puerta, Sótano del mago, Tablón, Almanaque, Despensa, Archivo del escriba, Escenario del bardo con la misma lógica y textos nuevos | L (2–3 semanas) |
| 5 — UX e interfaz | Tema de la interfaz React (pergamino, serifas, iconos), textos y manual F1, sonido ambiente de taberna (CC0), renombrar identidad en disco (`la-taberna`, puerto propio) | M (1–2 semanas) |

Riesgos: Spotify/Widevine en Windows (Chrome instalado), `node-pty` precompilado para la versión de Electron,
y que `server/capturaSala.ts` encuentre un Chromium en Windows.

## Prueba de concepto de la fase 0

`shared/tabernaEstudio.ts`: base `vacia`, hoguera central, mesas de roble con jarras y farol, barriles de barra,
escudo y antorchas en la pared, tablón «HOY», tres luces de fuego y ámbar y luz general baja (0,6). Solo usa
modelos que ya referencia el código. Se aplica al refugio nuevo (sala `express`); un refugio ya creado conserva su
escena. La captura (`docs/media/taberna-fase0.png`) no se pudo hacer en el entorno de la fase 0 (Linux en la nube
sin GPU, sin los packs extra descargables por límite de la API de GitHub): queda para la primera sesión en Windows.
