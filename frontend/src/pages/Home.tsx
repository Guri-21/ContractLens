import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Shield, FileText, Activity, ShieldCheck, Cpu, ArrowRight, GitCompareArrows } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary font-sans text-text">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-serif text-xl font-bold tracking-tight text-text-dark">
              ContractLens
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary transition-colors">Workflow</a>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#FBF8F3] px-6 py-24 md:py-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8F26450D_1px,transparent_1px),linear-gradient(to_bottom,#8F26450D_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Enterprise-Grade Legal AI
          </div>
          <h1 className="mx-auto max-w-5xl font-serif text-5xl font-semibold leading-[0.98] tracking-tight text-text-dark md:text-7xl lg:text-8xl">
            <span className="block">AI contract review,</span>
            <span className="block italic text-primary">governed by evidence.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-text-light md:text-xl">
            Compare SOWs against approved MSAs, expose hidden contradictions, cite exact source clauses, and refuse analysis when documents are missing.
          </p>
          <div className="mt-10 flex justify-center">
            <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="shadow-lg shadow-primary/20">
              Sign In to Platform <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Workflow</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-text-dark">MSA to SOW review, traced end to end.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: Shield, title: 'Admin Publishes MSA', text: 'Approved governing agreements are assigned to legal advisors.' },
              { icon: FileText, title: 'Advisor Uploads SOW', text: 'The SOW is compared against the assigned MSA and Indian-law grounding.' },
              { icon: GitCompareArrows, title: 'Contradictions Surface', text: 'Payment, liability, SLA, governing law, and missing exhibits are flagged.' },
              { icon: Activity, title: 'Audit Trail Locks', text: 'Every finding includes risk score, source quote, and reviewer decision trail.' },
            ].map((item) => (
              <div key={item.title} className="border border-slate-200 bg-[#FBF8F3] p-5">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-sm font-bold text-text-dark">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-light">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white px-6 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-text-dark">Built For The Problem Statement</h2>
            <p className="text-text-light mt-4">Legal review with source evidence, refusal, and auditability.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Cpu, title: 'Grounded AI Analysis', desc: 'Clause classification, contradiction detection, and redline suggestions with source quotes.' },
              { icon: FileText, title: 'Cross-Document Review', desc: 'Admin-approved MSAs are compared against advisor-uploaded SOWs and supporting documents.' },
              { icon: Activity, title: 'Risk & Audit Trail', desc: 'Severity-weighted scores, reviewer decisions, missing-data refusals, and exportable evidence.' }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-xl bg-background border border-slate-200 hover:shadow-md transition-shadow">
                <f.icon className="w-10 h-10 text-accent mb-6" />
                <h3 className="text-lg font-semibold text-text-dark mb-3">{f.title}</h3>
                <p className="text-text-light leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-dark text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Shield className="w-6 h-6 text-accent" />
            <span className="font-serif font-bold tracking-widest text-lg">ContractLens</span>
          </div>
          <div className="text-sm text-slate-400">
            &copy; 2026 ContractLens Enterprise. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
