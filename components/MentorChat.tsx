import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MentorPersona, ContentMode } from '../types';
import { chatWithMentor } from '../services/gemini';
import { Send, Book, Zap, AlertTriangle, User, Bot, Mic, MicOff } from 'lucide-react';

interface Props {
  className?: string;
  mode: ContentMode;
}

const MODELS = [
    { id: "gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)" },
    { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    { id: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Exp)" }
];

const MentorChat: React.FC<Props> = ({ className, mode }) => {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  
  const persona = useMemo(() => {
      switch (mode) {
          case ContentMode.SOCRATIC: return MentorPersona.DEVIL;
          case ContentMode.PRACTICAL: return MentorPersona.COACH;
          case ContentMode.ACADEMIC: return MentorPersona.LIBRARIAN;
          case ContentMode.ELI5: return MentorPersona.COACH; // Friendly/Simple
          default: return MentorPersona.LIBRARIAN;
      }
  }, [mode]);

  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Voice Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setIsListening(false);
            // Optionally auto-send
            // handleSend(transcript); 
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleMic = () => {
      if (!recognitionRef.current) {
          alert("Voice recognition not supported in this browser.");
          return;
      }

      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Prepare history for API (Gemini expects 'user' and 'model' roles)
    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const response = await chatWithMentor(history, userMsg, persona, selectedModel);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl border-l border-white/5 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                <Bot size={16} className="text-zinc-400" />
            </div>
            <div>
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white uppercase tracking-wider focus:outline-none cursor-pointer hover:text-zinc-300 transition-colors"
                >
                    {MODELS.map(m => (
                        <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-300">
                            {m.label}
                        </option>
                    ))}
                </select>
                <div className="text-[8px] font-mono text-zinc-500">Latency: Low</div>
            </div>
        </div>
        <div className={`text-[9px] font-bold px-2 py-1 rounded border ${
            mode === 'SOCRATIC' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            mode === 'PRACTICAL' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            'bg-zinc-800 border-zinc-700 text-zinc-400'
        }`}>
            {mode}
        </div>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600">
                    <Bot size={24} />
                </div>
                <p className="text-xs font-mono text-zinc-500">
                    System ready. Select a persona<br/>and initialize protocol.
                </p>
            </div>
        )}
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 
                    persona === MentorPersona.DEVIL ? 'bg-red-500/20 text-red-500' :
                    persona === MentorPersona.COACH ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-cyan-500/20 text-cyan-500'
                }`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                    : 'bg-zinc-900/50 border border-white/5 text-zinc-300 rounded-tl-sm'
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center animate-pulse">
                    <Bot size={14} className="text-zinc-600" />
                 </div>
                 <div className="flex items-center gap-1 h-8">
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-950 border-t border-white/5">
        <div className="relative group">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Message ${persona}...`}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-zinc-700 text-white placeholder-zinc-600 transition-all shadow-inner"
            />
            
            {/* Mic Button */}
            <button 
                onClick={toggleMic}
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                }`}
                title="Voice Input"
            >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {/* Send Button */}
            <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-0 disabled:scale-90 transition-all shadow-lg"
            >
                <Send size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MentorChat);
