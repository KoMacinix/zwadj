# =============================================================================
# ECHANTILLONNEUR D'ETAT MACHINE — la machine a-t-elle tenu PENDANT la mesure ?
# =============================================================================
#   powershell -ExecutionPolicy Bypass -File neutralisation/echantillonneur-etat-machine.ps1 `
#              -Journal .neutralisation-journaux/etat.csv -Intervalle 30
#   ... -Resume .neutralisation-journaux/etat.csv      # relit un journal et le TRIE
#
# ⛔ POURQUOI IL EXISTE, ET LE FAIT QUI L'A IMPOSE. « La machine a tenu pendant la
# mesure » doit etre une MESURE, pas une inference entre deux extremites. La nuit du
# 09 au 10/09/2026, les deux bouts d'une campagne etaient nominaux — et huit heures
# de veille sur batterie critique tenaient entre les deux. Une sonde lancee avant et
# apres n'aurait jamais pu le voir : elle n'observe pas l'intervalle, elle l'encadre.
#
# ⚠ SA CALIBRATION EST CELLE DE LA SONDE. Il echantillonne exactement les memes
# quantites que `sonde-etat-machine.ps1` — c'est la sonde qu'on calibre (`-Calibrer`),
# avant la campagne, pas lui. Il n'a donc PAS de calibration propre, et le dire est
# le contraire de l'omettre : un instrument qui se tairait la-dessus laisserait
# croire qu'il en porte une.
#
# ⚠ COUT A DECLARER : un processus powershell resident et un appel WMI toutes les
# $Intervalle secondes. C'est une charge AJOUTEE a la campagne qu'il observe. Sous
# 30 s elle cesse d'etre negligeable — et un observateur qui perturbe ce qu'il
# observe est l'instrument ECARTE au rang 6.
#
# ⚠ HORODATAGE COMPLET, ET C'EST UN CORRECTIF DU 11/09/2026. La premiere forme
# n'ecrivait que HH:mm:ss : un trou de huit heures et un trou de huit secondes s'y
# lisaient pareil, dans l'instrument meme qui existe a cause d'une nuit.
# =============================================================================

param(
    [Parameter(Mandatory = $true, ParameterSetName = 'Ecrire')]
    [string]$Journal,
    [Parameter(ParameterSetName = 'Ecrire')]
    [int]$Intervalle = 30,
    [Parameter(Mandatory = $true, ParameterSetName = 'Lire')]
    [string]$Resume
)

# ⛔ Meme motif que la sonde : sans cette ligne, les glyphes sortent en « ? » a la
# console et en « � » dans un journal redirige — c'est-a-dire quand ils servent
# de preuve (D268, porte a PowerShell le 11/09/2026).
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

# -----------------------------------------------------------------------------
# LES DEUX DETECTEURS — extraits en fonctions pour etre CALIBRABLES.
# ⛔ Tant qu'ils vivaient en ligne dans la branche de lecture, rien ne pouvait leur
#   soumettre un cas dont la reponse etait connue : ils etaient muets par
#   construction, au sens exact du rang 6.
# -----------------------------------------------------------------------------
function Get-Transitions($serie) {
    $r = @()
    for ($i = 1; $i -lt $serie.Count; $i++) {
        if ($serie[$i].alim -ne $serie[$i - 1].alim) {
            $r += ("{0} : {1} → {2} (batterie {3} %)" -f $serie[$i].horodatage, $serie[$i - 1].alim, $serie[$i].alim, $serie[$i].charge_pct)
        }
    }
    return ,$r
}

function Get-Trous($serie) {
    $ecarts = @()
    for ($i = 1; $i -lt $serie.Count; $i++) {
        $ecarts += ([datetime]::Parse($serie[$i].horodatage) - [datetime]::Parse($serie[$i - 1].horodatage)).TotalSeconds
    }
    $r = @()
    if ($ecarts.Count -eq 0) { return ,$r }
    $median = ($ecarts | Sort-Object)[[math]::Floor($ecarts.Count / 2)]
    for ($i = 0; $i -lt $ecarts.Count; $i++) {
        if ($median -gt 0 -and $ecarts[$i] -gt 3 * $median) {
            $r += ("{0} : {1} s sans echantillon (cadence mediane {2} s)" -f $serie[$i + 1].horodatage, [math]::Round($ecarts[$i]), [math]::Round($median))
        }
    }
    return ,$r
}

