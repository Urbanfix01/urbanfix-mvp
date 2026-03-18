param(
  [string]$Project = 'urbanfix-web',
  [string]$ProductionDomain = 'https://www.urbanfix.com.ar',
  [string]$CheckPath = '/tecnicos',
  [int]$PreviewTimeoutSeconds = 300,
  [int]$ProductionTimeoutSeconds = 600,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-CommandCapture([string]$FilePath, [string[]]$Arguments) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & $FilePath @Arguments 2>&1 | ForEach-Object { $_.ToString() }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  $text = ($output | Out-String).TrimEnd()
  if ($exitCode -ne 0) {
    $rendered = "$FilePath $($Arguments -join ' ')"
    throw "Command failed: $rendered`n$text"
  }
  return $text
}

function Invoke-CommandPassthrough([string]$FilePath, [string[]]$Arguments) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $FilePath @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0) {
    $rendered = "$FilePath $($Arguments -join ' ')"
    throw "Command failed: $rendered"
  }
}

function Get-FirstDeploymentUrl([string]$Environment, [string]$Status = 'READY') {
  $output = Invoke-CommandCapture 'npx' @('vercel', 'list', $Project, '--environment', $Environment, '--status', $Status)
  foreach ($line in ($output -split "`r?`n")) {
    if ($line -match 'https://\S+\.vercel\.app') {
      return $matches[0]
    }
  }
  return $null
}

function Wait-ForDeploymentUrlChange(
  [string]$Environment,
  [string]$PreviousUrl,
  [int]$TimeoutSeconds,
  [string]$Status = 'READY'
) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $current = Get-FirstDeploymentUrl -Environment $Environment -Status $Status
    if ($current -and $current -ne $PreviousUrl) {
      return $current
    }
    Start-Sleep -Seconds 10
  } while ((Get-Date) -lt $deadline)

  throw "Timed out waiting for a new $Environment deployment."
}

function Wait-ForReadyDeployment([string]$DeploymentUrl, [int]$TimeoutSeconds) {
  Invoke-CommandPassthrough 'npx' @('vercel', 'inspect', $DeploymentUrl, '--wait', '--timeout', "${TimeoutSeconds}s")
}

function Get-GitAheadBehind() {
  $counts = Invoke-CommandCapture 'git' @('rev-list', '--left-right', '--count', 'HEAD...origin/main')
  if ($counts -match '^\s*(\d+)\s+(\d+)\s*$') {
    return [pscustomobject]@{
      Ahead  = [int]$matches[1]
      Behind = [int]$matches[2]
    }
  }
  throw "Could not parse git ahead/behind counts: $counts"
}

function Get-LiveChunkPath([string]$BaseUrl, [string]$Path) {
  $prefix = if ($Path.StartsWith('/')) { '' } else { '/' }
  $uri = "$BaseUrl$prefix$Path?ts=$([guid]::NewGuid().ToString())"
  $response = Invoke-WebRequest -UseBasicParsing $uri
  $html = $response.Content
  $match = [regex]::Match($html, '/_next/static/chunks/app/tecnicos/page-[^"'' ]+\.js')
  if ($match.Success) {
    return $match.Value
  }
  return $null
}

Write-Step 'Validating Vercel authentication'
$vercelUser = Invoke-CommandCapture 'npx' @('vercel', 'whoami')
Write-Host "Vercel user: $vercelUser"

Write-Step 'Fetching origin/main'
Invoke-CommandPassthrough 'git' @('fetch', 'origin', 'main')

$currentBranch = Invoke-CommandCapture 'git' @('branch', '--show-current')
$gitStatus = Invoke-CommandCapture 'git' @('status', '--porcelain')
$aheadBehind = Get-GitAheadBehind

