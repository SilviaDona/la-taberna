# work-shelter en Windows: el equivalente de ./shelter (se usa por shelter.cmd o por el acceso directo).
# Instala lo necesario la primera vez (Node portátil si falta, dependencias, material CC0, compilación) y abre el juego
# en su ventana. Lo único que se asume del sistema es Claude Code instalado y con sesión iniciada. Sin administrador.
#   shelter.cmd                     abre el juego
#   shelter.cmd instalar-app        lo prepara todo y crea los accesos directos (Escritorio y menú Inicio)
#   shelter.cmd superficie [--lista] · shelter.cmd enganchar <id>   (salir a la superficie: server/superficie.ts)
# Compatible con Windows PowerShell 5.1 (el que trae Windows 11) y con PowerShell 7.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot
$RAIZ = $PSScriptRoot
$NODO_VERSION = '22.20.0'
# sumas SHA-256 oficiales (https://nodejs.org/dist/v22.20.0/SHASUMS256.txt): no se ejecuta nada que no cuadre
$SUMAS = @{ 'x64' = 'bb819d6eb8f5bfda294bbc83a7e4ec6539da67c4233d54b0d655b9248b15e29d'; 'arm64' = 'b12919e609b4fa1176ba8a155b49f761419a0c7cc97b42e6be09874a3f760ab6' }
$OCULTO = [bool]$env:SHELTER_OCULTO   # abierto desde el acceso directo, sin consola a la vista
$LOGS = Join-Path $env:LOCALAPPDATA 'work-shelter-public\Logs'

function Amarillo($t) { Write-Host $t -ForegroundColor Yellow }
function Verde($t) { Write-Host $t -ForegroundColor Green }
function Fallo($t) {
  Write-Host $t -ForegroundColor Red
  if ($OCULTO) {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show("$t`n`nRegistro: $LOGS\shelter.log", 'work-shelter', 'OK', 'Error')
  }
  exit 1
}
if ($OCULTO) { New-Item -ItemType Directory -Force -Path $LOGS | Out-Null; Start-Transcript -Append -Path (Join-Path $LOGS 'shelter.log') | Out-Null }

$orden = if ($args.Count) { [string]$args[0] } else { '' }
$resto = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }
$SUBORDEN = $orden -in @('superficie', 'enganchar')
if (-not $SUBORDEN) { Write-Host '== work-shelter ==' }