# -----------------------------------------------------------------------------
# CALIBRATION DU LECTEUR — deux series dont la reponse est connue AVANT lecture.
# Elle tourne a CHAQUE `-Resume`, et ne coute rien : tout est en memoire.
# ⚠ LE CAS NEGATIF EST AUSSI OBLIGATOIRE QUE LE POSITIF. Un detecteur qui rendrait
#   « 1 transition » sur TOUTE serie passerait le cas positif seul, et declarerait
#   non homogene une fenetre parfaitement propre — l'inverse exact du defaut, avec
#   la meme consequence : on cesse de le croire.
# -----------------------------------------------------------------------------
function Invoke-CalibrationLecteur {
    $script:LecteurOk = $true
    $t0 = [datetime]'2026-09-09 22:00:00'
    $homogene = @(); $heurte = @()
    for ($i = 0; $i -lt 8; $i++) {
        $h = $t0.AddSeconds(30 * $i)
        $homogene += [pscustomobject]@{ horodatage = $h.ToString('yyyy-MM-dd HH:mm:ss'); alim = 'SECTEUR'; charge_pct = 100 }
        # Serie HEURTEE : exactement UNE transition et exactement UN trou de 8 h.
        $hh = if ($i -lt 4) { $t0.AddSeconds(30 * $i) } else { $t0.AddHours(8).AddSeconds(30 * $i) }
        $heurte += [pscustomobject]@{ horodatage = $hh.ToString('yyyy-MM-dd HH:mm:ss'); alim = $(if ($i -lt 4) { 'SECTEUR' } else { 'BATTERIE' }); charge_pct = $(if ($i -lt 4) { 100 } else { 7 }) }
    }
    $verifs = @(
        @{ nom = 'negatif : serie homogene → 0 transition'; vu = (Get-Transitions $homogene).Count; attendu = 0 },
        @{ nom = 'negatif : serie homogene → 0 trou';       vu = (Get-Trous $homogene).Count;       attendu = 0 },
        @{ nom = 'positif : bascule secteur→batterie';      vu = (Get-Transitions $heurte).Count;   attendu = 1 },
        @{ nom = 'positif : trou de huit heures';           vu = (Get-Trous $heurte).Count;         attendu = 1 }
    )
    foreach ($v in $verifs) {
        if ($v.vu -ne $v.attendu) {
            Write-Output ("   ✗ {0} : {1} au lieu de {2}" -f $v.nom, $v.vu, $v.attendu)
            $script:LecteurOk = $false
        } else {
            Write-Output ("   ✓ {0}" -f $v.nom)
        }
    }
}

