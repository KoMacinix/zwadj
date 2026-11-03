# D339 — relevé de l'état machine du REJEU de l'e2e (décision R-8 du relevé de Ko, 03/11/2026).
# PROCÉDURE ARCHIVÉE COMME PREUVE, jamais promue en instrument (D291).
#
# Deux usages :
#   releve-machine.ps1 -Etiquette AVANT -Sortie <chemin>                      une ligne, puis sortie 0 (sortie 5 si batterie, chrome ou headless_shell > 0 pour AVANT et APRES)
#   releve-machine.ps1 -Boucle -Pas 30 -Stop <drapeau> -Sortie <chemin>       une ligne toutes les <Pas> secondes jusqu'à l'existence du fichier <drapeau>
#
# Une ligne : horodatage | secteur | batterie | RAM libre (Mo) | chrome | headless_shell | node | processeur (%)
# Aucun seuil : la RAM libre est DÉCLARÉE, pas jugée (note de Ko du 02/11, point 1 ; D290 : aucun seuil PERF hors certification).
# Pendant l'e2e, headless_shell > 0 est NORMAL (Playwright lance son navigateur) : seuls AVANT et APRES exigent 0.
# L'écriture se fait par .NET en UTF-8 sans BOM, jamais par redirection PowerShell 5.1 (UTF-16, D298). Aucun lecteur ne doit tenir le fichier ouvert (D299).
param(
  [string]$Etiquette = "PENDANT",
  [switch]$Boucle,
  [int]$Pas = 30,
  [string]$Stop = "",
  [Parameter(Mandatory = $true)][string]$Sortie
)
Add-Type -AssemblyName System.Windows.Forms
$utf8 = New-Object System.Text.UTF8Encoding $false

function Compter([string]$nom) {
  return @(Get-Process -Name $nom -ErrorAction SilentlyContinue).Count
}

function Ligne([string]$etiquette) {
  $secteur = [System.Windows.Forms.SystemInformation]::PowerStatus.PowerLineStatus
  $bat = [System.Windows.Forms.SystemInformation]::PowerStatus.BatteryLifePercent
  $os = Get-CimInstance Win32_OperatingSystem
  $ram = [math]::Round($os.FreePhysicalMemory / 1024)
  $cpu = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'").PercentProcessorTime
  $ligne = "{0} | {1,-7} | secteur={2} | batterie={3}% | RAM libre={4} Mo | chrome={5} | headless_shell={6} | node={7} | cpu={8}%" -f `
    (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $etiquette, $secteur, [math]::Round($bat * 100), $ram, (Compter "chrome"), (Compter "headless_shell"), (Compter "node"), $cpu
  [System.IO.File]::AppendAllText($Sortie, $ligne + "`n", $utf8)
  return $ligne
}

if ($Boucle) {
  while (-not (Test-Path -LiteralPath $Stop)) {
    [void](Ligne "PENDANT")
    $fin = (Get-Date).AddSeconds($Pas)
    while ((Get-Date) -lt $fin -and -not (Test-Path -LiteralPath $Stop)) { Start-Sleep -Milliseconds 500 }
  }
  exit 0
}

$l = Ligne $Etiquette
Write-Output $l
if ($Etiquette -eq "AVANT" -or $Etiquette -eq "APRES") {
  $secteur = [System.Windows.Forms.SystemInformation]::PowerStatus.PowerLineStatus
  if ($secteur -ne "Online" -or (Compter "chrome") -ne 0 -or (Compter "headless_shell") -ne 0) { exit 5 }
}
exit 0
