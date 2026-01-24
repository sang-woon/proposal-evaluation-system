'use client';

import { useState, useMemo } from 'react';
import {
  type GradeLevel,
  type EvaluationCategory,
  type CriterionScore,
  calculateGradeScore,
  DEFAULT_EVALUATION_CRITERIA,
  QUALITATIVE_TOTAL_SCORE,
} from '@/types/evaluation';

interface ScoringSheetProps {
  projectName: string;
  proposalName: string;
  evaluatorName: string;
  categories?: EvaluationCategory[];
  initialScores?: Record<string, GradeLevel>;
  onScoresChange?: (scores: Record<string, GradeLevel>, total: number) => void;
  readOnly?: boolean;
  isPrintMode?: boolean;
}

const GRADE_LABELS: GradeLevel[] = ['수', '우', '미', '양', '가'];

export function ScoringSheet({
  projectName,
  proposalName,
  evaluatorName,
  categories = DEFAULT_EVALUATION_CRITERIA,
  initialScores = {},
  onScoresChange,
  readOnly = false,
  isPrintMode = false,
}: ScoringSheetProps) {
  const [scores, setScores] = useState<Record<string, GradeLevel>>(initialScores);
  const [comment, setComment] = useState('');

  // 총점 계산
  const totalScore = useMemo(() => {
    let total = 0;
    categories.forEach(category => {
      category.items.forEach(item => {
        const grade = scores[item.id];
        if (grade) {
          total += calculateGradeScore(item.maxScore, grade);
        }
      });
    });
    return Math.round(total * 10) / 10;
  }, [scores, categories]);

  const handleGradeSelect = (criterionId: string, grade: GradeLevel) => {
    if (readOnly) return;

    const newScores = { ...scores, [criterionId]: grade };
    setScores(newScores);

    if (onScoresChange) {
      let newTotal = 0;
      categories.forEach(category => {
        category.items.forEach(item => {
          const g = newScores[item.id];
          if (g) {
            newTotal += calculateGradeScore(item.maxScore, g);
          }
        });
      });
      onScoresChange(newScores, Math.round(newTotal * 10) / 10);
    }
  };

  // 카테고리별 rowspan 계산
  const getCategoryRowspan = (category: EvaluationCategory) => {
    return category.items.length;
  };

  return (
    <div className={`scoring-sheet ${isPrintMode ? 'print-mode' : ''}`}>
      {/* 제목 */}
      <h1 className="sheet-title">평가위원별 채점표</h1>

      {/* 사업명 */}
      <div className="project-info">
        <span className="checkbox">☐</span>
        <span className="label">사 업 명 :</span>
        <span className="value">{projectName}</span>
      </div>

      {/* 제안사명/평가위원 헤더 */}
      <div className="header-row">
        <div className="header-cell proposal">
          <span className="label">제안사명</span>
          <span className="value">{proposalName}</span>
        </div>
        <div className="header-cell evaluator">
          <span className="label">평가위원</span>
          <span className="value">{evaluatorName}</span>
          <span className="seal">(인)</span>
        </div>
      </div>

      {/* 평가표 */}
      <table className="scoring-table">
        <thead>
          <tr>
            <th className="col-category" rowSpan={2}>구분</th>
            <th className="col-subcategory" colSpan={2}>평가항목</th>
            <th className="col-content" rowSpan={2}>평가내용</th>
            <th className="col-max-score" rowSpan={2}>배점</th>
            <th className="col-grades" colSpan={5}>평가등급</th>
            <th className="col-score" rowSpan={2}>점수</th>
          </tr>
          <tr>
            <th className="col-subcategory-name" colSpan={2}></th>
            <th className="grade-header">수</th>
            <th className="grade-header">우</th>
            <th className="grade-header">미</th>
            <th className="grade-header">양</th>
            <th className="grade-header">가</th>
          </tr>
          <tr className="total-row">
            <th colSpan={4} className="total-label">합 계</th>
            <th className="total-max-score">{QUALITATIVE_TOTAL_SCORE}</th>
            <th colSpan={5}></th>
            <th className="total-score">{totalScore || ''}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, catIndex) => (
            category.items.map((item, itemIndex) => {
              const gradeScores = {
                '수': calculateGradeScore(item.maxScore, '수'),
                '우': calculateGradeScore(item.maxScore, '우'),
                '미': calculateGradeScore(item.maxScore, '미'),
                '양': calculateGradeScore(item.maxScore, '양'),
                '가': calculateGradeScore(item.maxScore, '가'),
              };
              const selectedGrade = scores[item.id];
              const itemScore = selectedGrade
                ? calculateGradeScore(item.maxScore, selectedGrade)
                : null;

              return (
                <tr key={item.id}>
                  {/* 구분 (카테고리) - 첫 행에만 표시 */}
                  {itemIndex === 0 && (
                    <td
                      className="category-cell"
                      rowSpan={getCategoryRowspan(category)}
                    >
                      <div className="category-name">
                        {category.name === '정성평가' ? (
                          <>정성<br />평가<br />({QUALITATIVE_TOTAL_SCORE}점)</>
                        ) : (
                          <>
                            {category.name}
                            <br />
                            ({category.totalScore})
                          </>
                        )}
                      </div>
                    </td>
                  )}

                  {/* 소분류 */}
                  <td className="subcategory-cell" colSpan={2}>
                    {item.subCategory}
                  </td>

                  {/* 평가내용 */}
                  <td className="content-cell">
                    ○ {item.name}
                  </td>

                  {/* 배점 */}
                  <td className="max-score-cell">{item.maxScore}</td>

                  {/* 평가등급 (수/우/미/양/가) */}
                  {GRADE_LABELS.map(grade => (
                    <td
                      key={grade}
                      className={`grade-cell ${selectedGrade === grade ? 'selected' : ''}`}
                      onClick={() => handleGradeSelect(item.id, grade)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !readOnly) {
                          e.preventDefault();
                          handleGradeSelect(item.id, grade);
                        }
                      }}
                      tabIndex={readOnly ? -1 : 0}
                      role="button"
                      aria-pressed={selectedGrade === grade}
                      aria-label={`${item.name} - ${grade}등급 (${gradeScores[grade]}점)`}
                    >
                      <div className="grade-score">{gradeScores[grade]}</div>
                      {!readOnly && (
                        <input
                          type="radio"
                          name={`grade-${item.id}`}
                          checked={selectedGrade === grade}
                          onChange={() => handleGradeSelect(item.id, grade)}
                          className="grade-radio"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      )}
                      {readOnly && selectedGrade === grade && (
                        <span className="grade-check" aria-hidden="true">✓</span>
                      )}
                    </td>
                  ))}

                  {/* 점수 */}
                  <td className="score-cell">
                    {itemScore !== null ? itemScore : ''}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>

      {/* 종합의견 */}
      <div className="comment-section">
        <div className="comment-label">종합<br />의견</div>
        <div className="comment-content">
          {readOnly ? (
            <p>{comment}</p>
          ) : (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="종합 의견을 입력하세요"
              rows={4}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .scoring-sheet {
          font-family: '맑은 고딕', 'Malgun Gothic', sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
          background: white;
          font-size: 10pt;
          line-height: 1.4;
        }

        .print-mode {
          padding: 0;
        }

        .sheet-title {
          text-align: center;
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 15mm;
          letter-spacing: 8px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .project-info {
          margin-bottom: 5mm;
          font-size: 11pt;
        }

        .project-info .checkbox {
          margin-right: 5px;
        }

        .project-info .label {
          font-weight: bold;
          margin-right: 5px;
        }

        .header-row {
          display: flex;
          border: 2px solid #000;
          margin-bottom: 3mm;
        }

        .header-cell {
          display: flex;
          align-items: center;
          padding: 3mm 5mm;
          border-right: 1px solid #000;
        }

        .header-cell:last-child {
          border-right: none;
        }

        .header-cell.proposal {
          flex: 1;
          background: #e8f4fc;
        }

        .header-cell.evaluator {
          flex: 1;
        }

        .header-cell .label {
          font-weight: bold;
          background: #e8f4fc;
          padding: 2mm 4mm;
          margin-right: 4mm;
        }

        .header-cell .value {
          flex: 1;
          text-align: center;
          font-weight: bold;
        }

        .header-cell .seal {
          color: #c00;
          margin-left: 10px;
        }

        .scoring-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5mm;
          font-size: 9pt;
        }

        .scoring-table th,
        .scoring-table td {
          border: 1px solid #000;
          padding: 2mm 1mm;
          text-align: center;
          vertical-align: middle;
        }

        .scoring-table thead th {
          background: #e8f4fc;
          font-weight: bold;
        }

        .col-category {
          width: 12%;
        }

        .col-subcategory {
          width: 10%;
        }

        .col-content {
          width: 30%;
          text-align: left !important;
          padding-left: 2mm !important;
        }

        .col-max-score {
          width: 6%;
        }

        .grade-header {
          width: 6%;
          font-weight: bold;
        }

        .col-score {
          width: 6%;
        }

        .total-row th {
          background: #fff;
          font-weight: bold;
        }

        .total-label {
          text-align: center !important;
        }

        .category-cell {
          background: #f5f5f5;
          font-weight: bold;
          writing-mode: horizontal-tb;
        }

        .category-name {
          line-height: 1.5;
        }

        .subcategory-cell {
          font-size: 8.5pt;
        }

        .content-cell {
          text-align: left !important;
          padding-left: 2mm !important;
          font-size: 8.5pt;
        }

        .max-score-cell {
          font-weight: bold;
        }

        .grade-cell {
          cursor: ${readOnly ? 'default' : 'pointer'};
          position: relative;
          font-size: 8pt;
        }

        .grade-cell:hover:not(.selected) {
          background: ${readOnly ? 'transparent' : '#f0f7ff'};
        }

        .grade-cell:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        .grade-cell.selected {
          background: #ffeb3b;
          font-weight: bold;
        }

        .grade-radio {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          top: 0;
          left: 0;
        }

        .grade-check {
          color: #c00;
          font-weight: bold;
          font-size: 12pt;
        }

        .score-cell {
          font-weight: bold;
          color: #000;
        }

        .comment-section {
          display: flex;
          border: 1px solid #000;
          min-height: 25mm;
        }

        .comment-label {
          width: 12%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border-right: 1px solid #000;
          text-align: center;
          line-height: 1.8;
        }

        .comment-content {
          flex: 1;
          padding: 3mm;
        }

        .comment-content textarea {
          width: 100%;
          height: 100%;
          min-height: 20mm;
          border: none;
          resize: none;
          font-family: inherit;
          font-size: 10pt;
        }

        .comment-content textarea:focus {
          outline: none;
        }

        @media print {
          .scoring-sheet {
            padding: 0;
            font-size: 9pt;
          }

          .sheet-title {
            font-size: 16pt;
            margin-bottom: 10mm;
          }

          .grade-radio {
            display: none;
          }

          .grade-cell:hover {
            background: transparent;
          }

          .comment-content textarea {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
