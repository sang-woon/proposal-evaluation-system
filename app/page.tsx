/**
 * 홈페이지
 * FEAT: FEAT-0
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        제안평가시스템
      </h1>

      <p className="text-gray-600 text-center mb-12">
        평가위원님, 아래 버튼을 클릭하여 평가를 시작해주세요.
      </p>

      <div className="flex justify-center">
        <Link href="/evaluation" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" style={{ minWidth: '280px' }}>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                평가 입력
              </h2>
              <p className="text-gray-600 text-sm">
                제안서별 평가 점수를 입력합니다
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
