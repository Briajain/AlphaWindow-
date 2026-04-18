import React from 'react';
import { motion } from 'motion/react';
import { Database, Zap, Shield, Search, Terminal, ChevronRight, Activity, Globe } from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
}

export default function Landing({ onEnter }: LandingProps) {
  return (
    <div className="min-h-screen bg-bg-terminal text-white font-mono overflow-hidden relative">
      <div className="scanline" />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-gold/5 blur-[150px] pointer-events-none rounded-b-[100%]" />
      
      <div className="container mx-auto px-6 py-12 relative z-10 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bg-3 border border-gold/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif tracking-tight text-white">ALPHA WINDOW</span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-gold/60">Research Core Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-bold text-neu">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-bull" /> SECURE TUNNEL</span>
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-bull" /> LOCAL INFERENCE</span>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 relative"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 text-gold text-[10px] uppercase font-bold tracking-widest mb-4">
              <Terminal className="w-3 h-3" />
              Intelligence Framework v1.0
            </div>
            
            <h1 className="text-6xl md:text-7xl font-serif text-white leading-tight">
              Personal Research <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-bright">Assistant.</span>
            </h1>
            
            <p className="text-neu text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-mono">
              The high-density, local-first intelligence platform designed to capture, archive, and synthesize social fragments into actionable knowledge.
            </p>
          </motion.div>

          {/* Action Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            <button 
              onClick={onEnter}
              className="group relative inline-flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gold blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-xl" />
              <div className="relative flex items-center gap-3 bg-gold hover:bg-gold-bright text-bg-terminal px-8 py-4 rounded-xl font-mono font-bold text-sm tracking-widest uppercase transition-all transform group-hover:-translate-y-0.5">
                Initialize System
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            <span className="text-[10px] text-neu/50 uppercase tracking-[0.2em] flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Private Local Database Connection
            </span>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12 py-12 border-t border-white/5"
          >
            <div className="text-left p-6 rounded-2xl bg-bg-2 border border-white/5 hover:border-gold/20 transition-colors group">
              <Database className="w-6 h-6 text-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Tactical Storage</h3>
              <p className="text-xs text-neu leading-relaxed">Integrated PostgreSQL engine for industrial-grade archival of intelligence fragments.</p>
            </div>
            <div className="text-left p-6 rounded-2xl bg-bg-2 border border-white/5 hover:border-gold/20 transition-colors group">
              <Search className="w-6 h-6 text-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">AI Synthesis</h3>
              <p className="text-xs text-neu leading-relaxed">Local RAG analyst grounded strictly in your personal data to eliminate hallucinations.</p>
            </div>
            <div className="text-left p-6 rounded-2xl bg-bg-2 border border-white/5 hover:border-gold/20 transition-colors group">
              <Globe className="w-6 h-6 text-gold mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Seamless Capture</h3>
              <p className="text-xs text-neu leading-relaxed">Instantly route unstructured real-world posts directly to your structured intelligence vault.</p>
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
