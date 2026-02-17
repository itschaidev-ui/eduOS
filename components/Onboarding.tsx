import React, { useEffect, useRef, useState } from 'react';
import { OnboardingData, CurriculumOption } from '../types';
import { chatWithOnboardingAI, generateCurriculumOptions, isGeminiConfigured } from '../services/gemini';
import { Clock, ChevronRight, User, Target, Sparkles, Brain, LogOut, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper, { Step } from './react-bits/Stepper';
import LightRays from './react-bits/LightRays';
import Counter from './react-bits/Counter';
import { CompanionAvatar } from './CompanionAvatar';

interface Props {
  onComplete: (data: OnboardingData, selectedCurriculum: CurriculumOption) => void;
  onExit: () => void;
  initialName?: string | null;
}

const Onboarding: React.FC<Props> = ({ onComplete, onExit, initialName }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    goal: '',
    hoursPerDay: 1,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    name: initialName || '',
  });
  const [options, setOptions] = useState<CurriculumOption[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<CurriculumOption | null>(null);

  const [progress, setProgress] = useState(0);

  // --- Step 1 (Goal) Chat ---
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [goalStage, setGoalStage] = useState<'ask_goal' | 'ask_clarify'>('ask_goal');
  const [chatLoading, setChatLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [goalNotes, setGoalNotes] = useState(''); // raw user inputs
  const [missionDraft, setMissionDraft] = useState(''); // AI-interpreted mission
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>(() => {
    const greeting = initialName?.trim()
      ? `Hey ${initialName.trim()}! I'm Nova. What's up?`
      : `Hey! I'm Nova. What's up?`;
    return [
      { role: 'ai', text: greeting },
    ];
  });

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages]);

  const isGoodGoal = (text: string) => {
    const t = text.trim();
    if (t.length < 12) return false;
    // Require at least 2 words and one "real" word (avoid "hmm", "ok", etc.)
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    const hasMeaningfulWord = words.some((w) => w.replace(/[^a-zA-Z]/g, '').length >= 4);
    return hasMeaningfulWord;
  };

  const extractMissionDraft = (aiText: string, userMessage?: string, fullConversation?: { role: 'user' | 'ai'; text: string }[]) => {
    // Try to extract learning goal from natural conversation
    // Look for patterns like "learn X", "want to learn", "goal is", etc.
    const text = (aiText + ' ' + (userMessage || '')).toLowerCase();
    
    // Pattern 1: Direct mentions of learning goals in conversation
    const learnPatterns = [
      /(?:want to|wanna|going to|planning to|trying to|need to|want|wanted to|i want to)\s+learn\s+(?:how to\s+)?(?:make|create|build|do|use)\s+([^.!?]+)/i,
      /learn\s+(?:how to\s+)?(?:make|create|build|do|use)\s+([^.!?]+?)(?:\s+to\s+|\s+for\s+|$)/i,
      /goal\s+is\s+to\s+([^.!?]+)/i,
      /(?:studying|learning|mastering|making|creating|building)\s+([^.!?]+)/i,
      /focus\s+on\s+([^.!?]+)/i,
      /(?:how to|how do you)\s+(?:make|create|build|do)\s+([^.!?]+)/i,
      /(?:i want to|i wanna|i'd like to)\s+learn\s+(?:how to\s+)?(?:make|create|build|do)\s+([^.!?]+)/i,
    ];
    
    // Check full conversation context for better extraction
    const conversationText = fullConversation 
      ? fullConversation.map(m => m.text).join(' ').toLowerCase()
      : text;
    
    for (const pattern of learnPatterns) {
      const match = conversationText.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        // Filter out common filler words and validate it's meaningful
        if (extracted.length > 5 && !extracted.match(/^(to|for|about|how|what|when|where|why|that|this|it)\s*$/i)) {
          // Clean up the extracted text
          const cleaned = extracted.replace(/^(to|for|about|how|what|when|where|why|that|this|it)\s+/i, '').trim();
          if (cleaned.length > 5) {
            return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          }
        }
      }
    }
    
    // Pattern 2: Look for AI's understanding/summary in recent messages - PRIORITY
    const summaryPatterns = [
      /(?:we're figuring out|we're working on|we're learning|figuring out|working on)\s+(?:how to\s+)?(?:make|create|build|do|use)\s+([^.!?,]+)/i,
      /(?:so|so you|you want to|your goal is|you're looking to|you're trying to|you want|you'd like to)\s+(?:be taught|learn|to learn|to be taught)\s+(?:how to\s+)?(?:use|make|create|build|do)\s+([^.!?,]+)/i,
      /(?:so|so you|you want to|your goal is|you're looking to|you're trying to|you want)\s+(?:learn\s+)?(?:how to\s+)?(?:make|create|build|do|learn|use)\s+([^.!?,]+)/i,
      /(?:sounds like|looks like|seems like)\s+you\s+want\s+to\s+(?:learn\s+)?(?:how to\s+)?(?:make|create|build|do|use)\s+([^.!?,]+)/i,
      /(?:help you|helping you|we can|we'll)\s+(?:learn\s+)?(?:how to\s+)?(?:make|create|build|do|use)\s+([^.!?,]+)/i,
      /(?:you'd like to|you want to)\s+(?:be taught|learn)\s+(?:how to\s+)?(?:use|make)\s+([^.!?]+)/i,
      /(?:start with|learn|basics of|fundamentals of)\s+([^.!?,]+?)(?:\s+to\s+make|\s+production|\s+software|$)/i,
      /(?:phonk|react|python|javascript|guitar|piano|drawing|design|coding|programming|music|production|editing|video|photo|writing|language)\s+(?:production|development|design|editing|basics|fundamentals)/i,
    ];
    
    // Check AI's last few messages for mission understanding - this is most reliable
    if (fullConversation) {
      const aiMessages = fullConversation.filter(m => m.role === 'ai').slice(-5);
      for (const aiMsg of aiMessages) {
        // First check for "basics of X" or "X production" patterns
        const basicsPattern = /(?:basics of|fundamentals of|start with)\s+([^.!?,]+?)(?:\s+to\s+make|\s+production|\s+software|$)/i;
        const basicsMatch = aiMsg.text.match(basicsPattern);
        if (basicsMatch && basicsMatch[1]) {
          const extracted = basicsMatch[1].trim();
          if (extracted.length > 3) {
            // If it mentions "phonk production" or similar, include that
            if (aiMsg.text.toLowerCase().includes('phonk production')) {
              return 'Phonk production';
            }
            return extracted.charAt(0).toUpperCase() + extracted.slice(1);
          }
        }
        
        // Check for "we're figuring out how to make X" pattern specifically (most reliable)
        const figuringOutPattern = /(?:we're figuring out|we're working on|okay,?\s+so\s+we're figuring out)\s+(?:how to\s+)?(?:make|create|build|do|use|learn)\s+([^.!?,]+)/i;
        const figuringOutMatch = aiMsg.text.match(figuringOutPattern);
        if (figuringOutMatch && figuringOutMatch[1]) {
          let extracted = figuringOutMatch[1].trim();
          // Clean up common trailing words but keep meaningful ones
          extracted = extracted.replace(/\s+(thing|stuff|that|this|it|oh nice|nice)$/i, '').trim();
          if (extracted.length > 3) {
            return extracted.charAt(0).toUpperCase() + extracted.slice(1);
          }
        }
        
        // Then check other summary patterns
        for (const pattern of summaryPatterns) {
          const match = aiMsg.text.match(pattern);
          if (match && match[1]) {
            let extracted = match[1].trim();
            // Clean up filler words like "oh nice" that might get captured
            extracted = extracted.replace(/\s+(oh nice|nice|yeah|yep|sure|ok|okay)$/i, '').trim();
            // Handle "use X to make Y" patterns - keep the full phrase
            if (extracted.includes(' to make ') || extracted.includes(' to create ')) {
              // Keep the full phrase like "Waveform 13 to make phonk music"
              const fullPhrase = extracted;
              if (fullPhrase.length > 5) {
                return fullPhrase.charAt(0).toUpperCase() + fullPhrase.slice(1);
              }
            }
            // Only clean up if it's clearly a filler word, keep meaningful phrases like "phonk music"
            const cleaned = extracted.replace(/\s+(thing|stuff|that|this|it)$/i, '').trim();
            // Keep phrases that include genre/type words (music, song, etc.) as they're meaningful
            if (cleaned.length > 2) {
              return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            }
          }
        }
      }
    }
    
    // Pattern 3: Look for "make X" or "create X" directly in conversation
    const directActionPatterns = [
      /(?:make|create|build|do)\s+([^.!?]+?)(?:\s+music|\s+song|\s+track|\s+beat|$)/i,
    ];
    
    if (fullConversation) {
      const allText = fullConversation.map(m => m.text).join(' ').toLowerCase();
      for (const pattern of directActionPatterns) {
        const match = allText.match(pattern);
        if (match && match[1]) {
          const extracted = match[1].trim();
          if (extracted.length > 3 && !extracted.match(/^(that|this|it|stuff|things)\s*$/i)) {
            return extracted.charAt(0).toUpperCase() + extracted.slice(1);
          }
        }
      }
    }
    
    // Pattern 4: If user message itself is a learning goal
    if (userMessage && isGoodGoal(userMessage)) {
      return userMessage;
    }
    
    // Pattern 5: Fallback - look for topic mentioned in conversation (e.g., "phonk", "music production")
    if (fullConversation) {
      const allText = fullConversation.map(m => m.text).join(' ').toLowerCase();
      // Look for common learning topics mentioned
      const topicPatterns = [
        /(?:phonk|react|python|javascript|guitar|piano|drawing|design|coding|programming|music|production|editing|video|photo|writing|language)/i
      ];
      
      // Also check if AI explicitly mentions what they're learning
      const explicitLearningPattern = /(?:learning|figuring out|working on|making|creating)\s+([^.!?,]+?)(?:\s+music|\s+production|\s+software|$)/i;
      const explicitMatch = allText.match(explicitLearningPattern);
      if (explicitMatch && explicitMatch[1]) {
        const topic = explicitMatch[1].trim();
        if (topic.length > 2 && !topic.match(/^(how|what|when|where|why|to|for|about|that|this|it|stuff|things)\s*$/i)) {
          // If it's a short topic, add context
          if (topic.length < 10 && allText.includes('music')) {
            return `Make ${topic} music`;
          }
          return topic.charAt(0).toUpperCase() + topic.slice(1);
        }
      }
    }
    
    return '';
  };

  const sendGoalMessage = async () => {
    const text = chatInput.trim();
    if (!text || loading || chatLoading) return;
    setChatInput('');

    if (!isGeminiConfigured()) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text },
        {
          role: 'ai',
          text:
            'Gemini is not configured.\n\nSet `VITE_GEMINI_API_KEYS=...` in your project root `.env`, then restart `npm run dev`.'
        }
      ]);
      return;
    }

    // Keep a real Gemini-powered conversation ALWAYS.
    // Only accept/store the message as the "goal" when it's detailed enough.
    let nextGoalForContext = missionDraft || goalNotes || '';
    if (goalStage === 'ask_goal') {
      if (isGoodGoal(text)) {
        setGoalNotes(text);
        nextGoalForContext = text;
        setGoalStage('ask_clarify');
      }
    } else {
      // Clarifier stage: append clarifier to notes for context
      const nextNotes = goalNotes ? `${goalNotes}\n\n${text}` : text;
      setGoalNotes(nextNotes);
      nextGoalForContext = nextNotes;
    }

    // Build history for Gemini (roles: user/model)
    const history = chatMessages.slice(-12).map((m) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    setChatLoading(true);
    setIsTyping(true);
    try {
      const updatedMessages = [...chatMessages, { role: 'user' as const, text }];
      setChatMessages(updatedMessages);
      
      const reply = await chatWithOnboardingAI(history, text, { currentGoal: nextGoalForContext });
      const replyText = reply || '…';
      // Small delay for better UX - makes response feel more natural
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const finalMessages = [...updatedMessages, { role: 'ai' as const, text: replyText }];
      setChatMessages(finalMessages);
      setIsTyping(false);

      // Extract mission naturally from conversation using full context
      const extracted = extractMissionDraft(replyText, text, finalMessages);
      if (extracted) {
        setMissionDraft(extracted);
        // Use the extracted goal for curriculum generation
        setFormData((prev) => ({ ...prev, goal: extracted }));
      } else if (isGoodGoal(text)) {
        // If user message itself is a good goal, use it directly
        setMissionDraft(text);
        setFormData((prev) => ({ ...prev, goal: text }));
      }

      // Check if user confirmed they want to learn (sure, yes, okay, etc.)
      const confirmationPatterns = /^(sure|yes|yeah|yep|ok|okay|alright|sounds good|let's do it|let's go|i'd like that|i want to|i'm interested|thanks|thank you|ok thanks)$/i;
      const isConfirmation = confirmationPatterns.test(text.trim().toLowerCase());
      
      // Check if mission was successfully extracted (not generic like "do that")
      const hasClearMission = extracted && 
                              extracted.length > 3 && 
                              !extracted.toLowerCase().match(/^(do|that|this|it|stuff|things)$/i) &&
                              extracted.toLowerCase() !== 'do that';
      
      // Check if mission was just extracted in this turn (strong signal)
      const missionJustExtracted = hasClearMission && extracted;
      
      // Auto-advance if: mission is extracted AND (user confirmed OR we're past initial goal stage OR AI indicates readiness)
      const aiIndicatesReady = replyText.toLowerCase().includes('so we') || 
                               replyText.toLowerCase().includes('we\'re figuring out') ||
                               replyText.toLowerCase().includes('we\'re working on') ||
                               replyText.toLowerCase().includes('okay, so') ||
                               replyText.toLowerCase().includes('so you') ||
                               replyText.toLowerCase().includes('you\'d like to') ||
                               replyText.toLowerCase().includes('you want to') ||
                               /okay,?\s+so\s+we\'re/i.test(replyText.toLowerCase()) ||
                               (goalStage === 'ask_clarify' && hasClearMission);
      
      // Check if AI clearly stated the mission in a question/statement format (e.g., "So you'd like to be taught...?")
      // This is a strong signal that we have enough information - AI is summarizing/confirming the mission
      const aiStatesMission = (/(?:so|so you|you'd like to|you want to)\s+(?:be taught|learn|to learn)/i.test(replyText) ||
                               /(?:so you'd like|so you want)\s+to\s+(?:be taught|learn)/i.test(replyText) ||
                               /(?:gotcha|makes sense|okay|alright).*?(?:so you|you'd like|you want)/i.test(replyText)) &&
                               hasClearMission;
      
      // Auto-advance conditions:
      // 1. Clear mission extracted AND user confirmed, OR
      // 2. Clear mission extracted AND we're past initial stage, OR  
      // 3. Clear mission extracted AND AI indicates we're ready, OR
      // 4. AI clearly states the mission in a question/statement format
      // 5. User confirmed AND we have any mission (even if not perfect extraction)
      const hasAnyMission = (extracted && extracted.length > 3) || missionDraft.trim().length > 3;
      // Also check if AI said "we're figuring out" which is a strong signal
      const aiSaidFiguringOut = replyText.toLowerCase().includes('we\'re figuring out') || 
                                 replyText.toLowerCase().includes('okay, so we\'re figuring out');
      
      const shouldAutoAdvance = (hasClearMission || (hasAnyMission && isConfirmation)) && 
                                 (isConfirmation || goalStage === 'ask_clarify' || aiIndicatesReady || aiStatesMission || aiSaidFiguringOut || (isConfirmation && hasAnyMission)) && 
                                 currentStep === 1;
      
      if (shouldAutoAdvance) {
        // Small delay before auto-advancing for better UX
        setTimeout(() => {
          setCurrentStep(2);
        }, 1500);
      }
    } catch (e: any) {
      if (import.meta.env?.MODE === 'development') {
        console.error('[Onboarding] Gemini chat failed:', e);
      }
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: `I'm having trouble connecting right now. Please try again.` }
      ]);
      setIsTyping(false);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Step 2 (Time) / Days helpers ---
  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter((d) => d !== day) : [...prev.daysOfWeek, day]
    }));
  };

  // --- Step 4 (Generate Options) ---
  const handleStepChange = async (step: number) => {
    setCurrentStep(step);
    if (step === 4 && options.length === 0) {
      setLoading(true);
      setProgress(0);
      try {
        const timeConstraint = `${formData.hoursPerDay} hours on ${formData.daysOfWeek.join(', ')}`;
        const t = window.setInterval(() => {
          setProgress((p) => {
            if (p >= 95) return 95;
            const remaining = 95 - p;
            const inc = Math.max(0.4, remaining * 0.035);
            return Math.min(95, p + inc);
          });
        }, 120);

        const curriculumOptions = await generateCurriculumOptions(formData.goal, timeConstraint);
        window.clearInterval(t);
        setProgress(100);
        setOptions(curriculumOptions);
      } finally {
        // Small delay so 100% is visible briefly
        window.setTimeout(() => setLoading(false), 200);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-white/20">
        
        {/* Background Noise & Gradients */}
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            
            <LightRays
                raysOrigin="top-center"
                raysColor="#4f46e5"
                raysSpeed={0.2}
                lightSpread={0.6}
                rayLength={1.5}
                followMouse={true}
                mouseInfluence={0.5} 
                noiseAmount={0.08}
                distortion={0.05}
                className="opacity-90"
            />
        </div>

        <button 
            onClick={onExit}
            className="absolute top-6 right-6 text-zinc-600 hover:text-red-400 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-colors z-50"
        >
            <LogOut size={14} /> Abort
        </button>

        <div className="w-full max-w-4xl relative z-10">
          <Stepper
            initialStep={1}
            onStepChange={handleStepChange}
            onFinalStepCompleted={() => {
              if (selectedOption) onComplete(formData, selectedOption);
            }}
            backButtonText="PREVIOUS"
            nextButtonText={currentStep === 4 ? "COMPLETE" : "CONTINUE"}
            nextButtonProps={{
              disabled:
                loading ||
                // Step 1: require at least one valid goal message before continuing
                (currentStep === 1 && (!missionDraft.trim() || goalStage === 'ask_goal')) ||
                (currentStep === 4 && !selectedOption),
              style: {
                opacity:
                  loading ||
                  (currentStep === 1 && (!missionDraft.trim() || goalStage === 'ask_goal')) ||
                  (currentStep === 4 && !selectedOption)
                    ? 0.5
                    : 1
              }
            }}
          >
            {/* STEP 1: Conversational Goal (Chat) - Fully Merged */}
            <Step>
              <div className="flex flex-col h-full min-h-[70vh] w-full">
                {/* Compact Header */}
                <div className="text-center mb-6 shrink-0">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Mission Objective</h2>
                  <p className="text-zinc-400 text-sm">
                    Talk it out. When we’re aligned, hit <span className="text-white font-bold">CONTINUE</span>.
                  </p>
                </div>

                {/* Chat Interface - IS the step, no card wrapper */}
                <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto min-h-0">
                  {/* Chat Messages Area */}
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-5 custom-scrollbar min-h-0 scroll-smooth" style={{ maxHeight: 'calc(70vh - 140px)' }}>
                    <AnimatePresence mode="popLayout">
                      {chatMessages.map((m, i) => (
                        <motion.div
                          key={`${i}-${m.text.substring(0, 10)}`}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className={`flex gap-3 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          {m.role === 'user' ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                              className="w-8 h-8 rounded-full flex items-center justify-center border shadow-lg bg-white/10 border-white/20 text-white shrink-0"
                            >
                              <User size={14} />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              whileHover={{ scale: 1.05 }}
                              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                              className="shrink-0"
                            >
                              <CompanionAvatar
                                size={32}
                                alt="Companion"
                                className="shadow-lg"
                                objectPosition="center 12%"
                              />
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.3 }}
                            className={`max-w-[80%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-4 py-3 shadow-sm ${
                              m.role === 'user'
                                ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 text-white rounded-tr-sm backdrop-blur-sm'
                                : 'bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/5 text-zinc-200 rounded-tl-sm backdrop-blur-sm'
                            }`}
                          >
                            {m.text}
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {chatLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-3 items-start"
                      >
                        <div className="shrink-0">
                          <CompanionAvatar
                            size={32}
                            alt="Companion"
                            className="shadow-lg opacity-60"
                            objectPosition="center 12%"
                          />
                        </div>
                        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm shadow-sm w-64 relative overflow-hidden">
                          {/* Skeleton bars */}
                          <div className="space-y-2">
                            <div className="h-3 bg-zinc-700/50 rounded-full w-full relative overflow-hidden">
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                              />
                            </div>
                            <div className="h-3 bg-zinc-700/50 rounded-full w-3/4 relative overflow-hidden">
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.2 }}
                              />
                            </div>
                            <div className="h-3 bg-zinc-700/50 rounded-full w-5/6 relative overflow-hidden">
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.4 }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Input Area - Fixed at bottom */}
                  <div className="px-6 py-5 border-t border-white/5 shrink-0 bg-gradient-to-t from-black/40 to-transparent">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !chatLoading && sendGoalMessage()}
                        disabled={loading || chatLoading}
                        placeholder="Tell me exactly what you want to learn…"
                        className="w-full bg-black/60 border border-white/10 rounded-2xl pl-4 pr-12 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:bg-black/80 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-lg"
                        autoFocus
                      />
                      <motion.button
                        onClick={sendGoalMessage}
                        disabled={loading || chatLoading || !chatInput.trim()}
                        whileHover={{ scale: chatInput.trim() && !chatLoading ? 1.05 : 1 }}
                        whileTap={{ scale: chatInput.trim() && !chatLoading ? 0.95 : 1 }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
                        title="Send"
                      >
                        <Send size={14} />
                      </motion.button>
                    </motion.div>
                    {formData.goal.trim() && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center"
                      >
                        AI_MISSION: <span className="text-cyan-400 normal-case font-semibold">{missionDraft || formData.goal}</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </Step>

            {/* STEP 2: Time + Days */}
            <Step>
              <div className="space-y-10 py-4">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-purple-500/10 mx-auto mb-6">
                    <Clock size={32} className="text-purple-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tight">Time Dilation</h2>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                    How much bandwidth can you allocate?
                  </p>
                </div>

                <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 max-w-xl mx-auto">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Daily Focus</label>
                    <span className="text-2xl font-bold text-white">{formData.hoursPerDay}h</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.5"
                    value={formData.hoursPerDay}
                    onChange={(e) => setFormData({ ...formData, hoursPerDay: Number(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white hover:accent-cyan-400 transition-all"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                    <span>Casual (30m)</span>
                    <span>Deep Work (4h)</span>
                  </div>
                </div>

                <div className="space-y-4 max-w-xl mx-auto text-center">
                  <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Active Protocols</label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`w-12 h-12 rounded-xl text-xs font-bold transition-all border ${
                          formData.daysOfWeek.includes(day)
                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Step>

            {/* STEP 3: Name */}
            <Step>
              <div className="space-y-8 py-4">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-emerald-500/10 mx-auto mb-6">
                    <User size={32} className="text-emerald-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tight">Identity Matrix</h2>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                    Establish your alias.
                  </p>
                </div>
                <div className="relative group max-w-md mx-auto">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter Alias"
                    className="relative w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black transition-all text-center text-2xl font-bold tracking-tight"
                    autoFocus
                  />
                </div>
              </div>
            </Step>

            {/* STEP 4: Options */}
            <Step>
              <div className="space-y-8 h-full flex flex-col py-4">
                <div className="text-center space-y-4 shrink-0">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-800/50 text-cyan-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                    <Sparkles size={12} /> Analysis Complete
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tighter">Optimal Paths Detected</h2>
                  <p className="text-zinc-400">Select a curriculum architecture to begin initialization.</p>
                </div>

                <div className="grid gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0 max-h-[400px]">
                  {loading ? (
                    <div className="w-full h-[260px] bg-zinc-900/30 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-4">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-r-2 border-cyan-500 rounded-full animate-spin animation-delay-500"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Brain className="text-white animate-pulse" size={22} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Counter
                          value={Math.floor(progress)}
                          places={[100, 10, 1]}
                          fontSize={16}
                          padding={6}
                          gap={4}
                          textColor="rgba(34,211,238,0.9)"
                          fontWeight={900}
                          counterStyle={{
                            background: 'rgba(34,211,238,0.06)',
                            border: '1px solid rgba(34,211,238,0.18)'
                          }}
                          gradientFrom="black"
                        />
                        <span className="text-zinc-500 font-mono text-xs tracking-widest uppercase">%</span>
                      </div>

                      <div className="w-64 h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 via-white to-purple-400 transition-[width] duration-200 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        Architecting options...
                      </p>
                    </div>
                  ) : (
                    options.map((opt, i) => (
                      <motion.div
                        key={opt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => setSelectedOption(opt)}
                        className={`group relative bg-zinc-900/40 hover:bg-zinc-900 border rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                          selectedOption?.id === opt.id
                            ? 'border-cyan-500 bg-zinc-900 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-shimmer rounded-2xl pointer-events-none" />

                        <div className="flex justify-between items-start mb-3 relative z-10">
                          <h3
                            className={`text-xl font-bold transition-colors ${
                              selectedOption?.id === opt.id ? 'text-cyan-400' : 'text-white group-hover:text-cyan-200'
                            }`}
                          >
                            {opt.title}
                          </h3>
                          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider">
                            {opt.estimatedWeeks} Weeks
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed relative z-10 group-hover:text-zinc-300 transition-colors">
                          {opt.description}
                        </p>
                        <div className="flex gap-2 flex-wrap relative z-10">
                          {opt.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-black text-zinc-500 border border-zinc-800 group-hover:border-zinc-600 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 text-white">
                          <ChevronRight size={24} />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </Step>
          </Stepper>
        </div>
    </div>
  );
};

export default React.memo(Onboarding);
