// @TASK T2.1 - 관리자 대시보드 개선
// @SPEC docs/requirements.md#관리자-대시보드
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import {
  type GradeLevel,
  calculateGradeScore,
  DEFAULT_EVALUATION_CRITERIA,
  QUALITATIVE_TOTAL_SCORE,
} from '@/types/evaluation';
import { DocumentManager } from '@/components/admin/DocumentManager';

const PROJECT_NAME = "경기도의회 블록체인 기반 모바일 의정지원 시스템 구축";

// 기본 제안사 목록 (localStorage에서 로드 실패 시 사용)
const DEFAULT_PROPOSALS = [
  { id: 'p1', name: 'A', orderNum: 1 },
  { id: 'p2', name: 'B', orderNum: 2 },
  { id: 'p3', name: 'C', orderNum: 3 },
];

// 제안사 목록을 localStorage에서 로드
function loadProposals(): { id: string; name: string; orderNum: number }[] {
  if (typeof window === 'undefined') return DEFAULT_PROPOSALS;

  const savedProposals = localStorage.getItem('proposals');
  if (savedProposals) {
    try {
      return JSON.parse(savedProposals);
    } catch {
      return DEFAULT_PROPOSALS;
    }
  }
  return DEFAULT_PROPOSALS;
}

interface LocalEvaluation {
  evaluatorName: string;
  proposalId: string;
  scores: Record<string, GradeLevel>;
  totalScore: number;
  comment: string;
  savedAt: string;
}

interface EvaluatorInfo {
  id: string;
  name: string;
  is_submitted: boolean;
  created_at: string;
}

interface ProposalSummary {
  proposalId: string;
  proposalName: string;
  averageScore: number;
  totalScore: number;  // 합계점수
  trimmedAverageScore: number;  // 평균점수(최상위, 최하위 제외)
  evaluatorCount: number;
  rank: number;
}

// 날짜 포맷터 (성능을 위해 재사용)
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

// 소수점 2자리 버림 함수
function truncateToTwoDecimals(num: number): number {
  return Math.floor(num * 100) / 100;
}

// 평균 계산 함수 (최상위/최하위 제외)
// 규칙: 최상위와 최하위를 제외한 후 평균 산정하며, 최상위와 최하위 평점이 2개 이상인 경우에는 1개씩만을 제외
// 모든 점수는 소수점 2자리로 버림 처리
function calculateAdjustedAverage(scores: { evaluatorName: string; score: number }[]): {
  average: number;
  excludedHighest: string[];
  excludedLowest: string[];
} {
  if (scores.length === 0) {
    return { average: 0, excludedHighest: [], excludedLowest: [] };
  }

  // 모든 점수를 소수점 2자리로 버림 처리
  const truncatedScores = scores.map(s => ({
    evaluatorName: s.evaluatorName,
    score: truncateToTwoDecimals(s.score)
  }));

  if (truncatedScores.length <= 2) {
    // 2명 이하면 제외 없이 평균
    const avg = truncatedScores.reduce((sum, s) => sum + s.score, 0) / truncatedScores.length;
    return { average: truncateToTwoDecimals(avg), excludedHighest: [], excludedLowest: [] };
  }

  // 정렬하여 최상위/최하위 찾기
  const sorted = [...truncatedScores].sort((a, b) => b.score - a.score);
  const highestScore = sorted[0].score;
  const lowestScore = sorted[sorted.length - 1].score;

  // 최상위 점수를 가진 평가위원들 (2개 이상이면 1개만 제외)
  const highestEvaluators = truncatedScores.filter(s => s.score === highestScore);
  const excludedHighest = highestEvaluators.length > 0 ? [highestEvaluators[0].evaluatorName] : [];

  // 최하위 점수를 가진 평가위원들 (2개 이상이면 1개만 제외)
  const lowestEvaluators = truncatedScores.filter(s => s.score === lowestScore);
  // 만약 최상위와 최하위가 같은 점수면 (모두 동점) 1개만 제외
  let excludedLowest: string[] = [];
  if (highestScore !== lowestScore) {
    excludedLowest = lowestEvaluators.length > 0 ? [lowestEvaluators[0].evaluatorName] : [];
  }

  // 제외된 평가위원 목록
  const excludedNames = new Set([...excludedHighest, ...excludedLowest]);

  // 제외 후 평균 계산 (소수점 2자리 버림)
  const remainingScores = truncatedScores.filter(s => !excludedNames.has(s.evaluatorName));
  const average = remainingScores.length > 0
    ? truncateToTwoDecimals(remainingScores.reduce((sum, s) => sum + s.score, 0) / remainingScores.length)
    : 0;

  return { average, excludedHighest, excludedLowest };
}

// @TASK T2.4 - 정성적 평가 점수 집계표 컴포넌트 (새 형식 - 한 페이지에 모든 제안사)
interface QualitativeScoreSummaryProps {
  proposals: { id: string; name: string; orderNum: number }[];
  localEvaluations: Record<string, LocalEvaluation[]>;
  evaluatorNames: string[];
}

