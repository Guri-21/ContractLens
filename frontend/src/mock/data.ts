export interface PlaybookVersion {
  id: string;
  version: string;
  date: string;
  by: string;
  docs: number;
  status: 'active' | 'archived';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
}

export interface Contract {
  id: string;
  name: string;
  client: string;
  dept: string;
  country: string;
  type: string;
  uploadedBy: string;
  date: string;
  iso: string;
  status: 'reviewed' | 'processing' | 'queued' | 'failed';
  score: number | null;
  level: 'low' | 'medium' | 'high' | 'critical' | null;
  reviewer: string;
  rt: number | null;
}

export interface RuleSet {
  name: string;
  category: string;
  rules: number;
  updated: string;
}

export interface ClauseRecord {
  label: string;
  flagged: number;
  critical: number;
}

export interface TrendRecord {
  m: string;
  v: number;
}

export interface DeptRecord {
  label: string;
  contracts: number;
  avgRisk: number;
}

export interface CountryRecord {
  label: string;
  contracts: number;
  avgRisk: number;
}

export interface ClauseTypeRiskRecord {
  label: string;
  avgRisk: number;
}

export interface AuditTimelineItem {
  kind: string;
  color: string;
  at: string;
  title: string;
  note?: string | null;
  actor?: string;
}

export interface AuditEvent {
  id: string;
  contract: string;
  score: number | null;
  level: 'low' | 'medium' | 'high' | 'critical' | null;
  uploadedAt: string;
  summary: string;
  timeline: AuditTimelineItem[];
}

export const accents = {
  gold: { color: '#9C7A3C', hover: '#836428', soft: '#F3EEE2', text: '#6B5220' },
  crimson: { color: '#8B2635', hover: '#701C29', soft: '#F6E9EA', text: '#6B1F2A' },
};

export const riskMeta = {
  low: { label: 'Low', color: '#6B7B8C', soft: '#EEF1F4', text: '#43505E' },
  medium: { label: 'Medium', color: '#C9A24B', soft: '#F7F0DE', text: '#7A6224' },
  high: { label: 'High', color: '#B4611F', soft: '#F7EBDF', text: '#7A3F12' },
  critical: { label: 'Critical', color: '#8B2635', soft: '#F6E7E9', text: '#61151F' },
};

export const statusMeta = {
  queued: { label: 'Queued', color: '#64748B', soft: '#F1F5F9' },
  processing: { label: 'Processing', color: '#9C7A3C', soft: '#F5EFE2' },
  reviewed: { label: 'Reviewed', color: '#3F6B52', soft: '#E9F1EC' },
  failed: { label: 'Failed', color: '#8B2635', soft: '#F6E7E9' },
};

export const roleMeta: Record<string, { color: string; soft: string }> = {
  'Admin': { color: '#6B1F2A', soft: '#F6E9EA' },
  'Compliance Officer': { color: '#6B5220', soft: '#F3EEE2' },
  'Legal Reviewer': { color: '#334155', soft: '#F1F5F9' },
};

