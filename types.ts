
export enum ContentMode {
  ELI5 = 'ELI5',
  ACADEMIC = 'ACADEMIC',
  SOCRATIC = 'SOCRATIC',
  PRACTICAL = 'PRACTICAL'
}

export enum MentorPersona {
  LIBRARIAN = 'Librarian',
  COACH = 'Coach',
  DEVIL = 'Devil\'s Advocate'
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  type: 'complete_lesson' | 'earn_xp' | 'perfect_quiz' | 'visit_map';
  target: number;
  progress: number;
}

export interface UserState {
  uid: string;
  displayName: string | null;
  momentum: number; // 0-100
  streak: number;
  xp: number;
  completedNodes: string[]; // IDs of completed constellation nodes
  currentFocus: string | null; // ID of current node being studied
  quests?: Quest[]; // Daily quests
  lastQuestDate?: string; // Date string to check for resets
}

export interface CurriculumOption {
  id: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  tags: string[];
}

export interface OnboardingData {
  goal: string;
  hoursPerDay: number;
  daysOfWeek: string[];
  name: string;
}

// Graph Node for the Constellation
export interface KnowledgeNode {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'locked' | 'available' | 'mastered';
  connections: string[]; // IDs of connected nodes
  category: 'core' | 'side-quest';
  type?: 'standard' | 'chaos' | 'treasure' | 'mystery'; 
  variant?: 'risk' | 'reward' | 'mystery'; // Optional sub-variant
  cachedContent?: LessonContent; // Locally cached lesson content
  cachedRabbitHole?: string; // Cached rabbit hole content
}

export interface LessonResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'website';
}

export interface LessonSection {
  heading: string;
  body: string;
  type: 'text' | 'code' | 'quiz' | 'interactive_trigger';
  triggerContext?: string;
  triggerArchetype?: string;
}

export interface InteractiveWidget {
  type: string;
  config: any;
}

export interface LessonContent {
  title: string;
  summary: string;
  sections: LessonSection[];
  interactiveWidget?: InteractiveWidget | null;
  externalResources?: LessonResource[];
  cachedWidgets?: { [key: number]: InteractiveWidget }; // Cache by section index
  completedWidgetIndices?: number[]; // Track completed widgets to prevent duplicate XP
}

export interface RaidOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface RaidQuestion {
  id: string;
  text: string;
  options: RaidOption[];
  explanation: string;
}

export interface RaidData {
  title: string;
  description: string;
  questions: RaidQuestion[];
}

// Chaos Battle Structure
export interface ChaosBattle {
    id: string;
    title: string;
    questions: RaidQuestion[]; // Reusing RaidQuestion structure for simplicity
}

export interface CoopMember {
  uid: string;
  name: string;
  role: 'Captain' | 'Member' | 'Scribe' | 'Skeptic';
  status: 'online' | 'offline' | 'busy';
  xpContribution: number;
}

export interface CoopTeam {
  id: string;
  name: string;
  inviteCode: string;
  raidReady: boolean;
  weeklyGoal: string;
  memberIds: string[];
  members: CoopMember[];
}

export interface ContentReport {
  id: string;
  userId: string;
  userEmail: string | null;
  nodeLabel: string;
  reason: string;
  timestamp: number;
  status: 'open' | 'resolved';
}
