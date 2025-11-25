# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Param(
  [string]$NodeVersion = 'v20.17.0',
  [string]$NodeArchive = 'node-v20.17.0-win-x64.zip',
  [string]$PandocVersion = '3.5',
  [string]$PandocArchive = 'pandoc-3.5-windows-x86_64.zip'
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Download-And-Extract {
  param(
    [string]$Url,
    [string]$ArchiveName,
    [string]$Destination,
    [string]$InnerFolderName
  )

  $tempDir = Join-Path $env:TEMP 'md2word-setup'
  if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
  }

  $archivePath = Join-Path $tempDir $ArchiveName

  Write-Step "Downloading $ArchiveName"
  Invoke-WebRequest -Uri $Url -OutFile $archivePath

  $extractDir = Join-Path $tempDir ([IO.Path]::GetFileNameWithoutExtension($ArchiveName))
  if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
  }
  Expand-Archive -Path $archivePath -DestinationPath $extractDir

  if (Test-Path $Destination) {
    Remove-Item -Recurse -Force $Destination
  }

  $sourcePath = if ($InnerFolderName) {
    Join-Path $extractDir $InnerFolderName
  } else {
    $extractDir
  }

  Move-Item -Path $sourcePath -Destination $Destination
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $projectRoot

if (!(Test-Path 'tools')) {
  New-Item -ItemType Directory -Path 'tools' | Out-Null
}

## Install portable Node.js
$nodeTarget = Join-Path $projectRoot 'tools\node'
if (Test-Path $nodeTarget) {
  Write-Step "tools/node detected, skipping Node.js download"
} else {
  $nodeUrl = "https://nodejs.org/dist/$NodeVersion/$NodeArchive"
  Download-And-Extract -Url $nodeUrl -ArchiveName $NodeArchive -Destination $nodeTarget -InnerFolderName ([IO.Path]::GetFileNameWithoutExtension($NodeArchive))
  Write-Step "Portable Node.js installed to tools/node"
}

## Install portable Pandoc
$pandocTarget = Join-Path $projectRoot 'tools\pandoc'
if (Test-Path $pandocTarget) {
  Write-Step "tools/pandoc detected, skipping Pandoc download"
} else {
  $pandocUrl = "https://github.com/jgm/pandoc/releases/download/$PandocVersion/$PandocArchive"
  Download-And-Extract -Url $pandocUrl -ArchiveName $PandocArchive -Destination $pandocTarget -InnerFolderName 'pandoc-3.5-windows-x86_64'
  Write-Step "Pandoc installed to tools/pandoc"
}

## Install npm dependencies
$npmCmd = Join-Path $nodeTarget 'npm.cmd'
if (!(Test-Path $npmCmd)) {
  throw "Cannot find $npmCmd, please verify portable Node.js installation"
}

Write-Step "Running npm install (using portable Node.js)"
& $npmCmd install

Write-Host "`nInitialization complete. You can now run: npm run dev or npm run build" -ForegroundColor Green
