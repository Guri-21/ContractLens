import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function Settings() {
  return (
    <div className="space-y-6 animate-cl-fade max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-text-dark">Platform Settings</h2>
        <p className="text-text-light text-sm mt-1">Configure global preferences and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-12 bg-slate-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
