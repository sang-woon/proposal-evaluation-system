'use client';

import { useState, useMemo, useEffect, useRef, Fragment, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  type GradeLevel,
  calculateGradeScore,
  DEFAULT_EVALUATION_CRITERIA,
  QUALITATIVE_TOTAL_SCORE,
} from '@/types/evaluation';
import { DocumentDownload } from '@/components/evaluation/DocumentDownload';
import type { ProposalDocument, DocumentType } from '@/types/document';

const PROJECT_NAME = "경기도의회 블록체인 기반 모바일 의정지원 시스템 구축";

// 제안서 타입
interface Proposal {
  id: string;
  name: string;
  order_num: number;
}

// 토스트 알림 컴포넌트
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? '#228738' : type === 'error' ? '#de3412' : '#256ef4';

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 500,
        animation: 'fadeInOut 2s ease-in-out',
      }}
    >
      {message}
    </div>
  );
}

// 기본 제안서 (API 로드 실패 시 사용)
const DEFAULT_PROPOSALS: Proposal[] = [
  { id: 'p1', name: 'A', order_num: 1 },
  { id: 'p2', name: 'B', order_num: 2 },
  { id: 'p3', name: 'C', order_num: 3 },
];

const GRADE_LABELS: GradeLevel[] = ['수', '우', '미', '양', '가'];

const GRADE_STYLES: Record<GradeLevel, { bg: string; text: string }> = {
  '수': { bg: '#256ef4', text: '#ffffff' },
  '우': { bg: '#228738', text: '#ffffff' },
  '미': { bg: '#ffb114', text: '#1e2124' },
  '양': { bg: '#f05f42', text: '#ffffff' },
  '가': { bg: '#de3412', text: '#ffffff' },
};

const GRADE_DESC: Record<GradeLevel, string> = {
  '수': '매우 우수 (100%)',
  '우': '우수 (90%)',
  '미': '보통 (80%)',
  '양': '미흡 (70%)',
  '가': '매우 미흡 (60%)',
};

interface SavedEvaluation {
  evaluatorName: string;
  proposalId: string;
  scores: Record<string, GradeLevel>;
  totalScore: number;
  comment: string;
  savedAt: string;
}

