# =============================================================================
# RELEVE DU RANG 14 (D291) - PERF ET LA DUREE, A REGIME CONSTANT
# =============================================================================
# Usage, depuis la RACINE du depot, par l'outil PowerShell (NO_COLOR=1, comme D290),
# en AVANT-PLAN (D288) :
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs/preuves/D291/releve/releve-perf-duree.ps1 -CalibrerExtracteur
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs/preuves/D291/releve/releve-perf-duree.ps1 -Cycles 1,2,3
#   powershell -NoProfile -ExecutionPolicy Bypass -File docs/preuves/D291/releve/releve-perf-duree.ps1 -Cycles 4,5,6
#
# POURQUOI CE FICHIER EXISTE : c'est la PROCEDURE du releve de D291, versee comme PREUVE avec
# ses journaux (regle des preuves, D291). Ce n'est PAS un instrument de campagne, et il ne se
# promeut pas : ses choix (repos de 60 s, 6 cycles) sont ceux d'UN releve, pas une norme.
#
# LE PROTOCOLE EST DECIDE AILLEURS : ZWADJ_CONTINUITE.md, section D291, ecrit et commite AVANT
# la premiere passe. Ce fichier l'execute ; il ne le decide pas.
#
# PLAN FIXE - 6 cycles, ordre de l'observateur ABBAAB (contre une derive lineaire) :
#   cycle       : 1   2   3   4   5   6
#   observateur : OFF ON  ON  OFF OFF ON
# Un cycle : [observateur demarre si ON] -> repos 60 s -> passe A (APRES REPOS)
#            -> passe B (ENCHAINEE : meme sequence que passes_secteur.ps1) -> [observateur arrete]
#
# MESURE PAR PASSE, IDENTIQUE A passes_secteur.ps1 (D290) POUR RESTER COMPARABLE : Get-Regime
# avant ET apres, recopie a l'identique ; mur autour du seul pnpm ; cmd /c pour les deux flux.
# EN PLUS : horodatages de debut et de fin a la milliseconde (pour decouper le journal de
# l'observateur), et un extracteur qui lit AUSSI une suite ROUGE (« N failed | M passed (T) ») -
# celui de D290 ne lisait que « N passed (N) ».
#
# CALIBRATION DE L'EXTRACTEUR, DEUX BRAS, SUR DES SORTIES REELLES (D286), ABANDON SI UN BRAS MANQUE :
#   positif : calibration/delai.log, produit par vitest (meme version, meme outil) sur un test
#             qui ne se resout jamais -> au moins un delai, verdict rouge 0 passed / 1 failed (1).
#   negatif : docs/preuves/D290/passes/client-secteur-1.log -> zero delai, zero failed,
#             passed = total > 0.
# ARRET : regime non SECTEUR devant une passe (point 6 du critere) ; journal deja present.
# =============================================================================
param(
    [int[]]$Cycles = @(),
    [switch]$CalibrerExtracteur
)

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$ErrorActionPreference = 'Stop'

if (-not (Test-Path 'pnpm-workspace.yaml')) { throw 'ARRET : a lancer depuis la racine du depot' }
$racine = (Resolve-Path .).Path
$dossier = Join-Path $racine 'docs\preuves\D291\releve'
$passes = Join-Path $dossier 'passes'
$csv = Join-Path $dossier 'releve.csv'
$ech = Join-Path $racine 'neutralisation\echantillonneur-etat-machine.ps1'
$REPOS = 60
$plan = @{ 1 = 'OFF'; 2 = 'ON'; 3 = 'ON'; 4 = 'OFF'; 5 = 'OFF'; 6 = 'ON' }
if (-not (Test-Path $passes)) { New-Item -ItemType Directory -Path $passes -Force | Out-Null }