function QualitativeScoreSummary({ proposals, localEvaluations, evaluatorNames }: QualitativeScoreSummaryProps) {
  const FIXED_DATE = '2026.  1. 30.';
  const EVALUATOR_COUNT = 8; // 고정 8명

  // 테이블에 표시할 평가위원만 사용 (첫 8명)
  const displayedEvaluators = evaluatorNames.slice(0, EVALUATOR_COUNT);

  // 각 제안사별로 최상위/최하위 제외 정보 계산 (표시되는 8명만 대상)
  const proposalStats = proposals.map(proposal => {
    const scores = displayedEvaluators
      .map(name => {
        const ev = localEvaluations[name]?.find(e => e.proposalId === proposal.id);
        return ev ? { evaluatorName: name, score: ev.totalScore } : null;
      })
      .filter((s): s is { evaluatorName: string; score: number } => s !== null);

    const { average, excludedHighest, excludedLowest } = calculateAdjustedAverage(scores);

    return {
      proposalId: proposal.id,
      proposalName: proposal.name,
      average,
      excludedHighestSet: new Set(excludedHighest),
      excludedLowestSet: new Set(excludedLowest),
    };
  });

  // 셀 스타일
  const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '6px 6px',
    textAlign: 'center',
    fontSize: '11pt',
    verticalAlign: 'middle',
    height: '42px', // 균등한 행 높이
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 'bold',
    backgroundColor: '#f8f8f8',
  };

  return (
    <div
      className="print-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#fff',
        padding: '15mm 15mm',
        margin: '0 auto 20px auto',
        boxSizing: 'border-box',
        fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
        fontSize: '11pt',
        lineHeight: 1.4,
        border: '1px solid #ccc',
      }}
    >
      {/* 상단 라인 */}
      <div style={{ borderTop: '2px solid #000', marginBottom: '20px' }} />

      {/* 제목 */}
      <h1 style={{
        textAlign: 'center',
        fontSize: '22pt',
        fontWeight: 'bold',
        margin: '0 0 30px 0',
        letterSpacing: '8px',
      }}>
        정성적 평가 점수 집계표
      </h1>

      {/* 사업명 */}
      <p style={{
        fontSize: '12pt',
        margin: '0 0 25px 0',
        borderBottom: '1px solid #000',
        paddingBottom: '10px',
      }}>
        □ 사 업 명 : {PROJECT_NAME}
      </p>

      {/* 점수 집계 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '70px' }}>구분</th>
            <th style={{ ...headerCellStyle, width: '90px' }}>평가위원</th>
            {proposals.map(p => (
              <th key={p.id} style={headerCellStyle}>
                제안사 {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 평가위원 8명 행 */}
          {Array.from({ length: EVALUATOR_COUNT }).map((_, idx) => {
            const evaluatorName = displayedEvaluators[idx];

            return (
              <tr key={idx}>
                {idx === 0 && (
                  <td
                    rowSpan={EVALUATOR_COUNT}
                    style={{
                      ...cellStyle,
                      fontWeight: 'bold',
                      width: '70px',
                      lineHeight: 1.6,
                    }}
                  >
                    정성<br />평가<br />({QUALITATIVE_TOTAL_SCORE}점)
                  </td>
                )}
                <td style={cellStyle}>
                  {evaluatorName || ''}
                </td>
                {proposals.map(proposal => {
                  const stat = proposalStats.find(s => s.proposalId === proposal.id)!;
                  const ev = evaluatorName ? localEvaluations[evaluatorName]?.find(e => e.proposalId === proposal.id) : null;
                  const score = ev?.totalScore;

                  // 최상위/최하위 여부 확인
                  let excludeLabel = '';
                  if (evaluatorName && score !== undefined) {
                    if (stat.excludedLowestSet.has(evaluatorName)) {
                      excludeLabel = '(최하위-제외)';
                    } else if (stat.excludedHighestSet.has(evaluatorName)) {
                      excludeLabel = '(최상위-제외)';
                    }
                  }

                  return (
                    <td key={proposal.id} style={cellStyle}>
                      {score !== undefined ? (
                        <>
                          <span>{truncateToTwoDecimals(score).toFixed(2)}</span>
                          {excludeLabel && (
                            <>
                              <br />
                              <span style={{ fontSize: '9pt', color: '#666' }}>{excludeLabel}</span>
                            </>
                          )}
                        </>
                      ) : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {/* 평균 행 */}
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <td colSpan={2} style={{ ...cellStyle, fontWeight: 'bold' }}>
              평 균
            </td>
            {proposals.map(proposal => {
              const stat = proposalStats.find(s => s.proposalId === proposal.id)!;
              return (
                <td key={proposal.id} style={{ ...cellStyle, fontWeight: 'bold' }}>
                  {stat.average > 0 ? stat.average.toFixed(2) : ''}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* 참고 문구 */}
      <p style={{
        fontSize: '11pt',
        margin: '0 0 40px 0',
        lineHeight: 1.8,
      }}>
        * 최상위와 최하위를 제외한 후 평균 산정하며 최상위와 최하위 평점이 2개 이상인<br />
        &nbsp;&nbsp;경우에는 1개씩만을 제외
      </p>

      {/* 날짜 */}
      <p style={{
        textAlign: 'center',
        fontSize: '14pt',
        fontWeight: 'bold',
        margin: '0 0 50px 0',
        letterSpacing: '4px',
      }}>
        {FIXED_DATE}
      </p>

      {/* 서명란 */}
      <div style={{ fontSize: '12pt', lineHeight: 2.2 }}>
        <p style={{ margin: '0 0 5px 0' }}>
          <span style={{ letterSpacing: '3px' }}>작 성 자</span> : 직 책&nbsp;&nbsp;
          <span style={{ fontWeight: 'bold' }}>주무관</span>
          <span style={{ float: 'right' }}>
            성 명&nbsp;&nbsp;____________&nbsp;&nbsp;(서명)
          </span>
        </p>
        <p style={{ margin: '0 0 5px 0' }}>
          <span style={{ letterSpacing: '3px' }}>검 토 자</span> : 직 책&nbsp;&nbsp;
          <span style={{ fontWeight: 'bold' }}>AI의정혁신팀장</span>
          <span style={{ float: 'right' }}>
            성 명&nbsp;&nbsp;____________&nbsp;&nbsp;(서명)
          </span>
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ letterSpacing: '3px' }}>확 인 자</span> : 직 책&nbsp;&nbsp;
          <span style={{ fontWeight: 'bold' }}>평가위원장</span>
          <span style={{ float: 'right' }}>
            성 명&nbsp;&nbsp;____________&nbsp;&nbsp;(서명)
          </span>
        </p>
      </div>
    </div>
  );
}

// @TASK T2.3 - 총괄표 컴포넌트
function SummarySheet({ summaries, evaluatorCount }: { summaries: ProposalSummary[]; evaluatorCount: number }) {
  const today = dateFormatter.format(new Date());
  const sortedSummaries = [...summaries].sort((a, b) => a.rank - b.rank);

  return (
    <div
      className="print-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#fff',
        padding: '20mm 15mm',
        margin: '0 auto 20px auto',
        boxSizing: 'border-box',
        fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
        fontSize: '11pt',
        lineHeight: 1.5,
        border: '1px solid #ccc',
      }}
    >
      {/* 제목 */}
      <h1 style={{
        textAlign: 'center',
        fontSize: '20pt',
        fontWeight: 'bold',
        margin: '0 0 20px 0',
        letterSpacing: '10px',
        borderBottom: '3px solid #000',
        paddingBottom: '15px',
      }}>
        제안서 평가 총괄표
      </h1>

      {/* 사업명 */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '11pt' }}>
          □ 사 업 명 : {PROJECT_NAME}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '11pt' }}>
          □ 평가일자 : {today}
        </p>
        <p style={{ margin: '0', fontSize: '11pt' }}>
          □ 평가위원 수 : {evaluatorCount}명
        </p>
      </div>

      {/* 총괄표 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#e8f4fd' }}>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>
              순위
            </th>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>
              제안사명
            </th>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', width: '80px' }}>
              합계<br />점수
            </th>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', width: '100px', fontSize: '10pt', lineHeight: 1.3 }}>
              평균점수<br />(최상위,최하위<br />제외)
            </th>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', width: '70px' }}>
              평가<br />위원 수
            </th>
            <th style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold' }}>
              비고
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSummaries.map((summary) => (
            <tr key={summary.proposalId} style={{
              backgroundColor: summary.rank === 1 ? '#fffacd' : summary.rank <= 3 ? '#f0f9ff' : 'transparent'
            }}>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt' }}>
                {summary.rank}위
              </td>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', color: '#256ef4' }}>
                {summary.proposalName}
              </td>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt' }}>
                {summary.totalScore.toFixed(2)}점
              </td>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', color: '#256ef4' }}>
                {summary.trimmedAverageScore.toFixed(2)}점
              </td>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center' }}>
                {summary.evaluatorCount}명
              </td>
              <td style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', fontSize: '10pt' }}>
                {summary.evaluatorCount < evaluatorCount ? '평가 미완료' : ''}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <td colSpan={2} style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold' }}>
              총점 기준
            </td>
            <td colSpan={4} style={{ border: '2px solid #000', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold' }}>
              정성평가 {QUALITATIVE_TOTAL_SCORE}점 만점
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 서명란 */}
      <div style={{ marginTop: '50px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '120px', textAlign: 'center' }}>
                평가위원장
              </td>
              <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '14pt', color: '#256ef4', fontWeight: 'bold' }}>(서명)</span>
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>
                확인자
              </td>
              <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '14pt', color: '#256ef4', fontWeight: 'bold' }}>(서명)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 참고사항 */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '10pt', fontWeight: 'bold' }}>※ 참고사항</p>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '9pt', lineHeight: 1.6 }}>
          <li>합계점수는 모든 평가위원의 점수를 합산한 값입니다.</li>
          <li>평균점수(최상위,최하위 제외)는 최고점과 최저점 각 1개씩을 제외한 나머지 점수의 평균입니다.</li>
          <li>평가위원이 3명 미만인 경우, 최상위/최하위 제외 없이 일반 평균을 적용합니다.</li>
          <li>순위는 평균점수(최상위,최하위 제외) 기준으로 높은 순서대로 부여됩니다.</li>
        </ul>
      </div>
    </div>
  );
}

