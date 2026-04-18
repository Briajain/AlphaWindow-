import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, Zap, Search, LayoutGrid, Book, User, LogOut, 
  ChevronRight, RefreshCw, Trash2, TrendingUp, TrendingDown, 
  Minus, Globe, MessageSquareText, BarChart3, Clock, Terminal,
  Filter, Cpu, Database, Menu, X, Bot, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Vault from './Vault';
import Analyst from './Analyst';
import DBMS from './DBMS';



interface Post {
  postId: string;
  username: string;
  text: string;
  financialValidity: number;
  region: string;
  ticker: string;
  sentiment: 'buy' | 'sell' | 'hold';
  category: string;
  timestamp: string | number;
  confidence?: number;
  views?: number;
  likes?: number;
}

interface DashboardProps {
  token: string;
  user: { id: number; username: string };
  onLogout: () => void;
}

type View = 'feed' | 'vault' | 'profile' | 'analyst' | 'db';



export default function Dashboard({ token, user, onLogout }: DashboardProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('feed');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState<'timestamp' | 'likes' | 'views'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Temporal Cursor State
  const [cursorTs, setCursorTs] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const [postsRes, statsRes] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/stats')
      ]);
      const postsData = await postsRes.json();
      const statsData = await statsRes.json();
      if (postsData.success) setPosts(postsData.data);
      if (statsData.success) setTotalCount(statsData.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(posts.map(p => p.category));
    return ['ALL', ...Array.from(cats)].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(p => {
      const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
      const matchesSearch = 
        p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ticker.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const valA = Number(a[sortBy]) || 0;
      const valB = Number(b[sortBy]) || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [posts, activeCategory, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = posts.length;
    if (!total) return { total, topCategory: 'N/A', topPct: 0 };
    
    const catCounts: { [key: string]: number } = {};
    posts.forEach(p => {
      const cat = p.category || 'General';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    
    let topCat = 'General';
    let maxCount = 0;
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    });

    return { 
      total, 
      topCategory: topCat.toUpperCase(), 
      topPct: Math.round((maxCount / total) * 100) 
    };
  }, [posts]);

  // Temporal Cursor Handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!feedRef.current || filteredPosts.length < 2) return;
    const rect = feedRef.current.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    
    const timestamps = filteredPosts.map(p => Number(p.timestamp));
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const ts = minTs + rx * (maxTs - minTs);
    setCursorTs(ts);
  };

  return (
    <div className="min-h-screen bg-bg-terminal text-white font-mono flex overflow-hidden">
      <div className="scanline" />
      
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-bg-1 border-r border-gold/10 flex flex-col transition-all duration-300 relative z-30
      `}>
        {/* Profile Section */}
        <div className="p-6 border-b border-gold/10 bg-bg-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-gold" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate uppercase tracking-tighter">{user.username}</div>
                <div className="text-[9px] text-gold/60 font-bold tracking-widest">{user.id.toString().padStart(4, '0')} · OPERATOR</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div>
            <div className="text-[10px] text-neu uppercase tracking-[0.2em] mb-4 pl-2 font-bold">Core Systems</div>
            <div className="space-y-1">
              <NavBtn 
                icon={<LayoutGrid className="w-4 h-4" />} 
                label="Cockpit" 
                active={activeView === 'feed'} 
                collapsed={!isSidebarOpen}
                onClick={() => setActiveView('feed')} 
              />
              <NavBtn 
                icon={<Book className="w-4 h-4" />} 
                label="The Vault" 
                active={activeView === 'vault'} 
                collapsed={!isSidebarOpen}
                onClick={() => setActiveView('vault')} 
              />
              <NavBtn 
                icon={<Bot className="w-4 h-4" />} 
                label="AI Analyst" 
                active={activeView === 'analyst'} 
                collapsed={!isSidebarOpen}
                onClick={() => setActiveView('analyst')} 
              />
              <NavBtn 
                icon={<Database className="w-4 h-4" />} 
                label="DB Engine" 
                active={activeView === 'db'} 
                collapsed={!isSidebarOpen}
                onClick={() => setActiveView('db')} 
              />
              <NavBtn 
                icon={<User className="w-4 h-4" />} 
                label="Operator" 
                active={activeView === 'profile'} 
                collapsed={!isSidebarOpen}
                onClick={() => setActiveView('profile')} 
              />


            </div>
          </div>

          <AnimatePresence>
            {activeView === 'feed' && isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="text-[10px] text-neu uppercase tracking-[0.2em] mb-4 pl-2 font-bold">Categories</div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase flex items-center justify-between group ${
                        activeCategory === cat ? 'bg-gold/10 text-gold border border-gold/20' : 'text-neu hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {cat}
                      <span className="opacity-30 text-[8px] group-hover:opacity-100 transition-opacity">
                        {posts.filter(p => p.category === cat || (cat === 'ALL')).length}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gold/10 bg-bg-2">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-bear hover:bg-bear/10 transition-all font-bold text-[11px] tracking-[0.15em]"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && 'TERMINATE'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-gold/10 bg-bg-terminal flex items-center justify-between px-8 relative z-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neu hover:text-gold transition-colors">
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl font-serif text-white flex items-center gap-3">
                ALPHA WINDOW
                <span className="px-1.5 py-0.5 bg-bull/10 text-bull text-[9px] font-mono border border-bull/20 rounded uppercase tracking-widest">Research Assistant</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neu group-focus-within:text-gold transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH INTEL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-1 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-[10px] font-mono text-white focus:border-gold/30 outline-none transition-all placeholder:text-neu/30 tracking-widest uppercase"
              />
            </div>
            <div className="flex items-center gap-4 border-l border-gold/10 pl-6 h-8">
              <StatusItem icon={<Cpu className="w-3.5 h-3.5" />} label="STK" active />
              <StatusItem icon={<Database className="w-3.5 h-3.5" />} label="SQL" active />
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden p-8">
          <AnimatePresence mode="wait">
            {activeView === 'feed' ? (
              <motion.div 
                key="feed"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col gap-8"
              >
                {/* KPI Strip */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                  <KPICard title="TOTAL INTEL" value={totalCount.toString()} sub="Stored fragments" icon={<Database className="w-4 h-4 text-gold" />} />
                  <KPICard title="HOT SECTOR" value={stats.topCategory} sub={`${stats.topPct}% dominance`} icon={<Zap className="w-4 h-4 text-gold" />} />
                  <KPICard title="DATA DENSITY" value={`${Math.round(totalCount / Math.max(1, posts.length / 10))}x`} sub="Volume growth index" icon={<BarChart3 className="w-4 h-4 text-bull" />} color="bull" />
                  <KPICard title="ACTIVE STREAM" value="SYNCED" sub="2s polling active" icon={<RefreshCw className="w-4 h-4 text-gold animate-spin-slow" />} />
                </div>

                {/* Main Feed Table */}
                <div 
                  className="flex-1 card-quant flex flex-col min-h-0 tc-wrap"
                  ref={feedRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setCursorTs(null)}
                >
                  <div className="ch-quant">
                    <div className="flex items-center gap-4">
                      <span className="ct-quant">Live Intel Feed</span>
                      <span className="text-[9px] text-neu/50 uppercase tracking-widest">{activeCategory} STREAM active</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button 
                        onClick={() => {
                          const cycle: any = { timestamp: 'views', views: 'likes', likes: 'timestamp' };
                          setSortBy(cycle[sortBy]);
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-[9px] text-gold hover:bg-white/10 transition-all uppercase tracking-widest font-bold"
                       >
                         <Filter className="w-3 h-3" /> SORT: {sortBy}
                       </button>
                       <div className="h-4 w-px bg-white/10 mx-1" />
                       <span className="text-[10px] text-gold font-bold">{filteredPosts.length}</span>
                       <span className="text-[8px] text-neu font-bold uppercase tracking-widest">RECORDS FOUND</span>
                    </div>
                  </div>

                  {/* Temporal Cursor UI */}
                  {cursorTs && (
                    <div 
                      className="tcursor on" 
                      style={{ 
                        left: `${((cursorTs - Math.min(...filteredPosts.map(p => Number(p.timestamp)))) / (Math.max(...filteredPosts.map(p => Number(p.timestamp))) - Math.min(...filteredPosts.map(p => Number(p.timestamp))))) * (feedRef.current?.getBoundingClientRect().width || 0)}px` 
                      }}
                    >
                      <div className="ttip">{new Date(cursorTs).toLocaleTimeString([], { hour12: false })}</div>
                    </div>
                  )}

                  <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                      <thead className="bg-bg-3 border-b border-white/5 sticky top-0 z-10 font-bold uppercase tracking-widest text-[9px]">
                        <tr>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors group"
                            onClick={() => {
                              if (sortBy === 'timestamp') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                              else { setSortBy('timestamp'); setSortOrder('desc'); }
                            }}
                          >
                             <div className="flex items-center gap-2">
                               Timestamp {sortBy === 'timestamp' && (sortOrder === 'desc' ? <TrendingDown className="w-3 h-3 text-gold" /> : <TrendingUp className="w-3 h-3 text-gold" />)}
                             </div>
                          </th>
                          <th className="px-6 py-4">Identity</th>
                          <th className="px-6 py-4 min-w-[400px]">Data Fragment</th>
                          <th className="px-6 py-4">Category</th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors group"
                            onClick={() => {
                              if (sortBy === 'views') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                              else { setSortBy('views'); setSortOrder('desc'); }
                            }}
                          >
                             <div className="flex items-center gap-2">
                               Views {sortBy === 'views' && (sortOrder === 'desc' ? <TrendingDown className="w-3 h-3 text-gold" /> : <TrendingUp className="w-3 h-3 text-gold" />)}
                             </div>
                          </th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors group"
                            onClick={() => {
                              if (sortBy === 'likes') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                              else { setSortBy('likes'); setSortOrder('desc'); }
                            }}
                          >
                             <div className="flex items-center gap-2">
                               Likes {sortBy === 'likes' && (sortOrder === 'desc' ? <TrendingDown className="w-3 h-3 text-gold" /> : <TrendingUp className="w-3 h-3 text-gold" />)}
                             </div>
                          </th>
                          <th className="px-6 py-4">Asset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {loading && filteredPosts.length === 0 ? (
                          <tr><td colSpan={8} className="py-24 text-center text-neu animate-pulse">Establishing encrypted link to database...</td></tr>
                        ) : filteredPosts.map((post) => (
                           <PostRow 
                            key={post.postId} 
                            post={post} 
                            highlighted={cursorTs ? Math.abs(Number(post.timestamp) - cursorTs) < 300000 : false} 
                           />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeView === 'vault' ? (
              <motion.div 
                key="vault"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Vault token={token} />
              </motion.div>
            ) : activeView === 'analyst' ? (
              <motion.div 
                key="analyst"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <Analyst token={token} />
              </motion.div>
            ) : activeView === 'db' ? (
              <motion.div 
                key="db"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <DBMS token={token} />
              </motion.div>
            ) : (


              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex items-center justify-center"
              >
                <div className="card-quant p-12 text-center max-w-lg w-full">
                  <div className="w-24 h-24 rounded-2xl bg-gold/5 border border-gold/10 mx-auto mb-8 flex items-center justify-center">
                    <User className="w-10 h-10 text-gold" />
                  </div>
                  <h2 className="text-3xl font-serif mb-2">{user.username}</h2>
                  <p className="font-mono text-xs text-neu tracking-[0.2em] mb-10">SENIOR QUANT OPERATOR · CLASSIFIED</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-bg-3 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neu mb-1">OPERATOR ID</div>
                      <div className="text-gold font-bold"># {user.id.toString().padStart(6, '0')}</div>
                    </div>
                    <div className="bg-bg-3 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neu mb-1">CLEARANCE</div>
                      <div className="text-bull font-bold">LEVEL O-5</div>
                    </div>
                  </div>
                  
                  <button onClick={onLogout} className="btn-quant-bear w-full py-3 rounded-lg font-bold tracking-[0.2em] text-xs">TERMINATE LOGON</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function NavBtn({ icon, label, active, onClick, collapsed }: { icon: any, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group border ${
        active 
          ? 'bg-gold/10 border-gold/30 text-gold shadow-[0_0_15px_rgba(197,160,89,0.05)]' 
          : 'bg-transparent border-transparent text-neu hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'text-gold' : 'text-neu group-hover:text-gold/50'} transition-colors shrink-0`}>{icon}</div>
      {!collapsed && <span className="text-[12px] font-bold tracking-tight">{label}</span>}
    </button>
  );
}

