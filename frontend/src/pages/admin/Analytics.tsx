import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function Analytics() {
  return (
    <div className="space-y-6 animate-cl-fade max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Enterprise Analytics</h2>
        <p className="text-text-light text-sm mt-1">Global compliance and risk distribution metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded mb-4" />
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 animate-pulse" style={{ width: `${Math.random() * 60 + 20}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-end gap-4 mt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 bg-slate-100 rounded-t-md relative overflow-hidden" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}>
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
