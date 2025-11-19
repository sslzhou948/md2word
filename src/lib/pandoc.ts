import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function resolvePandocExecutable() {
  const explicit = process.env.PANDOC_PATH;
  if (explicit) {
    return explicit;
  }

  const toolsDir = path.join(process.cwd(), 'tools');
  const winPath = path.join(toolsDir, 'pandoc', 'pandoc.exe');
  const unixPath = path.join(toolsDir, 'pandoc', 'bin', 'pandoc');

  return process.platform === 'win32' ? winPath : unixPath;
}

export async function convertMarkdownToDocx(markdown: string, templateFilename: string) {
  const templatesDir = path.join(process.cwd(), 'templates');
  const referenceDoc = path.join(templatesDir, templateFilename);
  const pandocExecutable = resolvePandocExecutable();

  await access(referenceDoc);
  await access(pandocExecutable);

  const tempDir = await mkdtemp(path.join(tmpdir(), 'md2word-'));
  const inputPath = path.join(tempDir, 'input.md');
  const outputPath = path.join(tempDir, 'output.docx');

  try {
    await writeFile(inputPath, markdown, 'utf8');

    await execFileAsync(pandocExecutable, [
      inputPath,
      '--from=markdown',
      '--to=docx',
      `--reference-doc=${referenceDoc}`,
      `--output=${outputPath}`,
    ]);

    const fileBuffer = await readFile(outputPath);
    return fileBuffer;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

