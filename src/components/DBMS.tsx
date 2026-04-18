import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Terminal, Play, Table as TableIcon, Search, AlertCircle, Hash, ChevronRight, Save } from 'lucide-react';

interface TableInfo {
  tableName: string;
  rowCount: number;
}

interface DBMSProps {
  token: string;
}

export default function DBMS({ token }: DBMSProps) {
  const [query, setQuery] = useState('SELECT * FROM posts LIMIT 20;');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/db/tables', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTables(data.data);
    } catch (err) {
      console.error("Failed to fetch schema", err);
    }
  };

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        if (data.data.length > 0) {
          setColumns(Object.keys(data.data[0]));
        } else {
          setColumns([]);
        }
      } else {
        setError(data.error || "Query failed");
      }
    } catch (err) {
      setError("Network error: Database engine unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-bg-terminal gap-4 p-4">
      {/* Schema Browser */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <div className="bg-bg-2 border border-white/5 rounded-xl p-4 overflow-hidden relative">
          <div className="flex items-center gap-2 mb-4 text-gold border-b border-gold/10 pb-2">
            <Database className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Schema Engine</span>
          </div>
          <div className="space-y-1">
            {tables.map(t => (
              <button 
                key={t.tableName}
                onClick={() => setQuery(`SELECT * FROM ${t.tableName} LIMIT 20;`)}
                className="w-full flex items-center justify-between p-2 hover:bg-gold/5 rounded text-[10px] font-mono text-neu hover:text-gold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <TableIcon className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                  {t.tableName}
                </div>
                <div className="flex items-center gap-1 opacity-40">
                  <Hash className="w-2.5 h-2.5" />
                  {t.rowCount}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Quick Commands */}
        <div className="bg-bg-2 border border-white/5 rounded-xl p-4">
          <span className="text-[9px] font-mono text-gold/40 mb-3 block uppercase tracking-widest">Saved Commands</span>
          <div className="space-y-2">
            <button 
              onClick={() => setQuery("SELECT ticker, COUNT(*) FROM posts GROUP BY ticker ORDER BY COUNT(*) DESC;")}
              className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-[9px] font-mono text-white/60 truncate"
            >
              Analyze Volume by Ticker
            </button>
            <button 
              onClick={() => setQuery("SELECT category, sentiment, COUNT(*) FROM posts GROUP BY category, sentiment;")}
              className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-[9px] font-mono text-white/60 truncate"
            >
              Sentiment Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* Main Console */}
      <div className="flex-1 flex flex-col gap-4">
        {/* SQL Editor */}
        <div className="bg-bg-2 border border-white/5 rounded-xl overflow-hidden flex flex-col relative h-1/2">
          <div className="h-10 bg-black/40 px-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono text-gold font-bold uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5" />
              SQL Console
            </div>
            <button 
              onClick={runQuery}
              disabled={loading}
              className="flex items-center gap-2 bg-bull/20 text-bull border border-bull/30 h-7 px-4 rounded text-[9px] font-bold tracking-widest hover:bg-bull/30 transition-all disabled:opacity-30"
            >
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              EXECUTE_COMMAND
            </button>
          </div>
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent p-6 font-mono text-xs text-bull focus:outline-none resize-none caret-bull"
            spellCheck={false}
          />
        </div>

        {/* Results Viewer */}
        <div className="bg-bg-2 border border-white/5 rounded-xl overflow-hidden flex flex-col h-1/2">
          <div className="h-10 bg-black/40 px-4 border-b border-white/5 flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-neu font-bold uppercase tracking-widest">
              <Search className="w-3.5 h-3.5" />
              Output_Buffer
            </div>
            {results.length > 0 && (
              <span className="text-[9px] font-bold text-gold/60 border border-gold/20 px-2 rounded">
                {results.length} RECORDS_RETRIEVED
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                <div className="max-w-md">
                  <AlertCircle className="w-12 h-12 text-bear mb-4 mx-auto" />
                  <h4 className="text-white font-serif mb-2 uppercase tracking-widest">Execution Failure</h4>
                  <p className="text-bear font-mono text-xs p-4 bg-bear/10 border border-bear/20 rounded-lg">{error}</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 bg-bg-2">
                  <tr className="border-b border-white/10">
                    {columns.map(col => (
                      <th key={col} className="px-4 py-3 text-[9px] font-bold text-gold uppercase tracking-[0.2em]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-[10px] text-white/80">
                  {results.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      {columns.map(col => (
                        <td key={col} className="px-4 py-3 max-w-xs truncate">{String(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none pointer-events-none">
                <span className="text-[12px] font-mono uppercase tracking-[0.5em]">Command result empty</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
