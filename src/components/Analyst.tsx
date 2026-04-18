import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, Loader2, Save, Terminal, ShieldAlert, Cpu, Sparkles, HelpCircle, Paperclip, FileText, Trash2, X, ChevronRight, Files } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Source {
  id: number;
  filename: string;
  type: string;
  createdAt: string;
}

interface AnalystProps {
  token: string;
}

export default function Analyst({ token }: AnalystProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSources(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/sources/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSources(prev => [data.data, ...prev]);
        setMessages(prev => [...prev, { role: 'assistant', content: `SYSTEM_LOG: Document "${file.name}" ingested and integrated into local intelligence layer.` }]);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSources(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleQuery = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = presetQuery || query;
    if (!finalQuery.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: finalQuery };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: finalQuery })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "SYSTEM_ERROR: " + (data.error || "Analysis failed.") }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "CRITICAL_CONNECTION_FAILURE: Cannot reach local intelligence node." }]);
    } finally {
      setLoading(false);
    }
  };

  const saveToVault = async (content: string) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: `ANALYSIS_${new Date().toISOString().slice(0,10)}`, 
          content 
        })
      });
      if (res.ok) alert('Report synced to THE VAULT');
    } catch (err) {
      console.error(err);
    }
  };

  const presets = [
    "Summarize $NVDA market sentiment",
    "Latest trends in Finance AI",
    "Who is the most active operator?",
    "Identify bearish signals in Defense"
  ];

  return (
    <div className="flex flex-col h-full bg-bg-terminal border border-gold/10 rounded-2xl overflow-hidden relative shadow-2xl">
      <div className="scanline" />
      
      {/* Header */}
      <div className="h-14 border-b border-gold/10 bg-bg-2 flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-gold/10 border border-gold/20">
            <Bot className="w-4 h-4 text-gold" />
          </div>
          <h3 className="font-serif text-white flex items-center gap-2">
            AI ANALYST NODE
            <span className="text-[9px] font-mono text-bull bg-bull/5 px-1.5 border border-bull/10 rounded">ACTIVE</span>
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[9px] font-mono text-neu">
          <button 
            onClick={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all ${
              isSourcePanelOpen ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/5 border-white/10 text-neu hover:text-white'
            }`}
          >
            <Files className="w-3 h-3" /> INTEL SOURCES ({sources.length})
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3" /> QWEN_2.5_1.5B
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3" /> PARALLEL_EXEC_ON
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Source Panel */}
        <AnimatePresence>
          {isSourcePanelOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-bg-2 border-r border-gold/10 z-20 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gold/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gold tracking-widest uppercase">Intel Repository</span>
                <button onClick={() => setIsSourcePanelOpen(false)} className="text-neu hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="p-4 border-b border-gold/10">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf,.md,.txt" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-2 bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-lg text-gold font-mono text-[9px] font-bold tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                  UPLOAD DOCUMENT (PDF/MD)
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {sources.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <Files className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-mono">NO SOURCES UPLOADED</span>
                  </div>
                ) : (
                  sources.map(s => (
                    <div key={s.id} className="p-3 bg-bg-3 border border-white/5 rounded-xl group transition-all hover:border-gold/20">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3 h-3 text-gold shrink-0" />
                          <span className="text-[10px] text-white truncate font-bold uppercase tracking-tight" title={s.filename}>{s.filename}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteSource(s.id)}
                          className="text-bear opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bear/10 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-neu/50 font-mono">
                        <span>{s.type.toUpperCase()} DOCUMENT</span>
                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative z-0"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto opacity-40">
              <Sparkles className="w-12 h-12 text-gold mb-6 animate-pulse" />
              <h2 className="text-2xl font-serif text-white mb-4">Market Intelligence Core</h2>
              <p className="text-neu font-mono text-[10px] uppercase tracking-[0.2em] leading-relaxed mb-8">
                System is primed to analyze captured X data fragments and uploaded intel documents. Ask for summaries, sentiment reports, or pattern recognition.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full">
                {presets.map(p => (
                  <button 
                    key={p} 
                    onClick={() => handleQuery(undefined, p)}
                    className="bg-bg-3 hover:bg-bg-4 border border-white/5 rounded-lg py-2 px-4 text-[10px] text-gold font-bold tracking-wider transition-all text-left flex items-center justify-between group"
                  >
                    {p}
                    <HelpCircle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-6 border ${
                  m.role === 'user' 
                    ? 'bg-gold/5 border-gold/10' 
                    : 'bg-bg-2 border-white/5'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {m.role === 'user' ? (
                      <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Operator Context</span>
                    ) : (
                      <span className="text-[10px] font-bold text-bull uppercase tracking-widest flex items-center gap-2">
                         <Bot className="w-3 h-3" /> Intel Synthesis
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-mono leading-relaxed prose prose-invert prose-gold max-w-none prose-sm">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {m.role === 'assistant' && (
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] text-neu font-mono italic opacity-50">Local Intelligence Node // Alpha-01</span>
                      <button 
                        onClick={() => saveToVault(m.content)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-lg text-gold font-mono text-[9px] font-bold tracking-widest transition-all"
                      >
                        <Save className="w-3 h-3" />
                        SYNC TO VAULT
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-bg-2 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
                <Loader2 className="w-4 h-4 text-gold animate-spin" />
                <span className="text-neu font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Scanning Intel Layers...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-gold/10 bg-bg-2 relative z-10">
        <form onSubmit={handleQuery} className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ENTER COMMAND: Summarize $... Identify... Analyze..."
            className="w-full bg-bg-terminal border border-white/10 rounded-xl py-4 pl-6 pr-16 text-sm font-mono text-white focus:border-gold/40 outline-none transition-all placeholder:text-neu/20 shadow-inner"
            autoFocus
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gold text-bg-terminal rounded-lg hover:bg-gold-bright transition-all disabled:opacity-30 disabled:hover:bg-gold"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[9px] text-neu font-mono uppercase tracking-[0.2em] ml-2">
            Connected to local inference engine (Port: 11434)
          </p>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-bull shadow-[0_0_8px_var(--color-bull)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-bull shadow-[0_0_8px_var(--color-bull)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
