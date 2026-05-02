param(
  [string]$ManifestPath = "docs/generated/study-narration-manifest.json",
  [string]$SelectionTsvPath = "",
  [string]$VoiceName = "Microsoft Huihui Desktop",
  [int]$Rate = -1,
  [int]$Volume = 100,
  [switch]$OnlyMissing,
  [switch]$Overwrite,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

function Resolve-ProjectPath {
  param([string]$RelativePath)

  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\$RelativePath"))
}

function Get-SelectionMap {
  param([string]$AbsoluteSelectionPath)

  if ([string]::IsNullOrWhiteSpace($AbsoluteSelectionPath) -or -not (Test-Path -LiteralPath $AbsoluteSelectionPath)) {
    return @{
      ClipKeys = @{}
      LessonIds = @{}
    }
  }

  $selectionRows = Import-Csv -LiteralPath $AbsoluteSelectionPath -Delimiter "`t" -Encoding UTF8
  $selectionMap = @{
    ClipKeys = @{}
    LessonIds = @{}
  }

  foreach ($row in $selectionRows) {
    if (-not $row.lessonId) {
      continue
    }

    $selectionMap.LessonIds["$($row.lessonId)"] = $true

    if (-not $row.cardId) {
      continue
    }

    $selectionMap.ClipKeys["$($row.lessonId)/$($row.cardId)"] = $true
  }

  return $selectionMap
}

Add-Type -AssemblyName System.Speech

$absoluteManifestPath = Resolve-ProjectPath $ManifestPath

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "Manifest not found: $absoluteManifestPath"
}

$selectionMap = @{
  ClipKeys = @{}
  LessonIds = @{}
}

if (-not [string]::IsNullOrWhiteSpace($SelectionTsvPath)) {
  $absoluteSelectionPath = Resolve-ProjectPath $SelectionTsvPath
  $selectionMap = Get-SelectionMap $absoluteSelectionPath
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$entries = @($manifest.entries)

if ($OnlyMissing) {
  $entries = @($entries | Where-Object { -not $_.hasAudioAsset })
}

if ($selectionMap.ClipKeys.Count -gt 0 -or $selectionMap.LessonIds.Count -gt 0) {
  $entries = @(
    $entries | Where-Object {
      $selectionMap.ClipKeys.ContainsKey("$($_.lessonId)/$($_.cardId)") -or
      $selectionMap.LessonIds.ContainsKey("$($_.lessonId)")
    }
  )
}

if ($entries.Count -eq 0) {
  Write-Host "No study narration entries matched current filters."
  exit 0
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$availableVoices = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })

if ($VoiceName -and ($availableVoices -contains $VoiceName)) {
  $synth.SelectVoice($VoiceName)
} elseif ($availableVoices.Count -gt 0) {
  $VoiceName = $availableVoices[0]
  $synth.SelectVoice($VoiceName)
} else {
  throw "No installed system voices were found."
}

$synth.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
$synth.Volume = [Math]::Max(0, [Math]::Min(100, $Volume))

$generatedCount = 0
$skippedCount = 0
$failedCount = 0

Write-Host "Using voice: $VoiceName"
Write-Host "Matched entries: $($entries.Count)"

foreach ($entry in $entries) {
  $relativeTarget = [string]$entry.expectedAssetPath
  if ([string]::IsNullOrWhiteSpace($relativeTarget)) {
    $failedCount += 1
    Write-Warning "Missing target path for $($entry.lessonId)/$($entry.cardId)"
    continue
  }

  $relativeWaveTarget = [System.IO.Path]::ChangeExtension($relativeTarget, ".wav")
  $absoluteWaveTarget = Resolve-ProjectPath $relativeWaveTarget
  $targetDirectory = Split-Path -Parent $absoluteWaveTarget

  if ((Test-Path -LiteralPath $absoluteWaveTarget) -and -not $Overwrite) {
    $skippedCount += 1
    Write-Host "Skip existing: $relativeWaveTarget"
    continue
  }

  if ($WhatIf) {
    $generatedCount += 1
    Write-Host "Plan generate: $relativeWaveTarget"
    continue
  }

  try {
    if (-not (Test-Path -LiteralPath $targetDirectory)) {
      New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    }

    $text = [string]$entry.narrationText

    if ([string]::IsNullOrWhiteSpace($text)) {
      throw "Narration text is empty."
    }

    $synth.SetOutputToWaveFile($absoluteWaveTarget)
    $synth.Speak($text)
    $synth.SetOutputToNull()
    $generatedCount += 1
    Write-Host "Generated: $relativeWaveTarget"
  } catch {
    try {
      $synth.SetOutputToNull()
    } catch {
      # Ignore secondary cleanup failures.
    }

    $failedCount += 1
    Write-Warning "Failed: $relativeWaveTarget :: $($_.Exception.Message)"
  }
}

$synth.Dispose()

Write-Host "Generated $generatedCount narration clips."
Write-Host "Skipped $skippedCount existing clips."

if ($failedCount -gt 0) {
  throw "Failed to generate $failedCount narration clips."
}
