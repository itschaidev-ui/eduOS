import React, { useState, useEffect, useRef, ReactNode, Component, Suspense, lazy, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, deleteDoc, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signInAsGuest, checkRedirectResult } from './services/firebase';
import { useDataPersistence } from './hooks/useDataPersistence';
import { ContentMode, KnowledgeNode, LessonContent, UserState, OnboardingData, CurriculumOption, CoopTeam, ContentReport, ChaosBattle, InteractiveWidget } from './types';
import { generateLesson, generateRabbitHole, generateKnowledgeGraph, generateExpansionGraph, generateChaosBattle, generateLessonChallenge } from './services/gemini';
import { Brain, Star, Clock, Trophy, RefreshCw, Play, Rabbit, Settings, Layers, Menu, X, Share2, Users, LogIn, LogOut, AlertCircle, Info, CheckCircle2, Loader2, Flag, ShieldAlert, LayoutDashboard, Globe, ExternalLink, Youtube, FileText, Gift, Skull, PlusCircle, Heart, ChevronRight, ChevronLeft, MessageSquare, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Counter from './components/react-bits/Counter';
import { CompanionCorner } from './components/CompanionCorner';

// Lazy Load Components
const ConstellationMap = lazy(() => import('./components/ConstellationMap'));
const GenerativeWidget = lazy(() => import('./components/GenerativeWidgets'));
const MentorChat = lazy(() => import('./components/MentorChat'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const CoopDashboard = lazy(() => import('./components/CoopDashboard'));
const DashboardHub = lazy(() => import('./components/DashboardHub'));
const RaidSession = lazy(() => import('./components/RaidSession'));

// --- Inline Interactive Challenge Trigger Component ---
const InteractiveTrigger = ({ 
    context, 
    archetype, 
    onActivate, 
    isLoading 
}: { 
    context: string, 
    archetype: string, 
    onActivate: () => void,
    isLoading: boolean 
}) => {
    return (
        <div className="my-16 relative group">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-xl rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
                 
                 <div className="flex-1">
                     <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
                         <Zap size={14} className="fill-current" />
                         <span>Practical Challenge Available</span>
                     </div>
                     <h3 className="text-2xl font-bold text-white mb-2">
                        {archetype === 'Debugger' && "System Malfunction Detected"}
                        {archetype === 'Architect' && "Blueprint Required"}
                        {archetype === 'Skeptic' && "Defend Your Thesis"}
                        {archetype === 'SpeedRun' && "Neural Reflex Test"}
                        {archetype === 'Analyst' && "Pattern Recognition"}
                        {!['Debugger', 'Architect', 'Skeptic', 'SpeedRun', 'Analyst'].includes(archetype) && "Interactive Module"}
                     </h3>
                     <p className="text-zinc-400 text-sm">
                        {archetype === 'Debugger' && "A code segment is failing. Use your new knowledge to patch the logic."}
                        {archetype === 'Architect' && "Design a system component based on the constraints provided."}
                        {archetype === 'Skeptic' && "A rival AI is challenging your understanding. Win the debate."}
                        {archetype === 'SpeedRun' && "Sort and categorize concepts before the timer runs out."}
                        {archetype === 'Analyst' && "Interpret the incoming data stream to find the anomaly."}
                        {!['Debugger', 'Architect', 'Skeptic', 'SpeedRun', 'Analyst'].includes(archetype) && "Apply what you just learned in a hands-on simulation."}
                     </p>
                 </div>

                 <button 
                    onClick={onActivate}
                    disabled={isLoading}
                    className="flex-none px-8 py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                 >
                     {isLoading ? (
                         <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            Initializing...
                         </>
                     ) : (
                         <>
                            Initialize <Play size={12} fill="currentColor" />
                         </>
                     )}
                 </button>
             </div>
        </div>
    );
};


// Error Boundary Component
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  declare props: Readonly<ErrorBoundaryProps>;

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col gap-4">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center border border-red-500/50 mb-4 animate-pulse">
                  <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Neural Link Destabilized</h2>
              <p className="text-zinc-500 text-sm max-w-md text-center font-mono">
                  RENDER_MATRIX_ANOMALY_DETECTED.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-full font-bold transition-all mt-4 text-xs tracking-widest uppercase"
              >
                  Reboot System
              </button>
          </div>
      );
    }

    return this.props.children;
  }
}

type AppView = 'landing' | 'onboarding' | 'dashboard' | 'map' | 'lesson' | 'coop' | 'raid' | 'admin';

const LoadingScreen = ({
  message = "Establishing Neural Link...",
  longLoad = false,
  onReset
}: {
  message?: string;
  longLoad?: boolean;
  onReset?: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const t = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 99) return 99;
        // Ease-out toward 99% (simulated progress while waiting on network/compute).
        const remaining = 99 - p;
        const inc = Math.max(0.3, remaining * 0.035);
        return Math.min(99, p + inc);
      });
    }, 120);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen bg-black items-center justify-center flex-col gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-t-2 border-white rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Counter
            value={Math.floor(progress)}
            places={[100, 10, 1]}
            fontSize={18}
            padding={6}
            gap={4}
            textColor="rgba(255,255,255,0.85)"
            fontWeight={900}
            containerStyle={{ opacity: 0.9 }}
            counterStyle={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)'
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

        <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase animate-pulse">{message}</p>
      </div>

      {longLoad && onReset && (
        <button
          onClick={onReset}
          className="mt-4 text-xs text-red-400 hover:text-red-300 underline animate-in fade-in font-mono"
        >
          FORCE_RESET_CONNECTION
        </button>
      )}
    </div>
  );
};

// ProtectedLayout will be defined inside App to access state

// LessonView component - placeholder for now, will be properly implemented
const LessonView = (props: any) => {
  const { nodeId } = useParams();
  const { activeNode, setActiveNode, loadLesson, contentMode, ...rest } = props;
  
  useEffect(() => {
    if (nodeId && nodeId !== activeNode) {
      setActiveNode(nodeId);
      loadLesson(nodeId, contentMode);
    }
  }, [nodeId, activeNode, setActiveNode, loadLesson, contentMode]);
  
  // For now, return a placeholder - the full lesson rendering will be added
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 lg:p-16 pb-20 sm:pb-32 md:pb-40">
      <p className="text-white">Loading lesson {nodeId}...</p>
    </div>
  );
};

