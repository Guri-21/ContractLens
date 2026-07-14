import React, { useMemo } from 'react';
import { ClauseDTO } from '../reviewer-workspace/types';
import { PlusCircle, MinusCircle, Edit3 } from 'lucide-react';

interface VersionComparisonProps {
  oldClauses: ClauseDTO[];
  newClauses: ClauseDTO[];
}

type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffClause {
  status: DiffStatus;
  clause: ClauseDTO;
  oldText?: string;
}

export const VersionComparison: React.FC<VersionComparisonProps> = ({ oldClauses, newClauses }) => {
  const diffs = useMemo(() => {
    const result: DiffClause[] = [];
    const oldMap = new Map<string, ClauseDTO>(oldClauses.map(c => [c.id, c]));
    const newMap = new Map<string, ClauseDTO>(newClauses.map(c => [c.id, c]));

    // Check for modified, unchanged, and added
    for (const newClause of newClauses) {
      const oldClause = oldMap.get(newClause.id);
      if (!oldClause) {
        result.push({ status: 'added', clause: newClause });
      } else if (oldClause.text !== newClause.text) {
        result.push({ status: 'modified', clause: newClause, oldText: oldClause.text });
      } else {
        result.push({ status: 'unchanged', clause: newClause });
      }
    }

    // Check for removed
    for (const oldClause of oldClauses) {
      if (!newMap.has(oldClause.id)) {
        result.push({ status: 'removed', clause: oldClause });
      }
    }

    // Filter out unchanged to focus on diffs
    return result.filter(d => d.status !== 'unchanged');
  }, [oldClauses, newClauses]);

  if (diffs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-gray-200">
        No differences found between the two versions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Version Differences</h3>
      {diffs.map((diff, index) => (
        <div key={index} className={`p-4 rounded-lg border ${
          diff.status === 'added' ? 'bg-green-50 border-green-200' :
          diff.status === 'removed' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center mb-2">
            {diff.status === 'added' && <PlusCircle className="w-5 h-5 text-green-600 mr-2" />}
            {diff.status === 'removed' && <MinusCircle className="w-5 h-5 text-red-600 mr-2" />}
            {diff.status === 'modified' && <Edit3 className="w-5 h-5 text-blue-600 mr-2" />}
            
            <h4 className="font-semibold text-gray-900">
              {diff.clause.title || diff.clause.clauseType || `Clause ${diff.clause.id}`}
            </h4>
            <span className="ml-auto text-xs uppercase tracking-wider font-bold opacity-70">
              {diff.status}
            </span>
          </div>

          {diff.status === 'modified' ? (
            <div className="space-y-2 mt-3 text-sm">
              <div className="bg-red-100/50 p-2 border-l-2 border-red-400 text-red-800 line-through opacity-80">
                {diff.oldText}
              </div>
              <div className="bg-green-100/50 p-2 border-l-2 border-green-400 text-green-800">
                {diff.clause.text}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 mt-2">{diff.clause.text}</p>
          )}
        </div>
      ))}
    </div>
  );
};
