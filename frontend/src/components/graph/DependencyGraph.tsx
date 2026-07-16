import { DependencyGraph as BaseGraph } from '../../shared-components/DependencyGraph';
import { ClauseDTO } from '../../reviewer-workspace/types';

interface DependencyGraphProps {
  clauses: ClauseDTO[];
}

export default function DependencyGraph({ clauses }: DependencyGraphProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <BaseGraph clauses={clauses} />
    </div>
  );
}
