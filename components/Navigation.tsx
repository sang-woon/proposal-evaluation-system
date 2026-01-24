'use client';

/**
 * 네비게이션 컴포넌트
 * 관리자만 볼 수 있음
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/evaluation', label: '평가 입력' },
  { href: '/admin/dashboard', label: '관리자 대시보드' },
];

export function Navigation() {
  const pathname = usePathname();
  const { isAdmin, adminLogout } = useAdmin();

  // 관리자가 아니면 네비게이션을 표시하지 않음
  if (!isAdmin) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm no-print">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-primary-600">
            제안평가시스템
          </Link>

          <div className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={adminLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              aria-label="관리자 로그아웃"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