# 1. Node 22+ (si no hay, uno portátil en .runtime\, sin permisos de administrador)
$node = Get-Command node.exe -ErrorAction SilentlyContinue
$version = 0
if ($node) { try { $version = [int](& $node.Source -p "process.versions.node.split('.')[0]") } catch { $version = 0 } }
if ($node -and $version -ge 22) {
  $NODE = $node.Source; $NPM = Join-Path (Split-Path $NODE) 'npm.cmd'
} else {
  $arq = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $dir = Join-Path $RAIZ ".runtime\node-v$NODO_VERSION-win-$arq"
  if (-not (Test-Path (Join-Path $dir 'node.exe'))) {
    Amarillo 'No encuentro Node 22 o superior. Descargo uno portátil para work-shelter (solo esta vez)…'
    New-Item -ItemType Directory -Force -Path (Join-Path $RAIZ '.runtime') | Out-Null
    $zip = Join-Path $RAIZ '.runtime\node.zip'
    try { Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$NODO_VERSION/node-v$NODO_VERSION-win-$arq.zip" -OutFile $zip }
    catch { Fallo 'No he podido descargar Node. Comprueba la conexión o instala Node 22 desde https://nodejs.org' }
    if ((Get-FileHash -Algorithm SHA256 $zip).Hash.ToLower() -ne $SUMAS[$arq]) { Remove-Item $zip; Fallo 'El Node descargado no cuadra con su suma oficial: no lo uso. Instala Node 22 desde https://nodejs.org' }
    Expand-Archive -Path $zip -DestinationPath (Join-Path $RAIZ '.runtime') -Force
    Remove-Item $zip
  }
  $env:PATH = "$dir;$env:PATH"; $NODE = Join-Path $dir 'node.exe'; $NPM = Join-Path $dir 'npm.cmd'
}

if ($SUBORDEN) {
  if (-not (Test-Path 'node_modules\tsx')) { Fallo 'work-shelter aún no está instalado: ejecuta shelter.cmd una vez.' }
  & $NODE --import tsx server/superficie.ts @args
  exit $LASTEXITCODE
}

# 2. Claude Code (necesario para que los habitantes trabajen) y git
$claude = (Get-Command claude -ErrorAction SilentlyContinue) -or (Test-Path (Join-Path $HOME '.local\bin\claude.exe'))
if (-not $claude) {
  Write-Host "AVISO: no encuentro Claude Code (el comando 'claude')." -ForegroundColor Red
  Write-Host "  Instálalo (https://docs.claude.com/claude-code) y entra con tu cuenta: abre PowerShell, ejecuta 'claude' y luego '/login'." -ForegroundColor Red
  Write-Host '  work-shelter se abrirá igualmente, pero los habitantes no podrán trabajar hasta entonces.' -ForegroundColor Red
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'AVISO: no encuentro git. Las salas de ejemplo y el Control de Versiones lo necesitan (https://git-scm.com/download/win).' -ForegroundColor Red
}

# 3. Dependencias (la primera vez, o si cambia package-lock.json)
$sello = 'node_modules\.sello-shelter'
$huella = (Get-FileHash -Algorithm SHA1 package-lock.json).Hash.ToLower()
if (-not (Test-Path $sello) -or ((Get-Content $sello -Raw).Trim() -ne $huella)) {
  Amarillo 'Instalando dependencias (la primera vez tarda un par de minutos)…'
  & $NPM ci --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { Fallo 'Falló la instalación de dependencias (npm ci).' }
  Set-Content -Path $sello -Value $huella -NoNewline
}

# 3b. Binario de Electron (la ventana del juego): este paquete lo descarga aparte
$ELECTRON = Join-Path $RAIZ 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $ELECTRON)) {
  Amarillo 'Descargando la ventana del juego (Electron, solo la primera vez)…'
  & $NODE node_modules/electron/install.js
  if ($LASTEXITCODE -ne 0) { Amarillo 'No se pudo descargar Electron: work-shelter se abrirá en el navegador.' }
}

# 4. Material artístico CC0 (fijado por commit)
if (-not (Test-Path 'assets\indice.json')) {
  Amarillo 'Descargando el material artístico (CC0, unos 70 MB, solo la primera vez)…'
  & $NODE scripts/descargar-assets.mjs assets; $ok = $LASTEXITCODE -eq 0
  if ($ok) { & $NODE scripts/descargar-extra.mjs assets; $ok = $LASTEXITCODE -eq 0 }
  if ($ok) { & $NODE scripts/indexar-assets.mjs | Out-Null; $ok = $LASTEXITCODE -eq 0 }
  if (-not $ok) { Fallo 'No se pudo descargar el material. Comprueba la conexión y vuelve a abrir work-shelter.' }
}
if (-not (Test-Path 'assets\kaykit\character-animations-1.1\Mannequin Character\characters\Mannequin_Medium.glb')) {
  Amarillo 'Descargando los personajes que faltan (CC0, unos 30 MB, solo una vez)…'
  & $NODE scripts/descargar-extra.mjs assets
  if ($LASTEXITCODE -eq 0) { & $NODE scripts/indexar-assets.mjs | Out-Null } else { Amarillo 'No se pudieron bajar los personajes: se reintentará en el próximo arranque.' }
}

# 5. Compilar la interfaz si su código ha cambiado desde la última compilación (por contenido, no por fechas)
& $NODE -e "process.exit(require('./scripts/huellas.cjs').clienteAlDia() ? 0 : 1)"
if ($LASTEXITCODE -ne 0) {
  Amarillo 'Compilando work-shelter…'
  & $NODE scripts/huellas.cjs compilar
  if ($LASTEXITCODE -ne 0) { Fallo 'Falló la compilación de la interfaz.' }
}

