/**
 * 결과 집계 페이지 (T2.4)
 * FEAT: FEAT-1 - 평가 결과 자동 집계 및 순위 표시
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  type GradeLevel,
  calculateGradeScore,
  DEFAULT_EVALUATION_CRITERIA,
  QUALITATIVE_TOTAL_SCORE,
} from '@/types/evaluation';
import { calculateAverage, calculateTrimmedMean, calculateRanking } from '@/lib/aggregation';

const PROJECT_NAME = "경기도의회 블록체인 기반 모바일 의정지원 시스템 구축";

// 날짜 포맷터 (성능을 위해 재사용)
const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface Proposal {
  id: string;
  name: string;
  orderNum: number;
}

interface LocalEvaluation {
  evaluatorName: string;
  proposalId: string;
  scores: Record<string, GradeLevel>;
  totalScore: number;
  comment: string;
  savedAt: string;
}

interface ProposalResult {
  proposalId: string;
  proposalName: string;
  evaluatorScores: { evaluatorName: string; totalScore: number }[];
  rawMean: number;
  trimmedMean: number;
  rank: number;
}

export default function ResultsPage() {
  const [localEvaluations, setLocalEvaluations] = useState<Record<string, LocalEvaluation[]>>({});
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'detail' | 'evaluator'>('summary');
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Supabase에서 데이터 로드
      const response = await fetch('/api/evaluations?all=true');
      const result = await response.json();

      if (result.data) {
        // 제안서 데이터 설정
        if (result.data.proposals && result.data.proposals.length > 0) {
          const loadedProposals = result.data.proposals.map((p: any) => ({
            id: p.id,
            name: p.name.replace('제안사 ', ''),
            orderNum: p.order_num,
          }));
          setProposals(loadedProposals);
        }

        // 평가 데이터 설정
        if (result.data.evaluations) {
          setLocalEvaluations(result.data.evaluations);
        }
      }
    } catch (e) {
      console.error('Supabase 데이터 로드 실패:', e);
      // Fallback to localStorage
      try {
        const localData = localStorage.getItem('allEvaluations');
        if (localData) {
          const parsed = JSON.parse(localData);
          setLocalEvaluations(parsed);
        }
      } catch (localError) {
        console.error('localStorage 데이터 로드 실패:', localError);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const evaluatorNames = Object.keys(localEvaluations);

  // 제안서별 결과 계산
  const proposalResults = useMemo((): ProposalResult[] => {
    const results = proposals.map(proposal => {
      const evaluatorScores = evaluatorNames
        .map(name => {
          const ev = localEvaluations[name]?.find(e => e.proposalId === proposal.id);
          return ev ? { evaluatorName: name, totalScore: ev.totalScore } : null;
        })
        .filter((s): s is { evaluatorName: string; totalScore: number } => s !== null);

      const scores = evaluatorScores.map(e => e.totalScore);
      const rawMean = calculateAverage(scores);
      const trimmedMean = calculateTrimmedMean(scores);

      return {
        proposalId: proposal.id,
        proposalName: proposal.name,
        evaluatorScores,
        rawMean,
        trimmedMean,
        rank: 0,
      };
    });

    // 순위 계산 (절사평균 기준)
    const rankedProposals = calculateRanking(
      results.map(r => ({ name: r.proposalName, average: r.trimmedMean }))
    );

    return results.map(r => ({
      ...r,
      rank: rankedProposals.find(rp => rp.name === r.proposalName)?.rank || 0,
    }));
  }, [localEvaluations, evaluatorNames, proposals]);

  // 평가위원별 결과 계산
  const evaluatorResults = useMemo(() => {
    return evaluatorNames.map(name => {
      const evaluations = localEvaluations[name] || [];
      const completedCount = evaluations.length;
      const totalScore = evaluations.reduce((sum, ev) => sum + ev.totalScore, 0);
      const avgScore = completedCount > 0 ? totalScore / completedCount : 0;

      return {
        evaluatorName: name,
        completedCount,
        totalProposals: proposals.length,
        completionRate: proposals.length > 0 ? (completedCount / proposals.length) * 100 : 0,
        totalScore,
        avgScore,
        evaluations,
      };
    });
  }, [localEvaluations, evaluatorNames, proposals]);

  // 순위별로 정렬된 결과 (메모이제이션)
  const sortedProposalResults = useMemo(() => {
    return [...proposalResults].sort((a, b) => a.rank - b.rank);
  }, [proposalResults]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <p className="text-gray-600">데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f6', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e6e8ea', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e2124', margin: '0 0 4px 0' }}>결과 집계</h1>
            <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>{PROJECT_NAME}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'summary' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'summary' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📊 종합 순위
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'detail' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'detail' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📋 제안서별 상세
            </button>
            <button
              type="button"
              onClick={() => setViewMode('evaluator')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'evaluator' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'evaluator' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              👤 평가위원별
            </button>
            <button
              type="button"
              onClick={loadData}
              style={{
                padding: '8px 16px',
                border: '1px solid #cdd1d5',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#464c53',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🔄 새로고침
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {evaluatorNames.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
              <p style={{ fontSize: '18px', color: '#464c53', marginBottom: '8px' }}>아직 평가 데이터가 없습니다.</p>
              <p style={{ fontSize: '14px', color: '#6d7882' }}>평가위원들이 평가를 완료하면 여기에 결과가 표시됩니다.</p>
            </div>
          </Card>
        ) : viewMode === 'summary' ? (
          /* 종합 순위 보기 */
          <>
            {/* 통계 요약 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#256ef4', margin: '0 0 4px 0' }}>{evaluatorNames.length}</p>
                  <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>평가위원 수</p>
                </div>
              </Card>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#228738', margin: '0 0 4px 0' }}>{proposals.length}</p>
                  <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>제안서 수</p>
                </div>
              </Card>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#ffb114', margin: '0 0 4px 0' }}>
                    {proposalResults.filter(p => p.evaluatorScores.length === evaluatorNames.length).length}
                  </p>
                  <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>평가 완료 제안서</p>
                </div>
              </Card>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#f05f42', margin: '0 0 4px 0' }}>{QUALITATIVE_TOTAL_SCORE}</p>
                  <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>정성평가 만점</p>
                </div>
              </Card>
            </div>

            {/* 순위표 */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>
                  🏆 제안서 종합 순위 (절사평균 기준)
                </h2>
                <p style={{ fontSize: '12px', color: '#6d7882', margin: '4px 0 0 0' }}>
                  최고점/최저점 1개씩 제외한 절사평균으로 순위 산정
                </p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f5f6' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '80px' }}>순위</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '100px' }}>제안서</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>절사평균</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>원점수평균</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>평가인원</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProposalResults.map(result => (
                    <tr
                      key={result.proposalId}
                      style={{
                        borderBottom: '1px solid #e6e8ea',
                        backgroundColor: result.rank === 1 ? '#fffacd' : result.rank <= 3 ? '#f0f9ff' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, fontSize: '18px', color: result.rank <= 3 ? '#256ef4' : '#464c53' }}>
                        {result.evaluatorScores.length > 0 ? `${result.rank}위` : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, fontSize: '18px', color: '#256ef4' }}>
                        {result.proposalName}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
                        {result.evaluatorScores.length > 0 ? result.trimmedMean.toFixed(2) : '-'}
                        <span style={{ fontSize: '12px', color: '#6d7882', fontWeight: 400 }}> 점</span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#6d7882' }}>
                        {result.evaluatorScores.length > 0 ? result.rawMean.toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {result.evaluatorScores.length} / {evaluatorNames.length}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {result.evaluatorScores.length === evaluatorNames.length ? (
                          <span style={{ padding: '4px 12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>완료</span>
                        ) : result.evaluatorScores.length > 0 ? (
                          <span style={{ padding: '4px 12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>진행중</span>
                        ) : (
                          <span style={{ padding: '4px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>미평가</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : viewMode === 'detail' ? (
          /* 제안서별 상세 보기 */
          <>
            {/* 제안서 선택 */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {proposals.map(proposal => {
                  const result = proposalResults.find(r => r.proposalId === proposal.id);
                  const isSelected = selectedProposal === proposal.id;

                  return (
                    <button
                      type="button"
                      key={proposal.id}
                      onClick={() => setSelectedProposal(isSelected ? null : proposal.id)}
                      aria-pressed={isSelected}
                      style={{
                        padding: '12px 20px',
                        border: isSelected ? '2px solid #256ef4' : '1px solid #e6e8ea',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#ecf2fe' : '#fff',
                        color: isSelected ? '#256ef4' : '#1e2124',
                        fontSize: '14px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>제안서 {proposal.name}</div>
                      <div style={{ fontSize: '12px', color: '#6d7882', marginTop: '4px' }}>
                        평균 {result?.trimmedMean.toFixed(2) || '-'}점 | {result?.evaluatorScores.length || 0}명 평가
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 선택된 제안서 상세 */}
            {selectedProposal ? (
              (() => {
                const result = proposalResults.find(r => r.proposalId === selectedProposal);
                const proposal = proposals.find(p => p.id === selectedProposal);

                return result && proposal ? (
                  <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #e6e8ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#256ef4', margin: '0 0 4px 0' }}>제안서 {proposal.name}</h3>
                        <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>
                          {result.rank > 0 ? `순위 ${result.rank}위` : '순위 미정'} | 절사평균 {result.trimmedMean.toFixed(2)}점
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '36px', fontWeight: 700, color: '#256ef4', margin: 0 }}>{result.trimmedMean.toFixed(2)}</p>
                        <p style={{ fontSize: '12px', color: '#6d7882', margin: 0 }}>/ {QUALITATIVE_TOTAL_SCORE}점</p>
                      </div>
                    </div>

                    {result.evaluatorScores.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f4f5f6' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53' }}>평가위원</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>점수</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.evaluatorScores
                            .sort((a, b) => b.totalScore - a.totalScore)
                            .map((es, idx) => {
                              const scores = result.evaluatorScores.map(e => e.totalScore);
                              const maxScore = Math.max(...scores);
                              const minScore = Math.min(...scores);
                              const isMax = es.totalScore === maxScore && scores.length > 2;
                              const isMin = es.totalScore === minScore && scores.length > 2 && maxScore !== minScore;

                              return (
                                <tr key={es.evaluatorName} style={{ borderBottom: '1px solid #e6e8ea' }}>
                                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{es.evaluatorName}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '18px', color: '#256ef4' }}>
                                    {es.totalScore.toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    {isMax && (
                                      <span style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '11px' }}>
                                        최고점 (제외)
                                      </span>
                                    )}
                                    {isMin && (
                                      <span style={{ padding: '2px 8px', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '4px', fontSize: '11px' }}>
                                        최저점 (제외)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot>
                          <tr style={{ backgroundColor: '#f0f9ff' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#256ef4' }}>절사평균 (최고/최저 제외)</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: '18px', color: '#256ef4' }}>
                              {result.trimmedMean.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6d7882' }}>
                              원점수평균: {result.rawMean.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div style={{ padding: '48px', textAlign: 'center', color: '#6d7882' }}>
                        아직 이 제안서에 대한 평가가 없습니다.
                      </div>
                    )}
                  </div>
                ) : null;
              })()
            ) : (
              <Card>
                <div style={{ textAlign: 'center', padding: '48px', color: '#6d7882' }}>
                  위에서 제안서를 선택하면 상세 정보를 볼 수 있습니다.
                </div>
              </Card>
            )}
          </>
        ) : (
          /* 평가위원별 보기 */
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {evaluatorResults.map(result => (
                <div key={result.evaluatorName} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e2124', margin: '0 0 4px 0' }}>{result.evaluatorName}</h3>
                      <p style={{ fontSize: '12px', color: '#6d7882', margin: 0 }}>
                        완료율 {result.completionRate.toFixed(0)}% ({result.completedCount}/{result.totalProposals})
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      backgroundColor: result.completionRate === 100 ? '#d1fae5' : result.completionRate > 0 ? '#fef3c7' : '#fee2e2',
                      color: result.completionRate === 100 ? '#065f46' : result.completionRate > 0 ? '#92400e' : '#991b1b',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {result.completionRate === 100 ? '완료' : result.completionRate > 0 ? '진행중' : '미시작'}
                    </div>
                  </div>

                  {result.evaluations.length > 0 ? (
                    <div style={{ padding: '12px 20px' }}>
                      {result.evaluations
                        .sort((a, b) => {
                          const pA = proposals.find(p => p.id === a.proposalId);
                          const pB = proposals.find(p => p.id === b.proposalId);
                          return (pA?.orderNum || 0) - (pB?.orderNum || 0);
                        })
                        .map(ev => {
                          const proposal = proposals.find(p => p.id === ev.proposalId);
                          return (
                            <div key={ev.proposalId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f4f5f6' }}>
                              <span style={{ fontSize: '14px', color: '#464c53' }}>제안서 {proposal?.name}</span>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#256ef4' }}>{ev.totalScore.toFixed(2)}점</span>
                            </div>
                          );
                        })}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0 0', borderTop: '2px solid #e6e8ea', marginTop: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e2124' }}>평균</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#256ef4' }}>{result.avgScore.toFixed(2)}점</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6d7882', fontSize: '14px' }}>
                      아직 평가 기록이 없습니다.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
