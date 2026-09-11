# =============================================================================
# SONDE D'ETAT MACHINE — dans quel regime la machine etait-elle pendant la mesure ?
# =============================================================================
#   powershell -ExecutionPolicy Bypass -File neutralisation/sonde-etat-machine.ps1
#   ... -Calibrer                 # rejoue la calibration sur charge CONNUE, puis releve
#   ... -Echantillons 10 -PauseSecondes 3
#
# ⛔ POURQUOI CETTE SONDE EXISTE. « Intermittent » sans etat machine releve ne veut
# rien dire (D270) : la meme commande, sur le meme arbre, a rendu une suite
# entierement verte en quelques dizaines de secondes ET des dizaines d'echecs en
# plusieurs minutes. Une duree sans son etat machine n'est pas une mesure.
#
# ⛔ ELLE A VECU HORS DU DEPOT, ET C'ETAIT LA RESERVE N°2 DE D275 (07/09/2026) :
# « tous les etats releves pour cette certification l'ont ete par un script qui vit
# dans le scratchpad de la session — la session suivante ne pourra ni le rejouer,
# ni le contester, ni distinguer un ecart de machine d'un ecart d'instrument. »
# Elle entre au depot le 11/09/2026 (rang 11).
# ⚠ ECART ASSUME AU NOM ANNONCE : D275 nommait le remede `sonde-etat-machine.py`.
# Il est ici en PowerShell — les cinq quantites sont des compteurs Windows, et les
# lire depuis Python reviendrait a lancer... powershell. Le nom a ete ecrit avant
# que l'instrument existe ; l'instrument, lui, est calibre.
#
# -----------------------------------------------------------------------------
# LES CINQ QUANTITES, ET POURQUOI LES AUTRES INSTRUMENTS SONT ECARTES
# -----------------------------------------------------------------------------
#  1. RAM LIBRE   : Win32_OperatingSystem.FreePhysicalMemory.
#  2. CPU CHARGE  : Win32_PerfFormattedData_PerfOS_Processor (_Total).
#       Win32_Processor.LoadPercentage ECARTE le 03/09/2026 : il ne distingue pas
#       repos et charge.
#  3. BRIDAGE REEL: '\Processor Information(_Total)\% Processor Performance'.
#       > 100 % = turbo, donc NON bride. Win32_Processor.CurrentClockSpeed ECARTE :
#       il rend MaxClockSpeed en toute circonstance et ne distingue rien.
#  4. ALIMENTATION: Win32_Battery.BatteryStatus (2 = secteur, 1 = batterie) + charge,
#       plus les overlays AC/DC — deux overlays DIFFERENTS signifient que le mode
#       change avec la source, donc qu'un debranchement change le regime.
#  5. INVENTAIRE  : node, chrome, total Mo, nb de processus, et le detail > 150 Mo.
#       Le compte de `node` est un FAIT de certification, pas un detail (D275) :
#       un observateur de fichiers qui recompile pendant qu'une suite lit les memes
#       fichiers est la seule piste non ecartee de l'intermittence de D274.
#
# ⚠ Un champ vide rend ECHEC-INSTRUMENT, JAMAIS une chaine vide (lecon du rang 6) :
# un blanc se lit comme « rien a signaler », et c'est exactement le faux positif que
# D275 nomme dans sa reserve — « non vide n'est pas juste ».
#
# -----------------------------------------------------------------------------
# ⛔ LA CALIBRATION — CE QUE LA RESERVE N°2 REPROCHAIT EN SECOND
# -----------------------------------------------------------------------------
# La reserve ne disait pas seulement « hors depot » : elle disait que la calibration
# etait HERITEE du 03/09/2026 et n'avait jamais ete rejouee. Un instrument calibre
# une fois, ailleurs, sur une autre machine, n'est pas un instrument calibre.
# ⇒ `-Calibrer` rejoue la separation des regimes ICI ET MAINTENANT : releve au
#   REPOS, puis sous une charge CONNUE (une boucle occupee par cœur), et exige que
#   les deux instruments SEPARENT les deux regimes. S'ils ne separent pas, la sonde
#   ABANDONNE — sur une machine deja saturee elle ne peut rien distinguer, et le
#   dire vaut mieux que rendre un chiffre.
# ⚠ LA CALIBRATION CHARGE LA MACHINE : elle ne se lance pas PENDANT une campagne.
# ⚠ Et tout releve imprime `CALIBRATION_REJOUEE` : un releve colle dans un rapport
#   ne doit jamais pouvoir passer pour calibre s'il ne l'est pas.
# =============================================================================