function StatusItem({ icon, label, active }: { icon: any, label: string, active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`${active ? 'text-bull' : 'text-neu'} transition-colors`}>{icon}</div>
      <span className="text-[9px] font-bold text-neu uppercase tracking-[0.1em]">{label}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-bull shadow-[0_0_8px_var(--color-bull)]' : 'bg-neu/20'}`} />
    </div>
  );
}

function KPICard({ title, value, sub, icon, color = 'gold' }: { title: string, value: string, sub: string, icon: any, color?: 'gold' | 'bull' | 'bear' }) {
  const colorHash: any = { gold: 'text-gold', bull: 'text-bull', bear: 'text-bear' };
  return (
    <div className="card-quant p-6 group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[9px] text-neu font-bold uppercase tracking-widest">{title}</span>
        <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-gold/20 transition-colors">{icon}</div>
      </div>
      <div className={`text-3xl font-bold font-mono tracking-tighter mb-1 ${colorHash[color]}`}>{value}</div>
      <div className="text-[9px] text-neu/50 uppercase tracking-wider">{sub}</div>
    </div>
  );
}

function PostRow({ post, highlighted }: { post: Post, highlighted: boolean }) {
  return (
    <tr className={`transition-all duration-300 border-l-2 ${
      highlighted ? 'bg-gold/5 border-gold animate-pulse text-white' : 'hover:bg-white/5 border-transparent text-neu'
    }`}>
      <td className="px-6 py-4 font-mono text-[10px] opacity-40">
        <span className="text-[10px] text-neu font-mono uppercase tracking-wider opacity-60">
          {new Date(Number(post.timestamp)).toLocaleString(undefined, { 
            month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
          })}
        </span>
      </td>
      <td className="px-6 py-4 font-bold text-white/80">{post.username}</td>
      <td className="px-6 py-4 whitespace-normal">
        <div className="line-clamp-2 leading-relaxed" title={post.text}>{post.text}</div>
      </td>
      <td className="px-6 py-4">
        <span className="px-2 py-0.5 rounded border border-white/5 text-[9px] font-bold uppercase tracking-wider bg-white/5">{post.category}</span>
      </td>
      <td className="px-6 py-4 font-mono text-neu/60">{Number(post.views || 0).toLocaleString()}</td>
      <td className="px-6 py-4 font-mono text-neu/60">{Number(post.likes || 0).toLocaleString()}</td>
      <td className="px-6 py-4">
        <span className="text-gold font-bold">{post.ticker !== 'NONE' ? `$${post.ticker}` : '—'}</span>
      </td>
    </tr>
  );
}

