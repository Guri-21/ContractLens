import { Handle, Position } from 'reactflow';

import type { UnresolvedEndpointData } from './graphPresentation';

type UnresolvedEndpointProps = {
  data: UnresolvedEndpointData;
};

export function UnresolvedEndpoint({ data }: UnresolvedEndpointProps) {
  return (
    <article className="flex h-20 w-56 flex-col justify-center border border-dashed border-accent bg-white px-3 text-left text-legal-text shadow-sm">
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-accent" />
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-legal-meta">Missing target</p>
      <p className="mt-1 truncate text-xs font-semibold" title={data.targetId}>{data.targetId}</p>
    </article>
  );
}
