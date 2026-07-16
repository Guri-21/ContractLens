import React, { useState } from 'react';
import {
  Document as DocxDocument,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { Download, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import type { ClauseDTO, RiskFindingDTO } from '../types';
import type { ReviewerDecisionMap } from '../reviewerDecisions';

interface DownloadRedlinedSowProps {
  clauses: ClauseDTO[];
  risks: RiskFindingDTO[];
  reviewerDecisions: ReviewerDecisionMap;
}

/**
 * Applies accepted redline substitutions to clause text and generates a
 * downloadable DOCX containing the updated SOW.
 */
export const DownloadRedlinedSow: React.FC<DownloadRedlinedSowProps> = ({
  clauses,
  risks,
  reviewerDecisions,
}) => {
  const [generating, setGenerating] = useState(false);

  // Only SOW clauses — we're rebuilding the SOW document
  const sowClauses = clauses
    .filter((c) => c.documentType === 'SOW')
    .sort((a, b) => {
      // Sort by page first, then by section number
      const pageDiff = (a.page ?? 0) - (b.page ?? 0);
      if (pageDiff !== 0) return pageDiff;
      return (a.sectionNumber ?? '').localeCompare(b.sectionNumber ?? '', undefined, { numeric: true });
    });

  // Build a map: clauseId → accepted redline substitutions
  const acceptedRedlines = new Map<string, { originalText: string; suggestedText: string }[]>();
  for (const risk of risks) {
    if (
      reviewerDecisions[risk.id] === 'accepted' &&
      risk.redline?.originalText &&
      risk.redline?.suggestedText
    ) {
      const existing = acceptedRedlines.get(risk.clauseId) ?? [];
      existing.push({
        originalText: risk.redline.originalText,
        suggestedText: risk.redline.suggestedText,
      });
      acceptedRedlines.set(risk.clauseId, existing);
    }
  }

  const acceptedCount = Array.from(acceptedRedlines.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  function applyRedlines(clauseText: string, clauseId: string): { text: string; changed: boolean } {
    const substitutions = acceptedRedlines.get(clauseId);
    if (!substitutions || substitutions.length === 0) {
      return { text: clauseText, changed: false };
    }

    let result = clauseText;
    for (const sub of substitutions) {
      result = result.replace(sub.originalText, sub.suggestedText);
    }
    return { text: result, changed: result !== clauseText };
  }

  async function handleDownload() {
    if (sowClauses.length === 0) return;
    setGenerating(true);

    try {
      const documentName = sowClauses[0]?.documentName ?? 'SOW';
      const timestamp = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const children: Paragraph[] = [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: documentName,
              bold: true,
              size: 36,
              font: 'Calibri',
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        // Subtitle
        new Paragraph({
          children: [
            new TextRun({
              text: `Updated with ContractLens Review — ${timestamp}`,
              size: 20,
              color: '666666',
              font: 'Calibri',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        // Change summary
        new Paragraph({
          children: [
            new TextRun({
              text: `${acceptedCount} redline suggestion${acceptedCount !== 1 ? 's' : ''} applied`,
              bold: true,
              size: 20,
              color: '065F46',
              font: 'Calibri',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        // Divider
        new Paragraph({
          border: {
            bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
          spacing: { after: 400 },
        }),
      ];

      // Each clause
      for (const clause of sowClauses) {
        const heading = [
          clause.sectionNumber ? `Section ${clause.sectionNumber}` : null,
          clause.title,
          clause.clauseType ? `[${clause.clauseType}]` : null,
        ]
          .filter(Boolean)
          .join(' — ');

        if (heading) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: heading,
                  bold: true,
                  size: 24,
                  font: 'Calibri',
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
            }),
          );
        }

        // Page reference
        if (clause.page) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Page ${clause.page}`,
                  size: 16,
                  color: '999999',
                  italics: true,
                  font: 'Calibri',
                }),
              ],
              spacing: { after: 100 },
            }),
          );
        }

        const { text: finalText, changed } = applyRedlines(clause.text, clause.id);

        // Clause body
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: finalText,
                size: 22,
                font: 'Calibri',
                // Highlight modified clauses
                ...(changed
                  ? { highlight: 'green' as const }
                  : {}),
              }),
            ],
            spacing: { after: 200 },
          }),
        );

        // If changed, add a note
        if (changed) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '✓ Redline applied — AI suggestion accepted by reviewer',
                  size: 16,
                  color: '065F46',
                  italics: true,
                  font: 'Calibri',
                }),
              ],
              spacing: { after: 300 },
            }),
          );
        }
      }

      const doc = new DocxDocument({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const safeFilename = documentName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      saveAs(blob, `${safeFilename}_redlined.docx`);
    } finally {
      setGenerating(false);
    }
  }

  if (sowClauses.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 border border-legal-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-legal-text">
            <FileText className="h-5 w-5 text-legal-focus" />
            Download Updated SOW
          </h3>
          <p className="mt-1 text-sm text-legal-meta">
            Generate a new DOCX with all accepted redline suggestions applied inline.
            {acceptedCount > 0 ? (
              <span className="ml-1 font-semibold text-green-700">
                {acceptedCount} change{acceptedCount !== 1 ? 's' : ''} will be applied.
              </span>
            ) : (
              <span className="ml-1 text-amber-700">
                No redlines accepted yet — the download will contain the original SOW text.
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={generating}
          className="flex shrink-0 items-center gap-2 border border-legal-focus bg-legal-focus px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : acceptedCount > 0 ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generating ? 'Generating...' : 'Download DOCX'}
        </button>
      </div>
    </div>
  );
};
