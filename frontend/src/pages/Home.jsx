import { Link } from 'react-router-dom';
import { ShieldCheck, User } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full flex flex-col items-center animate-top-down">
        
        {/* Brand Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-neutral-surface border border-black/5 px-4 py-1.5 rounded-full mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-brand-accent font-bold">
              Anna University
            </span>
          </div>
          <h1 className="font-primary text-5xl md:text-6xl font-bold text-brand-primary tracking-tight mb-4">
            Remuneration Engine
          </h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            Secure digital processing and management of academic remuneration claims. Select your portal to continue.
          </p>
        </div>

        {/* Portal Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* Staff Portal Card */}
          <Link to="/login" className="group bg-white rounded-md p-8 shadow-mega border border-black/5 hover:border-brand-accent/30 transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-neutral-surface rounded-full flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform">
              <User size={32} />
            </div>
            <h2 className="font-primary text-2xl font-bold text-brand-primary mb-2">Staff Portal</h2>
            <p className="text-sm text-text-secondary mb-6">
              Submit your remuneration claims, view drafts, and print completed forms.
            </p>
            <div className="mt-auto">
              <span className="font-mono text-xs uppercase tracking-widest text-brand-accent font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                Enter Portal <span className="text-lg">→</span>
              </span>
            </div>
          </Link>

          {/* Admin Portal Card */}
          <Link to="/admin-login" className="group bg-brand-primary rounded-md p-8 shadow-mega border border-black/5 hover:border-brand-accent transition-all flex flex-col items-center text-center relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 rounded-full blur-3xl" />
            
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform relative z-10">
              <ShieldCheck size={32} />
            </div>
            <h2 className="font-primary text-2xl font-bold text-white mb-2 relative z-10">Admin Portal</h2>
            <p className="text-sm text-white/60 mb-6 relative z-10">
              Manage staff profiles, review submitted claims, and oversee operations.
            </p>
            <div className="mt-auto relative z-10">
              <span className="font-mono text-xs uppercase tracking-widest text-brand-accent font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                Secure Access <span className="text-lg">→</span>
              </span>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
