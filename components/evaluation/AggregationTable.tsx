'use client';

import type { AggregatedScore, DocumentSignature } from '@/types/evaluation';
import { formatKoreanDate } from '@/lib/aggregation';

interface AggregationTableProps {
  projectName: string;
  aggregatedScore: AggregatedScore;
  date?: Date | string;
  signatures?: DocumentSignature[];
  isPrintMode?: boolean;
}

const DEFAULT_SIGNATURES: DocumentSignature[] = [
  { role: '작 성 자', position: '주무관', name: '' },
  { role: '검 토 자', position: '의정정보화팀장', name: '' },
  { role: '확 인 자', position: '평가위원장', name: '' },
];

export function AggregationTable({
  projectName,
  aggregatedScore,
  date = new Date(),
  signatures = DEFAULT_SIGNATURES,
  isPrintMode = false,
}: AggregationTableProps) {
  const { evaluatorScores, trimmedMean } = aggregatedScore;

  // 평가위원 수에 따른 빈 행 수 계산 (최소 7행)
  const minRows = 7;
  const emptyRowsCount = Math.max(0, minRows - evaluatorScores.length);

  return (
    <div className={`aggregation-table ${isPrintMode ? 'print-mode' : ''}`}>
      {/* 제목 */}
      <h1 className="sheet-title">정성적 평가 점수 집계표</h1>

      {/* 사업명 */}
      <div className="project-info">
        <span className="checkbox">☐</span>
        <span className="label">사 업 명 :</span>
        <span className="value">{projectName}</span>
      </div>

      {/* 집계표 */}
      <table className="aggregate-table">
        <thead>
          <tr>
            <th className="col-category">구분</th>
            <th className="col-evaluator">평가위원</th>
            <th className="col-score">평점</th>
            <th className="col-extreme">최하위 또는 최상위</th>
          </tr>
        </thead>
        <tbody>
          {/* 정성평가 영역 */}
          {evaluatorScores.map((es, index) => (
            <tr key={es.evaluatorId}>
              {index === 0 && (
                <td
                  className="category-cell"
                  rowSpan={evaluatorScores.length + emptyRowsCount}
                >
                  <div className="category-name">
                    정성<br />평가<br /><br />(70점)
                  </div>
                </td>
              )}
              <td className="evaluator-cell">{es.evaluatorName}</td>
              <td className="score-cell">{es.totalScore}</td>
              <td className="extreme-cell">
                {es.isHighest && '최상위'}
                {es.isLowest && '최하위'}
              </td>
            </tr>
          ))}

          {/* 빈 행 */}
          {Array.from({ length: emptyRowsCount }).map((_, index) => (
            <tr key={`empty-${index}`}>
              {evaluatorScores.length === 0 && index === 0 && (
                <td
                  className="category-cell"
                  rowSpan={emptyRowsCount}
                >
                  <div className="category-name">
                    정성<br />평가<br /><br />(70점)
                  </div>
                </td>
              )}
              <td className="evaluator-cell">&nbsp;</td>
              <td className="score-cell">&nbsp;</td>
              <td className="extreme-cell">&nbsp;</td>
            </tr>
          ))}

          {/* 평균 행 */}
          <tr className="average-row">
            <td colSpan={2} className="average-label">평 균</td>
            <td className="average-score">{trimmedMean || ''}</td>
            <td className="average-note"></td>
          </tr>
        </tbody>
      </table>

      {/* 설명 */}
      <p className="note">
        * 최상위와 최하위를 제외한 후 평균 산정하며 최상위와 최하위 평점이 2개 이상인
        <br />
        &nbsp;&nbsp;경우에는 1개씩만을 제외
      </p>

      {/* 날짜 */}
      <div className="date-section">
        {formatKoreanDate(date)}
      </div>

      {/* 서명란 */}
      <div className="signature-section">
        {signatures.map((sig, index) => (
          <div key={index} className="signature-row">
            <span className="sig-role">{sig.role}</span>
            <span className="sig-colon">:</span>
            <span className="sig-position-label">직 책</span>
            <span className="sig-position">{sig.position}</span>
            <span className="sig-name-label">성 명</span>
            <span className="sig-name">{sig.name || '____________'}</span>
            <span className="sig-seal">(인)</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .aggregation-table {
          font-family: '맑은 고딕', 'Malgun Gothic', sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 10mm;
          background: white;
          font-size: 11pt;
          line-height: 1.4;
        }

        .print-mode {
          padding: 0;
        }

        .sheet-title {
          text-align: center;
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 20mm;
          letter-spacing: 8px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .project-info {
          margin-bottom: 8mm;
          font-size: 11pt;
        }

        .project-info .checkbox {
          margin-right: 5px;
        }

        .project-info .label {
          font-weight: bold;
          margin-right: 5px;
        }

        .aggregate-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8mm;
        }

        .aggregate-table th,
        .aggregate-table td {
          border: 1px solid #000;
          padding: 4mm 3mm;
          text-align: center;
          vertical-align: middle;
        }

        .aggregate-table thead th {
          background: #e8f4fc;
          font-weight: bold;
          font-size: 11pt;
        }

        .col-category {
          width: 15%;
        }

        .col-evaluator {
          width: 35%;
        }

        .col-score {
          width: 20%;
        }

        .col-extreme {
          width: 30%;
        }

        .category-cell {
          background: #f5f5f5;
          font-weight: bold;
        }

        .category-name {
          line-height: 1.8;
        }

        .evaluator-cell {
          text-align: center;
        }

        .score-cell {
          font-weight: bold;
        }

        .extreme-cell {
          color: #c00;
          font-weight: bold;
        }

        .average-row td {
          background: #fafafa;
        }

        .average-label {
          font-weight: bold;
          letter-spacing: 10px;
        }

        .average-score {
          font-weight: bold;
          font-size: 12pt;
        }

        .note {
          font-size: 10pt;
          margin-bottom: 15mm;
          line-height: 1.8;
        }

        .date-section {
          text-align: center;
          font-size: 12pt;
          margin-bottom: 20mm;
        }

        .signature-section {
          margin-top: 15mm;
        }

        .signature-row {
          display: flex;
          align-items: baseline;
          margin-bottom: 8mm;
          font-size: 11pt;
        }

        .sig-role {
          width: 70px;
          letter-spacing: 5px;
        }

        .sig-colon {
          margin: 0 5px;
        }

        .sig-position-label {
          margin-right: 10px;
          letter-spacing: 5px;
        }

        .sig-position {
          min-width: 100px;
          margin-right: 20px;
        }

        .sig-name-label {
          margin-right: 10px;
          letter-spacing: 5px;
        }

        .sig-name {
          min-width: 100px;
        }

        .sig-seal {
          color: #c00;
          margin-left: 5px;
        }

        @media print {
          .aggregation-table {
            padding: 0;
          }

          .sheet-title {
            font-size: 16pt;
            margin-bottom: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