// @TASK T2.2 - 채점표 컴포넌트 (A4 1페이지에 맞춤, 디자인 개선)
function ScoreSheet({ evaluation, proposalName }: { evaluation: LocalEvaluation; proposalName: string }) {
  // 등급별 점수 계산 함수
  const getGradeScores = (maxScore: number) => ({
    '수': maxScore,
    '우': Math.round(maxScore * 0.9 * 10) / 10,
    '미': Math.round(maxScore * 0.8 * 10) / 10,
    '양': Math.round(maxScore * 0.7 * 10) / 10,
    '가': Math.round(maxScore * 0.6 * 10) / 10,
  });

  // 선택된 등급의 점수 계산
  const getSelectedScore = (itemId: string, maxScore: number) => {
    const grade = evaluation.scores[itemId];
    if (!grade) return null;
    return calculateGradeScore(maxScore, grade);
  };

  // 스타일 상수
  const COLORS = {
    primary: '#1a365d',      // 진한 남색 (제목, 강조)
    secondary: '#2c5282',    // 중간 남색
    headerBg: '#e2e8f0',     // 헤더 배경 (연한 회색)
    categoryBg: '#f7fafc',   // 카테고리 배경
    border: '#2d3748',       // 테두리 (진한 회색)
    lightBorder: '#a0aec0',  // 연한 테두리
    text: '#1a202c',         // 본문 텍스트
    subText: '#4a5568',      // 보조 텍스트
  };

  return (
    <div
      className="print-page"
      style={{
        width: '210mm',
        minHeight: '287mm',
        backgroundColor: '#fff',
        padding: '10mm 12mm',
        margin: '0 auto 20px auto',
        boxSizing: 'border-box',
        fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
        fontSize: '9pt',
        lineHeight: 1.3,
        border: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        color: COLORS.text,
      }}
    >
      {/* 제목 영역 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '12px',
        borderBottom: `3px double ${COLORS.primary}`,
        paddingBottom: '10px',
      }}>
        <h1 style={{
          fontSize: '18pt',
          fontWeight: 'bold',
          margin: '0',
          letterSpacing: '6px',
          color: COLORS.primary,
        }}>
          평 가 위 원 별  채 점 표
        </h1>
      </div>

      {/* 사업명 */}
      <p style={{
        margin: '0 0 10px 0',
        fontSize: '9pt',
        color: COLORS.text,
        paddingLeft: '2px',
      }}>
        <span style={{ fontWeight: 'bold' }}>□ 사 업 명 :</span> {PROJECT_NAME}
      </p>

      {/* 제안사명, 평가위원 - 균등 너비 */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '8px',
        tableLayout: 'fixed',
        border: `2px solid ${COLORS.border}`,
      }}>
        <tbody>
          <tr>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 10px',
              backgroundColor: COLORS.headerBg,
              fontWeight: 'bold',
              width: '18%',
              textAlign: 'center',
              fontSize: '10pt',
            }}>
              제안사명
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 10px',
              width: '22%',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14pt',
              color: COLORS.primary,
            }}>
              {proposalName}
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 10px',
              backgroundColor: COLORS.headerBg,
              fontWeight: 'bold',
              width: '18%',
              textAlign: 'center',
              fontSize: '10pt',
            }}>
              평가위원
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 10px',
              width: '30%',
              textAlign: 'center',
              fontSize: '11pt',
              fontWeight: '500',
            }}>
              {evaluation.evaluatorName}
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 10px',
              width: '12%',
              textAlign: 'center',
              color: COLORS.secondary,
              fontWeight: 'bold',
              fontSize: '11pt',
            }}>
              (서명)
            </td>
          </tr>
        </tbody>
      </table>

      {/* 평가 테이블 */}
      <div className="eval-table-wrapper" style={{ flex: 1, overflow: 'hidden' }}>
      <table style={{
        width: '100%',
        maxWidth: '100%',
        borderCollapse: 'collapse',
        fontSize: '8pt',
        tableLayout: 'fixed',
        border: `2px solid ${COLORS.border}`,
      }}>
        <colgroup>
          <col style={{ width: '52px' }} />
          <col style={{ width: '80px' }} />
          <col />
          <col style={{ width: '30px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '36px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 3px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} rowSpan={2}>구분</th>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 3px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} rowSpan={2}>평가항목</th>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 3px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} rowSpan={2}>평가내용</th>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 3px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} rowSpan={2}>배점</th>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '4px 2px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} colSpan={5}>평가등급</th>
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 3px',
              backgroundColor: COLORS.headerBg,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: COLORS.primary,
            }} rowSpan={2}>점수</th>
          </tr>
          <tr>
            {['수', '우', '미', '양', '가'].map(grade => (
              <th key={grade} style={{
                border: `1px solid ${COLORS.border}`,
                padding: '3px 2px',
                backgroundColor: '#f8f9fa',
                textAlign: 'center',
                fontSize: '8pt',
                fontWeight: 'bold',
                color: COLORS.subText,
              }}>{grade}</th>
            ))}
          </tr>
          {/* 합계 행 */}
          <tr>
            <td colSpan={3} style={{
              border: `1px solid ${COLORS.border}`,
              padding: '5px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              backgroundColor: '#f8f9fa',
            }}>합 계</td>
            <td colSpan={6} style={{
              border: `1px solid ${COLORS.border}`,
              padding: '5px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
            }}></td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '5px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11pt',
              backgroundColor: '#f8f9fa',
              color: COLORS.primary,
            }}>{QUALITATIVE_TOTAL_SCORE}</td>
          </tr>
        </thead>
        <tbody>
          {DEFAULT_EVALUATION_CRITERIA.map((category, catIndex) => (
            category.items.map((item, itemIndex) => {
              const gradeScores = getGradeScores(item.maxScore);
              const selectedScore = getSelectedScore(item.id, item.maxScore);
              const selectedGrade = evaluation.scores[item.id];

              // 등급 셀 렌더링 함수 - 동그라미로 선택 표시
              const renderGradeCell = (grade: GradeLevel) => {
                const isSelected = selectedGrade === grade;
                return (
                  <td key={grade} style={{
                    border: `1px solid ${COLORS.lightBorder}`,
                    padding: '2px 1px',
                    textAlign: 'center',
                    fontSize: '7.5pt',
                    backgroundColor: 'transparent',
                    verticalAlign: 'middle',
                  }}>
                    {isSelected ? (
                      <span style={{
                        display: 'inline-block',
                        width: '22px',
                        height: '22px',
                        lineHeight: '18px',
                        border: `2px solid #000`,
                        borderRadius: '50%',
                        fontSize: '7.5pt',
                        fontWeight: 'bold',
                        color: '#000',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}>
                        {gradeScores[grade]}
                      </span>
                    ) : (
                      <span style={{ color: COLORS.subText }}>{gradeScores[grade]}</span>
                    )}
                  </td>
                );
              };

              return (
                <tr key={item.id}>
                  {itemIndex === 0 && (
                    <td
                      rowSpan={category.items.length}
                      style={{
                        border: `1px solid ${COLORS.border}`,
                        padding: '4px 3px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                        fontSize: '7.5pt',
                        backgroundColor: COLORS.categoryBg,
                        color: COLORS.primary,
                      }}
                    >
                      {category.name}
                      <br />
                      <span style={{ fontSize: '7pt', color: COLORS.subText, fontWeight: 'normal' }}>({category.totalScore}점)</span>
                    </td>
                  )}
                  <td style={{
                    border: `1px solid ${COLORS.lightBorder}`,
                    padding: '4px 3px',
                    textAlign: 'center',
                    fontSize: '7pt',
                    wordBreak: 'keep-all',
                    color: COLORS.subText,
                    lineHeight: 1.3,
                  }}>
                    {item.subCategory}
                  </td>
                  <td style={{
                    border: `1px solid ${COLORS.lightBorder}`,
                    padding: '4px 5px',
                    fontSize: '7.5pt',
                    lineHeight: 1.35,
                    color: COLORS.text,
                  }}>
                    <span style={{ color: COLORS.secondary }}>○</span> {item.name}
                  </td>
                  <td style={{
                    border: `1px solid ${COLORS.lightBorder}`,
                    padding: '4px 2px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '9pt',
                    color: COLORS.primary,
                  }}>
                    {item.maxScore}
                  </td>
                  {renderGradeCell('수')}
                  {renderGradeCell('우')}
                  {renderGradeCell('미')}
                  {renderGradeCell('양')}
                  {renderGradeCell('가')}
                  <td style={{
                    border: `1px solid ${COLORS.lightBorder}`,
                    padding: '4px 2px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '9pt',
                    color: COLORS.primary,
                  }}>
                    {selectedScore !== null ? selectedScore : ''}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
        <tfoot>
          {/* 총점 행 - 10개 컬럼 (구분, 평가항목, 평가내용, 배점, 수, 우, 미, 양, 가, 점수) */}
          <tr>
            <td colSpan={9} style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 10px',
              textAlign: 'right',
              fontWeight: 'bold',
              fontSize: '10pt',
              color: COLORS.primary,
              backgroundColor: COLORS.headerBg,
            }}>
              총 점
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '12pt',
              color: COLORS.primary,
              backgroundColor: '#fff',
              width: '36px',
              maxWidth: '36px',
            }}>
              {evaluation.totalScore.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* 종합의견 */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
        border: `2px solid ${COLORS.border}`,
      }}>
        <tbody>
          <tr>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px',
              backgroundColor: COLORS.headerBg,
              fontWeight: 'bold',
              width: '70px',
              textAlign: 'center',
              verticalAlign: 'middle',
              fontSize: '10pt',
              color: COLORS.primary,
            }}>
              종합<br />의견
            </td>
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '10px 12px',
              minHeight: '45px',
              verticalAlign: 'top',
              fontSize: '9pt',
              lineHeight: 1.5,
              color: COLORS.text,
            }}>
              {evaluation.comment || ''}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [localEvaluations, setLocalEvaluations] = useState<Record<string, LocalEvaluation[]>>({});
  const [selectedEvaluator, setSelectedEvaluator] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'scoresheet' | 'summary' | 'aggregate' | 'documents' | 'proposals' | 'evaluators'>('overview');
  const [proposals, setProposals] = useState(DEFAULT_PROPOSALS);
  const [newProposalName, setNewProposalName] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ evaluators: number; scores: number } | null>(null);
  const [evaluatorInfos, setEvaluatorInfos] = useState<EvaluatorInfo[]>([]);
  const [unlockingEvaluator, setUnlockingEvaluator] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/admin');
      return;
    }
    loadData();
  }, [isAdmin, router]);

  const loadData = async () => {
    setLoading(true);

    // Supabase에서 데이터 로드
    try {
      const response = await fetch('/api/evaluations?all=true');
      const result = await response.json();

      if (result.data) {
        // 제안서 목록 로드
        if (result.data.proposals && result.data.proposals.length > 0) {
          const loadedProposals = result.data.proposals.map((p: any) => ({
            id: p.id,
            name: p.name.replace('제안사 ', ''),
            orderNum: p.order_num,
          }));
          setProposals(loadedProposals);
        }

        // 평가 데이터 로드
        if (result.data.evaluations) {
          setLocalEvaluations(result.data.evaluations);
        }

        // 평가위원 목록 로드
        if (result.data.evaluators) {
          setEvaluatorInfos(result.data.evaluators);
        }
      }

      // 평가위원 정보 별도 로드 (is_submitted 포함)
      try {
        const evaluatorsResponse = await fetch('/api/evaluators');
        const evaluatorsResult = await evaluatorsResponse.json();
        if (evaluatorsResult.data) {
          // is_submitted가 없는 경우 false로 기본값 설정
          const infos = evaluatorsResult.data.map((e: any) => ({
            ...e,
            is_submitted: e.is_submitted ?? false,
          }));
          setEvaluatorInfos(infos);
        }
      } catch {
        console.log('평가위원 정보 로드 실패');
      }
    } catch (e) {
      console.error('Supabase 데이터 로드 실패:', e);
      // 폴백: localStorage에서 로드 시도
      try {
        const localData = localStorage.getItem('allEvaluations');
        if (localData) {
          const parsed = JSON.parse(localData);
          setLocalEvaluations(parsed);
        }
        setProposals(loadProposals());
      } catch (localError) {
        console.error('localStorage 데이터 로드 실패:', localError);
      }
    }

    setLoading(false);
  };

  // 평가위원 제출 해제
  const handleUnlockEvaluator = async (evaluatorId: string, evaluatorName: string) => {
    if (!confirm(`${evaluatorName} 평가위원의 제출을 해제하시겠습니까?\n\n해제 시 평가위원이 다시 평가를 수정할 수 있습니다.`)) {
      return;
    }

    setUnlockingEvaluator(evaluatorId);
    try {
      const response = await fetch('/api/evaluators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: evaluatorId,
          is_submitted: false,
        }),
      });

      if (response.ok) {
        // 목록 새로고침
        setEvaluatorInfos(prev =>
          prev.map(e => e.id === evaluatorId ? { ...e, is_submitted: false } : e)
        );
        alert(`${evaluatorName} 평가위원의 제출이 해제되었습니다.`);
      } else {
        alert('제출 해제 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error('제출 해제 실패:', e);
      alert('제출 해제 중 오류가 발생했습니다.');
    }
    setUnlockingEvaluator(null);
  };

  // 초기화 전 상태 조회
  const fetchResetStatus = async () => {
    try {
      const response = await fetch('/api/reset');
      const result = await response.json();
      if (result.success) {
        setResetStatus({
          evaluators: result.data.evaluatorCount,
          scores: result.data.scoreCount,
        });
      }
    } catch (e) {
      console.error('상태 조회 실패:', e);
    }
  };

  // 데이터 초기화 실행
  const handleReset = async () => {
    setResetLoading(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'DELETE',
        headers: {
          'x-admin-key': 'admin-reset-confirmed',
        },
      });
      const result = await response.json();

      if (result.success) {
        alert('모든 평가 데이터가 초기화되었습니다.');
        setShowResetDialog(false);
        setLocalEvaluations({});
        // localStorage도 초기화
        localStorage.removeItem('allEvaluations');
        loadData();
      } else {
        alert(`초기화 실패: ${result.errors?.join(', ') || result.error}`);
      }
    } catch (e) {
      console.error('초기화 실패:', e);
      alert('초기화 중 오류가 발생했습니다.');
    }
    setResetLoading(false);
  };

  // 제안사 추가
  const handleAddProposal = async () => {
    if (!newProposalName.trim()) {
      alert('제안사 이름을 입력해주세요.');
      return;
    }

    setProposalLoading(true);
    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProposalName.trim() }),
      });

      const result = await response.json();
      if (result.data) {
        const newProposal = {
          id: result.data.id,
          name: result.data.name,
          orderNum: result.data.order_num,
        };
        setProposals([...proposals, newProposal]);
        setNewProposalName('');
        alert(`제안사 "${newProposalName}" 추가 완료`);
      } else {
        alert(`추가 실패: ${result.error?.message}`);
      }
    } catch (e) {
      console.error('제안사 추가 실패:', e);
      alert('제안사 추가 중 오류가 발생했습니다.');
    }
    setProposalLoading(false);
  };

  // 제안사 삭제
  const handleDeleteProposal = async (proposalId: string, proposalName: string) => {
    if (!confirm(`제안사 "${proposalName}"을(를) 삭제하시겠습니까?\n\n관련된 모든 평가 데이터도 함께 삭제됩니다.`)) {
      return;
    }

    setProposalLoading(true);
    try {
      const response = await fetch(`/api/proposals?id=${proposalId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.data) {
        setProposals(proposals.filter(p => p.id !== proposalId));
        loadData(); // 평가 데이터 새로고침
        alert(`제안사 "${proposalName}" 삭제 완료`);
      } else {
        alert(`삭제 실패: ${result.error?.message}`);
      }
    } catch (e) {
      console.error('제안사 삭제 실패:', e);
      alert('제안사 삭제 중 오류가 발생했습니다.');
    }
    setProposalLoading(false);
  };

  // 모든 제안사 삭제
  const handleDeleteAllProposals = async () => {
    if (!confirm('모든 제안사를 삭제하시겠습니까?\n\n관련된 모든 평가 데이터도 함께 삭제됩니다.')) {
      return;
    }

    setProposalLoading(true);
    try {
      for (const proposal of proposals) {
        await fetch(`/api/proposals?id=${proposal.id}`, {
          method: 'DELETE',
        });
      }
      setProposals([]);
      loadData();
      alert('모든 제안사 삭제 완료');
    } catch (e) {
      console.error('제안사 삭제 실패:', e);
      alert('제안사 삭제 중 오류가 발생했습니다.');
    }
    setProposalLoading(false);
  };

  // evaluatorNames를 먼저 계산
  const evaluatorNames = Object.keys(localEvaluations);

  // 평가 완료 여부 확인
  const evaluationMatrix = proposals.map(proposal => {
    const evaluators = evaluatorNames.map(evaluatorName => {
      const ev = localEvaluations[evaluatorName]?.find(e => e.proposalId === proposal.id);
      return {
        evaluatorName,
        isComplete: !!ev,
        score: ev?.totalScore || 0
      };
    });
    return {
      proposalId: proposal.id,
      proposalName: proposal.name,
      evaluators
    };
  });

  // 총괄표용 데이터 계산 (모든 점수는 소수점 2자리 버림 처리)
  const calculateSummaryData = (): ProposalSummary[] => {
    const summaries = proposals.map(proposal => {
      // 점수를 소수점 2자리로 버림 처리
      const scores = evaluatorNames
        .map(name => localEvaluations[name]?.find(e => e.proposalId === proposal.id)?.totalScore)
        .filter((s): s is number => s !== undefined)
        .map(s => truncateToTwoDecimals(s));

      // 합계점수 (버림 처리된 점수들의 합, 결과도 버림)
      const totalScore = scores.length > 0 ? truncateToTwoDecimals(scores.reduce((a, b) => a + b, 0)) : 0;

      // 평균점수 (버림 처리)
      const averageScore = scores.length > 0 ? truncateToTwoDecimals(totalScore / scores.length) : 0;

      // 평균점수(최상위, 최하위 제외) - 버림 처리
      let trimmedAverageScore = 0;
      if (scores.length >= 3) {
        const sortedScores = [...scores].sort((a, b) => a - b);
        // 최하위 1개, 최상위 1개 제외
        const trimmedScores = sortedScores.slice(1, -1);
        trimmedAverageScore = truncateToTwoDecimals(trimmedScores.reduce((a, b) => a + b, 0) / trimmedScores.length);
      } else if (scores.length > 0) {
        // 3명 미만이면 일반 평균 사용
        trimmedAverageScore = averageScore;
      }

      return {
        proposalId: proposal.id,
        proposalName: proposal.name,
        averageScore,
        totalScore,
        trimmedAverageScore,
        evaluatorCount: scores.length,
        rank: 0
      };
    });

    // 순위 계산 (최상위/최하위 제외 평균 점수 높은 순)
    const sorted = [...summaries].sort((a, b) => b.trimmedAverageScore - a.trimmedAverageScore);
    sorted.forEach((item, index) => {
      const original = summaries.find(s => s.proposalId === item.proposalId);
      if (original) original.rank = index + 1;
    });

    return summaries;
  };

  // A4 인쇄용 스타일 (1페이지에 맞춤)
  const printStyles = `
    @media print {
      @page {
        size: A4;
        margin: 5mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .print-page {
        width: 100% !important;
        height: 287mm !important;
        page-break-after: always;
        page-break-inside: avoid;
        border: none !important;
        margin: 0 !important;
        padding: 3mm !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .print-page:last-child {
        page-break-after: auto;
      }
      .print-page table {
        flex-shrink: 0;
      }
      .print-page .eval-table-wrapper {
        flex: 1;
      }
      .print-page .eval-table-wrapper table {
        height: 100%;
      }
      .print-page .eval-table-wrapper tbody tr {
        height: auto;
      }
    }
  `;

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f6', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      <style>{printStyles}</style>

      {/* 헤더 */}
      <header className="no-print" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e6e8ea', padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#256ef4', margin: 0 }}>관리자 대시보드</h1>
            <span style={{ fontSize: '13px', color: '#6d7882' }}>{PROJECT_NAME}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'overview' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'overview' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📊 평가 현황
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scoresheet')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'scoresheet' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'scoresheet' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📄 채점표 출력
            </button>
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
              🏆 총괄표
            </button>
            <button
              type="button"
              onClick={() => setViewMode('aggregate')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'aggregate' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'aggregate' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📊 집계표 출력
            </button>
            <button
              type="button"
              onClick={() => setViewMode('documents')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'documents' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'documents' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📁 문서 관리
            </button>
            <button
              type="button"
              onClick={() => setViewMode('proposals')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'proposals' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'proposals' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🏢 제안사 관리
            </button>
            <button
              type="button"
              onClick={() => setViewMode('evaluators')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: viewMode === 'evaluators' ? '#256ef4' : '#e6e8ea',
                color: viewMode === 'evaluators' ? '#fff' : '#464c53',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              👥 평가위원 현황
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
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
              홈으로
            </button>
            <button
              type="button"
              onClick={() => {
                fetchResetStatus();
                setShowResetDialog(true);
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #f05f42',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#f05f42',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              🗑️ 데이터 초기화
            </button>
          </div>
        </div>
      </header>

      {/* 초기화 확인 다이얼로그 */}
      {showResetDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          aria-describedby="reset-dialog-description"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowResetDialog(false);
          }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 id="reset-dialog-title" style={{ fontSize: '18px', fontWeight: 700, color: '#f05f42', margin: '0 0 16px 0' }}>
              ⚠️ 평가 데이터 초기화
            </h3>
            <p id="reset-dialog-description" style={{ fontSize: '14px', color: '#464c53', margin: '0 0 16px 0', lineHeight: 1.6 }}>
              모든 평가 데이터가 <strong>영구적으로 삭제</strong>됩니다.
              <br />이 작업은 되돌릴 수 없습니다.
            </p>

            {resetStatus && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '14px', color: '#991b1b', margin: '0 0 8px 0', fontWeight: 600 }}>
                  삭제될 데이터:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#dc2626' }}>
                  <li>평가위원: {resetStatus.evaluators}명</li>
                  <li>평가점수: {resetStatus.scores}건</li>
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowResetDialog(false)}
                disabled={resetLoading}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #cdd1d5',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#464c53',
                  fontSize: '14px',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetLoading}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#f05f42',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  opacity: resetLoading ? 0.7 : 1,
                }}
              >
                {resetLoading ? '초기화 중...' : '초기화 실행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'overview' ? (
        /* 평가 현황 */
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          {/* 평가위원 제출 상태 관리 */}
          {evaluatorInfos.length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>
                    🔐 평가위원 제출 상태 관리
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6d7882', margin: '4px 0 0 0' }}>
                    제출된 평가를 해제하면 평가위원이 다시 수정할 수 있습니다
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    제출완료: {evaluatorInfos.filter(e => e.is_submitted).length}명
                  </span>
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    미제출: {evaluatorInfos.filter(e => !e.is_submitted).length}명
                  </span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {evaluatorInfos.map(evaluator => {
                    const evaluations = localEvaluations[evaluator.name] || [];
                    const completedCount = proposals.filter(p =>
                      evaluations.some(e => e.proposalId === p.id)
                    ).length;

                    return (
                      <div
                        key={evaluator.id}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: evaluator.is_submitted ? '2px solid #10b981' : '1px solid #e6e8ea',
                          backgroundColor: evaluator.is_submitted ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e2124' }}>
                              {evaluator.name}
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6d7882' }}>
                              평가 완료: {completedCount}/{proposals.length}
                            </p>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: evaluator.is_submitted ? '#10b981' : '#6d7882',
                            color: '#fff',
                          }}>
                            {evaluator.is_submitted ? '✓ 제출완료' : '미제출'}
                          </span>
                        </div>
                        {evaluator.is_submitted && (
                          <button
                            type="button"
                            onClick={() => handleUnlockEvaluator(evaluator.id, evaluator.name)}
                            disabled={unlockingEvaluator === evaluator.id}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #f59e0b',
                              borderRadius: '6px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: unlockingEvaluator === evaluator.id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {unlockingEvaluator === evaluator.id ? '처리 중...' : '🔓 제출 해제 (수정 허용)'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {evaluatorNames.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
              <p style={{ fontSize: '18px', color: '#464c53', marginBottom: '8px' }}>아직 평가 데이터가 없습니다.</p>
              <p style={{ fontSize: '14px', color: '#6d7882' }}>평가위원들이 평가를 완료하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <>
              {/* 평가 완료 여부 매트릭스 */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>
                    📋 평가 완료 여부 확인
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6d7882', margin: '4px 0 0 0' }}>
                    모든 평가위원이 모든 제안서를 평가했는지 확인하세요
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f4f5f6' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53', borderBottom: '1px solid #e6e8ea', position: 'sticky', left: 0, backgroundColor: '#f4f5f6', zIndex: 1 }}>평가위원 \ 제안서</th>
                        {proposals.map(p => (
                          <th key={p.id} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', borderBottom: '1px solid #e6e8ea', minWidth: '80px' }}>
                            {p.name}
                          </th>
                        ))}
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#256ef4', borderBottom: '1px solid #e6e8ea', backgroundColor: '#ecf2fe' }}>완료율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatorNames.map(evaluatorName => {
                        const evaluations = localEvaluations[evaluatorName] || [];
                        const completedCount = proposals.filter(p =>
                          evaluations.some(e => e.proposalId === p.id)
                        ).length;
                        const completionRate = (completedCount / proposals.length) * 100;

                        return (
                          <tr key={evaluatorName} style={{ borderBottom: '1px solid #e6e8ea' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>{evaluatorName}</td>
                            {proposals.map(p => {
                              const ev = evaluations.find(e => e.proposalId === p.id);
                              return (
                                <td key={p.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  {ev ? (
                                    <span style={{ fontSize: '18px', color: '#228738' }}>✓</span>
                                  ) : (
                                    <span style={{ fontSize: '18px', color: '#f05f42' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              backgroundColor: completionRate === 100 ? '#d1fae5' : completionRate > 0 ? '#fef3c7' : '#fee2e2',
                              color: completionRate === 100 ? '#065f46' : completionRate > 0 ? '#92400e' : '#991b1b'
                            }}>
                              {completionRate.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f0f9ff' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#256ef4', position: 'sticky', left: 0, backgroundColor: '#f0f9ff', zIndex: 1 }}>제안서별 완료율</td>
                        {proposals.map(p => {
                          const completedCount = evaluatorNames.filter(name =>
                            localEvaluations[name]?.some(e => e.proposalId === p.id)
                          ).length;
                          const completionRate = (completedCount / evaluatorNames.length) * 100;

                          return (
                            <td key={p.id} style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: completionRate === 100 ? '#065f46' : completionRate > 0 ? '#92400e' : '#991b1b'
                            }}>
                              {completionRate.toFixed(0)}%
                            </td>
                          );
                        })}
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#256ef4', backgroundColor: '#ecf2fe' }}>
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 전체 현황 테이블 */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>
                    📊 전체 평가 현황 (평가위원 {evaluatorNames.length}명)
                  </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f4f5f6' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53', borderBottom: '1px solid #e6e8ea', position: 'sticky', left: 0, backgroundColor: '#f4f5f6', zIndex: 1 }}>평가위원</th>
                        {proposals.map(p => (
                          <th key={p.id} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', borderBottom: '1px solid #e6e8ea', minWidth: '80px' }}>
                            제안서 {p.name}
                          </th>
                        ))}
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#256ef4', borderBottom: '1px solid #e6e8ea', backgroundColor: '#ecf2fe' }}>합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatorNames.map(evaluatorName => {
                        const evaluations = localEvaluations[evaluatorName] || [];
                        const total = evaluations.reduce((sum, ev) => sum + ev.totalScore, 0);

                        return (
                          <tr key={evaluatorName} style={{ borderBottom: '1px solid #e6e8ea' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>{evaluatorName}</td>
                            {proposals.map(p => {
                              const ev = evaluations.find(e => e.proposalId === p.id);
                              return (
                                <td key={p.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  {ev ? (
                                    <span style={{ fontWeight: 600, color: '#256ef4' }}>{ev.totalScore.toFixed(2)}</span>
                                  ) : (
                                    <span style={{ color: '#b1b8be' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#256ef4', backgroundColor: '#ecf2fe' }}>
                              {total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f0f9ff' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#256ef4', position: 'sticky', left: 0, backgroundColor: '#f0f9ff', zIndex: 1 }}>제안서별 평균</td>
                        {proposals.map(p => {
                          const scores = evaluatorNames
                            .map(name => localEvaluations[name]?.find(e => e.proposalId === p.id)?.totalScore)
                            .filter((s): s is number => s !== undefined);
                          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

                          return (
                            <td key={p.id} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#256ef4' }}>
                              {scores.length > 0 ? avg.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#256ef4', backgroundColor: '#ecf2fe' }}>
                          -
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 제안서별 카드 */}
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', marginBottom: '16px' }}>제안서별 평가 요약</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {proposals.map(proposal => {
                  const scores = evaluatorNames
                    .map(name => {
                      const ev = localEvaluations[name]?.find(e => e.proposalId === proposal.id);
                      return ev ? { evaluatorName: name, score: ev.totalScore } : null;
                    })
                    .filter((s): s is { evaluatorName: string; score: number } => s !== null);

                  const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;

                  return (
                    <div key={proposal.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#256ef4', margin: 0 }}>제안서 {proposal.name}</h4>
                        <span style={{ fontSize: '12px', color: '#6d7882', backgroundColor: '#f4f5f6', padding: '4px 8px', borderRadius: '4px' }}>
                          {scores.length}/{evaluatorNames.length} 평가
                        </span>
                      </div>

                      {scores.length > 0 ? (
                        <>
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 700, color: '#256ef4' }}>{avgScore.toFixed(2)}</span>
                            <span style={{ fontSize: '14px', color: '#6d7882', marginLeft: '4px' }}>/ {QUALITATIVE_TOTAL_SCORE}점 평균</span>
                          </div>
                          <div style={{ borderTop: '1px solid #e6e8ea', paddingTop: '12px' }}>
                            {scores.map(s => (
                              <div key={s.evaluatorName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', color: '#464c53' }}>{s.evaluatorName}</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e2124' }}>{s.score}점</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={{ fontSize: '14px', color: '#6d7882', textAlign: 'center', padding: '20px 0' }}>아직 평가 없음</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      ) : viewMode === 'scoresheet' ? (
        /* 채점표 출력 */
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          {/* 선택 UI */}
          <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', marginBottom: '16px' }}>📄 채점표 출력 설정</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <label htmlFor="evaluator-select" style={{ fontSize: '14px', fontWeight: 500, color: '#464c53', display: 'block', marginBottom: '8px' }}>평가위원 선택</label>
                <select
                  id="evaluator-select"
                  aria-label="평가위원 선택"
                  value={selectedEvaluator || ''}
                  onChange={(e) => setSelectedEvaluator(e.target.value || null)}
                  style={{ padding: '10px 14px', border: '1px solid #cdd1d5', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
                >
                  <option value="">전체 평가위원</option>
                  {evaluatorNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="proposal-select" style={{ fontSize: '14px', fontWeight: 500, color: '#464c53', display: 'block', marginBottom: '8px' }}>제안서 선택</label>
                <select
                  id="proposal-select"
                  aria-label="제안서 선택"
                  value={selectedProposal || ''}
                  onChange={(e) => setSelectedProposal(e.target.value || null)}
                  style={{ padding: '10px 14px', border: '1px solid #cdd1d5', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
                >
                  <option value="">전체 제안서</option>
                  {proposals.map(p => (
                    <option key={p.id} value={p.id}>제안서 {p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#256ef4',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🖨️ 인쇄하기
                </button>
              </div>
            </div>
          </div>

          {/* 채점표 미리보기 / 인쇄 영역 */}
          {evaluatorNames.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', color: '#464c53' }}>평가 데이터가 없습니다.</p>
            </div>
          ) : (
            evaluatorNames
              .filter(name => !selectedEvaluator || name === selectedEvaluator)
              .map(evaluatorName => {
                const evaluations = localEvaluations[evaluatorName] || [];

                return evaluations
                  .filter(ev => !selectedProposal || ev.proposalId === selectedProposal)
                  .map((ev) => {
                    const proposal = proposals.find(p => p.id === ev.proposalId);
                    return (
                      <ScoreSheet
                        key={`${evaluatorName}-${ev.proposalId}`}
                        evaluation={ev}
                        proposalName={proposal?.name || ''}
                      />
                    );
                  });
              })
          )}
        </main>
      ) : viewMode === 'summary' ? (
        /* 총괄표 출력 */
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          {/* 출력 버튼 */}
          <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: '0 0 4px 0' }}>🏆 총괄표</h3>
                <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>
                  모든 제안사의 평균 점수와 순위를 확인하세요
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#256ef4',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🖨️ 인쇄하기
              </button>
            </div>
          </div>

          {/* 총괄표 미리보기 / 인쇄 영역 */}
          {evaluatorNames.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', color: '#464c53' }}>평가 데이터가 없습니다.</p>
            </div>
          ) : (
            <SummarySheet
              summaries={calculateSummaryData()}
              evaluatorCount={evaluatorNames.length}
            />
          )}
        </main>
      ) : viewMode === 'documents' ? (
        /* 문서 관리 */
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: '0 0 4px 0' }}>📁 문서 관리</h3>
            <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>
              제안사별 발표자료, 정성적 제안서, 보안각서를 업로드하고 관리합니다
            </p>
          </div>
          <DocumentManager
            proposals={proposals.map(p => ({
              id: p.id,
              name: p.name,
              order_num: p.orderNum,
              created_at: new Date().toISOString(),
            }))}
          />
        </main>
      ) : viewMode === 'proposals' ? (
        /* 제안사 관리 */
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e2124', margin: '0 0 8px 0' }}>🏢 제안사 관리</h3>
            <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>
              평가 대상 제안사(업체)를 등록하고 관리합니다. 평가를 시작하기 전에 먼저 제안사를 등록하세요.
            </p>
          </div>

          {/* 제안사 추가 폼 */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: '0 0 16px 0' }}>➕ 새 제안사 추가</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={newProposalName}
                onChange={(e) => setNewProposalName(e.target.value)}
                placeholder="제안사 이름 (예: A, B, C 또는 회사명)"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #cdd1d5',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddProposal();
                }}
              />
              <button
                type="button"
                onClick={handleAddProposal}
                disabled={proposalLoading || !newProposalName.trim()}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: proposalLoading || !newProposalName.trim() ? '#cdd1d5' : '#256ef4',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: proposalLoading || !newProposalName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {proposalLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>

          {/* 현재 제안사 목록 */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>📋 등록된 제안사 ({proposals.length}개)</h4>
              {proposals.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllProposals}
                  disabled={proposalLoading}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #f05f42',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    color: '#f05f42',
                    fontSize: '13px',
                    cursor: proposalLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  🗑️ 모두 삭제
                </button>
              )}
            </div>

            {proposals.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6d7882' }}>
                <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>등록된 제안사가 없습니다.</p>
                <p style={{ fontSize: '14px', margin: 0 }}>위의 입력창에서 제안사를 추가하세요.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {proposals.map((proposal, index) => (
                  <div
                    key={proposal.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #e6e8ea',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#256ef4',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#1e2124' }}>
                        제안사 {proposal.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteProposal(proposal.id, proposal.name)}
                      disabled={proposalLoading}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #cdd1d5',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        color: '#6d7882',
                        fontSize: '13px',
                        cursor: proposalLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : viewMode === 'evaluators' ? (
        /* 평가위원 현황 */
        <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e2124', margin: '0 0 8px 0' }}>👥 평가위원 현황</h3>
            <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>
              평가위원 등록 현황과 평가 진행 상태를 확인합니다.
            </p>
          </div>

          {/* 요약 통계 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6d7882', margin: '0 0 8px 0' }}>등록된 평가위원</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#256ef4', margin: 0 }}>{evaluatorInfos.length}</p>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6d7882', margin: '0 0 8px 0' }}>평가 진행 중</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#ffb114', margin: 0 }}>
                {evaluatorInfos.filter(e => !e.is_submitted && Object.keys(localEvaluations).includes(e.name)).length}
              </p>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6d7882', margin: '0 0 8px 0' }}>제출 완료</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#228738', margin: 0 }}>
                {evaluatorInfos.filter(e => e.is_submitted).length}
              </p>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6d7882', margin: '0 0 8px 0' }}>평가 미시작</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#6d7882', margin: 0 }}>
                {evaluatorInfos.filter(e => !e.is_submitted && !Object.keys(localEvaluations).includes(e.name)).length}
              </p>
            </div>
          </div>

          {/* 평가위원 목록 */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>📋 평가위원 상세 현황</h4>
              <button
                type="button"
                onClick={loadData}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #cdd1d5',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#464c53',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🔄 새로고침
              </button>
            </div>

            {evaluatorInfos.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6d7882' }}>
                <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>👥</p>
                <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>등록된 평가위원이 없습니다.</p>
                <p style={{ fontSize: '14px', margin: 0 }}>평가위원이 이름을 입력하면 자동으로 등록됩니다.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f5f6' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '50px' }}>#</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53' }}>평가위원명</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>등록일시</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>평가 진행</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>제출 상태</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatorInfos.map((evaluator, index) => {
                    const evaluatorEvaluations = localEvaluations[evaluator.name] || [];
                    const completedCount = evaluatorEvaluations.length;
                    const totalProposals = proposals.length;
                    const progress = totalProposals > 0 ? (completedCount / totalProposals) * 100 : 0;

                    return (
                      <tr key={evaluator.id} style={{ borderBottom: '1px solid #e6e8ea' }}>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: '#6d7882' }}>{index + 1}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: evaluator.is_submitted ? '#228738' : completedCount > 0 ? '#ffb114' : '#e6e8ea',
                              color: evaluator.is_submitted || completedCount > 0 ? '#fff' : '#6d7882',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 600,
                            }}>
                              {evaluator.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500, color: '#1e2124' }}>{evaluator.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: '#6d7882', fontSize: '13px' }}>
                          {new Date(evaluator.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e6e8ea', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                backgroundColor: progress === 100 ? '#228738' : progress > 0 ? '#ffb114' : '#e6e8ea',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: progress === 100 ? '#228738' : progress > 0 ? '#ffb114' : '#6d7882',
                              minWidth: '60px',
                              textAlign: 'right',
                            }}>
                              {completedCount}/{totalProposals}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {evaluator.is_submitted ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#eaf6ec',
                              color: '#228738',
                              borderRadius: '16px',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}>
                              ✓ 제출완료
                            </span>
                          ) : completedCount === totalProposals && totalProposals > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '16px',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}>
                              ⏳ 제출대기
                            </span>
                          ) : completedCount > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#e8f4fd',
                              color: '#256ef4',
                              borderRadius: '16px',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}>
                              🔄 평가중
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#f4f5f6',
                              color: '#6d7882',
                              borderRadius: '16px',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}>
                              — 미시작
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {evaluator.is_submitted && (
                            <button
                              type="button"
                              onClick={() => handleUnlockEvaluator(evaluator.id, evaluator.name)}
                              disabled={unlockingEvaluator === evaluator.id}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #f05f42',
                                borderRadius: '4px',
                                backgroundColor: '#fff',
                                color: '#f05f42',
                                fontSize: '12px',
                                cursor: unlockingEvaluator === evaluator.id ? 'not-allowed' : 'pointer',
                                opacity: unlockingEvaluator === evaluator.id ? 0.6 : 1,
                              }}
                            >
                              {unlockingEvaluator === evaluator.id ? '처리중...' : '🔓 제출해제'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 평가위원별 상세 평가 현황 */}
          {evaluatorInfos.length > 0 && Object.keys(localEvaluations).length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', marginTop: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ea' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: 0 }}>📊 평가위원별 제안서 평가 현황</h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f5f6' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53', position: 'sticky', left: 0, backgroundColor: '#f4f5f6' }}>평가위원</th>
                      {proposals.map(p => (
                        <th key={p.id} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53', minWidth: '80px' }}>
                          제안서 {p.name}
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluatorInfos.map(evaluator => {
                      const evaluatorEvaluations = localEvaluations[evaluator.name] || [];
                      const totalScore = evaluatorEvaluations.reduce((sum, ev) => sum + ev.totalScore, 0);

                      return (
                        <tr key={evaluator.id} style={{ borderBottom: '1px solid #e6e8ea' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500, position: 'sticky', left: 0, backgroundColor: '#fff' }}>
                            {evaluator.name}
                            {evaluator.is_submitted && <span style={{ marginLeft: '6px', color: '#228738' }}>✓</span>}
                          </td>
                          {proposals.map(p => {
                            const ev = evaluatorEvaluations.find(e => e.proposalId === p.id);
                            return (
                              <td key={p.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                {ev ? (
                                  <span style={{ fontWeight: 600, color: '#256ef4' }}>{ev.totalScore.toFixed(1)}</span>
                                ) : (
                                  <span style={{ color: '#cdd1d5' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#1e2124' }}>
                            {totalScore > 0 ? totalScore.toFixed(1) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* 집계표 출력 - 정성적 평가 점수 집계표 (제안서별) */
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
          {/* 출력 버튼 */}
          <div className="no-print" style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: '0 0 4px 0' }}>📊 정성적 평가 점수 집계표</h3>
                <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>
                  제안서별로 평가위원의 점수를 확인하고, 최상위/최하위를 제외한 평균을 산정합니다
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#256ef4',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🖨️ 인쇄하기
              </button>
            </div>
          </div>

          {/* 집계표 인쇄 영역 */}
          {evaluatorNames.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', color: '#464c53' }}>평가 데이터가 없습니다.</p>
            </div>
          ) : (
            <QualitativeScoreSummary
              proposals={proposals}
              localEvaluations={localEvaluations}
              evaluatorNames={evaluatorNames}
            />
          )}
        </main>
      )}
    </div>
  );
}