function App() {
  // Check for missing environment variables
  // @ts-ignore
  const firebaseApiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : '';
  // @ts-ignore
  const geminiKeys = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEYS : '';
  // @ts-ignore
  const firebaseAuthDomain = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : '';
  const hasEnvVars = firebaseApiKey && geminiKeys;

  // Log Firebase config in production for debugging (first load only)
  useEffect(() => {
    if (import.meta.env?.MODE === 'production' && firebaseAuthDomain) {
      console.log('🔧 [Config] Firebase Auth Domain:', firebaseAuthDomain);
      console.log('🔧 [Config] Current Domain:', window.location.hostname);
      console.log('🔧 [Config] Match:', firebaseAuthDomain.includes(window.location.hostname) || window.location.hostname === 'eduos.chaimode.dev' ? '✅' : '❌');
    }
  }, [firebaseAuthDomain]);

  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [justAuthenticated, setJustAuthenticated] = useState(false);
  
  // Sync route with appState for backward compatibility
  const getAppStateFromRoute = (path: string): AppView => {
    if (path === '/onboarding') return 'onboarding';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/map') return 'map';
    if (path.startsWith('/lesson/')) return 'lesson';
    if (path === '/coops' || path.startsWith('/coop/')) return 'coop';
    if (path.includes('/raid')) return 'raid';
    if (path.startsWith('/assignment/')) return 'lesson'; // Assignments use lesson view
    return 'landing';
  };
  
  const appState = getAppStateFromRoute(location.pathname);
  
  // Helper to navigate (replaces setAppState)
  const navigateTo = (view: AppView, params?: { [key: string]: string }) => {
    let path = '/';
    switch (view) {
      case 'onboarding':
        path = '/onboarding';
        break;
      case 'dashboard':
        path = '/dashboard';
        break;
      case 'map':
        path = '/map';
        break;
      case 'lesson':
        path = params?.nodeId ? `/lesson/${params.nodeId}` : '/map';
        break;
      case 'coop':
        path = '/coops';
        break;
      case 'raid':
        path = params?.teamId ? `/coop/${params.teamId}/raid` : '/coops';
        break;
      case 'admin':
        path = '/admin';
        break;
      default:
        path = '/';
    }
    navigate(path);
  };
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'error' | 'success'} | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [loadingLong, setLoadingLong] = useState(false); 
  
  // Custom Hook for Data Persistence
  const {
      loadingData,
      hasLoadedUserData,
      userState,
      setUserState,
      nodes,
      setNodes,
      curriculumTitle,
      setCurriculumTitle,
      teams,
      setTeams,
      reports,
      setReports,
      saveUserData,
      isLocalGuest,
      isAdmin,
      INITIAL_USER_STATE
  } = useDataPersistence(user);
  
  // Lesson State
  const [lessonLoading, setLessonLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode>(ContentMode.ACADEMIC); // Default to Academic
  const [rabbitHoleContent, setRabbitHoleContent] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  
  // Dynamic Widget State
  const [activeWidgets, setActiveWidgets] = useState<{[key: string]: InteractiveWidget}>({});
  const [loadingWidgets, setLoadingWidgets] = useState<{[key: string]: boolean}>({});

  // Chaos Battle State
  const [chaosBattle, setChaosBattle] = useState<ChaosBattle | null>(null);
  const [chaosLives, setChaosLives] = useState(3);
  const [chaosIndex, setChaosIndex] = useState(0);

  // Coop State
  const [currentRaidTeamId, setCurrentRaidTeamId] = useState<string | null>(null);

  // Admin State
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Graph Loading State
  const [graphLoading, setGraphLoading] = useState(false);

  const allNodesCompleted = nodes.length > 0 && nodes.every(n => n.status === 'mastered');

  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set up Firebase Auth state listener and check for redirect results
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let redirectHandled = false;
    let redirectUserFound = false;
    let initialAuthCheck = true;
    
    // CRITICAL: Check for redirect result FIRST, before setting up onAuthStateChanged
    // getRedirectResult can only be called once per redirect
    const handleRedirect = async () => {
      try {
        console.log('🔍 [Auth] Checking redirect result...');
        console.log('   Current URL:', window.location.href);
        console.log('   URL has hash:', window.location.hash);
        console.log('   URL has search params:', window.location.search);
        console.log('   Full search:', window.location.search);
        console.log('   Full hash:', window.location.hash);
        
        // Check URL for any sign of redirect (even if params are in hash)
        const urlString = window.location.href;
        const hasAnyParams = urlString.includes('?') || urlString.includes('#');
        console.log('   URL contains ? or #:', hasAnyParams);
        
        // Check sessionStorage for redirect flag
        const hadRedirect = sessionStorage.getItem('firebase:redirectUser');
        console.log('   Redirect flag in sessionStorage:', hadRedirect);
        
        const redirectUser = await checkRedirectResult();
        redirectHandled = true;
        
        if (redirectUser) {
          console.log('✅ [Auth] Redirect user found via getRedirectResult:', redirectUser.email);
          redirectUserFound = true;
          setJustAuthenticated(true);
          setUser(redirectUser); // Set user immediately from redirect result
          setNotification({ type: 'success', message: "Authentication successful!" });
          sessionStorage.removeItem('firebase:redirectUser');
        } else {
          console.log('ℹ️ [Auth] No redirect result from getRedirectResult');
          
          // Check if user is already authenticated (might have persisted or auth succeeded via onAuthStateChanged)
          const currentUser = auth.currentUser;
          if (currentUser && hadRedirect) {
            console.log('✅ [Auth] User authenticated (found via currentUser + redirect flag):', currentUser.email);
            redirectUserFound = true;
            setJustAuthenticated(true);
            setUser(currentUser);
            setNotification({ type: 'success', message: "Authentication successful!" });
            sessionStorage.removeItem('firebase:redirectUser');
          } else if (currentUser) {
            console.log('ℹ️ [Auth] User already authenticated (no redirect flag):', currentUser.email);
          }
        }
      } catch (error) {
        redirectHandled = true;
        console.error("❌ [Auth] Error handling redirect result:", error);
        // If it's an unauthorized domain error, show helpful message
        if (error instanceof Error && error.message.includes('unauthorized-domain')) {
          setNotification({ 
            type: 'error', 
            message: "Domain not authorized. Please add eduos.chaimode.dev to Firebase authorized domains." 
          });
        }
      }
    };
    
    // Set up auth state listener (will fire after redirect check)
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔄 [Auth] Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      console.log('   Initial check:', initialAuthCheck);
      console.log('   Redirect handled:', redirectHandled);
      console.log('   Redirect user found:', redirectUserFound);
      
      // Check if we had a redirect pending
      const hadRedirect = sessionStorage.getItem('firebase:redirectUser');
      console.log('   Redirect flag in sessionStorage:', hadRedirect);
      
      // If this is the first auth state change and we have a user + redirect flag, it's a successful redirect
      if (initialAuthCheck && firebaseUser && hadRedirect && !redirectUserFound) {
        console.log('✅ [Auth] User authenticated after redirect (onAuthStateChanged fallback)');
        redirectUserFound = true;
        setJustAuthenticated(true);
        setUser(firebaseUser);
        setNotification({ type: 'success', message: "Authentication successful!" });
        sessionStorage.removeItem('firebase:redirectUser');
      } else if (!redirectUserFound) {
        // Only update user if we haven't already set it from redirect result
        setUser(firebaseUser);
      }
      
      setHasCheckedAuth(true);
      initialAuthCheck = false;
      
      // If user just authenticated and we didn't catch it in redirect check
      if (firebaseUser && !user && redirectHandled && !redirectUserFound && hadRedirect) {
        console.log('🆕 [Auth] New user detected after redirect check, marking as just authenticated');
        setJustAuthenticated(true);
        sessionStorage.removeItem('firebase:redirectUser');
      }
      
      // Force navigation if user is authenticated and we're on landing page
      if (firebaseUser && location.pathname === '/') {
        // Wait a bit for data to load, then navigate
        setTimeout(() => {
          if (!loadingData) {
            const targetPath = nodes.length > 0 || curriculumTitle ? '/dashboard' : '/onboarding';
            console.log('🧭 [Auth] Force navigating to:', targetPath);
            navigate(targetPath, { replace: true });
          }
        }, 300);
      }
    });
    
    // Call handleRedirect immediately (don't wait - onAuthStateChanged will handle timing)
    handleRedirect();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Additional navigation effect - handles case where user is authenticated but still on landing page
  useEffect(() => {
    if (user && hasCheckedAuth && !loadingData && location.pathname === '/') {
      // Always navigate if user is authenticated and on landing page
      console.log('🧭 [Navigation] User authenticated on landing page, navigating...', {
        nodesCount: nodes.length,
        hasCurriculum: !!curriculumTitle,
        justAuthenticated,
        hasRedirect: !!sessionStorage.getItem('firebase:redirectUser')
      });
      
      const timer = setTimeout(() => {
        const targetPath = nodes.length > 0 || curriculumTitle ? '/dashboard' : '/onboarding';
        console.log('🧭 [Navigation] Navigating to:', targetPath);
        navigate(targetPath, { replace: true });
        setJustAuthenticated(false);
        sessionStorage.removeItem('firebase:redirectUser');
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [user, hasCheckedAuth, loadingData, location.pathname, nodes.length, curriculumTitle, navigate]);

  // Handle navigation after authentication and data loading
  useEffect(() => {
    // Navigate if:
    // 1. Auth check has completed
    // 2. User is authenticated
    // 3. We're on the landing page (user just signed in)
    // 4. Data has finished loading
    // 5. User just authenticated (to prevent navigation on page reload for already-authenticated users)
    if (hasCheckedAuth && user && location.pathname === '/' && !loadingData && justAuthenticated) {
      console.log('🧭 [Navigation] Conditions met, preparing to navigate...', {
        hasCheckedAuth,
        hasUser: !!user,
        currentPath: location.pathname,
        loadingData,
        justAuthenticated,
        nodesCount: nodes.length,
        hasCurriculum: !!curriculumTitle
      });
      
      // Small delay to ensure all state is settled after redirect
      const timer = setTimeout(() => {
        if (nodes.length > 0 || curriculumTitle) {
          // User has existing data, go to dashboard
          console.log('🧭 [Navigation] Navigating to dashboard (user has data)');
          navigate('/dashboard');
        } else {
          // New user, go to onboarding
          console.log('🧭 [Navigation] Navigating to onboarding (new user)');
          navigate('/onboarding');
        }
        // Reset the flag after navigation
        setJustAuthenticated(false);
      }, 100);
      
      return () => clearTimeout(timer);
    } else if (hasCheckedAuth && user && location.pathname === '/' && !loadingData && !justAuthenticated) {
      // If user is authenticated but justAuthenticated is false, check if they should be redirected
      // This handles the case where the redirect flag might have been lost
      const hadRedirect = sessionStorage.getItem('firebase:redirectUser');
      if (hadRedirect) {
        console.log('🧭 [Navigation] Redirect flag found, navigating...');
        const timer = setTimeout(() => {
          if (nodes.length > 0 || curriculumTitle) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
          sessionStorage.removeItem('firebase:redirectUser');
        }, 100);
        return () => clearTimeout(timer);
      }
    } else if (hasCheckedAuth && user && location.pathname === '/' && !loadingData) {
      // Debug: Log why navigation isn't happening
      console.log('⚠️ [Navigation] Not navigating because:', {
        hasCheckedAuth,
        hasUser: !!user,
        currentPath: location.pathname,
        loadingData,
        justAuthenticated,
        reason: !justAuthenticated ? 'User did not just authenticate (might be page reload)' : 'Unknown'
      });
    }
  }, [hasCheckedAuth, user, location.pathname, loadingData, nodes.length, curriculumTitle, justAuthenticated, navigate]);

  // Parse URL for invite code on mount (Hash and Path support)
  useEffect(() => {
    const handleInvite = () => {
        let code: string | null = null;
        const path = window.location.pathname;
        const pathMatch = path.match(/^\/join\/([a-zA-Z0-9-]+)$/);
        if (pathMatch) code = pathMatch[1];

        const hash = window.location.hash;
        const hashMatch = hash.match(/^#\/join\/([a-zA-Z0-9-]+)$/);
        if (hashMatch) code = hashMatch[1];

        if (code) {
            setPendingInviteCode(code);
            const cleanUrl = window.location.origin + window.location.pathname.replace(/\/join\/[a-zA-Z0-9-]+/, '');
            window.history.replaceState({}, '', cleanUrl); 
            
            setNotification({
                type: 'info',
                message: `Invite detected: ${code}. Sign in to join squad.`
            });
        }
    };

    handleInvite();
    window.addEventListener('hashchange', handleInvite);
    return () => window.removeEventListener('hashchange', handleInvite);
  }, []);

  const spawnEventNode = useCallback((currentNodes: KnowledgeNode[], variant: 'chaos' | 'treasure' | 'mystery'): KnowledgeNode[] => {
      const maxX = Math.max(...currentNodes.map(n => n.x)) + 100;
      const avgY = currentNodes.reduce((acc, n) => acc + n.y, 0) / currentNodes.length;
      
      const eventNode: KnowledgeNode = {
          id: `${variant}-${Date.now()}`,
          label: variant === 'chaos' ? 'CHAOS TEST' : variant === 'treasure' ? 'SECRET CACHE' : 'MYSTERY SIGNAL',
          x: maxX + 100,
          y: avgY + (Math.random() * 200 - 100),
          status: 'available',
          connections: [],
          category: 'side-quest',
          type: variant
      };
      return [...currentNodes, eventNode];
  }, []);

  const handleExpandGraph = async () => {
      setGraphLoading(true);
      try {
          const newNodes = await generateExpansionGraph(curriculumTitle, nodes);
          if (newNodes.length > 0) {
              const lastMastered = nodes.filter(n => n.status === 'mastered').pop();
              if (lastMastered) {
                  lastMastered.connections.push(newNodes[0].id);
              }
              
              setNodes(prev => [...prev, ...newNodes]);
              setNotification({ type: 'success', message: "Frontier Expanded. New modules available." });
          } else {
              setNotification({ type: 'error', message: "Expansion failed. Try again later." });
          }
      } catch (e) {
          console.error(e);
      } finally {
          setGraphLoading(false);
      }
  };
  
  const loadLesson = useCallback(async (nodeId: string, mode: ContentMode) => {
    setLessonLoading(true);
    setCurrentLesson(null);
    setActiveWidgets({});
    setLoadingWidgets({});
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
        setLessonLoading(false);
        return;
    }

    // Optimization: Check for cached content first
    if (node.cachedContent) {
        setCurrentLesson(node.cachedContent);
        setLessonLoading(false);
        return;
    }

    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    const isFirstLesson = nodeIndex === 0;

    const content = await generateLesson(node.label, curriculumTitle, mode, isFirstLesson);
    
    if (content) {
        setCurrentLesson(content);
        
        // Save content to cache
        setNodes(prev => prev.map(n => 
            n.id === nodeId ? { ...n, cachedContent: content } : n
        ));
    }
    
    setLessonLoading(false);
  }, [nodes, curriculumTitle]);

  const handleStartJourney = async () => {
    console.log('🎯 [App] handleStartJourney called');
    console.log('   Current user:', user ? user.email : 'null');
    console.log('   App state:', appState);
    
    if (!user) {
      try {
        console.log('🎯 [App] User clicked "Initialize Sequence", starting Google sign-in...');
        console.log('   Calling signInWithGoogle...');
        const result = await signInWithGoogle();
        console.log('✅ [App] Sign-in completed/initiated, result:', result);

        // Popup flow (localhost) returns a user immediately
        if (result) {
          console.log('✅ [App] Popup auth returned a user, updating state + navigating...');
          setUser(result);
          setJustAuthenticated(true);
          setNotification({ type: 'success', message: "Authentication successful!" });

          // If we already have data, go to dashboard, otherwise onboarding
          const targetPath = nodes.length > 0 || curriculumTitle ? '/dashboard' : '/onboarding';
          navigate(targetPath, { replace: true });
        }
      } catch (error: any) {
        console.error("❌ [App] Auth error:", error);
        console.error("   Error details:", {
          code: error?.code,
          message: error?.message,
          stack: error?.stack
        });
        let errorMessage = "Authentication failed. Try again.";
        if (error?.code === 'auth/unauthorized-domain') {
          errorMessage = "Domain not authorized. Please add eduos.chaimode.dev to Firebase authorized domains.";
        } else if (error?.code === 'auth/operation-not-allowed') {
          errorMessage = "Google sign-in is not enabled. Please enable it in Firebase Console.";
        }
        setNotification({ type: 'error', message: errorMessage });
      }
    } else {
        console.log('ℹ️ [App] User already authenticated, navigating...');
        if (nodes.length > 0) {
            navigate('/dashboard');
        } else {
            navigate('/onboarding');
        }
    }
  };

  const handleGuestLogin = async () => {
    if (!user) {
        try {
            await signInAsGuest();
        } catch (error: any) {
             console.warn("Guest login failed (likely disabled in console). Using Offline Fallback.");
             
             // Check for existing offline session first
             let mockUid = localStorage.getItem('offline_guest_uid');
             if (!mockUid) {
                 mockUid = `guest-local-${Date.now()}`;
                 localStorage.setItem('offline_guest_uid', mockUid);
             }

             const mockUser = { 
                 uid: mockUid, 
                 displayName: 'Guest', 
                 email: null, 
                 isAnonymous: true,
                 emailVerified: false,
                 metadata: {},
                 phoneNumber: null,
                 photoURL: null,
                 providerData: [],
                 providerId: 'firebase',
                 refreshToken: '',
                 tenantId: null,
                 delete: async () => {},
                 getIdToken: async () => '',
                 getIdTokenResult: async () => ({} as any),
                 reload: async () => {},
                 toJSON: () => ({}),
             } as unknown as User;

             setNotification({ type: 'info', message: "Guest Mode (Offline) Activated." });
             setUser(mockUser);
        }
    } else {
        if (nodes.length > 0) navigate('/dashboard');
        else navigate('/onboarding');
    }
  };

  const handleSignOut = useCallback(() => {
      auth.signOut().catch(console.error);
      localStorage.removeItem('offline_guest_uid');
      setUser(null);
      navigate('/');
      setNodes([]);
      setHasCheckedAuth(false);
      setJustAuthenticated(false);
      setNotification({ type: 'info', message: "Session Terminated." });
  }, [navigate]);

  const handleOnboardingComplete = async (data: OnboardingData, selectedCurriculum: CurriculumOption) => {
      if (!user) return;

      const newUserState = {
          ...INITIAL_USER_STATE,
          uid: user.uid,
          displayName: data.name || user.displayName || 'Traveler'
      };
      
      setUserState(newUserState);
      setCurriculumTitle(selectedCurriculum.title);
      setGraphLoading(true);
      
      try {
        let newNodes: KnowledgeNode[] = [];
        try {
            newNodes = await generateKnowledgeGraph(selectedCurriculum.title, data.goal);
        } catch (genError) {
            console.error("Graph Generation Failed completely:", genError);
        }
        
        if (!newNodes || newNodes.length === 0) {
            setNotification({ type: 'error', message: "Neural generation failed. Please try again." });
            setGraphLoading(false);
            return;
        }

        setNodes(newNodes);
        navigate('/dashboard');

        // Always persist a local cache (even for real Firebase users) so refresh works if Firestore read fails.
        try {
            const localData = {
                userState: newUserState,
                onboardingData: data,
                curriculumTitle: selectedCurriculum.title,
                nodes: newNodes,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(`eduos_user_${user.uid}`, JSON.stringify(localData));
        } catch (e) {
            console.warn("Failed to write local onboarding cache", e);
        }
        
            if (isLocalGuest(user)) {
                const localData = {
                    userState: newUserState,
                    onboardingData: data,
                    curriculumTitle: selectedCurriculum.title,
                    nodes: newNodes,
                    createdAt: new Date().toISOString()
                };
                localStorage.setItem(`eduos_user_${user.uid}`, JSON.stringify(localData));
            } else {
                    await setDoc(doc(db, 'users', user.uid), {
                        userState: newUserState,
                        onboardingData: data,
                        curriculumTitle: selectedCurriculum.title,
                        nodes: newNodes,
                        createdAt: new Date().toISOString()
                    });
        }

        if (pendingInviteCode) {
            handleJoinTeam(pendingInviteCode, data.name).then(success => {
                if (success) navigate('/coops');
            });
            setPendingInviteCode(null);
        }

      } catch (e) {
          console.error("Critical Onboarding Error:", e);
          setNotification({ type: 'error', message: "Critical error during initialization." });
      } finally {
          setGraphLoading(false);
      }
  };

  const handleWidgetComplete = (xp: number, sectionIndex: number) => {
      if (!currentLesson || !activeNode) return;

      // Check if already completed
      if (currentLesson.completedWidgetIndices?.includes(sectionIndex)) {
          setNotification({ type: 'info', message: "Simulation previously mastered. No new XP awarded." });
          return;
      }

      const newXp = userState.xp + xp;
      setUserState(prev => ({ ...prev, xp: newXp }));
      setNotification({ type: 'success', message: `Challenge Complete! +${xp} XP` });
      
      // Mark as completed
      const updatedLesson = {
          ...currentLesson,
          completedWidgetIndices: [...(currentLesson.completedWidgetIndices || []), sectionIndex]
      };
      
      setCurrentLesson(updatedLesson);
      const updatedNodes = nodes.map(n => 
          n.id === activeNode ? { ...n, cachedContent: updatedLesson } : n
      );
      setNodes(updatedNodes);

      saveUserData(updatedNodes, { ...userState, xp: newXp });
  };

  const handleTriggerWidget = async (sectionIndex: number, context: string, archetype: string) => {
      if (activeWidgets[sectionIndex] || loadingWidgets[sectionIndex]) return;

      setLoadingWidgets(prev => ({...prev, [sectionIndex]: true}));
      
      // Check persistent cache
      if (currentLesson?.cachedWidgets && currentLesson.cachedWidgets[sectionIndex]) {
          setActiveWidgets(prev => ({...prev, [sectionIndex]: currentLesson.cachedWidgets![sectionIndex]}));
          setLoadingWidgets(prev => ({...prev, [sectionIndex]: false}));
          return;
      }

      const nodeLabel = nodes.find(n => n.id === activeNode)?.label || "Current Topic";
      const widget = await generateLessonChallenge(nodeLabel, context, archetype);
      
      if (widget) {
          setActiveWidgets(prev => ({...prev, [sectionIndex]: widget}));
          
          // Save to persistent cache
           if (currentLesson && activeNode) {
               const updatedLesson = {
                   ...currentLesson,
                   cachedWidgets: {
                       ...currentLesson.cachedWidgets,
                       [sectionIndex]: widget
                   }
               };
               setCurrentLesson(updatedLesson);
               setNodes(prev => prev.map(n => 
                   n.id === activeNode ? { ...n, cachedContent: updatedLesson } : n
               ));
           }

      } else {
          setNotification({ type: 'error', message: "Failed to initialize simulation." });
      }
      
      setLoadingWidgets(prev => ({...prev, [sectionIndex]: false}));
  };
  
  const handleNodeSelect = async (nodeId: string) => {
    setActiveNode(nodeId);
    navigate(`/lesson/${nodeId}`);
    setRabbitHoleContent(null);
    setChaosBattle(null);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'chaos') {
        setLessonLoading(true);
        const battle = await generateChaosBattle(curriculumTitle);
        setChaosBattle(battle);
        setChaosLives(3);
        setChaosIndex(0);
        setLessonLoading(false);
    } else if (node.type === 'mystery') {
        setActiveNode(nodeId);
        triggerRabbitHole();
        // Clear the node after visiting? Or keep it? keeping it for now.
    } else if (node.type === 'treasure') {
         const reward = 500;
         const newUserState = {
             ...userState,
             xp: userState.xp + reward
         };
         setUserState(newUserState);
         
         setNotification({ type: 'success', message: `Treasure Found! +${reward} XP` });
         const newNodes = nodes.filter(n => n.id !== nodeId);
         setNodes(newNodes);
         saveUserData(newNodes, newUserState);
         
         navigate('/map');
    } else {
        await loadLesson(nodeId, contentMode);
    }
  };
  
  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, [setNodes]);

  const handleModeChange = (newMode: ContentMode) => {
    setContentMode(newMode);
    if (activeNode) {
      const node = nodes.find(n => n.id === activeNode);
      if (node && node.type !== 'chaos') {
          loadLesson(activeNode, newMode);
      }
    }
  };

  const triggerRabbitHole = async () => {
      if(!activeNode) return;
      
      const node = nodes.find(n => n.id === activeNode);
      if (!node) return;

      if (node.cachedRabbitHole) {
          setRabbitHoleContent(node.cachedRabbitHole);
          return;
      }

      setRabbitHoleContent("Falling down the rabbit hole...");
      const content = await generateRabbitHole(node.label);
      setRabbitHoleContent(content);

      // Cache it
      setNodes(prev => prev.map(n => 
          n.id === activeNode ? { ...n, cachedRabbitHole: content } : n
      ));
  };

  const handleCompleteLesson = async () => {
    if (!activeNode || !user) return;

    let updatedNodes = [...nodes];
    const currentNode = updatedNodes.find(n => n.id === activeNode);
    if (!currentNode) return;

    if (currentNode.status === 'mastered') {
        setNotification({ type: 'info', message: "Module already assimilated. No additional XP awarded." });
        navigate('/map');
        setActiveNode(null);
        return;
    }

    updatedNodes = updatedNodes.map(n => n.id === activeNode ? { ...n, status: 'mastered' } : n);
    
    let nodesUnlockedCount = 0;
    currentNode.connections.forEach(connId => {
        updatedNodes = updatedNodes.map(n => {
            if (n.id === connId && n.status === 'locked') {
                nodesUnlockedCount++;
                return { ...n, status: 'available' };
            }
            return n;
        });
    });

    if (nodesUnlockedCount === 0) {
        const currentIndex = updatedNodes.findIndex(n => n.id === activeNode);
        const nextLockedNode = updatedNodes.find((n, idx) => idx > currentIndex && n.status === 'locked');
        if (nextLockedNode) {
            updatedNodes = updatedNodes.map(n => n.id === nextLockedNode.id ? { ...n, status: 'available' } : n);
        }
    }

    let newMomentum = userState.momentum + 15;
    let newStreak = userState.streak;
    let newXp = userState.xp + 250;
    let notificationMsg = "Module Assimilated. +250 XP.";

    if (Math.random() < 0.1) {
        const treasureNode: KnowledgeNode = {
             id: `loot-${Date.now()}`,
             label: 'SECRET CACHE',
             x: currentNode.x + (Math.random() * 100 - 50),
             y: currentNode.y + 100,
             status: 'available',
             connections: [],
             category: 'side-quest',
             type: 'treasure'
        };
        updatedNodes.push(treasureNode);
        notificationMsg += " Secret Cache Detected!";
    }

    if (newMomentum >= 100) {
        newMomentum = 0;
        newStreak += 1;
        
        // Random Event
        const roll = Math.random();
        if (roll < 0.4) {
             notificationMsg = "MOMENTUM CRITICAL! Chaos Node Manifesting...";
             updatedNodes = spawnEventNode(updatedNodes, 'chaos');
        } else if (roll < 0.7) {
             notificationMsg = "Mystery Signal Detected...";
             updatedNodes = spawnEventNode(updatedNodes, 'mystery');
        } else {
             notificationMsg = "Hidden Cache Revealed!";
             updatedNodes = spawnEventNode(updatedNodes, 'treasure');
        }
    }

    const newUserState: UserState = {
        ...userState,
        xp: newXp,
        momentum: newMomentum,
        completedNodes: [...userState.completedNodes, activeNode],
        streak: newStreak
    };

    setNodes(updatedNodes);
    setUserState(newUserState);
    setNotification({
        type: 'success',
        message: notificationMsg
    });
    navigate('/map');
    setActiveNode(null);

    saveUserData(updatedNodes, newUserState);
  };

  const handleChaosAnswer = (isCorrect: boolean) => {
      if (!chaosBattle) return;

      if (isCorrect) {
          if (chaosIndex < chaosBattle.questions.length - 1) {
              setChaosIndex(prev => prev + 1);
          } else {
              setNotification({ type: 'success', message: "CHAOS DEFEATED! +10,000 XP" });
              setUserState(prev => ({ ...prev, xp: prev.xp + 10000 }));
              setNodes(prev => prev.filter(n => n.id !== activeNode));
              navigate('/map');
          }
      } else {
          const newLives = chaosLives - 1;
          setChaosLives(newLives);
          if (newLives <= 0) {
               setNotification({ type: 'error', message: "CRITICAL FAILURE. Node Destabilizing..." });
               setNodes(prev => prev.filter(n => n.id !== activeNode));
               navigate('/map');
          }
      }
  }

  const handleCreateTeam = async (name: string): Promise<boolean> => {
      if (!user) return false;

      const isAlreadyCaptain = teams.some(t => t.members.find(m => m.uid === user.uid && m.role === 'Captain'));
      if (isAlreadyCaptain) {
           setNotification({
              type: 'error',
              message: `Command Protocol Violation: You can only maintain Captain rank for one squad.`
          });
          return false;
      }

      const teamId = `team-${Date.now()}`;
      const newTeam: CoopTeam = {
          id: teamId,
          name: name,
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          raidReady: false, 
          weeklyGoal: "Complete 10 Core Modules",
          memberIds: [user.uid],
          members: [
              {
                  uid: user.uid,
                  name: userState.displayName || "Captain",
                  role: 'Captain',
                  status: 'online',
                  xpContribution: userState.xp
              }
          ]
      };

      if (isLocalGuest(user)) {
          const updatedTeams = [...teams, newTeam];
          setTeams(updatedTeams);
          localStorage.setItem(`eduos_teams_${user.uid}`, JSON.stringify(updatedTeams));
          setNotification({ type: 'success', message: "Squad Initialized (Offline Simulation)." });
          return true;
      }

      try {
          await setDoc(doc(db, 'teams', teamId), newTeam);
          setNotification({ type: 'success', message: "Squad Initialized." });
          return true;
      } catch (e) {
          console.error("Create team failed:", e);
          setNotification({ type: 'error', message: "Failed to create squad." });
          return false;
      }
  };

  const handleDeleteTeam = async (teamId: string) => {
      if (!user) return;

      if (isLocalGuest(user)) {
           setTeams(prevTeams => {
                const updatedTeams = prevTeams.filter(t => t.id !== teamId);
                try {
                     localStorage.setItem(`eduos_teams_${user.uid}`, JSON.stringify(updatedTeams));
                } catch(e) { console.error(e); }
                return updatedTeams;
           });
           setNotification({ type: 'success', message: "Squad deleted." });
           return;
      }

      try {
          await deleteDoc(doc(db, 'teams', teamId));
          setNotification({ type: 'success', message: "Squad deleted." });
      } catch (e) {
          console.error(e);
          setNotification({ type: 'error', message: "Failed to delete squad." });
      }
  };

  const handleJoinTeam = async (code: string, explicitName?: string): Promise<boolean> => {
      if (!user) return false;
      
      if (isLocalGuest(user)) {
          setNotification({ type: 'info', message: "Join Co-op features require a verified Google account to sync." });
          return false;
      }

      try {
          const q = query(collection(db, 'teams'), where('inviteCode', '==', code));
          const { getDocs } = await import('firebase/firestore');
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
              setNotification({ type: 'error', message: "Invalid Invite Code." });
              return false;
          }

          const teamDoc = querySnapshot.docs[0];
          const teamData = teamDoc.data() as CoopTeam;

          if (teamData.memberIds.includes(user.uid)) {
              setNotification({ type: 'info', message: "You are already in this squad." });
              return false;
          }

          const nameToUse = explicitName || userState.displayName || "Traveler";
          const newMember = { 
              uid: user.uid, 
              name: nameToUse, 
              role: 'Member', 
              status: 'online', 
              xpContribution: userState.xp 
          };

          await updateDoc(doc(db, 'teams', teamDoc.id), {
              members: [...teamData.members, newMember],
              memberIds: [...teamData.memberIds, user.uid]
          });

          setNotification({ type: 'success', message: `Joined ${teamData.name}.` });
          return true;

      } catch (e) {
          console.error("Join failed:", e);
          return false;
      }
  };

  const handleEnterRaid = (team: CoopTeam) => {
      setCurrentRaidTeamId(team.id);
      navigate(`/coop/${team.id}/raid`);
  };

  const handleReport = async () => {
      if (!user || !activeNode || !reportReason.trim()) return;

      const activeNodeLabel = nodes.find(n => n.id === activeNode)?.label || "Unknown";

      if (isLocalGuest(user)) {
          setNotification({ type: 'info', message: "Reports sent from Guest mode are not saved to the server." });
          setShowReportModal(false);
          setReportReason('');
          return;
      }

      try {
          await addDoc(collection(db, 'reports'), {
              userId: user.uid,
              userEmail: user.email,
              nodeLabel: activeNodeLabel,
              reason: reportReason,
              timestamp: Date.now(),
              status: 'open'
          });
          setNotification({ type: 'success', message: "Report submitted. Thank you for improving eduOS." });
          setShowReportModal(false);
          setReportReason('');
      } catch (e) {
          console.error("Report failed:", e);
          setNotification({ type: 'error', message: "Failed to submit report." });
      }
  };

  const fetchReports = async () => {
      // reports handled by hook
  };

  const handleResolveReport = async (reportId: string) => {
      try {
          await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
          setNotification({ type: 'success', message: "Report marked as resolved." });
      } catch (e) {
          console.error("Resolve failed", e);
      }
  };

  if (loadingData) {
      return (
          <LoadingScreen 
            longLoad={loadingLong} 
            onReset={() => { auth.signOut(); window.location.reload(); }} 
          />
      );
  }

  // Show error if environment variables are missing (development only)
  if (!hasEnvVars && import.meta.env?.MODE === 'development') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col gap-4 p-8">
        <div className="w-16 h-16 bg-yellow-900/20 text-yellow-500 rounded-full flex items-center justify-center border border-yellow-500/50 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Missing Environment Variables</h2>
        <p className="text-zinc-400 text-center max-w-md">
          The app requires environment variables to run. Please check your <code className="bg-zinc-900 px-2 py-1 rounded">.env</code> file.
        </p>
        <div className="mt-4 p-4 bg-zinc-900 rounded-lg text-left text-sm font-mono space-y-1">
          <div>Required variables:</div>
          <div className="text-zinc-500">• VITE_FIREBASE_API_KEY</div>
          <div className="text-zinc-500">• VITE_GEMINI_API_KEYS</div>
          <div className="text-zinc-500">• VITE_FIREBASE_AUTH_DOMAIN</div>
          <div className="text-zinc-500">• ... (see ENV_SETUP.md)</div>
        </div>
        <p className="text-xs text-zinc-600 mt-4">Check the browser console for detailed errors.</p>
      </div>
    );
  }

  const currentRaidTeam = teams.find(t => t.id === currentRaidTeamId);

  // AuthenticatedRedirect component - redirects authenticated users from landing page
  const AuthenticatedRedirect = () => {
    useEffect(() => {
      console.log('🔄 [Redirect] AuthenticatedRedirect mounted/updated', {
        hasUser: !!user,
        hasCheckedAuth,
        loadingData,
        hasLoadedUserData,
        nodesLength: nodes.length,
        hasCurriculum: !!curriculumTitle,
        currentPath: location.pathname
      });
      
      if (user && hasCheckedAuth && hasLoadedUserData && !loadingData) {
        const targetPath = nodes.length > 0 || curriculumTitle ? '/dashboard' : '/onboarding';
        console.log('🔄 [Redirect] Conditions met! Navigating to:', targetPath);
        // Use a small delay to ensure state is settled
        const timer = setTimeout(() => {
          console.log('🔄 [Redirect] Executing navigation to:', targetPath);
          navigate(targetPath, { replace: true });
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [user, hasCheckedAuth, hasLoadedUserData, loadingData, nodes.length, curriculumTitle, navigate, location.pathname]);
    
    if (!hasCheckedAuth || loadingData || (user && !hasLoadedUserData)) {
      return <LoadingScreen message={!hasCheckedAuth ? "Checking authentication..." : "Loading your data..."} />;
    }
    
    return <LoadingScreen message="Redirecting..." />;
  };

  // ProtectedLayout component - defined here to access App state
  const ProtectedLayout = ({ children }: { children: ReactNode }) => (
    <>
      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-black">
        
        {/* HUD Header */}
        <header className="h-14 sm:h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 md:px-8 z-40 bg-black/80 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
            <div className="font-mono font-bold text-base sm:text-lg tracking-tighter text-white flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
              <span className="hidden sm:inline">eduOS</span>
              <span className="sm:hidden">edu</span>
            </div>
            
            {/* Breadcrumbs */}
            {(location.pathname.startsWith('/lesson/') || location.pathname === '/coops' || location.pathname === '/map') && (
              <div className="hidden sm:flex items-center gap-2 text-[10px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wide min-w-0">
                <span className="hover:text-white cursor-pointer transition-colors touch-manipulation" onClick={() => navigate('/dashboard')}>Hub</span>
                <span className="text-zinc-700">/</span>
                {location.pathname.startsWith('/lesson/') && (
                  <>
                    <span className="hover:text-white cursor-pointer transition-colors touch-manipulation" onClick={() => navigate('/map')}>Map</span>
                    <span className="text-zinc-700">/</span>
                  </>
                )}
                <span className="text-white truncate max-w-[120px] sm:max-w-[200px]">
                  {location.pathname === '/coops' ? 'SQUAD' : location.pathname === '/map' ? 'MAP' : nodes.find(n => n.id === activeNode)?.label?.substring(0, 15)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 shrink-0">
            {/* XP Stats - Mobile Compact */}
            <div className="flex sm:hidden items-center gap-1 text-[10px] font-mono">
              <Star size={10} className="text-white" fill="currentColor" />
              <span className="text-zinc-400">{userState.xp > 999 ? `${(userState.xp/1000).toFixed(1)}k` : userState.xp}</span>
            </div>
            
            {/* XP Stats - Desktop */}
            <div className="hidden sm:flex lg:flex items-center gap-4 md:gap-6 text-xs font-mono tracking-wider">
              <div className="flex items-center gap-2 text-zinc-400">
                <Star size={12} className="text-white" fill="currentColor" />
                <span className="hidden md:inline">{userState.xp.toLocaleString()} XP</span>
                <span className="md:hidden">{userState.xp > 999 ? `${(userState.xp/1000).toFixed(1)}k` : userState.xp}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-zinc-400">
                <Clock size={12} />
                <span>DAY {userState.streak}</span>
              </div>
            </div>

            {/* Momentum */}
            <div className="hidden xl:flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Momentum</span>
              <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500 ease-out" 
                  style={{ width: `${userState.momentum}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 border-l border-white/10 pl-2 sm:pl-4 md:pl-6 ml-1 sm:ml-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800 rounded-lg touch-manipulation"
                title="System Configuration"
              >
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 transition-colors hover:bg-red-950/30 rounded-lg touch-manipulation"
                title="Disconnect"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className={`text-white p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg transition-colors touch-manipulation ${sidebarOpen ? 'bg-zinc-800' : ''}`}
              title="Toggle Mentor Core"
            >
              <MessageSquare size={18} className={`sm:w-5 sm:h-5 ${sidebarOpen ? 'text-cyan-400' : 'text-zinc-400'}`} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          {children}
        </main>
      </div>

    </>
  );

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-white/20">

      {/* GLOBAL NOTIFICATION */}
      <AnimatePresence>
      {notification && (
            <motion.div 
                initial={{ opacity: 0, y: -20, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: -20, x: "-50%" }}
                className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md border ${
                    notification.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 
                    notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200' :
                    'bg-white/10 border-white/20 text-white'
                }`}
            >
                {notification.type === 'error' ? <AlertCircle size={16} /> : 
                 notification.type === 'success' ? <CheckCircle2 size={16} /> : 
                 <Info size={16} />}
                <span className="text-xs font-medium tracking-wide">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={14}/></button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
                  <button 
                      onClick={() => setShowSettings(false)} 
                      className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                  >
                      <X size={20}/>
                  </button>
                  
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-zinc-400" />
                      System Configuration
                  </h3>
                  
                  <div className="space-y-6">
                      {/* Custom Cursor removed */}

                      <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-zinc-800">
                          <div>
                              <div className="text-sm font-bold text-white">Audio Feedback</div>
                              <div className="text-xs text-zinc-500">Interface sounds and ambient hum</div>
                          </div>
                          <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-not-allowed opacity-50">
                              <div className="w-3 h-3 bg-zinc-500 rounded-full absolute top-1 left-1"></div>
                          </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-zinc-800">
                           <div>
                              <div className="text-sm font-bold text-white">High Contrast Mode</div>
                              <div className="text-xs text-zinc-500">Increase visual legibility</div>
                          </div>
                          <div className="w-10 h-5 bg-zinc-800 rounded-full relative cursor-not-allowed opacity-50">
                              <div className="w-3 h-3 bg-zinc-500 rounded-full absolute top-1 left-1"></div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                          <div className="text-xs font-mono text-zinc-600 mb-2">USER_ID: {user?.uid || 'GUEST_MODE'}</div>
                          <div className="text-xs font-mono text-zinc-600">VERSION: 2.5.0-BETA</div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5">
                           <div className="text-sm font-bold text-white mb-3">Content Mode</div>
                           <div className="grid grid-cols-2 gap-2">
                               {Object.values(ContentMode).map(mode => (
                                   <button
                                       key={mode}
                                       onClick={() => {
                                           handleModeChange(mode);
                                           // Optional: Close settings if you want, or let them switch freely
                                       }}
                                       className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                                           contentMode === mode 
                                           ? 'bg-white text-black border-white shadow-lg' 
                                           : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'
                                       }`}
                                   >
                                       {mode}
                                   </button>
                               ))}
                           </div>
                      </div>

                      <button 
                          onClick={handleSignOut}
                          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-4"
                      >
                          <LogOut size={16} /> Disconnect Neural Link
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                          <Flag size={16} className="text-red-500" />
                          Report Content
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                  </div>
                  <textarea 
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe the issue..."
                      className="w-full bg-black border border-zinc-800 rounded-lg p-4 text-white focus:border-white focus:outline-none min-h-[120px] mb-6 text-sm resize-none"
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowReportModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wide">Cancel</button>
                      <button 
                          onClick={handleReport}
                          disabled={!reportReason.trim()}
                          className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-full text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                      >
                          Submit
                      </button>
                  </div>
              </div>
          </div>
      )}

      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Landing Page Route */}
        <Route path="/" element={
          !user ? (
            <LandingPage onStart={handleStartJourney} onGuest={handleGuestLogin} />
          ) : (
            <AuthenticatedRedirect />
          )
        } />
        
        {/* Onboarding Route */}
        <Route path="/onboarding" element={
          !hasCheckedAuth ? (
            <LoadingScreen message="Checking authentication..." />
          ) : !user ? (
            <Navigate to="/" replace />
          ) : (!hasLoadedUserData || loadingData) ? (
            <LoadingScreen message="Loading your data..." />
          ) : (nodes.length > 0 || curriculumTitle) ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Onboarding onComplete={handleOnboardingComplete} onExit={handleSignOut} initialName={user?.displayName} />
          )
        } />
        
        {/* Raid Route */}
        <Route path="/coop/:teamId/raid" element={
          currentRaidTeam ? (
            <RaidSession team={currentRaidTeam} currentUser={userState} onExit={() => navigate('/coops')} />
          ) : (
            <Navigate to="/coops" replace />
          )
        } />
        
        {/* Admin Route */}
        <Route path="/admin" element={
          isAdmin(user) ? (
            <div className="w-full h-full flex flex-col bg-black">
              <div className="p-8 text-white">Admin Dashboard Placeholder</div>
            </div>
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        {/* Protected Routes - Require Authentication */}
        <Route path="/dashboard" element={!hasCheckedAuth ? (
          <LoadingScreen message="Checking authentication..." />
        ) : user ? (
          <ProtectedLayout>
            <DashboardHub
              userState={userState}
              teams={teams}
              curriculumTitle={curriculumTitle}
              onSelectSubject={() => navigate('/map')}
              onSelectTeam={(teamId) => {
                navigate('/coops');
              }}
              onCreateTeam={() => navigate('/coops')}
            />
          </ProtectedLayout>
        ) : (
          <Navigate to="/" replace />
        )} />
        
        <Route path="/map" element={!hasCheckedAuth ? (
          <LoadingScreen message="Checking authentication..." />
        ) : user ? (
          <ProtectedLayout>
            <div className="w-full h-full relative">
              {graphLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/90 backdrop-blur-sm">
                  <div className="w-px h-16 bg-gradient-to-b from-transparent via-white to-transparent animate-pulse mb-4"></div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-white">Generating Neural Graph</h3>
                  <p className="text-zinc-600 text-xs font-mono mt-2">EXPANDING_FRONTIER...</p>
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                  <p className="font-mono text-xs">NO_DATA_FOUND</p>
                  <button onClick={() => navigate('/onboarding')} className="text-white border-b border-white/20 hover:border-white pb-0.5 text-sm transition-all">Restart Initialization</button>
                </div>
              ) : (
                <ConstellationMap 
                  nodes={nodes} 
                  activeNodeId={activeNode}
                  onNodeSelect={handleNodeSelect}
                  onNodeMove={handleNodeMove}
                />
              )}
              
              {!graphLoading && nodes.length > 0 && (
                <div className="absolute bottom-12 left-12 pointer-events-none z-10">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter mix-blend-difference opacity-50"
                  >
                    {curriculumTitle}
                  </motion.h1>
                  
                  {allNodesCompleted && (
                    <button 
                      onClick={handleExpandGraph}
                      className="mt-6 px-8 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-3 pointer-events-auto transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105"
                    >
                      <PlusCircle size={18} />
                      <span className="text-xs uppercase tracking-widest">Expand Frontier</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </ProtectedLayout>
        ) : (
          <Navigate to="/" replace />
        )} />

        <Route path="/coops" element={!hasCheckedAuth ? (
          <LoadingScreen message="Checking authentication..." />
        ) : user ? (
          <ProtectedLayout>
            <CoopDashboard 
              teams={teams} 
              currentUser={userState.displayName || 'Traveler'}
              currentUserId={user?.uid || ''}
              onCreateTeam={(name) => handleCreateTeam(name)}
              onDeleteTeam={handleDeleteTeam}
              onJoinTeam={(code) => handleJoinTeam(code)}
              onNavigateToMap={() => navigate('/map')}
              onEnterRaid={handleEnterRaid}
            />
          </ProtectedLayout>
        ) : (
          <Navigate to="/" replace />
        )} />

        <Route path="/lesson/:nodeId" element={!hasCheckedAuth ? (
          <LoadingScreen message="Checking authentication..." />
        ) : user ? (
          <ProtectedLayout>
            <LessonView 
              activeNode={activeNode}
              setActiveNode={setActiveNode}
              nodes={nodes}
              currentLesson={currentLesson}
              lessonLoading={lessonLoading}
              contentMode={contentMode}
              setContentMode={setContentMode}
              chaosBattle={chaosBattle}
              chaosLives={chaosLives}
              chaosIndex={chaosIndex}
              rabbitHoleContent={rabbitHoleContent}
              setRabbitHoleContent={setRabbitHoleContent}
              activeWidgets={activeWidgets}
              loadingWidgets={loadingWidgets}
              userState={userState}
              setUserState={setUserState}
              setNodes={setNodes}
              saveUserData={saveUserData}
              setNotification={setNotification}
              setShowReportModal={setShowReportModal}
              loadLesson={loadLesson}
              handleCompleteLesson={handleCompleteLesson}
              handleChaosAnswer={handleChaosAnswer}
              triggerRabbitHole={triggerRabbitHole}
              handleTriggerWidget={handleTriggerWidget}
              handleWidgetComplete={handleWidgetComplete}
              navigate={navigate}
            />
          </ProtectedLayout>
        ) : (
          <Navigate to="/" replace />
        )} />
        
        <Route path="/assignment/:id" element={!hasCheckedAuth ? (
          <LoadingScreen message="Checking authentication..." />
        ) : user ? (
          <ProtectedLayout>
            <LessonView 
              activeNode={activeNode}
              setActiveNode={setActiveNode}
              nodes={nodes}
              currentLesson={currentLesson}
              lessonLoading={lessonLoading}
              contentMode={contentMode}
              setContentMode={setContentMode}
              chaosBattle={chaosBattle}
              chaosLives={chaosLives}
              chaosIndex={chaosIndex}
              rabbitHoleContent={rabbitHoleContent}
              setRabbitHoleContent={setRabbitHoleContent}
              activeWidgets={activeWidgets}
              loadingWidgets={loadingWidgets}
              userState={userState}
              setUserState={setUserState}
              setNodes={setNodes}
              saveUserData={saveUserData}
              setNotification={setNotification}
              setShowReportModal={setShowReportModal}
              loadLesson={loadLesson}
              handleCompleteLesson={handleCompleteLesson}
              handleChaosAnswer={handleChaosAnswer}
              triggerRabbitHole={triggerRabbitHole}
              handleTriggerWidget={handleTriggerWidget}
              handleWidgetComplete={handleWidgetComplete}
              navigate={navigate}
            />
          </ProtectedLayout>
        ) : (
          <Navigate to="/" replace />
        )} />
      </Routes>
      </Suspense>

      {/* GLOBAL MENTOR SIDEBAR (available across onboarding + protected routes) */}
      {user && hasCheckedAuth && (
        <div
          className={`fixed inset-y-0 right-0 w-full sm:w-80 lg:w-96 bg-zinc-950/95 sm:bg-zinc-950/90 backdrop-blur-xl border-l border-white/5 transform transition-all duration-300 ease-in-out z-50 flex flex-col ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
            <h2 className="font-bold flex items-center gap-2 text-white text-sm tracking-widest uppercase">
              <Brain size={16} className="text-zinc-500" /> Mentor Core
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={<div className="p-6 text-xs font-mono text-zinc-600">LOADING_MENTOR_...</div>}>
              <MentorChat className="h-full" mode={contentMode} />
            </Suspense>
          </div>

          {/* Social Section - Minimalist */}
          <div className="h-48 border-t border-white/5 bg-black/20 p-6 flex flex-col">
            {teams.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Squads</span>
                  <span className="text-[10px] font-mono text-zinc-600">{teams.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4">
                  {teams.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 cursor-pointer"
                      onClick={() => navigate('/coops')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-zinc-800 to-zinc-700 text-[10px] flex items-center justify-center font-bold text-white">
                          {t.name.substring(0, 1)}
                        </div>
                        <span className="text-xs text-zinc-300 font-medium truncate max-w-[120px]">{t.name}</span>
                      </div>
                      {t.raidReady && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/coops')}
                  className="w-full py-2.5 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide font-bold"
                >
                  Manage Squads
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <p className="text-xs text-zinc-500 font-mono">NO_SQUAD_LINKED</p>
                <button
                  onClick={() => navigate('/coops')}
                  className="px-6 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-full transition-colors tracking-wide uppercase"
                >
                  Initialize Co-op
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSISTENT COMPANION (bottom-right) */}
      {user && hasCheckedAuth && (
        <CompanionCorner
          sidebarOpen={sidebarOpen}
          onOpenChat={() => setSidebarOpen(true)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

export default App;
