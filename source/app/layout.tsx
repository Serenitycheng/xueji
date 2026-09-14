import type { Metadata } from 'next';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';
export const metadata: Metadata = {
  title: '学序 · 个人学习工作台',
  description: '管理线代、概率统计、日语、摄影与开发的学习路线、每日任务与掌握进度。',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="zh-CN"><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