export default function EvaluationPage() {
  const [evaluatorName, setEvaluatorName] = useState('');
  const [tempName, setTempName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>(DEFAULT_PROPOSALS);
  const [selectedProposal, setSelectedProposal] = useState(DEFAULT_PROPOSALS[0].id);
  const [scores, setScores] = useState<Record<string, GradeLevel>>({});
  const [comment, setComment] = useState('');
  const [savedEvaluations, setSavedEvaluations] = useState<SavedEvaluation[]>([]);
  const [viewMode, setViewMode] = useState<'input' | 'review' | 'documents'>('input');
  const [activeCategory, setActiveCategory] = useState(DEFAULT_EVALUATION_CRITERIA[0].id);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewModeHistory, setViewModeHistory] = useState<Array<'input' | 'review' | 'documents'>>(['input']);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Supabase에서 평가 데이터 로드 (병렬 페칭으로 워터폴 제거)
  const loadEvaluationsFromSupabase = async (name: string) => {
    setIsLoading(true);
    try {
      // 평가위원 제출 상태와 평가 데이터를 병렬로 로드
      const [evaluatorResult, evaluationsResult] = await Promise.all([
        fetch(`/api/evaluators?name=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .catch(() => ({ data: null })),
        fetch(`/api/evaluations?evaluatorName=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .catch(() => ({ data: null })),
      ]);

      // 평가위원 제출 상태 확인
      if (evaluatorResult.data && evaluatorResult.data.is_submitted === true) {
        setIsSubmitted(true);
        setIsSubmissionLocked(true);
      }

      const result = evaluationsResult;

      if (result.data) {
        // 제안서 목록 로드
        if (result.data.proposals && result.data.proposals.length > 0) {
          const loadedProposals = result.data.proposals.map((p: any) => ({
            id: p.id,
            name: p.name.replace('제안사 ', ''),
            order_num: p.order_num,
          }));
          setProposals(loadedProposals);
          setSelectedProposal(loadedProposals[0].id);
        }

        // 저장된 평가 데이터 로드
        if (result.data.savedEvaluations) {
          setSavedEvaluations(result.data.savedEvaluations);
        }
      }
    } catch (error) {
      console.error('Failed to load evaluations from Supabase:', error);
      showToast('서버 연결 실패. 오프라인 모드로 전환합니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 토스트 표시 함수
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  // 문서 목록 로드
  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const res = await fetch('/api/documents?all=true');
      const { data, error } = await res.json();

      if (!error && data) {
        setDocuments(data.documents || []);
        setDownloadUrls(data.downloadUrls || {});
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  // 특정 제안사/타입의 문서 찾기
  const getDocument = useCallback((proposalId: string | null, documentType: DocumentType) => {
    return documents.find(
      (doc) =>
        doc.document_type === documentType &&
        (proposalId ? doc.proposal_id === proposalId : doc.proposal_id === null)
    );
  }, [documents]);

  // 미저장 변경 감지
  useEffect(() => {
    const savedData = getSavedEvaluation(selectedProposal);
    if (savedData) {
      // 저장된 데이터와 현재 데이터 비교
      const scoresChanged = JSON.stringify(savedData.scores) !== JSON.stringify(scores);
      const commentChanged = savedData.comment !== comment;
      setHasUnsavedChanges(scoresChanged || commentChanged);
    } else {
      // 저장된 데이터가 없는 경우 점수나 코멘트가 있으면 미저장 상태
      setHasUnsavedChanges(Object.keys(scores).length > 0 || comment.length > 0);
    }
  }, [scores, comment, selectedProposal]);

  // 브라우저 종료/새로고침 시 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoggedIn && (hasUnsavedChanges || savedEvaluations.length > 0)) {
        e.preventDefault();
        e.returnValue = '시스템을 종료하시겠습니까? 저장하지 않은 변경사항이 있을 수 있습니다.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoggedIn, hasUnsavedChanges, savedEvaluations.length]);

  // 뒤로가기 처리
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isLoggedIn) {
        e.preventDefault();
        if (viewModeHistory.length > 1) {
          // 이전 viewMode로 돌아가기
          const newHistory = [...viewModeHistory];
          newHistory.pop();
          const previousMode = newHistory[newHistory.length - 1];
          setViewModeHistory(newHistory);
          setViewMode(previousMode);
          // 히스토리 상태 복원
          window.history.pushState({ viewMode: previousMode }, '');
        } else {
          // 시스템 종료 확인
          setShowExitConfirm(true);
          window.history.pushState({}, '');
        }
      }
    };

    // 초기 히스토리 상태 설정
    window.history.pushState({ viewMode: 'input' }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, viewModeHistory]);

  // viewMode 변경 시 히스토리 추가 (저장 확인 포함)
  const handleViewModeChange = (newMode: 'input' | 'review' | 'documents') => {
    if (newMode === viewMode) return;

    // 평가 입력 모드에서 나갈 때 미저장 데이터 확인
    if (viewMode === 'input' && hasUnsavedChanges) {
      setPendingNavigation(newMode);
      return;
    }

    // viewMode 변경 및 히스토리 추가
    setViewMode(newMode);
    setViewModeHistory(prev => [...prev, newMode]);
    window.history.pushState({ viewMode: newMode }, '');
  };

  // 저장 후 네비게이션 진행
  const proceedWithNavigation = () => {
    if (pendingNavigation) {
      setViewMode(pendingNavigation as 'input' | 'review' | 'documents');
      setViewModeHistory(prev => [...prev, pendingNavigation as 'input' | 'review' | 'documents']);
      window.history.pushState({ viewMode: pendingNavigation }, '');
      setPendingNavigation(null);
      setHasUnsavedChanges(false);
    }
  };

  // 네비게이션 취소
  const cancelNavigation = () => {
    setPendingNavigation(null);
  };

  // 로고 클릭 - 평가 입력 화면으로 이동
  const handleLogoClick = () => {
    if (viewMode !== 'input') {
      handleViewModeChange('input');
    } else {
      // 이미 평가 입력 화면이면 스크롤만 맨 위로
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // 미완료 제안서 목록
  const incompleteProposals = useMemo(() => {
    return proposals.filter(p => !savedEvaluations.find(e => e.proposalId === p.id));
  }, [proposals, savedEvaluations]);

  // 이름 수정 시작
  const startEditingName = () => {
    setEditingName(evaluatorName);
    setIsEditingName(true);
  };

  // 이름 수정 완료
  const handleNameChange = async () => {
    const newName = editingName.trim();
    if (!newName) {
      showToast('이름을 입력해주세요.', 'error');
      return;
    }
    if (newName === evaluatorName) {
      setIsEditingName(false);
      return;
    }

    try {
      // 서버에 이름 변경 요청
      const response = await fetch('/api/evaluators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: evaluatorName,
          newName: newName,
        }),
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        setEvaluatorName(newName);
        setSavedEvaluations(prev => prev.map(e => ({
          ...e,
          evaluatorName: newName,
        })));
        showToast('이름이 변경되었습니다.', 'success');
      } else {
        showToast('이름 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Name change error:', error);
      // 오프라인 모드에서도 로컬 상태는 업데이트
      setEvaluatorName(newName);
      setSavedEvaluations(prev => prev.map(e => ({
        ...e,
        evaluatorName: newName,
      })));
      showToast('이름이 변경되었습니다. (오프라인)', 'info');
    }
    setIsEditingName(false);
  };

  // 이름 수정 취소
  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  // 로그인 처리
  const handleLogin = async () => {
    if (tempName.trim()) {
      const name = tempName.trim();
      setEvaluatorName(name);
      setIsLoggedIn(true);
      // Supabase에서 데이터와 문서 로드 (병렬)
      await Promise.all([
        loadEvaluationsFromSupabase(name),
        loadDocuments(),
      ]);
    }
  };

  // 제안서별 저장 여부 확인
  const getSavedEvaluation = (proposalId: string) => {
    return savedEvaluations.find(e => e.proposalId === proposalId);
  };

  // 제안서 선택 시 저장된 데이터 로드
  const handleProposalSelect = (proposalId: string) => {
    setSelectedProposal(proposalId);
    setActiveCategory(DEFAULT_EVALUATION_CRITERIA[0].id);

    const saved = getSavedEvaluation(proposalId);
    if (saved) {
      setScores(saved.scores);
      setComment(saved.comment);
    } else {
      setScores({});
      setComment('');
    }
  };

  const totalScore = useMemo(() => {
    let total = 0;
    DEFAULT_EVALUATION_CRITERIA.forEach(category => {
      category.items.forEach(item => {
        const grade = scores[item.id];
        if (grade) total += calculateGradeScore(item.maxScore, grade);
      });
    });
    return Math.round(total * 10) / 10;
  }, [scores]);

  const categoryScores = useMemo(() => {
    const result: Record<string, { score: number; max: number; completed: number; total: number }> = {};
    DEFAULT_EVALUATION_CRITERIA.forEach(category => {
      let score = 0;
      let completed = 0;
      category.items.forEach(item => {
        const grade = scores[item.id];
        if (grade) {
          score += calculateGradeScore(item.maxScore, grade);
          completed++;
        }
      });
      result[category.id] = { score: Math.round(score * 10) / 10, max: category.totalScore, completed, total: category.items.length };
    });
    return result;
  }, [scores]);

  const totalItems = DEFAULT_EVALUATION_CRITERIA.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedItems = Object.keys(scores).length;

  const handleGradeSelect = (itemId: string, grade: GradeLevel) => {
    setScores(prev => ({ ...prev, [itemId]: grade }));
  };

  const handleSave = async () => {
    if (isSubmissionLocked || isSubmitted) {
      showToast('평가 제출이 완료되어 수정할 수 없습니다.', 'error');
      return;
    }
    if (completedItems !== totalItems) { showToast('모든 항목을 평가해주세요.', 'error'); return; }

    const currentProposalName = proposals.find(p => p.id === selectedProposal)?.name;

    // Supabase에 저장
    try {
      const scoresWithGrade: Record<string, { grade: GradeLevel; score: number }> = {};
      Object.entries(scores).forEach(([itemId, grade]) => {
        const item = DEFAULT_EVALUATION_CRITERIA
          .flatMap(c => c.items)
          .find(i => i.id === itemId);
        if (item) {
          scoresWithGrade[itemId] = {
            grade,
            score: calculateGradeScore(item.maxScore, grade),
          };
        }
      });

      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorName: evaluatorName.trim(),
          proposalId: selectedProposal,
          proposalName: currentProposalName,
          scores: scoresWithGrade,
          totalScore,
          comment,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Supabase 저장 실패:', result.error);
        // Supabase 실패해도 localStorage에는 저장 계속 진행
      }
    } catch (error) {
      console.error('저장 중 오류:', error);
      // Supabase 실패해도 localStorage에는 저장 계속 진행
    }

    const newEvaluation: SavedEvaluation = {
      evaluatorName: evaluatorName.trim(),
      proposalId: selectedProposal,
      scores: { ...scores },
      totalScore,
      comment,
      savedAt: new Date().toISOString(),
    };

    // 기존 평가가 있으면 업데이트, 없으면 추가
    setSavedEvaluations(prev => {
      const existingIndex = prev.findIndex(e => e.proposalId === selectedProposal);
      let updated: SavedEvaluation[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = newEvaluation;
      } else {
        updated = [...prev, newEvaluation];
      }
      return updated;
    });

    // 미저장 상태 초기화
    setHasUnsavedChanges(false);

    // 다음 미평가 제안서로 자동 이동
    const unsavedProposals = proposals.filter(p =>
      p.id !== selectedProposal && !savedEvaluations.find(e => e.proposalId === p.id)
    );

    if (unsavedProposals.length > 0) {
      const nextProposal = unsavedProposals[0];
      showToast(`제안서 ${currentProposalName} 저장 완료! → 제안서 ${nextProposal.name}로 이동`, 'success');
      handleProposalSelect(nextProposal.id);
      // 페이지 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (mainContentRef.current) {
        mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // 모든 평가 완료 - 제출 모달 표시
      showToast(`제안서 ${currentProposalName} 저장 완료!`, 'success');
      setTimeout(() => {
        setShowSubmitModal(true);
      }, 500);
    }
  };

  const handleReset = () => {
    if (confirm('초기화하시겠습니까?')) { setScores({}); setComment(''); }
  };

  const currentProposal = proposals.find(p => p.id === selectedProposal)!;
  const activeCategoryData = DEFAULT_EVALUATION_CRITERIA.find(c => c.id === activeCategory)!;
  const activeCategoryIndex = DEFAULT_EVALUATION_CRITERIA.findIndex(c => c.id === activeCategory);
  const isLastCategory = activeCategoryIndex === DEFAULT_EVALUATION_CRITERIA.length - 1;

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#f4f5f6', fontFamily: 'Pretendard, -apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e6e8ea', padding: '40px', width: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#256ef4', margin: '0 0 8px 0' }}>제안평가시스템</h1>
            <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>{PROJECT_NAME}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="evaluator-name-input" style={{ fontSize: '14px', fontWeight: 600, color: '#1e2124', display: 'block', marginBottom: '8px', textAlign: 'left' }}>평가위원 이름</label>
            <input
              id="evaluator-name-input"
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="이름을 입력해주세요"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid #cdd1d5', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={!tempName.trim()}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: tempName.trim() ? '#256ef4' : '#cdd1d5',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: tempName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            평가 시작하기
          </button>

          <p style={{ fontSize: '12px', color: '#6d7882', marginTop: '16px' }}>
            입력하신 이름으로 평가가 저장됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', backgroundColor: '#f4f5f6', fontFamily: 'Pretendard, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 미저장 데이터 확인 모달 */}
      {pendingNavigation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e2124' }}>저장되지 않은 변경사항</h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#464c53', lineHeight: 1.6 }}>
              현재 평가 입력 내용이 저장되지 않았습니다.<br />
              저장하지 않고 이동하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancelNavigation}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #cdd1d5',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#464c53',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={proceedWithNavigation}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#f05f42',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                저장하지 않고 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시스템 종료 확인 모달 */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>🚪</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e2124' }}>시스템 종료</h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#464c53', lineHeight: 1.6 }}>
              시스템을 종료하시겠습니까?<br />
              저장하지 않은 변경사항이 있을 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #cdd1d5',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#464c53',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                계속 평가하기
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#de3412',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 평가 완료 - 제출 안내 모달 */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '48px' }}>🎉</span>
              <h3 style={{ margin: '12px 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#228738' }}>
                모든 평가가 완료되었습니다!
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#464c53' }}>
                {proposals.length}개 제안서 평가를 모두 마쳤습니다.
              </p>
            </div>
            <div style={{
              backgroundColor: '#f0faf1',
              border: '1px solid #b8e6c1',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#1a5928', lineHeight: 1.6 }}>
                📋 평가 결과를 확인한 후 <strong>평가 제출</strong> 버튼을 눌러 최종 제출해주세요.<br />
                ⚠️ 제출 후에는 수정이 불가능합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleViewModeChange('review');
                }}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #256ef4',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#256ef4',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                결과 확인하기
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#228738',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미완료 제안서 확인 모달 */}
      {showIncompleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>📋</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e2124' }}>미완료 평가 목록</h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#464c53' }}>
              아래 제안서의 평가가 완료되지 않았습니다.
            </p>
            <div style={{ marginBottom: '20px' }}>
              {incompleteProposals.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setShowIncompleteModal(false);
                    handleProposalSelect(p.id);
                    handleViewModeChange('input');
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fde68a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef3c7';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>제안서 {p.name}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#b45309' }}>클릭하여 평가하기 →</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#256ef4',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 제출 완료 알림 배너 */}
      {isSubmitted && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderBottom: '2px solid #f59e0b',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '20px' }}>🔒</span>
          <div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
              평가가 이미 제출되었습니다
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#b45309' }}>
              수정이 필요한 경우 관리자에게 요청해주세요. 관리자 연락처: 평가관리팀
            </p>
          </div>
        </div>
      )}
      {/* 헤더 - 컴팩트하게 */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e6e8ea', padding: '8px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1
              onClick={handleLogoClick}
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#256ef4',
                margin: 0,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              title="평가 입력 화면으로 이동"
            >
              제안평가시스템
            </h1>
            <span style={{ fontSize: '12px', color: '#6d7882' }}>{PROJECT_NAME}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 평가위원 이름 표시 및 수정 */}
            <div style={{ fontSize: '13px', color: '#1e2124', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6d7882' }}>평가위원:</span>
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameChange();
                      if (e.key === 'Escape') cancelEditingName();
                    }}
                    autoFocus
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #256ef4',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      width: '100px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleNameChange}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#228738',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingName}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #cdd1d5',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      color: '#464c53',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{evaluatorName}</span>
                  {!isSubmitted && (
                    <button
                      type="button"
                      onClick={startEditingName}
                      title="이름 수정"
                      style={{
                        padding: '2px 6px',
                        border: '1px solid #cdd1d5',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        color: '#6d7882',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ 수정
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" onClick={() => handleViewModeChange('input')} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', backgroundColor: viewMode === 'input' ? '#256ef4' : '#e6e8ea', color: viewMode === 'input' ? '#fff' : '#464c53', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                평가 입력
              </button>
              <button type="button" onClick={() => handleViewModeChange('review')} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', backgroundColor: viewMode === 'review' ? '#256ef4' : '#e6e8ea', color: viewMode === 'review' ? '#fff' : '#464c53', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                현황 ({savedEvaluations.length})
              </button>
              <button type="button" onClick={() => handleViewModeChange('documents')} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', backgroundColor: viewMode === 'documents' ? '#256ef4' : '#e6e8ea', color: viewMode === 'documents' ? '#fff' : '#464c53', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                📁 자료
              </button>
            </div>
            {/* 평가 제출 버튼 - 미완료 시 클릭하면 미완료 목록 표시 */}
            <button
              type="button"
              onClick={async () => {
                if (isSubmitted) {
                  showToast('이미 제출이 완료되었습니다. 수정이 필요하면 관리자에게 문의하세요.', 'info');
                  return;
                }
                // 미완료 제안서가 있으면 목록 모달 표시
                if (savedEvaluations.length !== proposals.length) {
                  setShowIncompleteModal(true);
                  return;
                }
                // 모든 평가 완료 시 제출 확인
                if (confirm(`${savedEvaluations.length}개 평가를 제출하시겠습니까?\n\n⚠️ 제출 후에는 수정이 불가능합니다.\n수정이 필요한 경우 관리자에게 요청해야 합니다.`)) {
                  try {
                    // 평가위원 제출 상태 업데이트
                    const response = await fetch('/api/evaluators', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: evaluatorName,
                        is_submitted: true,
                      }),
                    });

                    if (response.ok) {
                      setIsSubmitted(true);
                      setIsSubmissionLocked(true);
                      showToast('평가가 성공적으로 제출되었습니다!', 'success');
                    } else {
                      showToast('제출 중 오류가 발생했습니다.', 'error');
                    }
                  } catch (error) {
                    console.error('Submit error:', error);
                    showToast('제출 중 오류가 발생했습니다.', 'error');
                  }
                }
              }}
              title={isSubmitted
                ? '이미 제출이 완료되었습니다'
                : savedEvaluations.length !== proposals.length
                ? `클릭하여 미완료 항목 확인 (${savedEvaluations.length}/${proposals.length} 완료)`
                : '평가를 관리자에게 제출합니다'}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isSubmitted ? '#6d7882' : savedEvaluations.length === proposals.length ? '#228738' : '#f59e0b',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isSubmitted ? '✓ 제출완료' : savedEvaluations.length === proposals.length ? '🚀 평가 제출' : `⚠️ 평가 제출 (${savedEvaluations.length}/${proposals.length})`}
            </button>
            {/* 헤더에 총점 표시 - 현재 평가 중인 제안서 포함 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#256ef4', borderRadius: '6px', color: '#fff' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{currentProposal.name}사</span>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>총점</span>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>{totalScore.toFixed(2)}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>/{QUALITATIVE_TOTAL_SCORE}</span>
              <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '4px' }}>({completedItems}/{totalItems})</span>
            </div>
          </div>
        </div>
      </header>

      {viewMode === 'input' ? (
        <main style={{ flex: 1, display: 'flex', minHeight: 0, padding: '8px' }}>
          {/* 왼쪽 패널 - 제안서/카테고리 */}
          <aside style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
            {/* 제안서 선택 */}
            <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e6e8ea', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: '#6d7882' }}>제안서 선택</label>
                <span style={{ fontSize: '11px', color: '#228738', fontWeight: 600 }}>{savedEvaluations.length}/{proposals.length} 완료</span>
              </div>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {proposals.map(p => {
                  const isSaved = !!getSavedEvaluation(p.id);
                  const isSelected = selectedProposal === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleProposalSelect(p.id)}
                      title={isSaved ? `제안서 ${p.name} - 저장됨 (클릭하여 수정)` : `제안서 ${p.name}`}
                      aria-label={`제안서 ${p.name}${isSaved ? ' - 저장됨' : ''}`}
                      style={{
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: isSelected ? '2px solid #256ef4' : (isSaved ? '2px solid #228738' : '1px solid #e6e8ea'),
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#ecf2fe' : (isSaved ? '#eaf6ec' : '#fff'),
                        color: isSelected ? '#0b50d0' : (isSaved ? '#228738' : '#1e2124'),
                        fontSize: '12px',
                        fontWeight: isSelected || isSaved ? 700 : 500,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      {isSaved ? '✓' : p.name}
                    </button>
                  );
                })}
              </div>
              {/* 현재 선택된 제안서 표시 */}
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#ecf2fe', borderRadius: '4px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6d7882' }}>현재 평가 중</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#256ef4' }}>
                  제안서 {currentProposal.name}
                </p>
                {getSavedEvaluation(selectedProposal) && (
                  <span style={{ fontSize: '10px', color: '#228738' }}>✓ 저장됨</span>
                )}
              </div>

              {/* 자료 다운로드 섹션 */}
              {(() => {
                const presentationDoc = getDocument(selectedProposal, 'presentation');
                const qualitativeDoc = getDocument(selectedProposal, 'qualitative');
                const hasDocuments = presentationDoc || qualitativeDoc;

                if (documentsLoading) {
                  return (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f4f5f6', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#6d7882' }}>자료 로딩중...</span>
                    </div>
                  );
                }

                if (!hasDocuments) return null;

                return (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff8e6', borderRadius: '6px', border: '1px solid #ffe082' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px' }}>📥</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#e65100' }}>자료 다운로드</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {presentationDoc && downloadUrls[presentationDoc.id] && (
                        <a
                          href={downloadUrls[presentationDoc.id]}
                          download={presentationDoc.file_name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            backgroundColor: '#fff',
                            border: '1px solid #e6e8ea',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: '#1e2124',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#ecf2fe';
                            e.currentTarget.style.borderColor = '#256ef4';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#e6e8ea';
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>📊</span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: '#256ef4' }}>발표자료</div>
                            <div style={{ fontSize: '10px', color: '#6d7882', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {presentationDoc.file_name}
                            </div>
                          </div>
                          <span style={{ fontSize: '14px', color: '#256ef4' }}>↓</span>
                        </a>
                      )}
                      {qualitativeDoc && downloadUrls[qualitativeDoc.id] && (
                        <a
                          href={downloadUrls[qualitativeDoc.id]}
                          download={qualitativeDoc.file_name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            backgroundColor: '#fff',
                            border: '1px solid #e6e8ea',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: '#1e2124',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0faf1';
                            e.currentTarget.style.borderColor = '#228738';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.style.borderColor = '#e6e8ea';
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>📑</span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: '#228738' }}>정성적 제안서</div>
                            <div style={{ fontSize: '10px', color: '#6d7882', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {qualitativeDoc.file_name}
                            </div>
                          </div>
                          <span style={{ fontSize: '14px', color: '#228738' }}>↓</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 카테고리 네비게이션 - 클릭 시 스크롤 */}
            <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e6e8ea', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {DEFAULT_EVALUATION_CRITERIA.map(category => {
                const catScore = categoryScores[category.id];
                const isComplete = catScore.completed === catScore.total;

                return (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      const element = document.getElementById(`category-${category.id}`);
                      const container = tableContainerRef.current;
                      if (element && container) {
                        // sticky 헤더 높이(약 45px)를 고려한 스크롤
                        const headerOffset = 45;
                        const elementPosition = element.offsetTop - headerOffset;
                        container.scrollTo({ top: elementPosition, behavior: 'smooth' });
                      }
                    }}
                    aria-label={`${category.name} 카테고리로 이동`}
                    style={{
                      padding: '8px',
                      border: activeCategory === category.id ? '2px solid #256ef4' : 'none',
                      borderRadius: '4px',
                      backgroundColor: activeCategory === category.id ? '#ecf2fe' : (isComplete ? '#eaf6ec' : '#f4f5f6'),
                      color: '#1e2124',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{category.name}</span>
                      <span style={{ fontSize: '11px', color: isComplete ? '#228738' : '#6d7882' }}>
                        {isComplete ? '✓' : `${catScore.completed}/${catScore.total}`}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ flex: 1, height: '3px', backgroundColor: '#e6e8ea', borderRadius: '2px' }}>
                        <div style={{ width: `${(catScore.completed / catScore.total) * 100}%`, height: '100%', backgroundColor: isComplete ? '#228738' : '#256ef4', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#6d7882' }}>
                        {catScore.score}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 저장/초기화 버튼 */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleReset}
                disabled={completedItems === 0}
                style={{
                  flex: 1, padding: '10px', border: '1px solid #cdd1d5', borderRadius: '4px', backgroundColor: '#fff',
                  color: completedItems === 0 ? '#b1b8be' : '#464c53', fontSize: '13px',
                  cursor: completedItems === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                초기화
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={completedItems !== totalItems}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: '4px',
                  backgroundColor: completedItems === totalItems ? '#256ef4' : '#cdd1d5',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: completedItems === totalItems ? 'pointer' : 'not-allowed'
                }}
              >
                저장
              </button>
            </div>
          </aside>

          {/* 오른쪽 평가 영역 - 모든 카테고리 표시 */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* 헤더 */}
            <div style={{ backgroundColor: '#fff', borderRadius: '6px 6px 0 0', border: '1px solid #e6e8ea', borderBottom: 'none', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e2124' }}>전체 평가 항목</span>
                <span style={{ fontSize: '12px', color: '#6d7882', marginLeft: '8px' }}>
                  총 배점 {QUALITATIVE_TOTAL_SCORE}점 | 현재 {totalScore.toFixed(2)}점
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* 등급 범례 */}
                <div style={{ display: 'flex', gap: '4px', fontSize: '11px' }}>
                  {GRADE_LABELS.map(g => (
                    <span key={g} style={{ padding: '2px 6px', borderRadius: '3px', backgroundColor: GRADE_STYLES[g].bg, color: GRADE_STYLES[g].text }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 평가 항목 테이블 - 모든 카테고리 */}
            <div ref={tableContainerRef} style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #e6e8ea', borderTop: '1px solid #e6e8ea', overflowY: 'auto', overflowX: 'hidden', minHeight: 0, position: 'relative' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f5f6', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '36px', borderBottom: '1px solid #e6e8ea', fontSize: '14px' }}>#</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#464c53', borderBottom: '1px solid #e6e8ea', fontSize: '14px' }}>평가 항목</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '50px', borderBottom: '1px solid #e6e8ea', fontSize: '14px' }}>배점</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '280px', borderBottom: '1px solid #e6e8ea', fontSize: '14px' }}>등급 선택</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#464c53', width: '60px', borderBottom: '1px solid #e6e8ea', fontSize: '14px' }}>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let itemNumber = 0;
                    return DEFAULT_EVALUATION_CRITERIA.map((category, catIndex) => (
                      <Fragment key={category.id}>
                        {/* 카테고리 구분 헤더 */}
                        <tr
                          id={`category-${category.id}`}
                          style={{
                            backgroundColor: activeCategory === category.id ? '#256ef4' : '#e8f4fd',
                            borderTop: catIndex > 0 ? '3px solid #256ef4' : '1px solid #e6e8ea',
                            borderBottom: '1px solid #cdd1d5',
                            transition: 'background-color 0.3s',
                          }}
                        >
                          <td colSpan={5} style={{ padding: activeCategory === category.id ? '14px 16px' : '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{
                                fontSize: activeCategory === category.id ? '17px' : '15px',
                                fontWeight: 700,
                                color: activeCategory === category.id ? '#ffffff' : '#256ef4',
                                transition: 'all 0.3s',
                              }}>
                                {activeCategory === category.id && '▶ '}{category.name}
                              </span>
                              <span style={{
                                fontSize: '13px',
                                color: activeCategory === category.id ? '#256ef4' : '#6d7882',
                                backgroundColor: activeCategory === category.id ? '#ffffff' : '#fff',
                                padding: activeCategory === category.id ? '4px 10px' : '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid #e6e8ea',
                                fontWeight: activeCategory === category.id ? 600 : 400,
                              }}>
                                배점 {category.totalScore}점
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: activeCategory === category.id ? 'rgba(255,255,255,0.9)' : '#6d7882',
                              }}>
                                ({category.items.length}개 항목)
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* 카테고리 아이템들 */}
                        {category.items.map((item, itemIndex) => {
                          itemNumber++;
                          const selectedGrade = scores[item.id];
                          const itemScore = selectedGrade ? calculateGradeScore(item.maxScore, selectedGrade) : null;

                          return (
                            <tr
                              key={item.id}
                              style={{
                                backgroundColor: selectedGrade ? '#f0faf1' : '#fff',
                                borderBottom: '1px solid #e6e8ea',
                              }}
                            >
                              <td style={{ padding: '8px', textAlign: 'center', color: selectedGrade ? '#228738' : '#6d7882', fontWeight: 600, fontSize: '14px' }}>
                                {selectedGrade ? '✓' : itemNumber}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '12px', color: '#6d7882', backgroundColor: '#f0f1f3', padding: '2px 6px', borderRadius: '3px', flexShrink: 0 }}>{item.subCategory}</span>
                                  <span style={{ color: '#1e2124', fontWeight: 500, fontSize: '14px', lineHeight: 1.4 }}>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#256ef4', fontWeight: 700, fontSize: '15px' }}>
                                {item.maxScore}
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  {GRADE_LABELS.map(grade => {
                                    const isSelected = selectedGrade === grade;
                                    const gradeScore = calculateGradeScore(item.maxScore, grade);
                                    const style = GRADE_STYLES[grade];

                                    return (
                                      <button
                                        type="button"
                                        key={grade}
                                        onClick={() => !isSubmitted && handleGradeSelect(item.id, grade)}
                                        disabled={isSubmitted}
                                        title={isSubmitted ? '평가가 제출되어 수정할 수 없습니다' : `${GRADE_DESC[grade]} - ${gradeScore}점`}
                                        aria-label={`${item.name} - ${GRADE_DESC[grade]}`}
                                        aria-pressed={isSelected}
                                        style={{
                                          width: '50px',
                                          padding: '10px 4px',
                                          borderRadius: '6px',
                                          border: isSelected ? 'none' : '1px solid #cdd1d5',
                                          backgroundColor: isSelected ? style.bg : '#fff',
                                          color: isSelected ? style.text : '#464c53',
                                          fontSize: '15px',
                                          fontWeight: isSelected ? 700 : 500,
                                          cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                          transition: 'background-color 0.1s, border-color 0.1s',
                                          outline: 'none',
                                          opacity: isSubmitted && !isSelected ? 0.5 : 1,
                                        }}
                                        onFocus={(e) => { if (!isSubmitted) e.currentTarget.style.boxShadow = '0 0 0 2px #256ef4'; }}
                                        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                                      >
                                        {grade}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: itemScore ? '#228738' : '#b1b8be', fontSize: '15px' }}>
                                {itemScore !== null ? itemScore : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* 종합의견 - 강조 표시 */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '0 0 6px 6px',
              border: '2px solid #256ef4',
              borderTop: '2px solid #256ef4',
              padding: '16px',
              flexShrink: 0,
              boxShadow: '0 -4px 12px rgba(37, 110, 244, 0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  backgroundColor: '#ecf2fe',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{ fontSize: '24px' }}>💬</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#256ef4' }}>필수</span>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="comment-input" style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#256ef4',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    종합 의견을 입력해주세요
                  </label>
                  <textarea
                    id="comment-input"
                    value={comment}
                    onChange={(e) => !isSubmitted && setComment(e.target.value)}
                    disabled={isSubmitted}
                    placeholder="제안서에 대한 전체적인 평가 의견, 장점, 개선사항 등을 자유롭게 작성해주세요."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #cdd1d5',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      backgroundColor: isSubmitted ? '#f4f5f6' : '#fff',
                      cursor: isSubmitted ? 'not-allowed' : 'text',
                    }}
                  />
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '12px',
                    color: '#6d7882',
                  }}>
                    ℹ️ 종합 의견은 평가서에 함께 기록됩니다. 최소 10자 이상 작성을 권장합니다.
                    {comment.length > 0 && (
                      <span style={{ marginLeft: '8px', color: comment.length >= 10 ? '#228738' : '#f05f42' }}>
                        (현재 {comment.length}자)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </section>
        </main>
      ) : viewMode === 'review' ? (
        /* 평가 현황 */
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e6e8ea', fontSize: '16px', fontWeight: 600, color: '#1e2124' }}>저장된 평가 현황</div>
            {savedEvaluations.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6d7882' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
                <p>아직 저장된 평가가 없습니다.</p>
                <button type="button" onClick={() => setViewMode('input')} style={{ marginTop: '16px', padding: '10px 20px', border: 'none', borderRadius: '6px', backgroundColor: '#256ef4', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                  평가 시작하기
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f5f6' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53' }}>평가위원</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#464c53' }}>제안서</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>총점</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#464c53' }}>저장일시</th>
                  </tr>
                </thead>
                <tbody>
                  {savedEvaluations.map((ev, idx) => {
                    const proposal = proposals.find(p => p.id === ev.proposalId);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e6e8ea' }}>
                        <td style={{ padding: '12px 16px' }}>{ev.evaluatorName}</td>
                        <td style={{ padding: '12px 16px' }}>제안서 {proposal?.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#256ef4', fontVariantNumeric: 'tabular-nums' }}>{ev.totalScore.toFixed(2)}</span>
                          <span style={{ color: '#6d7882' }}>/{QUALITATIVE_TOTAL_SCORE}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6d7882', fontSize: '13px' }}>
                          {new Date(ev.savedAt).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {savedEvaluations.length > 0 && (
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {proposals.map(proposal => {
                const evals = savedEvaluations.filter(e => e.proposalId === proposal.id);
                const avg = evals.length > 0 ? evals.reduce((s, e) => s + e.totalScore, 0) / evals.length : 0;
                return (
                  <div key={proposal.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e2124' }}>제안서 {proposal.name}</div>
                    <div style={{ fontSize: '13px', color: '#6d7882', marginTop: '4px' }}>평가 완료: {evals.length}건</div>
                    {evals.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#256ef4' }}>{avg.toFixed(2)}</span>
                        <span style={{ fontSize: '13px', color: '#6d7882', marginLeft: '4px' }}>점 (평균)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        /* 자료 다운로드 */
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e6e8ea', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e2124', margin: '0 0 4px 0' }}>📁 제안서 자료 다운로드</h3>
            <p style={{ fontSize: '13px', color: '#6d7882', margin: 0 }}>
              평가에 필요한 발표자료, 정성적 제안서, 보안각서를 다운로드하세요
            </p>
          </div>
          <DocumentDownload
            proposals={proposals.map(p => ({
              id: p.id,
              name: p.name,
              order_num: p.order_num,
              created_at: new Date().toISOString(),
            }))}
            evaluatorName={evaluatorName}
          />
        </main>
      )}
    </div>
  );
}
