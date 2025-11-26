Param(
  [string]$NodeVersion = 'v20.17.0',
  [string]$NodeArchive = 'node-v20.17.0-win-x64.zip',
  [string]$PandocVersion = '3.5',
  [string]$PandocArchive = 'pandoc-3.5-windows-x86_64.zip'
)

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-DownloadUrls {
  param([string]$PrimaryUrl)

  $urls = New-Object System.Collections.Generic.List[string]

  $normalizedPrimary = $PrimaryUrl.Trim()
  if (-not [string]::IsNullOrWhiteSpace($normalizedPrimary)) {
    $urls.Add($normalizedPrimary)
  }

  try {
    $uri = [Uri]$normalizedPrimary
    $host = $uri.Host.ToLowerInvariant()
    $path = $uri.AbsolutePath

    if ($env:MD2WORD_GITHUB_MIRROR -and $host -eq 'github.com') {
      $mirrorBase = $env:MD2WORD_GITHUB_MIRROR.TrimEnd('/')
      $mirrorUrl = "$mirrorBase$path"
      if ($uri.Query) {
        $mirrorUrl += $uri.Query
      }
      $urls.Insert(0, $mirrorUrl)
    }

    if ($host -eq 'github.com') {
      if ($path -match '^/(?<owner>[^/]+)/(?<repo>[^/]+)/releases/download/(?<tag>[^/]+)/(?<asset>.+)$') {
        $owner = $Matches.owner
        $repo = $Matches.repo
        $tag = $Matches.tag
        $asset = $Matches.asset
        $urls.Add("https://download.fastgit.org/$owner/$repo/releases/download/$tag/$asset")
        $urls.Add("https://mirrors.aliyun.com/github-release/$owner/$repo/$tag/$asset")
      } else {
        $ghPath = $path.TrimStart('/')
        if ($uri.Query) {
          $ghPath += $uri.Query
        }
        $urls.Add("https://download.fastgit.org/$ghPath")
      }

      $urls.Add("https://ghproxy.com/$normalizedPrimary")
    } elseif ($host -eq 'nodejs.org' -and $path -match '^/dist/(?<version>[^/]+)/(?<asset>.+)$') {
      $version = $Matches.version
      $asset = $Matches.asset
      $urls.Add("https://mirrors.aliyun.com/nodejs-release/$version/$asset")
      $urls.Add("https://npmmirror.com/mirrors/node/$version/$asset")
      $urls.Add("https://ghproxy.com/$normalizedPrimary")
    } else {
      $urls.Add("https://ghproxy.com/$normalizedPrimary")
    }
  } catch {
    $urls.Add("https://ghproxy.com/$normalizedPrimary")
  }

  return $urls | Select-Object -Unique
}

function Download-And-Extract {
  param(
    [string[]]$Urls,
    [string]$ArchiveName,
    [string]$Destination,
    [string]$InnerFolderName,
    [int]$MaxRetries = 3
  )

  $tempDir = Join-Path $env:TEMP 'md2word-setup'
  if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
  }

  $archivePath = Join-Path $tempDir $ArchiveName

  $downloadSucceeded = $false

  foreach ($url in $Urls) {
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
      $attemptLabel = if ($MaxRetries -gt 1) { " (attempt $attempt/$MaxRetries)" } else { "" }
      Write-Step "Downloading $ArchiveName from $url$attemptLabel"

      try {
        Invoke-WebRequest -Uri $url -OutFile $archivePath -UseBasicParsing
        $downloadSucceeded = $true
        break
      } catch {
        if (Test-Path $archivePath) {
          Remove-Item -Force $archivePath
        }

        if ($attempt -eq $MaxRetries) {
          Write-Step "Download failed from $url after $MaxRetries attempts. Last error: $_"
        } else {
          $delay = 5 * $attempt
          Write-Step "Download failed, retrying in $delay seconds..."
          Start-Sleep -Seconds $delay
        }
      }
    }

    if ($downloadSucceeded) {
      break
    }
  }

  if (-not $downloadSucceeded) {
    $allUrls = $Urls -join ', '
    throw "Failed to download $ArchiveName from all sources: $allUrls"
  }

  $extractDir = Join-Path $tempDir ([IO.Path]::GetFileNameWithoutExtension($ArchiveName))
  if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
  }
  Expand-Archive -Path $archivePath -DestinationPath $extractDir

  if (Test-Path $Destination) {
    Remove-Item -Recurse -Force $Destination
  }

  $sourcePath = $extractDir
  if ($InnerFolderName) {
    $candidate = Join-Path $extractDir $InnerFolderName
    if (Test-Path $candidate) {
      $sourcePath = $candidate
    } else {
      $childDirs = Get-ChildItem -Path $extractDir -Directory
      if ($childDirs.Count -eq 1) {
        $sourcePath = $childDirs[0].FullName
        Write-Step "Inner folder $InnerFolderName not found, using detected folder '$($childDirs[0].Name)'"
      } else {
        $available = ($childDirs | ForEach-Object { $_.Name }) -join ', '
        throw "Unable to locate inner folder '$InnerFolderName' under $extractDir. Available directories: $available"
      }
    }
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
  $nodeSources = Get-DownloadUrls -PrimaryUrl $nodeUrl
  Download-And-Extract -Urls $nodeSources -ArchiveName $NodeArchive -Destination $nodeTarget -InnerFolderName ([IO.Path]::GetFileNameWithoutExtension($NodeArchive))
  Write-Step "Portable Node.js installed to tools/node"
}

## Install portable Pandoc
$pandocTarget = Join-Path $projectRoot 'tools\pandoc'
if (Test-Path $pandocTarget) {
  Write-Step "tools/pandoc detected, skipping Pandoc download"
} else {
  $pandocUrl = "https://github.com/jgm/pandoc/releases/download/$PandocVersion/$PandocArchive"
  $pandocSources = Get-DownloadUrls -PrimaryUrl $pandocUrl
  Download-And-Extract -Urls $pandocSources -ArchiveName $PandocArchive -Destination $pandocTarget -InnerFolderName 'pandoc-3.5-windows-x86_64'
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
