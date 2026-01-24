import type { Metadata } from 'next';
import { AdminProvider } from '@/contexts/AdminContext';
import { Navigation } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: '제안평가시스템',
  description: '제안서 평가 결과 자동 집계 및 평가서 출력',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <AdminProvider>
          <Navigation />
          <main>
            {children}
          </main>
        </AdminProvider>
      </body>
    </html>
  );
}
