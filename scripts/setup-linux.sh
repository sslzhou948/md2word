#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-v20.17.0}"
NODE_ARCHIVE="node-${NODE_VERSION}-linux-x64.tar.xz"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}"

PANDOC_VERSION="${PANDOC_VERSION:-3.5}"
PANDOC_ARCHIVE="pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz"
PANDOC_URL="https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${PANDOC_ARCHIVE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TOOLS_DIR="${PROJECT_ROOT}/tools"
NODE_TARGET="${TOOLS_DIR}/node"
PANDOC_TARGET="${TOOLS_DIR}/pandoc"
TEMP_DIR="$(mktemp -d)"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
step() { bold "==> $1"; }

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

# Verify required commands exist
check_dependencies() {
  local missing=()
  for cmd in curl tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      missing+=("$cmd")
    fi
  done
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Error: missing required commands: ${missing[*]}" >&2
    echo "Install via: sudo apt-get install -y curl tar (Debian/Ubuntu)" >&2
    echo "or: sudo yum install -y curl tar (CentOS/RHEL)" >&2
    exit 1
  fi
}

check_dependencies

mkdir -p "${TOOLS_DIR}"

download_and_extract() {
  local url="$1"
  local archive="$2"
  local dest="$3"
  local strip_components="${4:-0}"

  local archive_path="${TEMP_DIR}/${archive}"
  step "Downloading ${archive}"
  
  # Download with retry and error handling
  if ! curl -L --fail --retry 3 --retry-delay 2 "${url}" -o "${archive_path}"; then
    echo "Error: failed to download ${url}" >&2
    exit 1
  fi

  rm -rf "${dest}"
  mkdir -p "${dest}"

  if [[ "${archive}" == *.zip ]]; then
    if ! command -v unzip >/dev/null 2>&1; then
      echo "Error: unzip is required to extract .zip archives" >&2
      echo "Install via: sudo apt-get install -y unzip" >&2
      exit 1
    fi
    unzip -q "${archive_path}" -d "${TEMP_DIR}/extract"
    mv "${TEMP_DIR}/extract"/* "${dest}"
  elif [[ "${archive}" == *.tar.gz ]]; then
    if ! tar -xzf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"; then
      echo "Error: failed to extract ${archive}" >&2
      exit 1
    fi
  elif [[ "${archive}" == *.tar.xz ]]; then
    if ! tar -xJf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"; then
      echo "Error: failed to extract ${archive}" >&2
      exit 1
    fi
  else
    step "Unknown archive format: ${archive}"
    exit 1
  fi
}

if [[ -d "${NODE_TARGET}" ]]; then
  step "tools/node detected, skipping Node.js download"
else
  download_and_extract "${NODE_URL}" "${NODE_ARCHIVE}" "${NODE_TARGET}" 1
  step "Portable Node.js installed in tools/node"
fi

if [[ -d "${PANDOC_TARGET}" ]]; then
  step "tools/pandoc detected, skipping Pandoc download"
else
  download_and_extract "${PANDOC_URL}" "${PANDOC_ARCHIVE}" "${PANDOC_TARGET}" 1
  step "Pandoc installed in tools/pandoc"
fi

export PATH="${NODE_TARGET}/bin:${PATH}"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node command not found, verify portable tools were installed" >&2
  exit 1
fi

step "Running npm install via portable Node.js"
cd "${PROJECT_ROOT}"
if ! npm install; then
  echo "Error: npm install failed" >&2
  exit 1
fi

bold "Initialization complete. You can now run npm run dev or npm run build && npm run start"
