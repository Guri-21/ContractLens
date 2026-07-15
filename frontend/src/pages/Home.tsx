import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/Button';
import { Shield, FileText, Activity, ShieldCheck, Scale, Cpu, Search, CheckCircle } from 'lucide-react';

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
      <section className="pt-24 pb-32 px-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8F264510_1px,transparent_1px),linear-gradient(to_bottom,#8F264510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
            <ShieldCheck className="w-4 h-4" /> Enterprise-Grade Legal AI
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-semibold text-text-dark leading-tight tracking-tight mb-8">
            The intelligent standard for <br/>
            <span className="text-primary italic">contract compliance.</span>
          </h1>
          <p className="text-xl text-text-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Automate SOW to MSA comparisons, instantly identify critical risks, and unify your legal review process with state-of-the-art AI.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="shadow-lg shadow-primary/20">
            Sign In to Platform
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white px-6 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-text-dark">Platform Architecture</h2>
            <p className="text-text-light mt-4">Built for scale, precision, and security.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Cpu, title: 'AI-Powered Analysis', desc: 'State-of-the-art NLP models that understand legal taxonomy.' },
              { icon: FileText, title: 'Document Intelligence', desc: 'Automatically cross-reference MSAs with incoming SOWs.' },
              { icon: Activity, title: 'Risk Monitoring', desc: 'Real-time dashboard for auditing, analytics, and risk scoring.' }
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
