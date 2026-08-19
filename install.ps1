$ErrorActionPreference = 'Stop'

$PluginName = 'dsh-plugin-multi-selection-comments'
$PluginId = 'multi-selection-comments'
$LegacyPluginName = 'dsh-plugin-quote-to-chat'
$PluginDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DshHomePath = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh' }
$ProfileModules = Join-Path $DshHomePath 'profiles\node_modules'
$PatchPath = Join-Path $DshHomePath 'profiles\web\cordis.patch.yml'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm was not found. Install Node.js first.'
}

Push-Location $PluginDir
try {
  npm install --no-audit --no-fund
  npm run check
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $ProfileModules | Out-Null
$TargetPath = Join-Path $ProfileModules $PluginName
if (Test-Path -LiteralPath $TargetPath) {
  $TargetItem = Get-Item -LiteralPath $TargetPath -Force
  if ($TargetItem.LinkType) {
    Remove-Item -LiteralPath $TargetPath -Force
  } else {
    throw "$TargetPath already exists and is not a link. Inspect it manually before continuing."
  }
}
New-Item -ItemType Junction -Path $TargetPath -Target $PluginDir | Out-Null

$LegacyTargetPath = Join-Path $ProfileModules $LegacyPluginName
if (Test-Path -LiteralPath $LegacyTargetPath) {
  $LegacyTargetItem = Get-Item -LiteralPath $LegacyTargetPath -Force
  if ($LegacyTargetItem.LinkType) {
    Remove-Item -LiteralPath $LegacyTargetPath -Force
  } else {
    Write-Warning "$LegacyTargetPath still exists and is not a link. Remove the legacy plugin manually."
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path $PatchPath) | Out-Null
if (-not (Test-Path -LiteralPath $PatchPath)) {
  [System.IO.File]::WriteAllText($PatchPath, "[]`r`n", [System.Text.UTF8Encoding]::new($false))
}

$LegacyEntryPattern = '(?ms)(?:^# dsh-plugin-quote-to-chat \(added by install\.ps1\)\r?\n)?^- insert:\r?\n    - id: quote-to-chat\r?\n      name: dsh-plugin-quote-to-chat\r?\n?'
$PatchText = [System.IO.File]::ReadAllText($PatchPath)
$MigratedPatchText = [regex]::Replace($PatchText, $LegacyEntryPattern, '')
if ($MigratedPatchText -ne $PatchText) {
  $RemainingLines = @($MigratedPatchText -split '\r?\n' | Where-Object { $_.Trim() -and -not $_.TrimStart().StartsWith('#') })
  if ($RemainingLines.Count -eq 0) {
    $MigratedPatchText = "[]`r`n"
  }
  [System.IO.File]::WriteAllText($PatchPath, $MigratedPatchText, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Select-String -LiteralPath $PatchPath -Pattern "name: $PluginName" -Quiet)) {
  $PatchLines = @(Get-Content -LiteralPath $PatchPath)
  $MeaningfulLines = @($PatchLines | Where-Object { $_.Trim() -and -not $_.TrimStart().StartsWith('#') })
  $EntryLines = @(
    "# $PluginName (added by install.ps1)",
    '- insert:',
    "    - id: $PluginId",
    "      name: $PluginName"
  )

  if ($MeaningfulLines.Count -eq 1 -and $MeaningfulLines[0].Trim() -eq '[]') {
    # Replace the empty YAML root instead of appending a second root node.
    $NextLines = @($PatchLines | Where-Object { $_.Trim() -ne '[]' }) + $EntryLines
  } else {
    $NextLines = $PatchLines + '' + $EntryLines
  }
  [System.IO.File]::WriteAllText($PatchPath, (($NextLines -join "`r`n") + "`r`n"), [System.Text.UTF8Encoding]::new($false))
}

Write-Host ''
Write-Host 'Installation complete. Stop and restart dsh web.'
Write-Host "Verify: dsh --profile web --dump-config | Select-String $PluginName"