# --- recopie A L'IDENTIQUE de passes_secteur.ps1 (D290), lignes 19-40 ---
function Get-Regime {
    $b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    $perf = (Get-Counter '\Processor Information(_Total)\% Processor Performance' -ErrorAction Stop).CounterSamples[0].CookedValue
    $os = Get-CimInstance Win32_OperatingSystem
    $alim = 'SANS-BATTERIE'
    if ($null -ne $b) {
        if ($b.BatteryStatus -eq 2) { $alim = 'SECTEUR' }
        elseif ($b.BatteryStatus -eq 1) { $alim = 'BATTERIE' }
        else { $alim = "AUTRE-$($b.BatteryStatus)" }
    }
    $charge = 'NA'
    if ($null -ne $b) { $charge = $b.EstimatedChargeRemaining }
    return [pscustomobject]@{
        alim = $alim
        charge = $charge
        perf = [math]::Round($perf, 1)
        ram = [math]::Round($os.FreePhysicalMemory / 1024)
        cpu = [int](Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq '_Total' }).PercentProcessorTime
        node = @(Get-Process -Name node -ErrorAction SilentlyContinue).Count
        chrome = @(Get-Process -Name chrome -ErrorAction SilentlyContinue).Count
    }
}

function Lire-Journal([string]$log) {
    $brut = [IO.File]::ReadAllText($log, [Text.Encoding]::UTF8)
    $lignes = ($brut -split "`n").Count
    $esc = ([regex]::Matches($brut, [string][char]27)).Count
    $t = [regex]::Replace($brut, "\x1b\[[0-9;]*m", '')
    $delais = ([regex]::Matches($t, 'Test timed out in \d+ms')).Count
    $failed = 0; $passed = 0; $total = 0; $verdict = 'ILLISIBLE'
    $mT = [regex]::Match($t, '(?m)^\s*Tests\s+(.+?)\s*$')
    if ($mT.Success) {
        $s = $mT.Groups[1].Value
        $mf = [regex]::Match($s, '(\d+) failed'); if ($mf.Success) { $failed = [int]$mf.Groups[1].Value }
        $mp = [regex]::Match($s, '(\d+) passed'); if ($mp.Success) { $passed = [int]$mp.Groups[1].Value }
        $mt = [regex]::Match($s, '\((\d+)\)'); if ($mt.Success) { $total = [int]$mt.Groups[1].Value }
        $verdict = "$passed/$total"
        if ($failed -gt 0) { $verdict = "$verdict ($failed failed)" }
    }
    $mD = [regex]::Match($t, 'Duration\s+([\d.]+)(ms|s)')
    $duree = 'ILLISIBLE'
    if ($mD.Success) {
        $v = [double]::Parse($mD.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
        if ($mD.Groups[2].Value -eq 'ms') { $v = $v / 1000 }
        $duree = [math]::Round($v, 2)
    }
    return [pscustomobject]@{ lignes = $lignes; esc = $esc; delais = $delais; failed = $failed; passed = $passed; total = $total; verdict = $verdict; duree = $duree }
}

if ($CalibrerExtracteur) {
    $calib = Join-Path $racine 'docs\preuves\D291\calibration'
    $logPos = Join-Path $calib 'delai.log'
    if (Test-Path $logPos) { throw "ARRET : $logPos existe deja" }
    $vitest = Join-Path $racine 'apps\client\node_modules\.bin\vitest.CMD'
    & cmd /c "`"$vitest`" run --root `"$calib`" --globals --testTimeout 100 > `"$logPos`" 2>&1"
    $codeCalib = $LASTEXITCODE
    $cache = Join-Path $calib 'node_modules'
    if (Test-Path $cache) { Remove-Item -Recurse -Force $cache }
    $pos = Lire-Journal $logPos
    $neg = Lire-Journal (Join-Path $racine 'docs\preuves\D290\passes\client-secteur-1.log')
    $okPos = ($codeCalib -ne 0) -and ($pos.delais -ge 1) -and ($pos.failed -eq 1) -and ($pos.passed -eq 0) -and ($pos.total -eq 1)
    $okNeg = ($neg.delais -eq 0) -and ($neg.failed -eq 0) -and ($neg.total -gt 0) -and ($neg.passed -eq $neg.total)
    Write-Output '===== CALIBRATION DE L''EXTRACTEUR, DEUX BRAS, SORTIES REELLES ====='
    Write-Output ("  positif : code vitest {0} (attendu non nul) |delais {1} (attendu >= 1) |verdict {2} (attendu 0/1 (1 failed)) |ESC {3} |{4} lignes parcourues -> {5}" -f $codeCalib, $pos.delais, $pos.verdict, $pos.esc, $pos.lignes, $(if ($okPos) { 'OK' } else { 'MANQUE' }))
    Write-Output ("  negatif : delais {0} (attendu 0) |verdict {1} (attendu passed = total > 0) |ESC {2} |{3} lignes parcourues -> {4}" -f $neg.delais, $neg.verdict, $neg.esc, $neg.lignes, $(if ($okNeg) { 'OK' } else { 'MANQUE' }))
    if ($pos.failed -gt 0) { Write-Output ("  occurrences de delai par test en echec, sur le cas connu : {0}" -f ($pos.delais / $pos.failed)) }
    if (-not ($okPos -and $okNeg)) { Write-Output 'ABANDON : un bras de la calibration manque son verdict'; exit 2 }
    exit 0
}

function Passe([int]$cycle, [string]$position, [string]$obs) {
    $av = Get-Regime
    if ($av.alim -ne 'SECTEUR') { throw "ARRET : regime $($av.alim) devant la passe c$cycle-$position (point 6 du critere)" }
    $log = Join-Path $passes ("c{0}-{1}-{2}.log" -f $cycle, $position, $obs)
    if (Test-Path $log) { throw "ARRET : $log existe deja" }
    $debut = Get-Date
    $sw = [diagnostics.stopwatch]::StartNew()
    & cmd /c "pnpm --filter @zwadj/client run test > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $sw.Stop()
    $fin = Get-Date
    $ap = Get-Regime
    $j = Lire-Journal $log
    $ligne = [pscustomobject]@{
        cycle = $cycle; position = $position; observateur = $obs
        debut = $debut.ToString('yyyy-MM-dd HH:mm:ss.fff'); fin = $fin.ToString('yyyy-MM-dd HH:mm:ss.fff')
        alim_av = $av.alim; charge_av = $av.charge; perf_av = $av.perf; perf_ap = $ap.perf
        ram_av = $av.ram; cpu_av = $av.cpu; node_av = $av.node; chrome_av = $av.chrome; alim_ap = $ap.alim
        verdict = $j.verdict; failed = $j.failed; passed = $j.passed; total = $j.total; delais = $j.delais; esc = $j.esc
        duree_vitest = $j.duree; mur = [math]::Round($sw.Elapsed.TotalSeconds, 2); code = $code; lignes_lues = $j.lignes
    }
    $ligne | Export-Csv -Path $csv -Append -NoTypeInformation -Encoding UTF8 -Delimiter ';'
    Write-Output ("c{0}-{1} obs {2} |{3} {4}% |PERF av {5} ap {6} |RAM {7} |CPU {8} |node {9} |chrome {10} |{11} |delais {12} |vitest {13}s |mur {14}s |code {15} |{16} lignes" -f `
        $cycle, $position, $obs, $av.alim, $av.charge, $av.perf, $ap.perf, $av.ram, $av.cpu, $av.node, $av.chrome, $j.verdict, $j.delais, $j.duree, $ligne.mur, $code, $j.lignes)
}

foreach ($c in $Cycles) {
    if (-not $plan.ContainsKey($c)) { throw "ARRET : cycle $c hors du plan" }
    $obs = $plan[$c]
    $proc = $null
    if ($obs -eq 'ON') {
        $journalEch = Join-Path $dossier "ech-c$c.csv"
        if (Test-Path $journalEch) { throw "ARRET : $journalEch existe deja" }
        $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ech, '-Journal', $journalEch, '-Intervalle', '1') -WindowStyle Hidden -PassThru
    }
    Write-Output ("cycle {0} |observateur {1} |repos {2} s a partir de {3}" -f $c, $obs, $REPOS, (Get-Date -Format 'HH:mm:ss'))
    Start-Sleep -Seconds $REPOS
    Passe $c 'A' $obs
    Passe $c 'B' $obs
    if ($null -ne $proc) {
        Stop-Process -Id $proc.Id -Force
        $proc.WaitForExit(10000) | Out-Null
    }
}
if ($Cycles.Count -gt 0) {
    $cl = Get-Regime
    Write-Output ("cloture : {0} {1}% |PERF {2} |RAM {3} |CPU {4} |node {5} |chrome {6} |{7}" -f $cl.alim, $cl.charge, $cl.perf, $cl.ram, $cl.cpu, $cl.node, $cl.chrome, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
}
