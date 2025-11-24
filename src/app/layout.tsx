import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { UserCountBadge } from '@/components/user-count-badge';

const geistSans = localFont({
  src: [
    {
      path: '../../public/fonts/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Geist-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: [
    {
      path: '../../public/fonts/GeistMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'md2word · Markdown 轉 Word',
  description: '使用 LLM 清洗 Markdown 並套用 Word 模板的輕量工具',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <UserCountBadge />
      </body>
    </html>
  );
}
