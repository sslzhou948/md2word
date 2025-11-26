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

# Force enable TLS 1.2 to avoid HTTPS handshake issues with some mirrors
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-DownloadUrls {
  param([string]$PrimaryUrl)

  $urls = New-Object System.Collections.Generic.List[string]
  $normalizedPrimary = $PrimaryUrl.Trim()

  # Strategy A: Node.js downloads (use domestic mirrors, do NOT send through GitHub proxies)
  if ($normalizedPrimary -match 'nodejs.org') {
    if ($normalizedPrimary -match 'dist/(?<version>v[\d\.]+)/(?<asset>.+)') {
      $version = $Matches.version
      $asset = $Matches.asset

      # Priority 1: npmmirror (Taobao mirror)
      $urls.Add("https://npmmirror.com/mirrors/node/$version/$asset")

      # Priority 2: Aliyun mirror
      $urls.Add("https://mirrors.aliyun.com/nodejs-release/$version/$asset")
    }

    # Always add original URL as a fallback
    $urls.Add($normalizedPrimary)
    return $urls | Select-Object -Unique
  }

  # Strategy B: GitHub downloads (use GitHub-specific proxies)
  if ($normalizedPrimary -match 'github.com') {
    # Proxy 1: ghproxy.net (relatively stable, see https://ghproxy.net/)
    $urls.Add("https://ghproxy.net/$normalizedPrimary")

    # Proxy 2: mirror.ghproxy.com
    $urls.Add("https://mirror.ghproxy.com/$normalizedPrimary")

    # Proxy 3: kgithub.com mirror
    $urls.Add($normalizedPrimary.Replace("github.com", "kgithub.com"))
  }

  # Always include the original URL as the final fallback
  $urls.Add($normalizedPrimary)

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

  # Disable PowerShell progress bar to avoid UI overhead causing timeouts on large downloads
  $ProgressPreference = 'SilentlyContinue'

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
        # If a partial file exists from a previous attempt, remove it first
        if (Test-Path $archivePath) {
          Remove-Item -Force $archivePath
        }

        # Primary download method: BITS, designed for unstable networks and large files
        Start-BitsTransfer -Source $url -Destination $archivePath -ErrorAction Stop

        $downloadSucceeded = $true
        break
      } catch {
        Write-Warning "BITS download failed: $_"

        # Fallback: try system curl.exe if available
        try {
          Write-Step "Falling back to curl.exe..."
          $curlCmd = "curl.exe"
          # -L follow redirects, -f fail on HTTP errors, --retry adds its own retries
          & $curlCmd -L -f --retry 3 -o "$archivePath" "$url"
          if ($LASTEXITCODE -eq 0) {
            $downloadSucceeded = $true
            break
          }
        } catch {
          # Ignore and continue to retry logic below
        }

        if ($attempt -eq $MaxRetries) {
          Write-Step "Download failed from $url after $MaxRetries attempts."
        } else {
          $delay = 3 * $attempt
          Write-Step "Retrying in $delay seconds..."
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

  Write-Step "Download finished. Extracting..."

  $extractDir = Join-Path $tempDir ([IO.Path]::GetFileNameWithoutExtension($ArchiveName))
  if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
  }

  Expand-Archive -Path $archivePath -DestinationPath $extractDir -Force

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
      } else {
        # As a fallback, try to auto-detect the folder containing pandoc.exe
        $exeFiles = Get-ChildItem -Path $extractDir -Filter "pandoc.exe" -Recurse -ErrorAction SilentlyContinue
        if ($exeFiles.Count -gt 0) {
          $sourcePath = $exeFiles[0].DirectoryName
          Write-Step "Auto-detected folder containing pandoc.exe"
        } else {
          $available = ($childDirs | ForEach-Object { $_.Name }) -join ', '
          throw "Unable to locate inner folder '$InnerFolderName' under $extractDir. Available directories: $available"
        }
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

# Optionally add portable Node.js to the current user's PATH so that `node` / `npm` work in new terminals
try {
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')

  # Normalize to empty string if null
  if ($null -eq $userPath) {
    $userPath = ''
  }

  $separator = ';'
  $pathEntries =
    if ([string]::IsNullOrWhiteSpace($userPath)) {
      @()
    } else {
      $userPath -split $separator
    }

  # Remove any old md2word portable-node entries that point to a different folder
  $cleanedEntries = $pathEntries |
    Where-Object {
      $entry = $_.Trim()
      if ([string]::IsNullOrWhiteSpace($entry)) { return $false }

      $isMd2WordNode = $entry -like '*md2word*tools\node*'
      $isCurrentNode = [string]::Equals($entry, $nodeTarget, [StringComparison]::OrdinalIgnoreCase)

      # Keep non-md2word entries, and keep the current nodeTarget, drop stale md2word/tools/node paths
      return (-not $isMd2WordNode) -or $isCurrentNode
    }

  $hasCurrentNode = $cleanedEntries -contains $nodeTarget
  if (-not $hasCurrentNode) {
    $cleanedEntries += $nodeTarget
  }

  $newUserPath = ($cleanedEntries | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join $separator
  [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')

  Write-Step "Ensured portable Node.js path '$nodeTarget' is present in your user PATH. Open a new terminal to use node/npm directly."
} catch {
  Write-Step "Failed to update user PATH, continuing with local PATH only."
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

## Ensure portable Node.js is visible to any child processes (so 'node' is resolvable on PATH)
$env:PATH = "$nodeTarget;$env:PATH"

## Optionally configure a fast npm registry mirror (safe to run multiple times)
try {
  & $npmCmd config set registry https://registry.npmmirror.com | Out-Null
} catch {
  Write-Step "Failed to set npm registry mirror, continuing with default registry"
}

Write-Step "Running npm install (using portable Node.js)"
& $npmCmd install --no-audit

if ($LASTEXITCODE -ne 0) {
  throw "npm install failed with exit code $LASTEXITCODE"
}

Write-Host "`nInitialization complete. You can now run: npm run dev or npm run build" -ForegroundColor Green
