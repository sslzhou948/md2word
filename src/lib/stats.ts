import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_COUNT = 12753;
const statsFilePath = path.join(process.cwd(), 'data', 'stats.json');

async function ensureStatsFile() {
  try {
    await fs.access(statsFilePath);
  } catch {
    await fs.mkdir(path.dirname(statsFilePath), { recursive: true });
    await fs.writeFile(statsFilePath, JSON.stringify({ userCount: DEFAULT_COUNT }, null, 2), 'utf-8');
  }
}

export async function getUserCount(): Promise<number> {
  try {
    await ensureStatsFile();
    const raw = await fs.readFile(statsFilePath, 'utf-8');
    const data = JSON.parse(raw);
    const count = Number(data?.userCount);
    if (Number.isFinite(count) && count >= DEFAULT_COUNT) {
      return count;
    }
    return DEFAULT_COUNT;
  } catch (error) {
    console.error('[Stats] 读取用户计数失败', error);
    return DEFAULT_COUNT;
  }
}

export async function incrementUserCount(): Promise<number> {
  const current = await getUserCount();
  const next = current + 1;
  try {
    await fs.writeFile(statsFilePath, JSON.stringify({ userCount: next }, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Stats] 写入用户计数失败', error);
  }
  return next;
}

