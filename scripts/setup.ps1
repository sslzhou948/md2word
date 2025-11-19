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

  Write-Step "下載 $ArchiveName"
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

## 安裝 portable Node.js -----------------------------------------------------
$nodeTarget = Join-Path $projectRoot 'tools\node'
if (Test-Path $nodeTarget) {
  Write-Step "已偵測到 tools/node，略過 Node.js 下載"
} else {
  $nodeUrl = "https://nodejs.org/dist/$NodeVersion/$NodeArchive"
  Download-And-Extract -Url $nodeUrl -ArchiveName $NodeArchive -Destination $nodeTarget -InnerFolderName ([IO.Path]::GetFileNameWithoutExtension($NodeArchive))
  Write-Step "已安裝 portable Node.js 到 tools/node"
}

## 安裝 portable Pandoc -------------------------------------------------------
$pandocTarget = Join-Path $projectRoot 'tools\pandoc'
if (Test-Path $pandocTarget) {
  Write-Step "已偵測到 tools/pandoc，略過 Pandoc 下載"
} else {
  $pandocUrl = "https://github.com/jgm/pandoc/releases/download/$PandocVersion/$PandocArchive"
  Download-And-Extract -Url $pandocUrl -ArchiveName $PandocArchive -Destination $pandocTarget -InnerFolderName 'pandoc-3.5-windows-x86_64'
  Write-Step "已安裝 Pandoc 到 tools/pandoc"
}

## 安裝 npm 依賴 --------------------------------------------------------------
$npmCmd = Join-Path $nodeTarget 'npm.cmd'
if (!(Test-Path $npmCmd)) {
  throw "找不到 $npmCmd，請確認 portable Node.js 安裝是否成功"
}

Write-Step '開始執行 npm install（使用 portable Node.js）'
& $npmCmd install

Write-Host "`n✅ 初始化完成，可執行 npm run dev 或 npm run build" -ForegroundColor Green

