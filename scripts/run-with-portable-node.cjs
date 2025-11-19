#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [, , command, ...extraArgs] = process.argv;

if (!command) {
  console.error('請提供要執行的命令，例如：run-with-portable-node dev');
  process.exit(1);
}

const projectRoot = process.cwd();
const toolsDir = path.join(projectRoot, 'tools');

const defaultPortableNode =
  process.platform === 'win32'
    ? path.join(toolsDir, 'node', 'node.exe')
    : path.join(toolsDir, 'node', 'bin', 'node');

const portableNode = process.env.PORTABLE_NODE_PATH || defaultPortableNode;

if (!fs.existsSync(portableNode)) {
  console.error(`找不到可用的 Node 執行檔：${portableNode}`);
  console.error('請確認 tools/node/ 是否存在，或設定 PORTABLE_NODE_PATH 指向其他 Node。');
  process.exit(1);
}

const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const eslintBin = path.join(projectRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

const commandMap = {
  dev: { bin: nextBin, args: ['dev', ...extraArgs] },
  build: { bin: nextBin, args: ['build', ...extraArgs] },
  start: { bin: nextBin, args: ['start', ...extraArgs] },
  lint: { bin: eslintBin, args: [...extraArgs] },
};

const entry = commandMap[command];

if (!entry) {
  console.error(`不支援的命令：${command}`);
  process.exit(1);
}

const child = spawn(portableNode, [entry.bin, ...entry.args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

