import type { Metadata } from 'next';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
export const metadata: Metadata = {
  title: '学迹 · 个人学习工作台',
  description: '保存学习方向、当前内容、停点与下一步，按自己的节奏继续学习。',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="zh-CN"><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
