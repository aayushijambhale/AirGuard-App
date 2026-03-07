import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  StickyNote, 
  Trash2, 
  Send, 
  ChevronRight, 
  Search,
  Bot,
  User,
  Loader2,
  X
} from 'lucide-react';
import { generateChatResponseStream } from './lib/gemini';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotes();
    fetchChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchNotes = async () => {
    const res = await fetch('/api/notes');
    const data = await res.json();
    setNotes(data);
  };

  const fetchChatHistory = async () => {
    const res = await fetch('/api/chat');
    const data = await res.json();
    setChatHistory(data.map((m: any) => ({ role: m.role, content: m.content })));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setChatHistory(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Save user message to DB
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMessage)
    });

    try {
      const history = chatHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      let assistantContent = '';
      const stream = generateChatResponseStream(input, history);
      
      setChatHistory(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        assistantContent += chunk;
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].content = assistantContent;
          return newHistory;
        });
      }

      // Save assistant message to DB
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'model', content: assistantContent })
      });

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title || !newNote.content) return;
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    });
    const data = await res.json();
    setNotes(prev => [data, ...prev]);
    setNewNote({ title: '', content: '' });
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = async (id: number) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E7E5E4] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#1C1917] rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Nexus AI</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-[#F5F5F4] text-[#1C1917]' : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Assistant</span>
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === 'notes' ? 'bg-[#F5F5F4] text-[#1C1917]' : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'}`}
            >
              <StickyNote className="w-4 h-4" />
              <span className="text-sm font-medium">Knowledge Base</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#E7E5E4]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E7E5E4] flex items-center justify-center">
              <User className="w-4 h-4 text-[#78716C]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">Personal Account</span>
              <span className="text-[10px] text-[#A8A29E]">Free Tier</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#F5F5F4] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6"
            >
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <Bot className="w-12 h-12" />
                    <div>
                      <h2 className="text-lg font-medium">How can I help you today?</h2>
                      <p className="text-sm">I can help you brainstorm, summarize notes, or answer questions.</p>
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#1C1917]' : 'bg-white border border-[#E7E5E4]'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#1C1917]" />}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#1C1917] text-white' : 'bg-white border border-[#E7E5E4] text-[#1C1917]'}`}>
                      {msg.content || (isTyping && i === chatHistory.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : '')}
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Nexus anything..."
                  className="w-full bg-white border border-[#E7E5E4] rounded-2xl px-6 py-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/5 transition-all shadow-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1C1917] text-white rounded-xl flex items-center justify-center hover:bg-[#262626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col p-8"
            >
              <div className="max-w-6xl mx-auto w-full space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight">Knowledge Base</h2>
                    <p className="text-[#78716C] mt-1">Store and organize your important information.</p>
                  </div>
                  <button 
                    onClick={() => setIsNoteModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1C1917] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#262626] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Note
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                  <input 
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C1917]/5 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => (
                    <motion.div 
                      layout
                      key={note.id}
                      className="group bg-white border border-[#E7E5E4] p-6 rounded-2xl hover:shadow-md transition-all relative"
                    >
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-4 right-4 p-2 text-[#A8A29E] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <h3 className="font-semibold text-lg mb-2 pr-8">{note.title}</h3>
                      <p className="text-sm text-[#78716C] line-clamp-4 leading-relaxed">{note.content}</p>
                      <div className="mt-4 pt-4 border-t border-[#F5F5F4] flex items-center justify-between">
                        <span className="text-[10px] text-[#A8A29E] uppercase tracking-wider font-medium">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#E7E5E4]" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note Modal */}
        <AnimatePresence>
          {isNoteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNoteModalOpen(false)}
                className="absolute inset-0 bg-[#1C1917]/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Create New Note</h3>
                    <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-[#F5F5F4] rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">Title</label>
                      <input 
                        type="text"
                        value={newNote.title}
                        onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Note title..."
                        className="w-full bg-[#F5F5F4] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1C1917]/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">Content</label>
                      <textarea 
                        rows={6}
                        value={newNote.content}
                        onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Write your thoughts here..."
                        className="w-full bg-[#F5F5F4] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1C1917]/5 resize-none"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleCreateNote}
                    className="w-full bg-[#1C1917] text-white py-4 rounded-2xl font-medium hover:bg-[#262626] transition-colors"
                  >
                    Save Note
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
