'use client';

import { useEffect, useState } from 'react';

const FALLBACK_COUNT = 12753;

export function UserCountBadge() {
  const [count, setCount] = useState<number>(FALLBACK_COUNT);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (typeof data?.count === 'number') {
        setCount(data.count);
        setError(null);
      } else {
        throw new Error('Invalid payload');
      }
    } catch (err) {
      console.error('[Stats] 前端获取计数失败', err);
      setError('计数同步异常');
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchCount();
    };
    window.addEventListener('user-count-updated', handler);
    return () => {
      window.removeEventListener('user-count-updated', handler);
    };
  }, []);

  const displayText = count === FALLBACK_COUNT && !error ? '加载中…' : count.toLocaleString();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 hidden md:block">
      <div className="pointer-events-auto rounded-2xl border border-neutral-200 bg-white/90 px-5 py-3 shadow-2xl shadow-neutral-200/80 backdrop-blur">
        <p className="mt-1 text-sm font-medium text-neutral-700">
          {count === FALLBACK_COUNT && !error ? (
            <span>正在同步真实使用人数…</span>
          ) : (
            <>
              已有{' '}
              <span className="text-lg font-semibold text-neutral-900">{displayText}</span>{' '}
              位用户用 md2word 完成文档
            </>
          )}
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          {error
            ? '统计暂时不可用，稍后自动重试。'
            : '真实用户持续累积，越多选择代表越被信任。'}
        </p>
      </div>
    </div>
  );
}

