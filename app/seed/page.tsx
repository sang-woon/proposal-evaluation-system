'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_EVALUATION_CRITERIA, calculateGradeScore, type GradeLevel } from '@/types/evaluation';

const SAMPLE_EVALUATORS = ['김철수', '이영희', '박민수', '정수진', '최동훈', '한지민', '오승환', '윤서연'];

const GRADES: GradeLevel[] = ['수', '우', '미', '양', '가'];

// 제안사 이름 생성 (A, B, C, ... Z, AA, AB, ...)
function getProposalName(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index); // A-Z
  }
  return String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));
}

// 제안서 목록 동적 생성
function generateProposals(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: getProposalName(i),
    orderNum: i + 1,
  }));
}

// 제안서별 기본 점수 성향 동적 생성 (첫번째가 가장 높음)
function generateProposalBias(count: number): Record<string, number> {
  const bias: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    // 0.9 ~ 0.5 사이로 균등 분배
    bias[`p${i + 1}`] = 0.9 - (i * 0.4 / Math.max(count - 1, 1));
  }
  return bias;
}

function getRandomGrade(bias: number): GradeLevel {
  const rand = Math.random();
  const adjustedRand = rand * 0.4 + bias * 0.6; // bias 영향 60%

  if (adjustedRand > 0.85) return '수';
  if (adjustedRand > 0.7) return '우';
  if (adjustedRand > 0.5) return '미';
  if (adjustedRand > 0.3) return '양';
  return '가';
}

function generateEvaluation(
  evaluatorName: string,
  proposalId: string,
  proposals: { id: string; name: string; orderNum: number }[],
  proposalBias: Record<string, number>
) {
  const bias = proposalBias[proposalId] || 0.5;
  const scores: Record<string, GradeLevel> = {};
  let totalScore = 0;

  DEFAULT_EVALUATION_CRITERIA.forEach(category => {
    category.items.forEach(item => {
      const grade = getRandomGrade(bias + (Math.random() - 0.5) * 0.2);
      scores[item.id] = grade;
      totalScore += calculateGradeScore(item.maxScore, grade);
    });
  });

  return {
    evaluatorName,
    proposalId,
    scores,
    totalScore: Math.round(totalScore * 10) / 10,
    comment: `${evaluatorName} 평가위원의 제안서 ${proposals.find(p => p.id === proposalId)?.name} 평가`,
    savedAt: new Date().toISOString(),
  };
}

export default function SeedPage() {
  const [status, setStatus] = useState<string>('');
  const [seeded, setSeeded] = useState(false);
  const [proposalCount, setProposalCount] = useState(7);

  // localStorage에서 저장된 제안사 수 불러오기
  useEffect(() => {
    const savedCount = localStorage.getItem('proposalCount');
    if (savedCount) {
      setProposalCount(parseInt(savedCount, 10));
    }
  }, []);

  const handleSeed = () => {
    const proposals = generateProposals(proposalCount);
    const proposalBias = generateProposalBias(proposalCount);
    const allEvaluations: Record<string, any[]> = {};

    SAMPLE_EVALUATORS.forEach(evaluator => {
      allEvaluations[evaluator] = proposals.map(proposal =>
        generateEvaluation(evaluator, proposal.id, proposals, proposalBias)
      );
    });

    // 평가 데이터와 제안사 정보 저장
    localStorage.setItem('allEvaluations', JSON.stringify(allEvaluations));
    localStorage.setItem('proposalCount', proposalCount.toString());
    localStorage.setItem('proposals', JSON.stringify(proposals));

    setStatus(`✅ ${SAMPLE_EVALUATORS.length}명의 평가위원 × ${proposalCount}개 제안서 = ${SAMPLE_EVALUATORS.length * proposalCount}개 평가 데이터 생성 완료!`);
    setSeeded(true);
  };

  const handleClear = () => {
    localStorage.removeItem('allEvaluations');
    localStorage.removeItem('evaluationSubmissionLocked');
    setStatus('🗑️ 모든 평가 데이터가 삭제되었습니다.');
    setSeeded(false);
  };

  const checkData = () => {
    const data = localStorage.getItem('allEvaluations');
    if (data) {
      const parsed = JSON.parse(data);
      const evaluators = Object.keys(parsed);
      const totalEvals = evaluators.reduce((sum, e) => sum + parsed[e].length, 0);
      setStatus(`📊 현재 데이터: ${evaluators.length}명 평가위원, ${totalEvals}개 평가\n평가위원: ${evaluators.join(', ')}`);
    } else {
      setStatus('❌ 저장된 평가 데이터가 없습니다.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f5f6',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      padding: '40px',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e6e8ea',
        padding: '32px',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#256ef4', marginBottom: '8px' }}>
          테스트 데이터 관리
        </h1>
        <p style={{ fontSize: '14px', color: '#6d7882', marginBottom: '24px' }}>
          평가 시스템 테스트를 위한 샘플 데이터를 생성하거나 삭제합니다.
        </p>

        {/* 제안사 수 선택 */}
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#464c53', marginBottom: '8px' }}>
            제안사 수 선택
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={proposalCount}
              onChange={(e) => setProposalCount(parseInt(e.target.value, 10))}
              style={{
                padding: '10px 16px',
                fontSize: '16px',
                border: '1px solid #cdd1d5',
                borderRadius: '8px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                minWidth: '120px',
              }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}개</option>
              ))}
            </select>
            <span style={{ fontSize: '14px', color: '#6d7882' }}>
              제안사: {Array.from({ length: proposalCount }, (_, i) => getProposalName(i)).join(', ')}사
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={handleSeed}
            style={{
              padding: '14px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#256ef4',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🌱 샘플 데이터 생성 ({SAMPLE_EVALUATORS.length}명 × {proposalCount}개 제안서)
          </button>

          <button
            onClick={checkData}
            style={{
              padding: '14px 24px',
              border: '1px solid #cdd1d5',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#464c53',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            📊 현재 데이터 확인
          </button>

          <button
            onClick={handleClear}
            style={{
              padding: '14px 24px',
              border: '1px solid #de3412',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#de3412',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🗑️ 모든 데이터 삭제
          </button>
        </div>

        {status && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f4f5f6',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1e2124',
            whiteSpace: 'pre-wrap',
          }}>
            {status}
          </div>
        )}

        {seeded && (
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <a
              href="/evaluation"
              style={{
                flex: 1,
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#228738',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              평가 페이지 →
            </a>
            <a
              href="/results"
              style={{
                flex: 1,
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#256ef4',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              결과 집계 →
            </a>
            <a
              href="/admin/dashboard"
              style={{
                flex: 1,
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#6d7882',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              관리자 →
            </a>
          </div>
        )}

        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#ecf2fe', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#256ef4', marginBottom: '8px' }}>
            생성되는 샘플 데이터
          </h3>
          <ul style={{ fontSize: '13px', color: '#464c53', margin: 0, paddingLeft: '20px' }}>
            <li>평가위원 {SAMPLE_EVALUATORS.length}명: {SAMPLE_EVALUATORS.join(', ')}</li>
            <li>제안서 {proposalCount}개: {getProposalName(0)} ~ {getProposalName(proposalCount - 1)}사</li>
            <li>각 평가위원이 모든 제안서를 평가 (총 {SAMPLE_EVALUATORS.length * proposalCount}개 평가)</li>
            <li>{getProposalName(0)}사가 평균적으로 높은 점수, {getProposalName(proposalCount - 1)}사가 낮은 점수로 설정</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
