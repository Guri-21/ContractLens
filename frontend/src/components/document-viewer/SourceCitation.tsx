/**
 * SourceCitation.tsx
 *
 * Renders the "show your evidence" panel for a given RiskFindingDTO.
 * Every AI claim must show its exact source quote, document name, page,
 * and section — never paraphrased, never hidden behind extra clicks.
 *
 * Branch: gurnoor-citation-graph-ui
 */

import React from 'react';
import { BookOpen, FileText, Hash, MapPin, AlertCircle } from 'lucide-react';
import { RiskFindingDTO } from '../../reviewer-workspace/types';

interface SourceCitationProps {
  finding: RiskFindingDTO;
  /** Optional: section hierarchy string, e.g. "8 > 8.2 > Limitation of Liability" */
  sectionHierarchy?: string;
}

const riskColors: Record<RiskFindingDTO['riskLevel'], string> = {
  low: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  medium: 'border-orange-300 bg-orange-50 text-orange-800',
  high: 'border-red-300 bg-red-50 text-red-800',
  critical: 'border-red-500 bg-red-100 text-red-900',
};

const riskDot: Record<RiskFindingDTO['riskLevel'], string> = {
  low: 'bg-yellow-400',
  medium: 'bg-orange-400',
  high: 'bg-red-500',
  critical: 'bg-red-700',
};

export const SourceCitation: React.FC<SourceCitationProps> = ({
  finding,
  sectionHierarchy,
}) => {
  const isNotEvaluated = finding.status === 'not_evaluated';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">Source Citations</span>
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            {finding.evidence.length} source{finding.evidence.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Risk level badge */}
        {!isNotEvaluated && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${riskColors[finding.riskLevel]}`}
          >
            <span className={`w-2 h-2 rounded-full ${riskDot[finding.riskLevel]}`} />
            {finding.riskLevel.toUpperCase()}
          </span>
        )}

        {isNotEvaluated && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-gray-100 text-gray-600">
            <AlertCircle className="w-3 h-3" />
            NOT EVALUATED
          </span>
        )}
      </div>

      {/* Section hierarchy breadcrumb */}
      {sectionHierarchy && (
        <div className="px-4 py-2 border-b border-gray-100 bg-indigo-50/50">
          <div className="flex items-center gap-1.5 text-xs text-indigo-600">
            <Hash className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono">{sectionHierarchy}</span>
          </div>
        </div>
      )}

      {/* Missing documents notice — for not_evaluated findings */}
      {isNotEvaluated && finding.missingDocuments && finding.missingDocuments.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">
              AI refused to evaluate — missing context
            </p>
            <p className="text-xs text-amber-700 mb-2">{finding.reason}</p>
            <div className="flex flex-wrap gap-1.5">
              {finding.missingDocuments.map((doc) => (
                <span
                  key={doc}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {doc}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evidence cards */}
      <div className="p-4 space-y-3">
        {finding.evidence.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No source evidence recorded.</p>
        )}

        {finding.evidence.map((ev, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
          >
            {/* Evidence meta */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                <FileText className="w-3.5 h-3.5" />
                <span>{ev.documentName}</span>
              </div>

              {ev.section && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="w-3 h-3" />
                  <span>Sec {ev.section}</span>
                </div>
              )}

              {ev.page !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>Page {ev.page}</span>
                </div>
              )}

              <span className="ml-auto text-xs text-gray-400 font-mono">#{i + 1}</span>
            </div>

            {/* Exact quote — never paraphrased */}
            <blockquote className="px-4 py-3">
              <p className="text-sm text-gray-800 italic leading-relaxed font-serif before:content-['\u201C'] after:content-['\u201D']">
                {ev.quote}
              </p>
            </blockquote>
          </div>
        ))}
      </div>

      {/* Playbook rule violated */}
      {finding.playbookRuleViolated && (
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-700 mb-0.5">Playbook Rule Violated</p>
            <p className="text-xs text-indigo-600">{finding.playbookRuleViolated}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceCitation;