export const initials = (name: string): string => {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

export const levelFor = (s: number | null): 'low' | 'medium' | 'high' | 'critical' | null => {
  if (s == null) return null;
  return s >= 80 ? 'critical' : s >= 60 ? 'high' : s >= 40 ? 'medium' : 'low';
};

export const playbookVersions: PlaybookVersion[] = [
  { id: 'v42', version: 'v4.2', date: 'Jul 1, 2026', by: 'Lena Chen', docs: 3, status: 'active' },
  { id: 'v41', version: 'v4.1', date: 'May 15, 2026', by: 'Jordan Okafor', docs: 3, status: 'archived' },
  { id: 'v40', version: 'v4.0', date: 'Mar 2, 2026', by: 'Lena Chen', docs: 2, status: 'archived' },
  { id: 'v33', version: 'v3.3', date: 'Dec 10, 2025', by: 'Jordan Okafor', docs: 2, status: 'archived' },
  { id: 'v32', version: 'v3.2', date: 'Oct 20, 2025', by: 'Lena Chen', docs: 2, status: 'archived' },
];

export const users: User[] = [
  { id: 'u1', name: 'Jordan Okafor', email: 'jordan.okafor@contractlens.io', role: 'Admin', status: 'Active', lastActive: '2 min ago' },
  { id: 'u2', name: 'Aisha Rossi', email: 'aisha.rossi@contractlens.io', role: 'Legal Reviewer', status: 'Active', lastActive: '1 hr ago' },
  { id: 'u3', name: 'David Park', email: 'david.park@contractlens.io', role: 'Legal Reviewer', status: 'Active', lastActive: '3 hr ago' },
  { id: 'u4', name: 'Sofia Marchetti', email: 'sofia.marchetti@contractlens.io', role: 'Compliance Officer', status: 'Active', lastActive: 'Yesterday' },
  { id: 'u5', name: 'Kenji Mueller', email: 'kenji.mueller@contractlens.io', role: 'Legal Reviewer', status: 'Active', lastActive: '20 min ago' },
  { id: 'u6', name: 'Lena Chen', email: 'lena.chen@contractlens.io', role: 'Admin', status: 'Active', lastActive: '5 hr ago' },
  { id: 'u7', name: 'Samuel Adeyemi', email: 'samuel.adeyemi@contractlens.io', role: 'Compliance Officer', status: 'Invited', lastActive: '—' },
  { id: 'u8', name: 'Priya Nair', email: 'priya.nair@contractlens.io', role: 'Legal Reviewer', status: 'Deactivated', lastActive: '3 weeks ago' },
];

export const contracts: Contract[] = [
  { id: 'C-1042', name: 'Northwind Master Services Agreement', client: 'Northwind Trading', dept: 'Procurement', country: 'United States', type: 'MSA', uploadedBy: 'J. Okafor', date: 'Jun 2, 2026', iso: '2026-06-02', status: 'reviewed', score: 34, level: 'low', reviewer: 'A. Rossi', rt: 3.5 },
  { id: 'C-1043', name: 'Vertex Health SaaS SLA', client: 'Vertex Health', dept: 'IT', country: 'United States', type: 'SLA', uploadedBy: 'K. Mueller', date: 'Jun 5, 2026', iso: '2026-06-05', status: 'reviewed', score: 71, level: 'high', reviewer: 'A. Rossi', rt: 6.2 },
  { id: 'C-1051', name: 'Meridian Capital NDA', client: 'Meridian Capital', dept: 'Legal', country: 'United Kingdom', type: 'NDA', uploadedBy: 'L. Chen', date: 'Jun 8, 2026', iso: '2026-06-08', status: 'reviewed', score: 22, level: 'low', reviewer: 'D. Park', rt: 1.4 },
  { id: 'C-1055', name: 'Halcyon Labs Statement of Work', client: 'Halcyon Labs', dept: 'Sales', country: 'United States', type: 'SOW', uploadedBy: 'J. Okafor', date: 'Jun 11, 2026', iso: '2026-06-11', status: 'processing', score: null, level: null, reviewer: '—', rt: null },
  { id: 'C-1060', name: 'Bluepeak Logistics MSA', client: 'Bluepeak Logistics', dept: 'Procurement', country: 'Germany', type: 'MSA', uploadedBy: 'S. Adeyemi', date: 'Jun 14, 2026', iso: '2026-06-14', status: 'reviewed', score: 88, level: 'critical', reviewer: 'A. Rossi', rt: 9.1 },
  { id: 'C-1064', name: 'Cornerstone Realty Lease Exhibit', client: 'Cornerstone Realty', dept: 'Finance', country: 'United States', type: 'EXHIBIT', uploadedBy: 'K. Mueller', date: 'Jun 17, 2026', iso: '2026-06-17', status: 'reviewed', score: 46, level: 'medium', reviewer: 'D. Park', rt: 2.8 },
  { id: 'C-1071', name: 'Atlas Manufacturing Supply MSA', client: 'Atlas Manufacturing', dept: 'Procurement', country: 'Canada', type: 'MSA', uploadedBy: 'L. Chen', date: 'Jun 20, 2026', iso: '2026-06-20', status: 'queued', score: null, level: null, reviewer: '—', rt: null },
  { id: 'C-1078', name: 'Sable & Co Consulting SOW', client: 'Sable & Co', dept: 'Legal', country: 'United Kingdom', type: 'SOW', uploadedBy: 'J. Okafor', date: 'Jun 22, 2026', iso: '2026-06-22', status: 'reviewed', score: 63, level: 'high', reviewer: 'A. Rossi', rt: 5.0 },
  { id: 'C-1083', name: 'Vertex Health Data Processing NDA', client: 'Vertex Health', dept: 'IT', country: 'United States', type: 'NDA', uploadedBy: 'S. Adeyemi', date: 'Jun 25, 2026', iso: '2026-06-25', status: 'reviewed', score: 39, level: 'low', reviewer: 'D. Park', rt: 2.1 },
  { id: 'C-1090', name: 'Meridian Capital Loan MSA', client: 'Meridian Capital', dept: 'Finance', country: 'United States', type: 'MSA', uploadedBy: 'K. Mueller', date: 'Jun 28, 2026', iso: '2026-06-28', status: 'processing', score: null, level: null, reviewer: '—', rt: null },
  { id: 'C-1097', name: 'Halcyon Labs Cloud SLA', client: 'Halcyon Labs', dept: 'IT', country: 'Singapore', type: 'SLA', uploadedBy: 'L. Chen', date: 'Jul 1, 2026', iso: '2026-07-01', status: 'reviewed', score: 55, level: 'medium', reviewer: 'A. Rossi', rt: 3.9 },
  { id: 'C-1101', name: 'Northwind Trading Amendment Exhibit', client: 'Northwind Trading', dept: 'Procurement', country: 'United States', type: 'EXHIBIT', uploadedBy: 'J. Okafor', date: 'Jul 3, 2026', iso: '2026-07-03', status: 'reviewed', score: 29, level: 'low', reviewer: 'D. Park', rt: 1.2 },
  { id: 'C-1108', name: 'Atlas Manufacturing NDA', client: 'Atlas Manufacturing', dept: 'Legal', country: 'Canada', type: 'NDA', uploadedBy: 'S. Adeyemi', date: 'Jul 6, 2026', iso: '2026-07-06', status: 'failed', score: null, level: null, reviewer: '—', rt: null },
  { id: 'C-1112', name: 'Bluepeak Logistics SLA', client: 'Bluepeak Logistics', dept: 'IT', country: 'Germany', type: 'SLA', uploadedBy: 'K. Mueller', date: 'Jul 8, 2026', iso: '2026-07-08', status: 'reviewed', score: 82, level: 'critical', reviewer: 'A. Rossi', rt: 7.4 },
  { id: 'C-1119', name: 'Cornerstone Realty MSA', client: 'Cornerstone Realty', dept: 'Sales', country: 'United States', type: 'MSA', uploadedBy: 'L. Chen', date: 'Jul 10, 2026', iso: '2026-07-10', status: 'processing', score: null, level: null, reviewer: '—', rt: null },
];

export const ruleSetsData: RuleSet[] = [
  { name: 'Data Privacy (CCPA / CPRA)', category: 'Privacy', rules: 24, updated: 'Jun 18, 2026' },
  { name: 'Contract Formation & Enforceability', category: 'Formation', rules: 18, updated: 'Jun 18, 2026' },
  { name: 'Consumer Protection', category: 'Consumer', rules: 12, updated: 'May 30, 2026' },
  { name: 'Employment & Labor', category: 'Employment', rules: 15, updated: 'May 30, 2026' },
  { name: 'Export Controls (EAR)', category: 'Trade', rules: 9, updated: 'Apr 12, 2026' },
];

export const clauseData: ClauseRecord[] = [
  { label: 'Payment Terms', flagged: 14, critical: 3 },
  { label: 'Limitation of Liability', flagged: 11, critical: 4 },
  { label: 'Indemnification', flagged: 9, critical: 2 },
  { label: 'Confidentiality', flagged: 8, critical: 1 },
  { label: 'Data Privacy', flagged: 7, critical: 2 },
  { label: 'Termination', flagged: 6, critical: 1 },
  { label: 'Auto-Renewal', flagged: 5, critical: 1 },
  { label: 'IP Ownership', flagged: 5, critical: 1 },
  { label: 'Governing Law', flagged: 4, critical: 0 },
  { label: 'Warranty', flagged: 3, critical: 0 },
];

export const trendData: TrendRecord[] = [
  { m: 'Dec', v: 51 }, { m: 'Jan', v: 47 }, { m: 'Feb', v: 53 }, { m: 'Mar', v: 49 },
  { m: 'Apr', v: 58 }, { m: 'May', v: 62 }, { m: 'Jun', v: 55 }, { m: 'Jul', v: 60 },
];

export const deptData: DeptRecord[] = [
  { label: 'Information Tech', contracts: 4, avgRisk: 64 },
  { label: 'Procurement', contracts: 4, avgRisk: 61 },
  { label: 'Finance', contracts: 2, avgRisk: 62 },
  { label: 'Sales', contracts: 2, avgRisk: 58 },
  { label: 'Legal', contracts: 3, avgRisk: 41 },
];

export const countryData: CountryRecord[] = [
  { label: 'Germany', contracts: 2, avgRisk: 85 },
  { label: 'United States', contracts: 8, avgRisk: 52 },
  { label: 'Singapore', contracts: 1, avgRisk: 55 },
  { label: 'United Kingdom', contracts: 2, avgRisk: 43 },
  { label: 'Canada', contracts: 2, avgRisk: 40 },
];

export const clauseTypeRisk: ClauseTypeRiskRecord[] = [
  { label: 'Limitation of Liability', avgRisk: 78 },
  { label: 'Payment Terms', avgRisk: 66 },
  { label: 'Indemnification', avgRisk: 61 },
  { label: 'Data Privacy', avgRisk: 57 },
  { label: 'Confidentiality', avgRisk: 44 },
];

export const auditData: AuditEvent[] = [
  {
    id: 'C-1060', contract: 'Bluepeak Logistics MSA', score: 88, level: 'critical', uploadedAt: 'Jun 14, 09:12',
    summary: 'Uploaded by J. Okafor — scored Critical (88), 7 findings, 3 reviewer actions',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jun 14 09:12', title: 'Document uploaded by Jordan Okafor', note: null },
      { kind: 'AI Score', color: '#8B2635', at: 'Jun 14 09:14', title: 'Engine scored 88 / Critical — 7 findings against Playbook v4.2', note: null },
      { kind: 'Override', color: '#B4611F', at: 'Jun 15 11:20', title: 'Limitation of Liability finding overridden', actor: 'A. Rossi', note: 'Cap negotiated at 2x fees; acceptable per counsel.' },
      { kind: 'Accept', color: '#3F6B52', at: 'Jun 15 11:40', title: 'Accepted redline on Payment Terms (net-45 → net-30)', actor: 'A. Rossi', note: null },
      { kind: 'Reject', color: '#8B2635', at: 'Jun 15 12:05', title: 'Rejected AI suggestion to remove auto-renewal', actor: 'A. Rossi', note: 'Client requires evergreen term.' },
      { kind: 'Complete', color: '#64748B', at: 'Jun 15 12:10', title: 'Marked as reviewed', note: null },
    ]
  },
  {
    id: 'C-1112', contract: 'Bluepeak Logistics SLA', score: 82, level: 'critical', uploadedAt: 'Jul 8, 14:30',
    summary: 'Uploaded by K. Mueller — scored Critical (82), 5 findings, 2 reviewer actions',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jul 8 14:30', title: 'Document uploaded by Kenji Mueller', note: null },
      { kind: 'AI Score', color: '#8B2635', at: 'Jul 8 14:33', title: 'Engine scored 82 / Critical — 5 findings', note: null },
      { kind: 'Accept', color: '#3F6B52', at: 'Jul 8 16:02', title: 'Accepted uptime SLA credit correction', actor: 'A. Rossi', note: null },
      { kind: 'Override', color: '#B4611F', at: 'Jul 8 16:20', title: 'Data-residency finding overridden with DPA addendum', actor: 'A. Rossi', note: 'Addendum attached as Exhibit D.' },
    ]
  },
  {
    id: 'C-1043', contract: 'Vertex Health SaaS SLA', score: 71, level: 'high', uploadedAt: 'Jun 5, 10:05',
    summary: 'Uploaded by K. Mueller — scored High (71), 4 findings, 2 reviewer actions',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jun 5 10:05', title: 'Document uploaded by Kenji Mueller', note: null },
      { kind: 'AI Score', color: '#B4611F', at: 'Jun 5 10:07', title: 'Engine scored 71 / High — 4 findings', note: null },
      { kind: 'Accept', color: '#3F6B52', at: 'Jun 5 15:44', title: 'Accepted liability cap redline', actor: 'A. Rossi', note: null },
      { kind: 'Complete', color: '#64748B', at: 'Jun 5 16:00', title: 'Marked as reviewed', note: null },
    ]
  },
  {
    id: 'C-1108', contract: 'Atlas Manufacturing NDA', score: null, level: null, uploadedAt: 'Jul 6, 08:20',
    summary: 'Uploaded by S. Adeyemi — processing failed, retry pending',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jul 6 08:20', title: 'Document uploaded by Samuel Adeyemi', note: null },
      { kind: 'Failed', color: '#8B2635', at: 'Jul 6 08:22', title: 'Processing failed — unreadable scanned pages (OCR error)', note: null },
    ]
  },
  {
    id: 'C-1078', contract: 'Sable & Co Consulting SOW', score: 63, level: 'high', uploadedAt: 'Jun 22, 13:15',
    summary: 'Uploaded by J. Okafor — scored High (63), 3 findings, 1 reviewer action',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jun 22 13:15', title: 'Document uploaded by Jordan Okafor', note: null },
      { kind: 'AI Score', color: '#B4611F', at: 'Jun 22 13:18', title: 'Engine scored 63 / High — 3 findings', note: null },
      { kind: 'Reject', color: '#8B2635', at: 'Jun 22 17:30', title: 'Rejected finding on IP assignment (false positive)', actor: 'A. Rossi', note: 'Language already conforms to playbook.' },
      { kind: 'Complete', color: '#64748B', at: 'Jun 22 17:35', title: 'Marked as reviewed', note: null },
    ]
  },
  {
    id: 'C-1042', contract: 'Northwind Master Services Agreement', score: 34, level: 'low', uploadedAt: 'Jun 2, 09:00',
    summary: 'Uploaded by J. Okafor — scored Low (34), 1 finding, no overrides',
    timeline: [
      { kind: 'Upload', color: '#64748B', at: 'Jun 2 09:00', title: 'Document uploaded by Jordan Okafor', note: null },
      { kind: 'AI Score', color: '#6B7B8C', at: 'Jun 2 09:02', title: 'Engine scored 34 / Low — 1 minor finding', note: null },
      { kind: 'Accept', color: '#3F6B52', at: 'Jun 2 11:30', title: 'Accepted governing-law clarification', actor: 'A. Rossi', note: null },
      { kind: 'Complete', color: '#64748B', at: 'Jun 2 11:33', title: 'Marked as reviewed', note: null },
    ]
  },
];
