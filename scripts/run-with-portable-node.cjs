#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [, , command, ...extraArgs] = process.argv;

if (!command) {
  console.error('Please provide a command, e.g. run-with-portable-node dev');
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
  console.error(`Unable to find a Node executable at: ${portableNode}`);
  console.error('Ensure tools/node/ exists or set PORTABLE_NODE_PATH to a different Node binary.');
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
  console.error(`Unsupported command: ${command}`);
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

