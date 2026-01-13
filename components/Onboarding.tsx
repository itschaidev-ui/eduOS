import React, { useState } from 'react';
import { OnboardingData, CurriculumOption } from '../types';
import { generateCurriculumOptions } from '../services/gemini';
import { Clock, ChevronRight, ChevronLeft, User, Target, Sparkles, Brain, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper, { Step } from './react-bits/Stepper';
import LightRays from './react-bits/LightRays';

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

  const handleStepChange = async (step: number) => {
      setCurrentStep(step);
      // Step 3 is transitioning to Step 4 (Options)
      if (step === 4 && options.length === 0) {
          setLoading(true);
          const timeConstraint = `${formData.hoursPerDay} hours on ${formData.daysOfWeek.join(', ')}`;
          const curriculumOptions = await generateCurriculumOptions(formData.goal, timeConstraint);
          setOptions(curriculumOptions);
          setLoading(false);
      }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
        ...prev,
        daysOfWeek: prev.daysOfWeek.includes(day) 
            ? prev.daysOfWeek.filter(d => d !== day)
            : [...prev.daysOfWeek, day]
    }));
  };

  if (loading) {
      return (
          <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border-r-2 border-cyan-500 rounded-full animate-spin animation-delay-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Brain className="text-white animate-pulse" size={32} />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Architecting Knowledge Graph</h2>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                      Processing: <span className="text-cyan-400">"{formData.goal.substring(0, 25)}..."</span>
                  </p>
              </div>
          </div>
      );
  }

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
                onFinalStepCompleted={() => selectedOption && onComplete(formData, selectedOption)}
                backButtonText="PREVIOUS"
                nextButtonText={currentStep === 4 ? "COMPLETE" : "CONTINUE"}
                nextButtonProps={{ 
                    disabled: currentStep === 4 && !selectedOption,
                    style: { opacity: currentStep === 4 && !selectedOption ? 0.5 : 1 } 
                }}
            >
                <Step>
                    <div className="space-y-8 py-4">
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-cyan-500/10 mx-auto mb-6">
                                <Target size={32} className="text-cyan-400" />
                            </div>
                            <h2 className="text-4xl font-bold text-white tracking-tight">Mission Objective</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                                Define your target. Whether it's "Master Python" or "Understand Black Holes", be ambitious.
                            </p>
                        </div>
                        <div className="relative group max-w-xl mx-auto">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <textarea 
                                value={formData.goal}
                                onChange={(e) => setFormData({...formData, goal: e.target.value})}
                                placeholder="I want to learn..."
                                className="relative w-full h-40 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-black transition-all resize-none text-lg leading-relaxed text-center"
                                autoFocus
                            />
                        </div>
                    </div>
                </Step>
                
                <Step>
                    <div className="space-y-10 py-4">
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-purple-500/10 mx-auto mb-6">
                                <Clock size={32} className="text-purple-400" />
                            </div>
                            <h2 className="text-4xl font-bold text-white tracking-tight">Time Dilation</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                                How much bandwidth can you allocate to this neural upgrade?
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
                                onChange={(e) => setFormData({...formData, hoursPerDay: Number(e.target.value)})}
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
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
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

                <Step>
                    <div className="space-y-8 py-4">
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-emerald-500/10 mx-auto mb-6">
                                <User size={32} className="text-emerald-400" />
                            </div>
                            <h2 className="text-4xl font-bold text-white tracking-tight">Identity Matrix</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                                Establish your alias for the system records.
                            </p>
                        </div>
                        <div className="relative group max-w-md mx-auto">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <input 
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Enter Alias"
                                className="relative w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black transition-all text-center text-2xl font-bold tracking-tight"
                                autoFocus
                            />
                        </div>
                    </div>
                </Step>

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
                            {options.map((opt, i) => (
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
                                        <h3 className={`text-xl font-bold transition-colors ${selectedOption?.id === opt.id ? 'text-cyan-400' : 'text-white group-hover:text-cyan-200'}`}>
                                            {opt.title}
                                        </h3>
                                        <span className="text-[10px] font-mono font-bold text-zinc-500 bg-black px-2 py-1 rounded border border-zinc-800 uppercase tracking-wider">{opt.estimatedWeeks} Weeks</span>
                                    </div>
                                    <p className="text-sm text-zinc-400 mb-4 leading-relaxed relative z-10 group-hover:text-zinc-300 transition-colors">{opt.description}</p>
                                    <div className="flex gap-2 flex-wrap relative z-10">
                                        {opt.tags.map(tag => (
                                            <span key={tag} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-black text-zinc-500 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 text-white">
                                        <ChevronRight size={24} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </Step>
            </Stepper>
        </div>
    </div>
  );
};

export default React.memo(Onboarding);