param(
    [int]$Echantillons = 6,
    [int]$PauseSecondes = 5,
    [switch]$Calibrer,
    # Marge exigee entre repos et charge, en points de pourcentage. Elle n'est pas
    # une propriete de la machine mais le SEUIL DE DISCRIMINATION qu'on exige de
    # l'instrument : sous cette marge, il ne separe pas les deux regimes.
    [int]$MargeCpu = 20
)

$ErrorActionPreference = 'Stop'

# ⛔ L'EQUIVALENT POWERSHELL DES TROIS LIGNES PYTHON DE D268. Sans lui, les
# glyphes ✓ / ✗ / ⚠ sortent en « ? » a la console et en « � » des que la
# sortie est REDIRIGEE vers un journal — c'est-a-dire exactement quand elle sert
# de preuve. Mesure le 11/09/2026 : la ligne de verdict de la calibration etait
# illisible dans le fichier alors qu'elle etait juste a l'ecran.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Get-RamLibreMo {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($null -eq $os.FreePhysicalMemory) { return $null }
    return [math]::Round($os.FreePhysicalMemory / 1024)
}

function Get-CpuPct {
    $p = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor |
         Where-Object { $_.Name -eq '_Total' }
    if ($null -eq $p.PercentProcessorTime) { return $null }
    return [int]$p.PercentProcessorTime
}

function Get-PerfPct {
    try {
        $c = Get-Counter '\Processor Information(_Total)\% Processor Performance' -ErrorAction Stop
        return [math]::Round($c.CounterSamples[0].CookedValue, 1)
    } catch { return $null }
}

function Mediane($a) {
    $s = @($a | Sort-Object); $n = $s.Count
    if ($n -eq 0) { return $null }
    if ($n % 2 -eq 1) { return $s[[math]::Floor($n / 2)] }
    return [math]::Round(($s[$n / 2 - 1] + $s[$n / 2]) / 2, 1)
}

function Preleve([int]$n, [int]$pause) {
    $ram = @(); $cpu = @(); $perf = @()
    for ($i = 1; $i -le $n; $i++) {
        $r = Get-RamLibreMo; if ($null -eq $r) { Write-Output 'ECHEC-INSTRUMENT ram'; exit 1 }
        $c = Get-CpuPct;     if ($null -eq $c) { Write-Output 'ECHEC-INSTRUMENT cpu'; exit 1 }
        $p = Get-PerfPct;    if ($null -eq $p) { Write-Output 'ECHEC-INSTRUMENT perf'; exit 1 }
        $ram += $r; $cpu += $c; $perf += $p
        if ($i -lt $n -and $pause -gt 0) { Start-Sleep -Seconds $pause }
    }
    return [pscustomobject]@{ Ram = $ram; Cpu = $cpu; Perf = $perf }
}