# -----------------------------------------------------------------------------
# LECTURE — un CSV de 2 000 lignes que personne n'ouvre ne mesure rien.
# -----------------------------------------------------------------------------
if ($PSCmdlet.ParameterSetName -eq 'Lire') {
    if (-not (Test-Path $Resume)) { Write-Output "ECHEC-INSTRUMENT journal introuvable : $Resume"; exit 1 }
    Write-Output 'CALIBRATION DU LECTEUR — quatre cas dont la reponse est connue d''avance'
    Invoke-CalibrationLecteur
    if (-not $script:LecteurOk) { Write-Output 'ECHEC-CALIBRATION — le lecteur ABANDONNE.'; exit 1 }

    $l = Import-Csv -Path $Resume -Delimiter ';'
    if ($l.Count -eq 0) { Write-Output 'ECHEC-INSTRUMENT journal VIDE'; exit 1 }

    $casses = @($l | Where-Object { $_.ram_libre_mo -eq 'ECHEC-INSTRUMENT' })
    $bons = @($l | Where-Object { $_.ram_libre_mo -ne 'ECHEC-INSTRUMENT' })
    Write-Output "ECHANTILLONS=$($l.Count)   dont ECHEC-INSTRUMENT=$($casses.Count)"
    if ($bons.Count -eq 0) { Write-Output 'ECHEC-INSTRUMENT : aucun echantillon exploitable'; exit 1 }

    $t0 = [datetime]::Parse($bons[0].horodatage)
    $t1 = [datetime]::Parse($bons[-1].horodatage)
    Write-Output ("FENETRE={0:yyyy-MM-dd HH:mm:ss} → {1:yyyy-MM-dd HH:mm:ss}   ({2} min)" -f $t0, $t1, [math]::Round(($t1 - $t0).TotalMinutes, 1))

    $ram = $bons | ForEach-Object { [int]$_.ram_libre_mo }
    $cpu = $bons | ForEach-Object { [int]$_.cpu_pct }
    Write-Output "RAM_LIBRE_MO min=$(($ram | Measure-Object -Minimum).Minimum) max=$(($ram | Measure-Object -Maximum).Maximum)"
    Write-Output "CPU_PCT max=$(($cpu | Measure-Object -Maximum).Maximum)"
    Write-Output "NODE max=$(($bons | ForEach-Object { [int]$_.node } | Measure-Object -Maximum).Maximum)"

    # ⛔ LES DEUX CHOSES QU'UN ENCADREMENT NE PEUT PAS VOIR, ET POUR LESQUELLES CE
    #   FICHIER EXISTE : un changement d'ALIMENTATION, et un TROU dans la serie.
    $transitions = Get-Transitions $bons
    Write-Output "TRANSITIONS_ALIMENTATION=$($transitions.Count)"
    $transitions | ForEach-Object { Write-Output "   $_" }

    $trous = Get-Trous $bons
    Write-Output "TROUS_DANS_LA_SERIE=$($trous.Count)   (un trou = veille, gel, ou echantillonneur tue)"
    $trous | ForEach-Object { Write-Output "   $_" }

    if ($transitions.Count -or $trous.Count -or $casses.Count) {
        Write-Output '⚠ LA FENETRE N''EST PAS HOMOGENE — toute duree mesuree dedans porte sur DEUX regimes.'
        exit 2
    }
    Write-Output '✓ FENETRE HOMOGENE : une seule source d''alimentation, aucune interruption de serie.'
    exit 0
}

# -----------------------------------------------------------------------------
# ECRITURE
# -----------------------------------------------------------------------------
$dossier = Split-Path -Parent $Journal
if ($dossier -and -not (Test-Path $dossier)) { New-Item -ItemType Directory -Path $dossier -Force | Out-Null }

'horodatage;ram_libre_mo;cpu_pct;perf_pct;alim;charge_pct;node;chrome;nb_proc' |
    Out-File -FilePath $Journal -Encoding utf8

Write-Output "ECHANTILLONNAGE vers $Journal toutes les $Intervalle s — Ctrl+C pour arreter."
while ($true) {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $ram = [math]::Round($os.FreePhysicalMemory / 1024)
        $cpu = [int](Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor |
                     Where-Object { $_.Name -eq '_Total' }).PercentProcessorTime
        $perf = [math]::Round((Get-Counter '\Processor Information(_Total)\% Processor Performance' `
                     -ErrorAction Stop).CounterSamples[0].CookedValue, 1)
        $bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
        $alim = if ($null -eq $bat) { 'SANS-BATTERIE' }
                elseif ($bat.BatteryStatus -eq 2) { 'SECTEUR' }
                elseif ($bat.BatteryStatus -eq 1) { 'BATTERIE' }
                else { "AUTRE-$($bat.BatteryStatus)" }
        $ch = if ($null -eq $bat) { 'NA' } else { $bat.EstimatedChargeRemaining }
        $procs = Get-Process
        $node = @($procs | Where-Object { $_.ProcessName -eq 'node' }).Count
        $chrome = @($procs | Where-Object { $_.ProcessName -eq 'chrome' }).Count
        '{0:yyyy-MM-dd HH:mm:ss};{1};{2};{3};{4};{5};{6};{7};{8}' -f (Get-Date), $ram, $cpu, $perf, $alim, $ch, $node, $chrome, $procs.Count |
            Add-Content -Path $Journal -Encoding utf8
    } catch {
        # ⚠ Un champ vide se lirait « rien a signaler ». On ecrit l'echec (rang 6).
        '{0:yyyy-MM-dd HH:mm:ss};ECHEC-INSTRUMENT;;;;;;;' -f (Get-Date) | Add-Content -Path $Journal -Encoding utf8
    }
    Start-Sleep -Seconds $Intervalle
}
