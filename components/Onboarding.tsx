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
  const [goalNotes, setGoalNotes] = useState(''); // raw user inputs
  const [missionDraft, setMissionDraft] = useState(''); // AI-interpreted mission
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>(() => {
    const greeting = initialName?.trim()
      ? `Welcome back, ${initialName.trim()}. What do you want to learn?`
      : `What do you want to learn?`;
    return [
      { role: 'ai', text: greeting },
      { role: 'ai', text: `Be specific (e.g. “learn React fundamentals to build a portfolio app”).` }
    ];
  });

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
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

  const extractMissionDraft = (aiText: string) => {
    // Expect model to include a line like: "MISSION: ...".
    const lines = aiText.split('\n').map((l) => l.trim()).filter(Boolean);
    const missionLine = lines.find((l) => /^MISSION(_DRAFT)?:/i.test(l));
    if (!missionLine) return '';
    return missionLine.replace(/^MISSION(_DRAFT)?:\s*/i, '').trim();
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
    try {
      setChatMessages((prev) => [...prev, { role: 'user', text }]);
      const reply = await chatWithOnboardingAI(history, text, { currentGoal: nextGoalForContext });
      const replyText = reply || '…';
      setChatMessages((prev) => [...prev, { role: 'ai', text: replyText }]);

      const extracted = extractMissionDraft(replyText);
      if (extracted) {
        setMissionDraft(extracted);
        // Use the AI mission as the canonical goal for curriculum generation
        setFormData((prev) => ({ ...prev, goal: extracted }));
      }
    } catch (e: any) {
      console.error('[Onboarding] Gemini chat failed:', e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Gemini error: ${e?.message || String(e)}` }
      ]);
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
            {/* STEP 1: Conversational Goal (Chat) */}
            <Step>
              <div className="space-y-6 py-4">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-cyan-500/10 mx-auto mb-4">
                    <Target size={32} className="text-cyan-400" />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tight">Mission Objective</h2>
                  <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                    Talk it out. When we’re aligned, hit <span className="text-white font-bold">CONTINUE</span>.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto bg-zinc-950/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                  <div ref={chatScrollRef} className="h-[320px] overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {m.role === 'user' ? (
                          <div className="w-9 h-9 rounded-2xl flex items-center justify-center border shadow-lg bg-white/5 border-white/10 text-white/70">
                            <User size={14} />
                          </div>
                        ) : (
                          <CompanionAvatar
                            size={36}
                            alt="Companion"
                            className="shadow-lg"
                            objectPosition="center 12%"
                          />
                        )}
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-4 py-3 border ${
                            m.role === 'user'
                              ? 'bg-white/5 border-white/10 text-white rounded-tr-md'
                              : 'bg-zinc-900/40 border-white/5 text-zinc-200 rounded-tl-md'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 border-t border-white/5">
                    <div className="relative">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendGoalMessage()}
                        disabled={loading || chatLoading}
                        placeholder="Tell me exactly what you want to learn…"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-4 pr-12 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                        autoFocus
                      />
                      <button
                        onClick={sendGoalMessage}
                        disabled={loading || chatLoading || !chatInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-30 transition-all flex items-center justify-center"
                        title="Send"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                    {formData.goal.trim() && (
                      <div className="mt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">
                        AI_MISSION: <span className="text-zinc-300 normal-case">{missionDraft || formData.goal}</span>
                      </div>
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
