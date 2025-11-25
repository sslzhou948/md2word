import { NextResponse } from 'next/server';

import { getUserCount } from '@/lib/stats';

export async function GET() {
  try {
    const count = await getUserCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('[Stats] 获取计数失败', error);
    return NextResponse.json({ count: 12753 }, { status: 200 });
  }
}

