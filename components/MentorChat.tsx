import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MentorPersona, ContentMode, AISoulProfile } from '../types';
import { chatWithMentor, extractUserPreferences } from '../services/gemini';
import { Send, User, Bot, Mic, MicOff } from 'lucide-react';
import { CompanionAvatar } from './CompanionAvatar';

interface Props {
  className?: string;
  mode: ContentMode;
  sidebarOpen?: boolean;
  mentorWide?: boolean;
  curriculumTitle?: string;
  userDisplayName?: string | null;
  userId?: string | null;
  aiSoul?: AISoulProfile;
  onUpdateAiSoul?: (soul: Partial<AISoulProfile>) => void;
}

const MentorChatComponent: React.FC<Props> = ({ className, mode, sidebarOpen = true, mentorWide = false, curriculumTitle = '', userDisplayName = null, userId = null, aiSoul, onUpdateAiSoul }) => {
  
  // Default to Gemini 2.5 Flash for chat
  const selectedModel = "gemini-2.5-flash";
  const [companionName, setCompanionName] = useState<string>(() => localStorage.getItem('eduos:companionName') || 'Nova');
  const [turnCount, setTurnCount] = useState(0);
  const [companionMood, setCompanionMood] = useState<'neutral' | 'smug' | 'blush' | 'happy' | 'annoyed'>('neutral');
  
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

  useEffect(() => {
    localStorage.setItem('eduos:companionName', companionName);
  }, [companionName]);

  // In this iteration: companion portrait is visible ONLY in wide mode (mentorWide=true).

  const moodToSrc = (mood: typeof companionMood) => {
    // Map moods to actual files that exist in the avatars folder
    // Note: Some images are in Scrapped:Haram folder
    const moodMap: Record<typeof companionMood, { preferred: string; fallback: string }> = {
      'neutral': {
        preferred: '/companion/avatars/Halfbody.png',
        fallback: '/companion/Scrapped:Haram/Halfbody.png'
      },
      'blush': {
        preferred: '/companion/Scrapped:Haram/Half Body And Blushing.jpeg',
        fallback: '/companion/Scrapped:Haram/3:4body and blushing.jpeg'
      },
      'smug': {
        preferred: '/companion/avatars/Halfbody.png',
        fallback: '/companion/Scrapped:Haram/Halfbody.png'
      },
      'happy': {
        preferred: '/companion/avatars/Halfbody.png',
        fallback: '/companion/Scrapped:Haram/Halfbody.png'
      },
      'annoyed': {
        preferred: '/companion/avatars/Halfbody.png',
        fallback: '/companion/Scrapped:Haram/Halfbody.png'
      }
    };
    return moodMap[mood];
  };

  const inferMoodFromUserText = (text: string): typeof companionMood => {
    const t = text.toLowerCase().trim();
    
    // Improved pattern matching - more flexible and catches variations
    // Smug: compliments about intelligence, skill, being good
    if (/(you('?re| are|'?ve been)\s+(so\s+)?(smart|good|great|amazing|brilliant|genius|insane|incredible|awesome|excellent|perfect))|you're\s+(the\s+)?(goat|best|legend|master|pro)|(so|really|very)\s+(smart|good|great|amazing|brilliant|genius|insane|incredible|awesome|excellent|perfect)|(genius|brilliant|insane|goat|legend|amazing|so good|well done|nice work|good job)/i.test(t)) {
      return 'smug';
    }
    
    // Blush: romantic, affectionate, or appearance compliments
    if (/(cute|adorable|beautiful|gorgeous|pretty|hot|sexy|lovely|stunning|attractive|i love you|love you|marry me|waifu|wife|crush|romantic|flirt|flirting|heart|❤|💕|💖|💗|💓|💞|💝)/i.test(t)) {
      return 'blush';
    }
    
    // Happy: gratitude, positive feedback, excitement
    if (/(thank(s| you|s a lot|s so much)|appreciate|ty|tysm|thx|grateful|thanks for|good to know|that's helpful|that helps|excited|happy|yay|woohoo|awesome|great|nice|cool|sweet|perfect)/i.test(t)) {
      return 'happy';
    }
    
    // Annoyed: negative feedback, frustration, criticism
    if (/(stupid|dumb|idiot|trash|garbage|bad|wrong|incorrect|useless|hate|sucks|terrible|awful|horrible|worst|fail|failed|broken|doesn't work|not working|bug|error|mistake|incorrect|no that's|that's not|that's wrong)/i.test(t)) {
      return 'annoyed';
    }
    
    return 'neutral';
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    
    const inferredMood = inferMoodFromUserText(userMsg);
    setCompanionMood(inferredMood);
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Prepare history for API (Gemini expects 'user' and 'model' roles)
    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    try {
      // Get onboarding data from localStorage
      let onboardingContext = '';
      if (curriculumTitle) {
        onboardingContext = `User's learning goal/curriculum: ${curriculumTitle}. `;
      } else if (userId) {
        // Try to get onboarding data from localStorage
        try {
          const localKey = `eduos_user_${userId}`;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            const parsed = JSON.parse(localData);
            if (parsed.onboardingData?.goal) {
              onboardingContext = `User's learning goal: ${parsed.onboardingData.goal}. `;
            } else if (parsed.curriculumTitle) {
              onboardingContext = `User's curriculum: ${parsed.curriculumTitle}. `;
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      
      const response = await chatWithMentor(
        history, 
        userMsg, 
        persona, 
        selectedModel,
        onboardingContext,
        userDisplayName || undefined,
        aiSoul
      );
      setMessages(prev => [...prev, { role: 'model', text: response }]);
      // Drift back toward neutral after a response so she doesn't get stuck in a single emotion.
      window.setTimeout(() => {
        setCompanionMood('neutral');
      }, 8000);

      // --- MEMORY EVOLUTION ---
      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);
      
      // Every 3 turns, check for new preferences to evolve memory
      if (newTurnCount % 3 === 0 && onUpdateAiSoul && aiSoul) {
          const contextHistory = [...messages, { role: 'user', text: userMsg }, { role: 'model', text: response }];
          // Run in background
          extractUserPreferences(contextHistory as any, aiSoul.memoryNotes || '')
            .then((newPrefs) => {
                if (newPrefs && newPrefs.trim().length > 0) {
                    console.log("🧠 [Memory Evolved]:", newPrefs);
                    const currentNotes = aiSoul.memoryNotes || '';
                    // Simple append with newline if needed
                    const updatedNotes = currentNotes ? `${currentNotes}\n${newPrefs}` : newPrefs;
                    onUpdateAiSoul({ memoryNotes: updatedNotes });
                }
            })
            .catch(err => console.error("Memory evolution failed", err));
      }

    } catch (e: any) {
      console.error('[MentorChat] Gemini chat failed:', e);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: `Gemini error: ${e?.message || String(e)}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl border-l border-white/5 ${className} relative overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0 z-30">
      <div className="flex items-center gap-2">
            <CompanionAvatar
              size={32}
              alt={`${companionName} (companion)`}
              className="shadow-lg"
              objectPosition="center 12%"
            />
            <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">{companionName}</div>
                <div className="text-[8px] font-mono text-zinc-500">Personal Mentor</div>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[9px] font-bold px-2 py-1 rounded border ${
              mode === 'SOCRATIC' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              mode === 'PRACTICAL' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}>
              {mode}
          </div>
        </div>
      </div>

      {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-0">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600">
                    <CompanionAvatar size={56} objectPosition="center 14%" />
                </div>
                <p className="text-xs font-mono text-zinc-500">
                    System ready. Select a persona<br/>and initialize protocol.
                </p>
            </div>
        )}
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'user' ? (
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <User size={12} className="text-zinc-400" />
                    </div>
                ) : (
                    <div className="w-10 h-10 flex-shrink-0 mt-1 flex items-center justify-center">
                        <img 
                            src="/Extra/n.png" 
                            alt={companionName}
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm max-w-[85%]' 
                    : `bg-zinc-900/50 border border-white/5 text-zinc-300 rounded-tl-sm ${mentorWide ? 'max-w-[75%]' : 'max-w-[85%]'}`
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex gap-3 items-start">
                 <div className="w-10 h-10 flex-shrink-0 mt-1 flex items-center justify-center">
                    <img 
                        src="/Extra/n.png" 
                        alt={companionName}
                        className="w-full h-full object-contain animate-pulse"
                    />
                 </div>
                 <div className="flex-1 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="ml-1">{companionName} is thinking...</span>
                    </div>
                 </div>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-zinc-950 border-t border-white/5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0 relative p-4">
        <div className="relative group">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Message ${companionName}...`}
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
        {/* Sitting companion */}
        <div className={`mt-3 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mentorWide ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
        }`}>
          <div className="flex items-center gap-3">
            <img
              src="/companion/avatars/sitting.png"
              alt="Nova guides you"
              className="w-10 h-10 rounded-xl border border-white/10 object-cover bg-black/30"
            />
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Nova</p>
              <p className="text-[10px] font-mono text-zinc-400">
                Sitting with you while you explore.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MentorChat = React.memo(MentorChatComponent);
export default MentorChat;