# -----------------------------------------------------------------------------
# CALIBRATION — deux regimes dont on connait la reponse AVANT de mesurer.
# -----------------------------------------------------------------------------
# ⛔ CETTE FONCTION NE REND RIEN PAR LE PIPELINE, ET C'EST LE POINT.
# Premiere ecriture, le 11/09/2026 : elle narrait par Write-Output PUIS rendait son
# booleen de verdict par un `return`. En PowerShell les deux vont dans le MEME flux :
# l'appelant recevait un TABLEAU [lignes de narration..., booleen], toujours non
# vide, donc toujours VRAI.
# ⛔ La calibration serait passee MEME EN ECHOUANT — un instrument vert par
# construction, exactement le defaut que cet instrument existe pour interdire.
# ⚠ Repere parce que la narration n'apparaissait PAS a l'ecran : la sortie MANQUANTE
# etait le seul symptome, le code de sortie disait 0 et le releve avait l'air normal.
# Le verdict passe donc par une variable de portee script, jamais par le pipeline.
function Invoke-Calibration([int]$marge) {
    $script:CalibrationOk = $true
    Write-Output '--- CALIBRATION : separation des regimes, ici et maintenant ---'

    # ⛔ LA CHARGE DE CALIBRATION DOIT ETRE DEBRIDEE, ET C'EST UNE MESURE DU 11/09/2026.
    # Premiere forme : 12 `Start-Job`. Releve — 4,6 s rien que pour demarrer, puis une
    # charge qui RETOMBE. Seconde forme : 12 threads .NET. Releve — le processus
    # consommait 3,7 s de CPU sur 3 s de mur, la ou 12 cœurs en offrent 36.
    # ⇒ Windows BRIDE les threads de fond (PROCESS_POWER_THROTTLING_EXECUTION_SPEED),
    #   d'autant plus sur batterie. Le bridage retire : 34,2 s sur 3 s, et le compteur
    #   _Total monte a 100 %.
    # ⛔ UNE CHARGE DE CALIBRATION ELLE-MEME BRIDEE MESURE LE BRIDAGE, PAS L'INSTRUMENT.
    #   Sans ce debridage, la sonde conclut « l'instrument ne separe pas les regimes »
    #   alors que l'instrument est juste et que c'est la charge qui n'a pas eu lieu —
    #   un diagnostic qui envoie chercher le defaut a l'exact oppose de sa cause.
    if (-not ('ZwadjCharge' -as [type])) {
        Add-Type -TypeDefinition @"
using System; using System.Threading; using System.Runtime.InteropServices;
public static class ZwadjCharge {
  [StructLayout(LayoutKind.Sequential)]
  public struct Etat { public uint Version; public uint ControlMask; public uint StateMask; }
  [DllImport("kernel32.dll", SetLastError=true)]
  static extern bool SetProcessInformation(IntPtr h, int cls, ref Etat info, uint size);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  // classe 4 = ProcessPowerThrottling ; ControlMask 0x1 = EXECUTION_SPEED ;
  // StateMask 0x0 = bridage DESACTIVE pour ce processus.
  public static bool Debrider() {
    var s = new Etat(); s.Version = 1; s.ControlMask = 0x1; s.StateMask = 0x0;
    return SetProcessInformation(GetCurrentProcess(), 4, ref s, (uint)Marshal.SizeOf(typeof(Etat)));
  }
  private static volatile bool _stop = false;
  private static void Brule() { double x = 1.0; while (!_stop) { x = Math.Sqrt(x) + 1.0000001; } }
  public static Thread[] Demarrer(int n) {
    _stop = false; var t = new Thread[n];
    for (int i = 0; i < n; i++) { t[i] = new Thread(Brule); t[i].IsBackground = true; t[i].Start(); }
    return t;
  }
  public static void Arreter(Thread[] t) { _stop = true; foreach (var x in t) x.Join(2000); }
}
"@
    }

    $coeurs = [int]$env:NUMBER_OF_PROCESSORS
    if ($coeurs -lt 1) { $coeurs = 1 }

    $repos = Preleve 4 1
    $cpuRepos = Mediane $repos.Cpu
    $perfRepos = Mediane $repos.Perf

    $debride = [ZwadjCharge]::Debrider()
    $moi = Get-Process -Id $PID
    $cpu0 = $moi.TotalProcessorTime
    $chrono = [Diagnostics.Stopwatch]::StartNew()
    $fils = [ZwadjCharge]::Demarrer($coeurs)
    Start-Sleep -Seconds 1
    $charge = Preleve 4 1
    $chrono.Stop()
    $moi.Refresh()
    $cpuBrule = ($moi.TotalProcessorTime - $cpu0).TotalSeconds
    [ZwadjCharge]::Arreter($fils)

    $cpuCharge = Mediane $charge.Cpu
    $perfCharge = Mediane $charge.Perf
    $ecartCpu = $cpuCharge - $cpuRepos
    $ecartPerf = $perfCharge - $perfRepos
    $plafond = $coeurs * $chrono.Elapsed.TotalSeconds
    $rendement = if ($plafond -gt 0) { [math]::Round($cpuBrule / $plafond, 2) } else { 0 }

    Write-Output ("  coeurs charges         : {0}   bridage retire : {1}" -f $coeurs, $debride)
    Write-Output ("  charge REELLEMENT produite : {0} s de CPU sur un plafond de {1} s  (rendement {2})" -f [math]::Round($cpuBrule, 1), [math]::Round($plafond, 1), $rendement)
    Write-Output ("  CPU   repos -> charge  : {0} % -> {1} %   (ecart {2} pts, marge exigee {3})" -f $cpuRepos, $cpuCharge, $ecartCpu, $marge)
    Write-Output ("  PERF  repos -> charge  : {0} % -> {1} %   (ecart {2} pts)" -f $perfRepos, $perfCharge, $ecartPerf)

    # ⛔ D'ABORD : LA CHARGE A-T-ELLE EU LIEU ? Sans ce controle, une charge absente
    #   se lit comme un instrument aveugle — deux diagnostics opposes sur la meme sortie.
    if ($rendement -lt 0.5) {
        Write-Output ("  ✗ ECHEC-INSTRUMENT : la charge n'a PAS ete produite (rendement {0} < 0,5)." -f $rendement)
        Write-Output "    Ce n'est PAS un verdict sur l'instrument de mesure : c'est le generateur"
        Write-Output '    de charge qui a ete bride. Verifier le retour de Debrider() ci-dessus.'
        $script:CalibrationOk = $false
        Write-Output ''
        return
    }
    if ($ecartCpu -lt $marge) {
        Write-Output ("  ✗ L'INSTRUMENT CPU NE SEPARE PAS LES DEUX REGIMES ({0} pts < {1})." -f $ecartCpu, $marge)
        Write-Output '    La charge a bien eu lieu (rendement ci-dessus) : c''est donc bien'
        Write-Output '    l''instrument qui ne discrimine pas, ou la machine qui est deja saturee.'
        $script:CalibrationOk = $false
    }
    if ($ecartPerf -le 0) {
        Write-Output ("  ✗ L'INSTRUMENT DE BRIDAGE NE BOUGE PAS SOUS CHARGE ({0} pts)." -f $ecartPerf)
        Write-Output '    C''est le defaut exact qui avait fait ecarter CurrentClockSpeed le 10/09.'
        $script:CalibrationOk = $false
    }
    if ($script:CalibrationOk) { Write-Output '  ✓ les deux instruments separent repos et charge, sur une charge REELLE.' }
    Write-Output ''
}

