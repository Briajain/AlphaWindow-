import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Trash2, Save, FileText, Search, Link as LinkIcon, ChevronRight, Hash, Clock, Edit3, Eye } from 'lucide-react';

interface Note {
  id?: number;
  title: string;
  content: string;
  updatedAt?: string;
}

interface VaultProps {
  token: string;
}

export default function Vault({ token }: VaultProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotes(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleSave = async () => {
    if (!activeNote) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activeNote)
      });
      const data = await res.json();
      if (data.success) {
        if (!activeNote.id) {
          setNotes([data.data, ...notes]);
          setActiveNote(data.data);
        } else {
          setNotes(notes.map(n => n.id === data.data.id ? data.data : n));
        }
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Destroy this intel record?')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotes(notes.filter(n => n.id !== id));
        if (activeNote?.id === id) setActiveNote(null);
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const createNewNote = () => {
    const newNote = { title: 'UNTITLED_RECORD', content: '' };
    setActiveNote(newNote);
    setIsEditing(true);
  };

  // Internal Linking Logic: [[Note Title]] -> Link
  const renderers = {
    text: ({ value }: { value: string }) => {
      const parts = value.split(/(\[\[.*?\]\])/g);
      return parts.map((part, i) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const title = part.slice(2, -2);
          const target = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
          return (
            <button
              key={i}
              onClick={() => target && setActiveNote(target)}
              className={`text-gold hover:underline decoration-gold/30 font-bold ${!target && 'opacity-50 cursor-not-allowed'}`}
              title={target ? `Jump to ${title}` : `Note "${title}" not found`}
            >
              {title}
            </button>
          );
        }
        return part;
      });
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  return (
    <div className="flex h-full bg-bg-terminal border border-gold/10 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="scanline" />
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-gold/10 bg-bg-1 flex flex-col">
        <div className="p-4 border-b border-gold/10 bg-bg-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-white flex items-center gap-2">
              <Book className="w-4 h-4 text-gold" />
              THE VAULT
            </h3>
            <button 
              onClick={createNewNote}
              className="p-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-lg text-gold transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neu" />
            <input 
              type="text" 
              placeholder="SEARCH VAULT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-terminal border border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-[10px] font-mono text-white focus:border-gold/30 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNote(note)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all group ${
                activeNote?.id === note.id 
                  ? 'bg-gold/10 border-gold/30 text-gold' 
                  : 'bg-transparent border-transparent text-neu hover:bg-white/5 hover:text-white'
              }`}
            >
              <FileText className={`w-4 h-4 flex-shrink-0 ${activeNote?.id === note.id ? 'text-gold' : 'text-neu group-hover:text-gold/50'}`} />
              <div className="flex-1 overflow-hidden">
                <div className="text-[11px] font-bold truncate tracking-tight">{note.title}</div>
                <div className="text-[9px] font-mono opacity-50 flex items-center gap-1.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(note.updatedAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
              <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeNote?.id === note.id ? 'opacity-100 text-gold' : ''}`} />
            </button>
          ))}
          {filteredNotes.length === 0 && !loading && (
            <div className="py-12 text-center">
              <div className="text-neu/20 font-serif italic text-sm mb-2">No records found...</div>
              <button onClick={createNewNote} className="text-gold font-mono text-[9px] uppercase tracking-widest hover:underline">Initialise Fragment</button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col bg-bg-terminal relative">
        <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.div 
              key={activeNote.id || 'new'}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Note Header */}
              <div className="h-14 border-b border-gold/10 bg-bg-2 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                  <input 
                    type="text" 
                    value={activeNote.title}
                    onChange={(e) => setActiveNote({...activeNote, title: e.target.value.toUpperCase()})}
                    className="bg-transparent text-white font-serif text-lg font-bold outline-none flex-1 placeholder:opacity-20"
                    placeholder="UNTITLED_ANALYSIS"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] font-bold tracking-widest transition-all ${
                      isEditing ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-white/5 border-white/10 text-neu hover:text-white'
                    }`}
                  >
                    {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    {isEditing ? 'PREVIEW' : 'EDIT'}
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gold text-bg-terminal rounded-lg font-mono text-[10px] font-bold tracking-widest hover:bg-gold-bright transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    SYNC
                  </button>
                  {activeNote.id && (
                    <button 
                      onClick={() => handleDelete(activeNote.id!)}
                      className="p-1.5 bg-bear/10 hover:bg-bear/20 border border-bear/20 rounded-lg text-bear transition-all ml-4"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editor/Preview */}
              <div className="flex-1 flex overflow-hidden">
                <div className={`flex-1 overflow-y-auto custom-scrollbar p-8 ${!isEditing ? 'hidden' : 'block'}`}>
                  <textarea 
                    value={activeNote.content}
                    onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
                    placeholder="Begin entry... use [[Note Title]] for internal linking."
                    className="w-full h-full bg-transparent text-neu font-mono text-sm leading-relaxed outline-none resize-none placeholder:opacity-10"
                  />
                </div>
                {!isEditing && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-bg-terminal prose prose-invert prose-gold max-w-none prose-sm font-mono leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Handle internal links in text
                        text: ({ value }: { value: string }) => {
                          const parts = value.split(/(\[\[.*?\]\])/g);
                          return (
                            <>
                              {parts.map((part, i) => {
                                if (part.startsWith('[[') && part.endsWith(']]')) {
                                  const title = part.slice(2, -2);
                                  const target = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => target && setActiveNote(target)}
                                      className={`text-gold hover:underline decoration-gold/30 font-bold ${
                                        !target ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                      }`}
                                      title={target ? `Jump to ${title}` : `Note "${title}" not found`}
                                    >
                                      {title}
                                    </button>
                                  );
                                }
                                return part;
                              })}
                            </>
                          );
                        }
                      }}
                    >
                      {activeNote.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30 select-none">
              <div className="w-24 h-24 rounded-full border-2 border-gold/20 border-dashed animate-spin-slow mb-8 flex items-center justify-center">
                <Book className="w-10 h-10 text-gold" />
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">ARCHIVE INACTIVE</h2>
              <p className="text-neu font-mono text-[10px] uppercase tracking-[0.4em]">Select a record or initialise new fragment</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
