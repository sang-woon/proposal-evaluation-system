/**
 * 평가위원 8명 및 제안사 A, B, C 평가 데이터 시드 스크립트
 * 실행: npx tsx scripts/seed-evaluations.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 평가위원 8명
const EVALUATORS = [
  '평가위원1',
  '평가위원2',
  '평가위원3',
  '평가위원4',
  '평가위원5',
  '평가위원6',
  '평가위원7',
  '평가위원8',
];

// 제안사 3개
const PROPOSALS = [
  { id: 'p1', name: '제안사 A' },
  { id: 'p2', name: '제안사 B' },
  { id: 'p3', name: '제안사 C' },
];

// 평가항목 23개 (배점 포함)
const EVALUATION_ITEMS = [
  { id: 'c1-1', maxScore: 4 },
  { id: 'c1-2', maxScore: 2 },
  { id: 'c1-3', maxScore: 3 },
  { id: 'c1-4', maxScore: 1 },
  { id: 'c2-1', maxScore: 4 },
  { id: 'c2-2', maxScore: 6 },
  { id: 'c2-3', maxScore: 3 },
  { id: 'c2-4', maxScore: 3 },
  { id: 'c2-5', maxScore: 2 },
  { id: 'c2-6', maxScore: 2 },
  { id: 'c3-1', maxScore: 6 },
  { id: 'c3-2', maxScore: 5 },
  { id: 'c3-3', maxScore: 3 },
  { id: 'c3-4', maxScore: 3 },
  { id: 'c4-1', maxScore: 4 },
  { id: 'c4-2', maxScore: 4 },
  { id: 'c4-3', maxScore: 3 },
  { id: 'c4-4', maxScore: 2 },
  { id: 'c4-5', maxScore: 2 },
  { id: 'c5-1', maxScore: 2 },
  { id: 'c5-2', maxScore: 2 },
  { id: 'c5-3', maxScore: 2 },
  { id: 'c6-1', maxScore: 2 },
];

// 등급별 비율
const GRADE_RATES: Record<string, number> = {
  '수': 1.0,
  '우': 0.9,
  '미': 0.8,
  '양': 0.7,
  '가': 0.6,
};

const GRADES = ['수', '우', '미', '양', '가'];

// 랜덤 등급 생성 (약간의 편향 적용 - 중간 등급이 더 많이 나오도록)
function getRandomGrade(): string {
  const weights = [0.15, 0.25, 0.30, 0.20, 0.10]; // 수, 우, 미, 양, 가
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < GRADES.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return GRADES[i];
    }
  }
  return '미';
}

// 제안사별 기본 성향 (A가 가장 좋고, C가 가장 낮음)
function getProposalBias(proposalId: string): number {
  switch (proposalId) {
    case 'p1': return 0.1;  // A: 약간 높은 점수 경향
    case 'p2': return 0;    // B: 평균
    case 'p3': return -0.1; // C: 약간 낮은 점수 경향
    default: return 0;
  }
}

// 제안사에 따른 등급 조정
function getAdjustedGrade(proposalId: string): string {
  const bias = getProposalBias(proposalId);
  const baseRandom = Math.random() + bias;

  if (baseRandom > 0.85) return '수';
  if (baseRandom > 0.60) return '우';
  if (baseRandom > 0.35) return '미';
  if (baseRandom > 0.15) return '양';
  return '가';
}

// 평가 데이터 생성
function generateEvaluationData(evaluatorName: string, proposal: typeof PROPOSALS[0]) {
  const scores: Record<string, { grade: string; score: number }> = {};
  let totalScore = 0;

  for (const item of EVALUATION_ITEMS) {
    const grade = getAdjustedGrade(proposal.id);
    const score = item.maxScore * GRADE_RATES[grade];
    scores[item.id] = { grade, score };
    totalScore += score;
  }

  return {
    evaluatorName,
    proposalId: proposal.id,
    proposalName: proposal.name,
    scores,
    totalScore: Math.round(totalScore * 100) / 100,
    comment: `${evaluatorName}의 ${proposal.name} 평가 완료`,
  };
}

// API 호출
async function saveEvaluation(data: ReturnType<typeof generateEvaluationData>) {
  const response = await fetch(`${BASE_URL}/api/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (result.error) {
    console.error(`❌ Error saving ${data.evaluatorName} - ${data.proposalName}:`, result.error);
    return false;
  }
  console.log(`✅ ${data.evaluatorName} - ${data.proposalName}: ${data.totalScore}점`);
  return true;
}

// 메인 실행
async function main() {
  console.log('🚀 평가 데이터 시드 시작...\n');
  console.log(`📋 평가위원: ${EVALUATORS.length}명`);
  console.log(`📋 제안사: ${PROPOSALS.map(p => p.name).join(', ')}`);
  console.log(`📋 평가항목: ${EVALUATION_ITEMS.length}개\n`);

  let successCount = 0;
  let failCount = 0;

  for (const evaluator of EVALUATORS) {
    console.log(`\n👤 ${evaluator} 평가 등록 중...`);

    for (const proposal of PROPOSALS) {
      const data = generateEvaluationData(evaluator, proposal);
      const success = await saveEvaluation(data);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // API 부하 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 완료: ${successCount}건 성공, ${failCount}건 실패`);
  console.log(`📊 총 ${EVALUATORS.length}명 × ${PROPOSALS.length}개 제안사 = ${EVALUATORS.length * PROPOSALS.length}건`);
}

main().catch(console.error);
