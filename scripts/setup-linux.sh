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

mkdir -p "${TOOLS_DIR}"

download_and_extract() {
  local url="$1"
  local archive="$2"
  local dest="$3"
  local strip_components="${4:-0}"

  local archive_path="${TEMP_DIR}/${archive}"
  step "下載 ${archive}"
  curl -L "${url}" -o "${archive_path}"

  rm -rf "${dest}"
  mkdir -p "${dest}"

  if [[ "${archive}" == *.zip ]]; then
    unzip -q "${archive_path}" -d "${TEMP_DIR}/extract"
    mv "${TEMP_DIR}/extract"/* "${dest}"
  elif [[ "${archive}" == *.tar.gz ]]; then
    tar -xzf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"
  elif [[ "${archive}" == *.tar.xz ]]; then
    tar -xJf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"
  else
    step "未知的壓縮格式：${archive}"
    exit 1
  }
}

if [[ -d "${NODE_TARGET}" ]]; then
  step "偵測到 tools/node，略過 Node.js 下載"
else
  download_and_extract "${NODE_URL}" "${NODE_ARCHIVE}" "${NODE_TARGET}" 1
  step "已安裝 portable Node.js 至 tools/node"
fi

if [[ -d "${PANDOC_TARGET}" ]]; then
  step "偵測到 tools/pandoc，略過 Pandoc 下載"
else
  download_and_extract "${PANDOC_URL}" "${PANDOC_ARCHIVE}" "${PANDOC_TARGET}" 1
  step "已安裝 Pandoc 至 tools/pandoc"
fi

export PATH="${NODE_TARGET}/bin:${PATH}"

if ! command -v node >/dev/null 2>&1; then
  echo "找不到 node 指令，請確認工具是否下載成功" >&2
  exit 1
fi

step "使用 portable Node.js 執行 npm install"
cd "${PROJECT_ROOT}"
npm install

bold "✅ 初始化完成，可執行 npm run dev 或 npm run build && npm run start"

