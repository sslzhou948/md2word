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

# 检查必要的命令是否存在
check_dependencies() {
  local missing=()
  for cmd in curl tar; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      missing+=("$cmd")
    fi
  done
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "错误: 缺少必要的命令: ${missing[*]}" >&2
    echo "请先安装: sudo apt-get install -y curl tar (Debian/Ubuntu)" >&2
    echo "或: sudo yum install -y curl tar (CentOS/RHEL)" >&2
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
  step "下载 ${archive}"
  
  # 下载文件，带重试和错误处理
  if ! curl -L --fail --retry 3 --retry-delay 2 "${url}" -o "${archive_path}"; then
    echo "错误: 下载失败: ${url}" >&2
    exit 1
  fi

  rm -rf "${dest}"
  mkdir -p "${dest}"

  if [[ "${archive}" == *.zip ]]; then
    if ! command -v unzip >/dev/null 2>&1; then
      echo "错误: 需要 unzip 命令来解压 .zip 文件" >&2
      echo "请安装: sudo apt-get install -y unzip" >&2
      exit 1
    fi
    unzip -q "${archive_path}" -d "${TEMP_DIR}/extract"
    mv "${TEMP_DIR}/extract"/* "${dest}"
  elif [[ "${archive}" == *.tar.gz ]]; then
    if ! tar -xzf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"; then
      echo "错误: 解压失败: ${archive}" >&2
      exit 1
    fi
  elif [[ "${archive}" == *.tar.xz ]]; then
    if ! tar -xJf "${archive_path}" -C "${dest}" --strip-components="${strip_components}"; then
      echo "错误: 解压失败: ${archive}" >&2
      exit 1
    fi
  else
    step "未知的压缩格式：${archive}"
    exit 1
  fi
}

if [[ -d "${NODE_TARGET}" ]]; then
  step "检测到 tools/node，跳过 Node.js 下载"
else
  download_and_extract "${NODE_URL}" "${NODE_ARCHIVE}" "${NODE_TARGET}" 1
  step "已安装 portable Node.js 到 tools/node"
fi

if [[ -d "${PANDOC_TARGET}" ]]; then
  step "检测到 tools/pandoc，跳过 Pandoc 下载"
else
  download_and_extract "${PANDOC_URL}" "${PANDOC_ARCHIVE}" "${PANDOC_TARGET}" 1
  step "已安装 Pandoc 到 tools/pandoc"
fi

export PATH="${NODE_TARGET}/bin:${PATH}"

if ! command -v node >/dev/null 2>&1; then
  echo "错误: 找不到 node 命令，请确认工具是否下载成功" >&2
  exit 1
fi

step "使用 portable Node.js 执行 npm install"
cd "${PROJECT_ROOT}"
if ! npm install; then
  echo "错误: npm install 失败" >&2
  exit 1
fi

bold "✅ 初始化完成，可执行 npm run dev 或 npm run build && npm run start"