if ($DryRun) {
  if ($currentBranch -ne 'main') {
    Write-Warning "Current branch is '$currentBranch'. The real deploy script expects 'main'."
  }
  if ($gitStatus) {
    Write-Warning 'Worktree is dirty. A real deploy would stop here.'
  }
  if ($aheadBehind.Behind -gt 0) {
    Write-Warning "Local main is behind origin/main by $($aheadBehind.Behind) commits."
  }
} else {
  if ($currentBranch -ne 'main') {
    throw "Deploy must run from branch 'main'. Current branch: $currentBranch"
  }
  if ($gitStatus) {
    throw 'Worktree is dirty. Commit or stash your changes before running web:deploy.'
  }
  if ($aheadBehind.Behind -gt 0) {
    throw "Local main is behind origin/main by $($aheadBehind.Behind) commits. Pull/rebase before deploying."
  }
  if ($aheadBehind.Ahead -eq 0) {
    throw 'No local commits are waiting to be pushed. Nothing new to deploy.'
  }
}

Write-Step 'Reading current deployment state'
$currentProductionUrl = Get-FirstDeploymentUrl -Environment 'production' -Status 'READY'
$currentPreviewUrl = Get-FirstDeploymentUrl -Environment 'preview' -Status 'READY'
$currentLiveChunk = $null
try {
  $currentLiveChunk = Get-LiveChunkPath -BaseUrl $ProductionDomain -Path $CheckPath
} catch {
  Write-Warning "Could not read public chunk from $ProductionDomain$CheckPath"
}

Write-Host "Current production deployment: $currentProductionUrl"
Write-Host "Current preview deployment:    $currentPreviewUrl"
if ($currentLiveChunk) {
  Write-Host "Current public chunk:          $currentLiveChunk"
}

if ($DryRun) {
  Write-Step 'Dry run finished'
  return
}

Write-Step 'Running local web build'
Invoke-CommandPassthrough 'npm' @('run', 'web:build')

Write-Step 'Pushing main'
Invoke-CommandPassthrough 'git' @('push', 'origin', 'main')

Write-Step 'Waiting for the new preview deployment'
$newPreviewUrl = Wait-ForDeploymentUrlChange -Environment 'preview' -PreviousUrl $currentPreviewUrl -TimeoutSeconds $PreviewTimeoutSeconds
Write-Host "New preview deployment: $newPreviewUrl"
Wait-ForReadyDeployment -DeploymentUrl $newPreviewUrl -TimeoutSeconds $PreviewTimeoutSeconds

Write-Step 'Promoting the preview to production'
Invoke-CommandPassthrough 'npx' @('vercel', 'promote', $newPreviewUrl, '-y', '--timeout', "${ProductionTimeoutSeconds}s")

Write-Step 'Waiting for the new production deployment'
$newProductionUrl = Wait-ForDeploymentUrlChange -Environment 'production' -PreviousUrl $currentProductionUrl -TimeoutSeconds $ProductionTimeoutSeconds
Write-Host "New production deployment: $newProductionUrl"
Wait-ForReadyDeployment -DeploymentUrl $newProductionUrl -TimeoutSeconds $ProductionTimeoutSeconds

Write-Step 'Validating aliases and public site'
$inspectOutput = Invoke-CommandCapture 'npx' @('vercel', 'inspect', $newProductionUrl)
if ($inspectOutput -notmatch [regex]::Escape($ProductionDomain)) {
  throw "The new production deployment does not expose $ProductionDomain as an alias."
}

$newLiveChunk = $null
try {
  $newLiveChunk = Get-LiveChunkPath -BaseUrl $ProductionDomain -Path $CheckPath
} catch {
  Write-Warning "Could not read public chunk from $ProductionDomain$CheckPath after promotion."
}

Write-Step 'Deploy completed'
Write-Host "Previous production: $currentProductionUrl"
Write-Host "New production:      $newProductionUrl"
if ($currentLiveChunk) {
  Write-Host "Previous chunk:      $currentLiveChunk"
}
if ($newLiveChunk) {
  Write-Host "New public chunk:    $newLiveChunk"
}
