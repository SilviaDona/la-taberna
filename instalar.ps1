# work-shelter en Windows 11: instalación en un solo comando, sin permisos de administrador. En PowerShell:
#   irm https://raw.githubusercontent.com/SilviaDona/la-taberna/main/instalar.ps1 | iex
# Descarga el juego en %LOCALAPPDATA%\work-shelter-public (o $env:SHELTER_CODIGO), lo prepara (shelter.cmd
# instalar-app: Node portátil si falta, dependencias, material CC0, compilación) y crea los accesos directos en el
# Escritorio y en el menú Inicio. Volver a ejecutarlo pone el juego al día.
# Opciones por variables de entorno: SHELTER_REPO (otro repo), SHELTER_RAMA (otra rama), SHELTER_SIN_ABRIR=1.
# Todo va dentro de una función: con «irm | iex», PowerShell lo lee entero antes de empezar.
function Instalar-WorkShelter {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $repo = if ($env:SHELTER_REPO) { $env:SHELTER_REPO } else { 'https://github.com/SilviaDona/la-taberna.git' }
  $rama = if ($env:SHELTER_RAMA) { $env:SHELTER_RAMA } else { 'main' }
  $codigo = if ($env:SHELTER_CODIGO) { $env:SHELTER_CODIGO } else { Join-Path $env:LOCALAPPDATA 'work-shelter-public' }

  if ([Environment]::OSVersion.Platform -ne 'Win32NT') { Write-Host 'Este instalador es para Windows (en macOS: instalar.sh).' -ForegroundColor Red; return }

  # git: hace falta para descargar el juego, para las salas de ejemplo y para el Control de Versiones
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host 'Falta git. Lo instalo solo para tu usuario (sin administrador) con winget…' -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
      winget install --id Git.Git --scope user --silent --accept-package-agreements --accept-source-agreements
      $env:PATH = [Environment]::GetEnvironmentVariable('PATH', 'User') + ';' + [Environment]::GetEnvironmentVariable('PATH', 'Machine')
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
      Write-Host 'No he podido instalar git. Instálalo desde https://git-scm.com/download/win, cierra PowerShell y vuelve a ejecutar este mismo comando.' -ForegroundColor Red
      return
    }
  }

  if (Test-Path (Join-Path $codigo '.git')) {
    Write-Host "Poniendo al día el juego en $codigo…" -ForegroundColor Yellow
    git -C $codigo pull --ff-only --quiet
    if ($LASTEXITCODE -ne 0) { Write-Host "No he podido ponerlo al día (¿cambios tuyos en $codigo?): sigo con lo que hay." -ForegroundColor Yellow }
  } elseif (Test-Path $codigo) {
    Write-Host "$codigo ya existe y no es una copia del juego: muévelo o elige otra carpeta con `$env:SHELTER_CODIGO." -ForegroundColor Red
    return
  } else {
    Write-Host "Descargando el juego en $codigo…" -ForegroundColor Yellow
    git clone --quiet --branch $rama $repo $codigo
    if ($LASTEXITCODE -ne 0) { Write-Host 'No he podido descargar el juego. Comprueba la conexión.' -ForegroundColor Red; return }
  }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $codigo 'shelter.ps1') instalar-app
  if ($LASTEXITCODE -ne 0) { Write-Host 'La preparación no ha terminado bien: mira los mensajes de arriba.' -ForegroundColor Red; return }

  Write-Host 'Listo: work-shelter está en el Escritorio y en el menú Inicio.' -ForegroundColor Green
  Write-Host "El código del juego queda en $codigo."
  if (-not $env:SHELTER_SIN_ABRIR) { Start-Process (Join-Path ([Environment]::GetFolderPath('Desktop')) 'work-shelter.lnk') }
}
Instalar-WorkShelter
