# Cinq passes de la suite client SUR SECTEUR, regime et PERF releves DEVANT chacune.
#
# POURQUOI CE FICHIER : le texte n'a traverse aucun interpreteur (D289, voie n°3).
# Ce n'est pas un instrument de campagne et il n'entre pas au depot : c'est le
# harnais de mesure du lot, jetable, son contenu est rapporte en fin de lot.
#
# ⛔ Pas de MOYENNE : la variance intrinseque mesuree est de 19 %, une moyenne la
# cacherait (consigne de Ko). Chaque passe rend SA ligne.
# ⚠ Chaque compteur rend AUSSI ce qu'il a parcouru, attendu A COTE (D290).

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$ErrorActionPreference = 'Continue'

$racine = 'C:\Users\benla\Desktop\MyProjct\Zwadj'
$journaux = Join-Path $PSScriptRoot 'passes'
if (-not (Test-Path $journaux)) { New-Item -ItemType Directory -Path $journaux -Force | Out-Null }
Set-Location $racine

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

$lignes = @()
for ($i = 1; $i -le 5; $i++) {
    $av = Get-Regime
    $log = Join-Path $journaux "client-secteur-$i.log"
    $sw = [diagnostics.stopwatch]::StartNew()
    # cmd redirige les DEUX flux : en PS 5.1, rediriger stderr d'un natif fabrique
    # des ErrorRecord et fausse $? (note de l'outil). cmd ne le fait pas.
    & cmd /c "pnpm --filter @zwadj/client run test > `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $sw.Stop()
    $ap = Get-Regime

    $contenu = Get-Content $log -Raw -Encoding UTF8
    $nbLignes = (Get-Content $log -Encoding UTF8).Count
    $timeouts = ([regex]::Matches($contenu, 'Test timed out in \d+ms')).Count
    $mTests = [regex]::Match($contenu, 'Tests\s+(\d+) passed \((\d+)\)')
    $mFich = [regex]::Match($contenu, 'Test Files\s+(\d+) passed \((\d+)\)')
    $mDuree = [regex]::Match($contenu, 'Duration\s+([\d.]+)s')
    $echecs = ([regex]::Matches($contenu, '(?m)^\s*FAIL\s')).Count

    $verdict = 'ILLISIBLE'
    if ($mTests.Success) { $verdict = "$($mTests.Groups[1].Value)/$($mTests.Groups[2].Value)" }

    $lignes += [pscustomobject]@{
        passe = $i
        regime = "$($av.alim) $($av.charge)%"
        PERF_av = $av.perf
        PERF_ap = $ap.perf
        RAM_av = $av.ram
        CPU_av = $av.cpu
        chrome = $av.chrome
        node_av = $av.node
        verdict = $verdict
        fichiers = $(if ($mFich.Success) { "$($mFich.Groups[1].Value)/$($mFich.Groups[2].Value)" } else { '?' })
        delais = $timeouts
        FAIL = $echecs
        duree_vitest = $(if ($mDuree.Success) { $mDuree.Groups[1].Value + 's' } else { '?' })
        duree_mur = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        code = $code
        lignes_lues = $nbLignes
    }
    Write-Output ("passe {0} : {1} · PERF {2} · {3} · delais {4} · FAIL {5} · vitest {6} · mur {7}s · code {8} · {9} lignes lues" -f `
        $i, $av.alim, $av.perf, $verdict, $timeouts, $echecs, $lignes[-1].duree_vitest, $lignes[-1].duree_mur, $code, $nbLignes)
}

Write-Output ''
Write-Output '===== TABLEAU, UNE LIGNE PAR PASSE (aucune moyenne) ====='
$lignes | Format-Table -AutoSize | Out-String -Width 220

Write-Output '===== CALIBRATION DE L''EXTRACTEUR, DEUX BRAS (D286) ====='
$t = Get-Content (Join-Path $journaux 'client-secteur-1.log') -Raw -Encoding UTF8
$posTests = ([regex]::Matches($t, 'Tests\s+\d+ passed')).Count
$posTimeout = ([regex]::Matches($t, 'Test timed out in 5000ms')).Count
$negTemoin = ([regex]::Matches($t, 'CE-MOTIF-N-EXISTE-PAS-DANS-LA-SORTIE')).Count
Write-Output ("  positif : le motif de verdict se trouve dans la sortie brute : {0}   (attendu >=1)" -f $posTests)
Write-Output ("  negatif : un motif absent rend bien zero                      : {0}   (attendu 0)" -f $negTemoin)
Write-Output ("  contexte : occurrences de « Test timed out in 5000ms »         : {0}" -f $posTimeout)
Write-Output ("  ⚠ le compteur de delais a parcouru {0} lignes sur la passe 1" -f (Get-Content (Join-Path $journaux 'client-secteur-1.log') -Encoding UTF8).Count)
Write-Output ''
Write-Output '===== ETAT A LA CLOTURE ====='
Get-Regime | Format-List | Out-String -Width 120
