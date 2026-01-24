'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { ScoringSheet, AggregationTable } from '@/components/evaluation';
import {
  type GradeLevel,
  type EvaluatorScoreSheet,
  type AggregatedScore,
  calculateGradeScore,
  DEFAULT_EVALUATION_CRITERIA,
} from '@/types/evaluation';
import { aggregateScores } from '@/lib/aggregation';

// 샘플 데이터
const PROJECT_NAME = "'24년 경기도의회 의정 정보시스템(의정포털, 의정자료유통) 통합 운영";

const SAMPLE_PROPOSALS = [
  { id: 'p1', name: 'A', orderNum: 1 },
  { id: 'p2', name: 'B', orderNum: 2 },
  { id: 'p3', name: 'C', orderNum: 3 },
];

const SAMPLE_EVALUATORS = [
  { id: 'e1', name: '평가위원 1' },
  { id: 'e2', name: '평가위원 2' },
  { id: 'e3', name: '평가위원 3' },
  { id: 'e4', name: '평가위원 4' },
  { id: 'e5', name: '평가위원 5' },
];

// 샘플 점수 데이터 생성
function generateSampleScores(): Record<string, Record<string, Record<string, GradeLevel>>> {
  const grades: GradeLevel[] = ['수', '우', '미', '양', '가'];
  const scores: Record<string, Record<string, Record<string, GradeLevel>>> = {};

  SAMPLE_PROPOSALS.forEach(proposal => {
    scores[proposal.id] = {};
    SAMPLE_EVALUATORS.forEach(evaluator => {
      scores[proposal.id][evaluator.id] = {};
      DEFAULT_EVALUATION_CRITERIA.forEach(category => {
        category.items.forEach(item => {
          // 랜덤하게 등급 부여 (편향: 수, 우가 더 많이 나오도록)
          const random = Math.random();
          let grade: GradeLevel;
          if (random < 0.3) grade = '수';
          else if (random < 0.6) grade = '우';
          else if (random < 0.8) grade = '미';
          else if (random < 0.95) grade = '양';
          else grade = '가';
          scores[proposal.id][evaluator.id][item.id] = grade;
        });
      });
    });
  });

  return scores;
}

type PrintMode = 'scoring' | 'aggregation' | 'both';

export default function PrintPage() {
  const [selectedProposal, setSelectedProposal] = useState(SAMPLE_PROPOSALS[0].id);
  const [selectedEvaluator, setSelectedEvaluator] = useState(SAMPLE_EVALUATORS[0].id);
  const [printMode, setPrintMode] = useState<PrintMode>('scoring');

  // 샘플 점수 (실제로는 DB에서 가져옴)
  const [allScores] = useState(() => generateSampleScores());

  // 현재 선택된 평가위원의 점수
  const currentScores = useMemo(() => {
    return allScores[selectedProposal]?.[selectedEvaluator] || {};
  }, [allScores, selectedProposal, selectedEvaluator]);

  // 총점 계산
  const calculateTotalScore = (scores: Record<string, GradeLevel>): number => {
    let total = 0;
    DEFAULT_EVALUATION_CRITERIA.forEach(category => {
      category.items.forEach(item => {
        const grade = scores[item.id];
        if (grade) {
          total += calculateGradeScore(item.maxScore, grade);
        }
      });
    });
    return Math.round(total * 10) / 10;
  };

  // 집계 데이터 생성
  const aggregatedData = useMemo((): AggregatedScore => {
    const proposal = SAMPLE_PROPOSALS.find(p => p.id === selectedProposal)!;
    const scoreSheets: EvaluatorScoreSheet[] = SAMPLE_EVALUATORS.map(evaluator => {
      const scores = allScores[selectedProposal]?.[evaluator.id] || {};
      return {
        evaluatorId: evaluator.id,
        evaluatorName: evaluator.name,
        proposalId: proposal.id,
        proposalName: proposal.name,
        scores: Object.entries(scores).map(([criterionId, grade]) => ({
          criterionId,
          grade,
          score: 0, // 개별 점수는 계산에 필요 없음
        })),
        totalScore: calculateTotalScore(scores),
        comment: '',
      };
    });

    return aggregateScores(proposal.id, proposal.name, scoreSheets);
  }, [allScores, selectedProposal]);

  const handlePrint = () => {
    window.print();
  };

  const currentProposal = SAMPLE_PROPOSALS.find(p => p.id === selectedProposal)!;
  const currentEvaluator = SAMPLE_EVALUATORS.find(e => e.id === selectedEvaluator)!;

  return (
    <div className="print-page">
      {/* 컨트롤 패널 (인쇄 시 숨김) */}
      <div className="control-panel no-print">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">평가서 출력</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* 출력 유형 선택 */}
          <div className="form-group">
            <label className="form-label">출력 유형</label>
            <select
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              className="form-input"
            >
              <option value="scoring">평가위원별 채점표</option>
              <option value="aggregation">정성적 평가 점수 집계표</option>
              <option value="both">둘 다 출력</option>
            </select>
          </div>

          {/* 제안서 선택 */}
          <div className="form-group">
            <label className="form-label">제안서</label>
            <select
              value={selectedProposal}
              onChange={(e) => setSelectedProposal(e.target.value)}
              className="form-input"
            >
              {SAMPLE_PROPOSALS.map(proposal => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.name}
                </option>
              ))}
            </select>
          </div>

          {/* 평가위원 선택 (채점표 출력 시만) */}
          {(printMode === 'scoring' || printMode === 'both') && (
            <div className="form-group">
              <label className="form-label">평가위원</label>
              <select
                value={selectedEvaluator}
                onChange={(e) => setSelectedEvaluator(e.target.value)}
                className="form-input"
              >
                {SAMPLE_EVALUATORS.map(evaluator => (
                  <option key={evaluator.id} value={evaluator.id}>
                    {evaluator.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 인쇄 버튼 */}
          <div className="form-group flex items-end">
            <Button onClick={handlePrint} className="w-full">
              🖨️ 인쇄
            </Button>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="alert alert-info mb-6">
          <strong>💡 안내:</strong> 인쇄 시 A4 용지 크기에 맞게 출력됩니다.
          브라우저 인쇄 설정에서 '배경 그래픽' 옵션을 활성화하면 배경색이 함께 인쇄됩니다.
        </div>
      </div>

      {/* 미리보기 영역 */}
      <div className="a4-preview">
        {/* 평가위원별 채점표 */}
        {(printMode === 'scoring' || printMode === 'both') && (
          <div className="a4-page">
            <ScoringSheet
              projectName={PROJECT_NAME}
              proposalName={currentProposal.name}
              evaluatorName={currentEvaluator.name}
              initialScores={currentScores}
              readOnly={true}
              isPrintMode={true}
            />
          </div>
        )}

        {/* 페이지 구분 */}
        {printMode === 'both' && <div className="page-break" />}

        {/* 정성적 평가 점수 집계표 */}
        {(printMode === 'aggregation' || printMode === 'both') && (
          <div className="a4-page">
            <AggregationTable
              projectName={PROJECT_NAME}
              aggregatedScore={aggregatedData}
              date={new Date()}
              isPrintMode={true}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .print-page {
          min-height: 100vh;
        }

        .control-panel {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .a4-preview {
          background: #e0e0e0;
          padding: 20px;
          min-height: calc(100vh - 200px);
        }

        .a4-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 20px;
          padding: 15mm;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          box-sizing: border-box;
        }

        @media print {
          .print-page {
            background: white;
          }

          .a4-preview {
            background: white;
            padding: 0;
          }

          .a4-page {
            width: 100%;
            min-height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }

          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
