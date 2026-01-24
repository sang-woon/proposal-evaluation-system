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
        제안서 평가 결과를 자동으로 집계하고 평가서를 출력합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/evaluation" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                평가 입력
              </h2>
              <p className="text-gray-600 text-sm">
                제안서별 평가 점수를 입력합니다
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/results" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                결과 집계
              </h2>
              <p className="text-gray-600 text-sm">
                전체 평가 결과를 집계합니다
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/print" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🖨️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                평가서 출력
              </h2>
              <p className="text-gray-600 text-sm">
                A4 평가서를 출력합니다
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
