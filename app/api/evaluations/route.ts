/**
 * 평가 데이터 API (Supabase 연동)
 * - GET: 평가 조회 (평가위원별, 제안서별 필터 가능)
 * - POST: 평가 저장
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type {
  Proposal,
  Evaluator,
  EvaluationScore,
  Evaluation
} from '@/types/database';

// 평가 데이터 타입
interface EvaluationData {
  evaluatorName: string;
  proposalId: string;
  proposalName: string;
  scores: Record<string, { grade: string; score: number }>;
  totalScore: number;
  comment?: string;
}

// GET: 평가 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evaluatorName = searchParams.get('evaluatorName');
  const proposalId = searchParams.get('proposalId');
  const all = searchParams.get('all'); // 모든 평가 데이터 조회

  try {
    // 제안서 정보 조회
    const { data: proposalsData, error: propError } = await supabase
      .from('proposal')
      .select('*')
      .order('order_num');

    if (propError) {
      return NextResponse.json({ data: null, error: propError.message }, { status: 500 });
    }
    const proposals = (proposalsData || []) as Proposal[];

    // 평가위원 정보 조회
    let evaluatorQuery = supabase.from('evaluator').select('*');
    if (evaluatorName) {
      evaluatorQuery = evaluatorQuery.eq('name', evaluatorName);
    }
    const { data: evaluatorsData, error: evalError } = await evaluatorQuery;

    if (evalError) {
      return NextResponse.json({ data: null, error: evalError.message }, { status: 500 });
    }
    const evaluators = (evaluatorsData || []) as Evaluator[];

    // 모든 데이터 조회 모드 (관리자용)
    if (all === 'true') {
      // 모든 평가 점수 조회
      const { data: allScoresData, error: scoresError } = await supabase
        .from('evaluation_score')
        .select('*');

      if (scoresError) {
        console.error('evaluation_score 조회 실패:', scoresError);
        // 테이블이 없거나 오류 시 빈 배열로 진행
      }
      const allScores = (allScoresData || []) as EvaluationScore[];

      // 모든 평가 요약 조회 (evaluation 테이블이 없을 수 있음)
      let allEvaluations: Evaluation[] = [];
      try {
        const { data: evalData, error: evalsError } = await supabase
          .from('evaluation')
          .select('*');

        if (!evalsError && evalData) {
          allEvaluations = evalData as Evaluation[];
        }
      } catch (e) {
        console.log('evaluation 테이블 조회 실패 (테이블이 없을 수 있음):', e);
      }

      // 평가위원별로 데이터 그룹화
      const evaluationsByEvaluator: Record<string, unknown[]> = {};

      for (const evaluator of evaluators) {
        const evaluatorScores = allScores.filter(s => s.evaluator_id === evaluator.id);
        const evaluatorEvals = allEvaluations.filter(e => e.evaluator_id === evaluator.id);

        // 제안서별로 평가 데이터 구성
        const evaluationsForEvaluator: unknown[] = [];

        for (const proposal of proposals) {
          const proposalScores = evaluatorScores.filter(s => s.proposal_id === proposal.id);

          // 점수가 없으면 스킵
          if (proposalScores.length === 0) continue;

          const evalSummary = evaluatorEvals.find(e => e.proposal_id === proposal.id);

          const scoresMap: Record<string, string> = {};
          let calculatedTotal = 0;
          proposalScores.forEach(s => {
            if (s.grade) {
              scoresMap[s.item_id] = s.grade;
            }
            if (s.score) {
              calculatedTotal += Number(s.score);
            }
          });

          evaluationsForEvaluator.push({
            evaluatorName: evaluator.name,
            proposalId: proposal.id,
            scores: scoresMap,
            totalScore: evalSummary?.total_score ?? calculatedTotal,
            comment: evalSummary?.comment || '',
            savedAt: evalSummary?.saved_at || proposalScores[0]?.created_at || new Date().toISOString(),
          });
        }

        if (evaluationsForEvaluator.length > 0) {
          evaluationsByEvaluator[evaluator.name] = evaluationsForEvaluator;
        }
      }

      return NextResponse.json({
        data: {
          evaluations: evaluationsByEvaluator,
          proposals,
          evaluators,
        },
        error: null,
      });
    }

    // 특정 평가위원의 평가 조회
    if (evaluatorName && evaluators.length > 0) {
      const evaluator = evaluators[0];

      // 평가 점수 조회
      let scoresQuery = supabase
        .from('evaluation_score')
        .select('*')
        .eq('evaluator_id', evaluator.id);

      if (proposalId) {
        scoresQuery = scoresQuery.eq('proposal_id', proposalId);
      }

      const { data: scoresData, error: scoresError } = await scoresQuery;

      if (scoresError) {
        return NextResponse.json({ data: null, error: scoresError.message }, { status: 500 });
      }
      const scores = (scoresData || []) as EvaluationScore[];

      // 평가 요약 조회 (테이블이 없을 수 있음)
      let evaluations: Evaluation[] = [];
      try {
        let evalsQuery = supabase
          .from('evaluation')
          .select('*')
          .eq('evaluator_id', evaluator.id);

        if (proposalId) {
          evalsQuery = evalsQuery.eq('proposal_id', proposalId);
        }

        const { data: evalData, error: evalsError } = await evalsQuery;
        if (!evalsError && evalData) {
          evaluations = evalData as Evaluation[];
        }
      } catch (e) {
        console.log('evaluation 테이블 조회 실패:', e);
      }

      // 제안서별로 평가 데이터 구성
      const savedEvaluations: unknown[] = [];

      for (const proposal of proposals) {
        const proposalScores = scores.filter(s => s.proposal_id === proposal.id);

        // 점수가 없으면 스킵
        if (proposalScores.length === 0) continue;

        const evalSummary = evaluations.find(e => e.proposal_id === proposal.id);

        const scoresMap: Record<string, string> = {};
        let calculatedTotal = 0;
        proposalScores.forEach(s => {
          if (s.grade) {
            scoresMap[s.item_id] = s.grade;
          }
          if (s.score) {
            calculatedTotal += Number(s.score);
          }
        });

        savedEvaluations.push({
          evaluatorName: evaluator.name,
          proposalId: proposal.id,
          scores: scoresMap,
          totalScore: evalSummary?.total_score ?? calculatedTotal,
          comment: evalSummary?.comment || '',
          savedAt: evalSummary?.saved_at || proposalScores[0]?.created_at || new Date().toISOString(),
        });
      }

      return NextResponse.json({
        data: {
          evaluator,
          savedEvaluations,
          proposals,
        },
        error: null,
      });
    }

    return NextResponse.json({
      data: {
        evaluators,
        proposals,
      },
      error: null,
    });
  } catch (error) {
    console.error('GET /api/evaluations error:', error);
    return NextResponse.json(
      { data: null, error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 평가 저장
export async function POST(request: NextRequest) {
  try {
    const body: EvaluationData = await request.json();

    // 입력 검증
    if (!body.evaluatorName || !body.proposalId || !body.scores) {
      return NextResponse.json(
        { data: null, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. 평가위원이 존재하는지 확인, 없으면 생성
    const { data: existingEvaluator } = await supabase
      .from('evaluator')
      .select('*')
      .eq('name', body.evaluatorName)
      .single();

    let evaluator = existingEvaluator as Evaluator | null;

    if (!evaluator) {
      const { data: newEvaluator, error: createError } = await supabase
        .from('evaluator')
        .insert([{ name: body.evaluatorName }] as unknown as never[])
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { data: null, error: `평가위원 생성 실패: ${createError.message}` },
          { status: 500 }
        );
      }
      evaluator = newEvaluator as Evaluator;
    }

    if (!evaluator) {
      return NextResponse.json(
        { data: null, error: '평가위원 정보를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 2. 제안서가 존재하는지 확인, 없으면 생성
    const { data: existingProposal } = await supabase
      .from('proposal')
      .select('*')
      .eq('id', body.proposalId)
      .single();

    let proposal = existingProposal as Proposal | null;

    if (!proposal) {
      const orderNum = parseInt(body.proposalId.replace('p', '')) || 1;
      const { data: newProposal, error: createPropError } = await supabase
        .from('proposal')
        .insert([{
          id: body.proposalId,
          name: body.proposalName || `제안사 ${String.fromCharCode(64 + orderNum)}`,
          order_num: orderNum,
        }] as unknown as never[])
        .select()
        .single();

      if (createPropError) {
        const { data: retryProposal } = await supabase
          .from('proposal')
          .select('*')
          .eq('id', body.proposalId)
          .single();
        proposal = retryProposal as Proposal | null;
      } else {
        proposal = newProposal as Proposal;
      }
    }

    // 3. 기존 평가 점수 삭제 (해당 평가위원 + 제안서)
    await supabase
      .from('evaluation_score')
      .delete()
      .eq('evaluator_id', evaluator.id)
      .eq('proposal_id', body.proposalId);

    // 4. 새 평가 점수 저장 (grade와 score 모두 저장)
    const scoreRecords = Object.entries(body.scores).map(([itemId, data]) => ({
      evaluator_id: evaluator.id,
      proposal_id: body.proposalId,
      item_id: itemId,
      score: data.score,
      grade: data.grade,
    }));

    const { error: saveError } = await supabase
      .from('evaluation_score')
      .insert(scoreRecords as unknown as never[]);

    if (saveError) {
      return NextResponse.json(
        { data: null, error: `점수 저장 실패: ${saveError.message}` },
        { status: 500 }
      );
    }

    // 5. 평가 요약 저장 (upsert)
    const { error: evalError } = await supabase
      .from('evaluation')
      .upsert([{
        evaluator_id: evaluator.id,
        proposal_id: body.proposalId,
        total_score: body.totalScore,
        comment: body.comment || '',
        saved_at: new Date().toISOString(),
      }] as unknown as never[], {
        onConflict: 'evaluator_id,proposal_id',
      });

    if (evalError) {
      console.error('Evaluation summary save error:', evalError);
      // 평가 요약 저장 실패해도 점수는 저장됨
    }

    return NextResponse.json({
      data: {
        evaluatorId: evaluator.id,
        proposalId: body.proposalId,
        totalScore: body.totalScore,
        message: '평가가 저장되었습니다.',
      },
      error: null,
    });
  } catch (error) {
    console.error('POST /api/evaluations error:', error);
    return NextResponse.json(
      { data: null, error: '평가 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