# 5b. Accesos directos en el Escritorio y en el menú Inicio (shelter.cmd instalar-app)
if ($orden -eq 'instalar-app') {
  Amarillo 'Creando los accesos directos…'
  $icono = Join-Path $RAIZ '.runtime\icono.ico'
  try {
    # un .ico con la imagen PNG dentro (Windows lo admite desde Vista), reducida a 256 px
    Add-Type -AssemblyName System.Drawing
    $png = [System.Drawing.Image]::FromFile((Join-Path $RAIZ 'electron\icono\icono.png'))
    $bmp = New-Object System.Drawing.Bitmap 256, 256
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($png, 0, 0, 256, 256); $g.Dispose(); $png.Dispose()
    $ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    $datos = $ms.ToArray()
    $f = [System.IO.File]::Create($icono); $w = New-Object System.IO.BinaryWriter $f
    $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]1)
    $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([uint16]1); $w.Write([uint16]32)
    $w.Write([uint32]$datos.Length); $w.Write([uint32]22); $w.Write($datos); $w.Close()
  } catch { Amarillo "No he podido preparar el icono: $($_.Exception.Message)"; $icono = $null }
  $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $wsh = New-Object -ComObject WScript.Shell
  $destinos = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
  foreach ($d in $destinos) {
    $a = $wsh.CreateShortcut((Join-Path $d 'work-shelter.lnk'))
    $a.TargetPath = $ps
    $a.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"`$env:SHELTER_OCULTO='1'; & '$($RAIZ.Replace("'", "''"))\shelter.ps1'`""
    $a.WorkingDirectory = $RAIZ
    $a.WindowStyle = 7
    $a.Description = 'work-shelter'
    if ($icono) { $a.IconLocation = "$icono,0" }
    $a.Save()
  }
  Verde 'Listo: work-shelter está en el Escritorio y en el menú Inicio.'
  exit 0
}

# 6. Servidor local (solo 127.0.0.1, bajo un supervisor que lo relanza al pulsar «Reiniciar» en el juego) y ventana
$PUERTO = if ($env:SHELTER_PUERTO) { $env:SHELTER_PUERTO } else { '3778' }
$DATOS = if ($env:SHELTER_DATOS) { $env:SHELTER_DATOS } else { Join-Path $RAIZ '.data' }
function Salud { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$PUERTO/salud" | Out-Null; $true } catch { $false } }
if (Salud) { & $NODE scripts/huellas.cjs poner-al-dia $PUERTO $DATOS | Out-Null }
$servidor = $null
if (Salud) {
  Amarillo "Ya hay un work-shelter abierto en el puerto ${PUERTO}: abro otra ventana."
} else {
  Amarillo 'Abriendo el refugio…'
  if (-not $env:SHELTER_SIN_VENTANA) { $env:SHELTER_SALIR_SIN_CLIENTES = '1' }
  $servidor = Start-Process -FilePath $NODE -ArgumentList 'server/supervisor.mjs' -WorkingDirectory $RAIZ -NoNewWindow -PassThru
  for ($i = 0; $i -lt 120 -and -not (Salud); $i++) { Start-Sleep -Milliseconds 250 }
}
# el secreto de este arranque (lo escribe el servidor, solo para ti) va en el fragmento de la URL
$token = Join-Path $DATOS 'token'
for ($i = 0; $i -lt 40 -and -not ((Test-Path $token) -and (Get-Item $token).Length -gt 0); $i++) { Start-Sleep -Milliseconds 100 }
$URL = "http://127.0.0.1:$PUERTO/#t=" + $(if (Test-Path $token) { (Get-Content $token -Raw).Trim() } else { '' })
function Parar {
  # el servidor se apaga solo al cerrar la ventana; si no, se cierra con todo lo suyo (no las terminales: su anfitrión va aparte)
  if ($servidor -and -not $servidor.HasExited) {
    if (-not $servidor.WaitForExit(5000)) { & taskkill.exe /T /F /PID $servidor.Id | Out-Null }
  }
}
Verde "work-shelter en marcha: http://127.0.0.1:$PUERTO  (Ctrl+C aquí lo cierra todo)"
try {
  if ($env:SHELTER_SIN_VENTANA) {
    Write-Host "Abre: $URL"
    if ($servidor) { $servidor.WaitForExit() }
  } elseif (Test-Path $ELECTRON) {
    $env:SHELTER_URL = $URL
    $e = Start-Process -FilePath $ELECTRON -ArgumentList 'electron/main.cjs' -WorkingDirectory $RAIZ -PassThru
    $e.WaitForExit()
  } else {
    Amarillo 'No encuentro Electron; abro work-shelter en el navegador.'
    Start-Process $URL
    if ($servidor) { $servidor.WaitForExit() }
  }
} finally { Parar }