$calibre = 'NON REJOUEE DANS CETTE INVOCATION (lancer -Calibrer)'
if ($Calibrer) {
    Invoke-Calibration $MargeCpu
    if (-not $script:CalibrationOk) {
        Write-Output 'ECHEC-CALIBRATION — la sonde ABANDONNE, elle ne mesure plus rien.'
        exit 1
    }
    $calibre = ('OUI, le {0:yyyy-MM-dd HH:mm}, marge exigee {1} pts' -f (Get-Date), $MargeCpu)
}

# -----------------------------------------------------------------------------
# LE RELEVE
# -----------------------------------------------------------------------------
$e = Preleve $Echantillons $PauseSecondes

$procs = Get-Process
$node = @($procs | Where-Object { $_.ProcessName -eq 'node' }).Count
$chrome = @($procs | Where-Object { $_.ProcessName -eq 'chrome' }).Count
$totalMo = [math]::Round((($procs | Measure-Object WorkingSet64 -Sum).Sum) / 1MB)

$bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
if ($null -eq $bat) { $src = 'SANS-BATTERIE'; $chargePct = 'NA' }
else {
    $src = if ($bat.BatteryStatus -eq 2) { 'SECTEUR' }
           elseif ($bat.BatteryStatus -eq 1) { 'BATTERIE' }
           else { "AUTRE-$($bat.BatteryStatus)" }
    $chargePct = $bat.EstimatedChargeRemaining
}
try {
    $ps = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes' -ErrorAction Stop
    $ovAc = $ps.ActiveOverlayAcPowerScheme; $ovDc = $ps.ActiveOverlayDcPowerScheme
    $ovMeme = if ($ovAc -eq $ovDc) { 'IDENTIQUES' } else { 'DIFFERENTS' }
} catch { $ovAc = 'ECHEC-INSTRUMENT'; $ovDc = 'ECHEC-INSTRUMENT'; $ovMeme = 'ECHEC-INSTRUMENT' }

$ramMed = Mediane $e.Ram

Write-Output "CALIBRATION_REJOUEE=$calibre"
Write-Output "HORODATAGE=$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "ECHANTILLONS=$Echantillons x $PauseSecondes s"
Write-Output "RAM_MEDIANE_MO=$ramMed"
Write-Output "RAM_BANDE_MO=$(($e.Ram | Measure-Object -Minimum).Minimum)-$(($e.Ram | Measure-Object -Maximum).Maximum)"
Write-Output "CPU_MEDIANE_PCT=$(Mediane $e.Cpu)"
Write-Output "CPU_BANDE_PCT=$(($e.Cpu | Measure-Object -Minimum).Minimum)-$(($e.Cpu | Measure-Object -Maximum).Maximum)"
Write-Output "PERF_MEDIANE_PCT=$(Mediane $e.Perf)   (>100 = turbo, donc non bride)"
Write-Output "ALIM_SOURCE=$src"
Write-Output "ALIM_CHARGE_PCT=$chargePct"
Write-Output "ALIM_OVERLAY_AC_DC=$ovMeme ($ovAc)"
Write-Output "NODE=$node"
Write-Output "CHROME=$chrome"
Write-Output "TOTAL_MO=$totalMo"
Write-Output "NB_PROCESSUS=$($procs.Count)"
Write-Output "BARRE_D273_MO=4579"
Write-Output "ECART_A_LA_BARRE_MO=$($ramMed - 4579)"
Write-Output '--- INVENTAIRE > 150 Mo (nom / nb / Mo) ---'
$procs | Group-Object ProcessName | ForEach-Object {
    [pscustomobject]@{ Nom = $_.Name; Nb = $_.Count; Mo = [math]::Round((($_.Group | Measure-Object WorkingSet64 -Sum).Sum) / 1MB) }
} | Where-Object { $_.Mo -gt 150 } | Sort-Object Mo -Descending |
    ForEach-Object { Write-Output "$($_.Nom) $($_.Nb) $($_.Mo)" }
