import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContentMode, LessonContent, MentorPersona, CurriculumOption, KnowledgeNode, RaidData, ChaosBattle, AISoulProfile } from "../types";

// --- SHARED BEHAVIOR ---

const FLEXIBILITY_RULE = `
CRITICAL FLEXIBILITY PROTOCOL:
- If the user asks "how to do X" (practical skill like crochet, coding, cooking), DO NOT REFUSE.
- Even if you cannot physically do it, you MUST provide:
  1. A clear "Yes, I can help you learn that."
  2. Step-by-step instructions or a starter guide.
  3. Where to find resources (e.g., "Search for 'beginner crochet patterns' on Ravelry or YouTube").
- NEVER say "I cannot do that physically" as a refusal. Say "I can't hold the hook for you, but here is exactly how you move your hands..."
`;

const injectSoul = (baseInstruction: string, soul?: AISoulProfile): string => {
    if (!soul) return baseInstruction;
    let modified = baseInstruction;
    if (soul.soulPrompt) modified += `\n\n[USER CUSTOM SOUL]: ${soul.soulPrompt}`;
    if (soul.memoryNotes) modified += `\n\n[LONG TERM MEMORY]: ${soul.memoryNotes}`;
    if (soul.helpStyle) modified += `\n\n[PREFERRED HELP STYLE]: ${soul.helpStyle}`;
    return modified;
};

// Helper to get API Keys from environment variables
const getApiKeys = () => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        const envKeys = import.meta.env.VITE_GEMINI_API_KEYS;
        if (envKeys && typeof envKeys === 'string') {
            // Split comma-separated keys and filter out empty strings
            const keys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
            if (keys.length > 0) {
                return keys;
            }
        }
    }
    // No keys found - throw error in production, warn in development
    if (import.meta.env?.MODE === 'production') {
        throw new Error('VITE_GEMINI_API_KEYS environment variable is required in production');
    }
    if (import.meta.env?.MODE === 'development') {
        console.warn('⚠️ VITE_GEMINI_API_KEYS not found. Please set it in your .env file.');
    }
    return [];
};

const keys = getApiKeys();
if (keys.length === 0 && import.meta.env?.MODE === 'development') {
    console.error('❌ No Gemini API keys found. Please add VITE_GEMINI_API_KEYS to your .env file.');
}

const clients = keys.map(k => new GoogleGenAI({ apiKey: k }));
const ai = clients[0] || null; // Default client (null if no keys)

export const isGeminiConfigured = () => clients.length > 0;

// Helper to ensure we have a valid client
const ensureClient = () => {
    if (!ai || clients.length === 0) {
        throw new Error('Gemini API keys not configured. Please set VITE_GEMINI_API_KEYS in your .env file.');
    }
    return ai;
};

// --- HELPERS ---

const cleanAndParseJSON = <T>(text: string): T | null => {
    try {
        if (!text) return null;
        let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        const firstOpen = cleaned.search(/[\{\[]/);
        let lastClose = -1;
        for (let i = cleaned.length - 1; i >= 0; i--) {
            if (cleaned[i] === '}' || cleaned[i] === ']') {
                lastClose = i;
                break;
            }
        }
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleaned = cleaned.substring(firstOpen, lastClose + 1);
        }
        cleaned = cleaned.trim();
        return JSON.parse(cleaned) as T;
    } catch (e) {
        if (import.meta.env?.MODE === 'development') {
            console.error("JSON Parse Error:", e);
        }
        return null;
    }
}

// Robust Retry wrapper for API calls to handle 429/503 errors
async function callWithRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        // Add a hard timeout to the operation (increased to 60s for Cross-Check mode)
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API Timeout")), 60000));
        return await Promise.race([operation(), timeout]) as T;
    } catch (error: any) {
        const isRateLimit = error.message?.includes('429') || error.status === 429;
        const isServerBusy = error.message?.includes('503') || error.status === 503;
        const isTimeout = error.message === "Gemini API Timeout";
        
        if (retries > 0 && (isRateLimit || isServerBusy || isTimeout)) {
            if (import.meta.env?.MODE === 'development') {
                console.warn(`API Issue (${error.message}). Retrying in ${delay}ms...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(operation, retries - 1, delay * 1.5);
        }
        throw error;
    }
}

// --- CROSS-CHECK / ACCELERATION PLAN ENGINE ---

interface GenerationConfig {
    model?: string;
    config?: any;
    contents: string;
}

// Runs prompt across multiple providers (simulated via multiple keys/clients) and synthesizes
async function generateWithCrossCheck<T>(
    promptConfig: GenerationConfig, 
    synthesisInstruction: string,
    schema?: Schema
): Promise<T | null> {
    if (import.meta.env?.MODE === 'development') {
        console.log("🚀 Initiating Acceleration Plan: Cross-Check Mode");
    }

    try {
        // 1. Parallel Generation
        // We use slightly different prompts or temperatures to encourage diversity if using same model
        const promises = clients.map((client, index) => {
            const variantConfig = {
                ...promptConfig,
                config: {
                    ...promptConfig.config,
                    temperature: 0.7 + (index * 0.2), // Vary temp: 0.7, 0.9
                }
            };
            
            // Add individual timeout per provider
            const apiCall = client.models.generateContent({
                model: "gemini-2.5-flash",
                ...variantConfig
            }).then(res => res.text).catch(e => {
                if (import.meta.env?.MODE === 'development') {
                    console.warn(`Provider ${index} failed:`, e);
                }
                return null;
            });

            const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 25000));
            return Promise.race([apiCall, timeout]);
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(r => r !== null && typeof r === 'string' && r.trim().length > 0);

        if (validResults.length === 0) throw new Error("All providers failed.");

        // 2. Synthesis Phase
        // If we have multiple results, we ask one agent to synthesize the best parts
        let finalContent = validResults[0] as string;

        if (validResults.length > 1) {
             const synthesisPrompt = `
                Analyze the following ${validResults.length} responses to the prompt: "${promptConfig.contents}".
                
                RESPONSE A:
                ${validResults[0]}
                
                RESPONSE B:
                ${validResults[1]}
                
                ${synthesisInstruction}
                
                Return the result in the requested JSON format.
             `;

             // Use a random client for synthesis to distribute load
             const synthesisClient = clients[Math.floor(Math.random() * clients.length)];

             const synthesisResult = await synthesisClient.models.generateContent({
                 model: "gemini-2.5-flash",
                 config: {
                     responseMimeType: "application/json",
                     responseSchema: schema,
                     systemInstruction: "You are the Synthesis Engine. Combine the best insights from multiple streams."
                 },
                 contents: synthesisPrompt
             });
             
             finalContent = synthesisResult.text || finalContent;
        }

        return cleanAndParseJSON<T>(finalContent);

    } catch (error) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Cross-check failed, falling back to single stream:", error);
        }
        // Fallback to single stream immediately if fancy logic fails
        try {
             if (clients.length === 0 || !clients[0]) throw new Error('API keys not configured');
             const fallbackClient = clients[0];
             const fallbackResult = await fallbackClient.models.generateContent({
                model: "gemini-2.5-flash",
                ...promptConfig
             });
             return cleanAndParseJSON<T>(fallbackResult.text || "");
        } catch (e) {
            return null;
        }
    }
}


// --- FALLBACK GENERATORS (OFFLINE/QUOTA MODE) ---

const getFallbackGraph = (title: string): KnowledgeNode[] => {
    if (import.meta.env?.MODE === 'development') {
        console.warn("Using Fallback Graph for:", title);
    }
    const shortTitle = title.split(' ').slice(0, 2).join(' ');
    return Array.from({ length: 6 }).map((_, i) => ({
        id: `fallback-${i}`,
        label: `${shortTitle} Module ${i + 1}`,
        x: 100 + (i * 120),
        y: 150 + (i % 2 === 0 ? 0 : 100), // Zig-zag
        status: i === 0 ? 'available' : 'locked',
        connections: i < 5 ? [`fallback-${i + 1}`] : [],
        category: 'core',
        type: 'standard'
    }));
};

const getFallbackLesson = (topic: string): LessonContent => ({
    title: topic,
    summary: `Backup Module loaded. The neural link is currently at capacity or offline. We have retrieved cached archives for "${topic}".`,
    sections: [
        {
            heading: "Core Fundamentals",
            body: `To understand ${topic}, we must first look at its foundational elements. In this offline mode, focus on the definitions and structural relationships that define this concept. Mastery of ${topic} is critical for advanced progression.`,
            type: "text"
        },
        {
            heading: "Structural Analysis",
            body: `Analyzing ${topic} reveals a complex interplay of systems. Consider how this concept interacts with adjacent nodes in your knowledge graph. When the neural link is re-established, we will dive deeper into dynamic examples.`,
            type: "text"
        },
        {
            heading: "Practical Application",
            body: `How is ${topic} applied in real-world scenarios? Typically, it is used to solve specific efficiency problems or to bridge gaps between theoretical models and execution.`,
            type: "text"
        }
    ],
    interactiveWidget: {
        type: "flashcard",
        config: {
            question: `What is the primary definition of ${topic}?`,
            answer: "It is a key component of the current curriculum, serving as a building block for subsequent modules."
        }
    },
    externalResources: [
        {
            title: `Learn more about ${topic} on Wikipedia`,
            url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
            type: "article"
        },
        {
            title: `Watch tutorials on ${topic}`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`,
            type: "video"
        }
    ]
});

// --- SCHEMAS ---

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          body: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["text", "code", "quiz", "interactive_trigger"] },
          triggerContext: { type: Type.STRING, nullable: true },
          triggerArchetype: { type: Type.STRING, nullable: true }
        },
        required: ["heading", "body", "type"],
      },
    },
    // Legacy support for older lessons, but new ones won't use it primarily
    interactiveWidget: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        type: { type: Type.STRING },
        config: { 
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                initialCode: { type: Type.STRING },
                title: { type: Type.STRING },
                data: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            value: { type: Type.NUMBER }
                        }
                    } 
                },
                items: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            categoryIndex: { type: Type.NUMBER }
                        }
                    } 
                },
                categories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                pairs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            left: { type: Type.STRING },
                            right: { type: Type.STRING }
                        }
                    }
                },
                minLabel: { type: Type.STRING },
                maxLabel: { type: Type.STRING },
                explanationLow: { type: Type.STRING },
                explanationHigh: { type: Type.STRING }
            }
        }
      },
    },
    externalResources: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                type: { type: Type.STRING }
            }
        }
    }
  },
  required: ["title", "summary", "sections"],
};

const curriculumOptionsSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedWeeks: { type: Type.NUMBER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["id", "title", "description", "estimatedWeeks", "tags"]
    }
};

const graphSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            connections: { type: Type.ARRAY, items: { type: Type.STRING } },
            category: { type: Type.STRING, enum: ["core", "side-quest"] }
        },
        required: ["id", "label", "x", "y", "connections", "category"]
    }
};

const raidSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                text: { type: Type.STRING },
                                isCorrect: { type: Type.BOOLEAN }
                            },
                            required: ["id", "text", "isCorrect"]
                        }
                    },
                    explanation: { type: Type.STRING }
                },
                required: ["id", "text", "options", "explanation"]
            }
        }
    },
    required: ["title", "description", "questions"]
};

// --- GENERATORS ---

export const generateCurriculumOptions = async (goal: string, timeConstraints: string): Promise<CurriculumOption[]> => {
    return await callWithRetry(async () => {
        // Use Cross-Check for Curriculum Generation (Acceleration Plan)
        const result = await generateWithCrossCheck<CurriculumOption[]>({
            config: {
                responseMimeType: "application/json",
                responseSchema: curriculumOptionsSchema,
                systemInstruction: "You are the Curriculum Architect. Generate 4 distinct learning paths."
            },
            contents: `User Goal: "${goal}". Time: ${timeConstraints}.`,
        }, "Merge the options to create 4 highly distinct, optimized paths. Ensure variety in pacing and depth.", curriculumOptionsSchema);

        if (result) return result;

        // Fallback to single stream if cross-check returned null internally (still REAL Gemini).
        const client = ensureClient();
        const singleResult = await client.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                responseMimeType: "application/json",
                responseSchema: curriculumOptionsSchema,
                systemInstruction: "You are the Curriculum Architect. Generate 4 distinct learning paths."
            },
            contents: `User Goal: "${goal}". Time: ${timeConstraints}.`,
        });

        if (singleResult.text) {
            const parsed = cleanAndParseJSON<CurriculumOption[]>(singleResult.text);
            if (parsed) return parsed;
        }
        throw new Error("Gemini returned empty/invalid curriculum options.");
    });
};

export const generateKnowledgeGraph = async (curriculumTitle: string, userGoal: string): Promise<KnowledgeNode[]> => {
    // 1. Try API Generation with Retry
    try {
        return await callWithRetry(async () => {
            if (!ai) throw new Error('API keys not configured');
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: graphSchema,
                    systemInstruction: `You are a Knowledge Graph Engineer.
                    Create a dependency graph of 5-8 nodes for the curriculum: "${curriculumTitle}".
                    
                    LAYOUT: 800x600 canvas.
                    - Start at top-left, end at bottom-right.
                    - First node 'available', others 'locked'.
                    - Ensure logical prerequisites connections.
                    `
                },
                contents: "Generate nodes.",
            });

            if (result.text) {
                const nodes = cleanAndParseJSON<KnowledgeNode[]>(result.text);
                
                if (nodes && Array.isArray(nodes) && nodes.length > 0) {
                    return nodes.map((n, i) => ({
                        id: n.id || `node-${i}`,
                        label: n.label || `Module ${i+1}`,
                        x: Number.isFinite(n.x) ? n.x : 100 + (i % 3) * 200,
                        y: Number.isFinite(n.y) ? n.y : 100 + Math.floor(i / 3) * 150,
                        connections: Array.isArray(n.connections) ? n.connections : [],
                        status: i === 0 ? 'available' : 'locked',
                        category: n.category || 'core',
                        type: 'standard'
                    }));
                }
            }
            throw new Error("Empty or invalid graph response");
        });
    } catch (error) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Gemini Graph Gen Error (Falling back to local):", error);
        }
        // 2. Return Fallback if API completely fails so app doesn't hang
        return getFallbackGraph(curriculumTitle);
    }
}

// Generates 4-5 new nodes that attach to the end of the existing graph
export const generateExpansionGraph = async (curriculumTitle: string, existingNodes: KnowledgeNode[]): Promise<KnowledgeNode[]> => {
    try {
        const leafNodes = existingNodes.filter(n => n.connections.length === 0 || !existingNodes.some(target => target.connections.includes(n.id)));
        const contextLabels = leafNodes.map(n => n.label).join(", ");

        return await callWithRetry(async () => {
            if (!ai) throw new Error('API keys not configured');
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: graphSchema,
                    systemInstruction: `You are a Knowledge Architect. The user has mastered: ${contextLabels}.
                    Generate 4-5 NEW, ADVANCED nodes that naturally follow these concepts.
                    
                    Layout:
                    - Place them visually 'after' the existing nodes (e.g. x > 600).
                    - Connections should mostly point from new nodes to each other, but the first new node needs to connect FROM the existing graph logic (the app will handle the physical link).
                    - Mark them as 'locked'.
                    `
                },
                contents: `Expand the curriculum "${curriculumTitle}" with advanced concepts.`,
            });

            if (result.text) {
                const nodes = cleanAndParseJSON<KnowledgeNode[]>(result.text);
                if (nodes && Array.isArray(nodes)) {
                    return nodes.map((n, i) => ({
                         ...n,
                         id: `exp-${Date.now()}-${i}`, // Ensure unique IDs
                         status: 'locked',
                         type: 'standard'
                    }));
                }
            }
            throw new Error("Failed expansion");
        });
    } catch (e) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Expansion failed:", e);
        }
        return [];
    }
};

export const generateChaosBattle = async (curriculumTitle: string): Promise<ChaosBattle | null> => {
    try {
        return await callWithRetry(async () => {
            if (!ai) throw new Error('API keys not configured');
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: raidSchema, // Reusing raid schema for simplicity
                    systemInstruction: `Create a CHAOS TEST for the subject "${curriculumTitle}".
                    - 10 Questions.
                    - EXTREMELY DIFFICULT.
                    - "Socratic" style trick questions allowed.
                    - No mercy.
                    `
                },
                contents: "Generate Chaos Battle.",
            });

            if (result.text) {
                const data = cleanAndParseJSON<RaidData>(result.text);
                if (data) {
                    return {
                        id: `chaos-${Date.now()}`,
                        title: "CHAOS TEST: " + data.title,
                        questions: data.questions
                    };
                }
            }
            return null;
        });
    } catch (e) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Chaos Gen Error:", e);
        }
        return null;
    }
}

export const generateLesson = async (topic: string, context: string, mode: ContentMode, isFirstLesson: boolean = false, aiSoul?: AISoulProfile): Promise<LessonContent | null> => {
  try {
    return await callWithRetry(async () => {
        // Use Cross-Check for Lessons to ensure depth and accuracy
        let systemInstruction = `Expert Tutor. 
        
        DOMAIN/CURRICULUM: "${context}"
        TOPIC: "${topic}"
        
        CRITICAL INSTRUCTION:
        You must teach "${topic}" strictly within the context of the "${context}" curriculum.
        - If the curriculum is "Frontend Development" and topic is "Motion", teach CSS/Framer Motion, NOT Physics.
        - If the curriculum is "Physics" and topic is "Motion", teach Kinematics.
        - Disambiguate based on the curriculum title.
        
        STRICTLY STAY ON TOPIC. Provide detailed, educational content.
        
        INTERACTIVE TRIGGERS:
              Instead of a single quiz at the end, insert 'interactive_trigger' sections WHEREVER appropriate in the flow (e.g. after explaining a key concept).
              - For 'interactive_trigger', provide a 'triggerContext' (what did they just learn?) and a suggested 'triggerArchetype'.
              - Archetypes: 'Debugger' (Code), 'Architect' (System Design), 'Skeptic' (Debate), 'SpeedRun' (Quick Recall), 'Analyst' (Data), 'Negotiator' (Persuasion).
              
              Mode: ${mode}.
              ${isFirstLesson ? "No summary." : "Include short summary."}
              `;
        
        systemInstruction += FLEXIBILITY_RULE;
        systemInstruction = injectSoul(systemInstruction, aiSoul);

        const result = await generateWithCrossCheck<LessonContent>({
            config: {
                responseMimeType: "application/json",
                responseSchema: lessonSchema,
                systemInstruction
            },
            contents: `Teach ${topic}`,
        }, "Combine these lessons. Ensure 2-3 interactive triggers are placed naturally within the content.", lessonSchema);

        if (result) return result;

        if (!ai) throw new Error('API keys not configured');
        const singleResult = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            responseMimeType: "application/json",
            responseSchema: lessonSchema,
            systemInstruction
          },
          contents: `Teach ${topic}`,
        });
    
        if (singleResult.text) {
          return cleanAndParseJSON<LessonContent>(singleResult.text);
        }
        throw new Error("Empty lesson response");
    });
  } catch (error) {
    if (import.meta.env?.MODE === 'development') {
        console.error("Gemini Lesson Gen Error (Using fallback):", error);
    }
    return getFallbackLesson(topic);
  }
};

export const generateLessonChallenge = async (topic: string, context: string, archetype: string): Promise<InteractiveWidget | null> => {
    try {
        let systemInstruction = `You are an Infinite Challenge Engine. Create a unique interactive challenge about "${topic}".
        Context: "${context}".
        Archetype: "${archetype}".
        `;

        // Archetype specific instructions
        switch (archetype.toLowerCase()) {
            case 'debugger':
                systemInstruction += `\nTask: Generate broken code. User must fix it. Widget Type: 'code-fixer'. Config: initialCode (broken), solution (fixed), hints.`;
                break;
            case 'architect':
                systemInstruction += `\nTask: Design problem. User must connect components. Widget Type: 'design-canvas'. Config: nodes (list), goal.`;
                break;
            case 'skeptic':
                systemInstruction += `\nTask: You are a Skeptic bot. Challenge the user's understanding. Widget Type: 'socratic-duel'. Config: initialStatement (controversial/wrong), winningCondition.`;
                break;
            case 'speedrun':
                systemInstruction += `\nTask: Rapid fire matching/sorting. Widget Type: 'speed-run'. Config: categories (2 strings), items (Array of { text: string, categoryIndex: 0 or 1 }), title, description.`;
                break;
            case 'analyst':
                systemInstruction += `\nTask: Data interpretation. Widget Type: 'data-vis'. Config: data (Array of {name: string, value: number}), question.`;
                break;
            case 'negotiator':
                systemInstruction += `\nTask: Persuasion scenario. Widget Type: 'negotiator'. Config: scenario, botRole, goal.`;
                break;
            default:
                systemInstruction += `\nTask: Standard quiz. Widget Type: 'quiz'.`;
        }

        // We use a looser schema for the config since it varies wildy by archetype
        // Ideally we would define a union schema, but for now we trust the generic object structure
        
        const result = await callWithRetry(async () => {
            if (!ai) throw new Error('API keys not configured');
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    responseMimeType: "application/json",
                    // Reuse the interactiveWidget schema part from lessonSchema for structure
                    // properties: { type: string, config: object }
                },
                contents: `Generate challenge for ${archetype}.`,
            });

            if (result.text) {
                const parsed = cleanAndParseJSON<InteractiveWidget>(result.text);
                if (parsed) {
                    // Ensure config object exists to prevent crashes
                    if (!parsed.config) parsed.config = {};

                    // Force type consistency based on archetype
                    let forcedType = parsed.type;
                    switch (archetype.toLowerCase()) {
                        case 'debugger': forcedType = 'code-fixer'; break;
                        case 'architect': forcedType = 'design-canvas'; break;
                        case 'skeptic': forcedType = 'socratic-duel'; break;
                        case 'speedrun': forcedType = 'speed-run'; break;
                        case 'analyst': forcedType = 'data-vis'; break;
                        case 'negotiator': forcedType = 'negotiator'; break;
                    }

                    // Validation & Repair Engine
                    let repairPrompt = "";
                    let needsRepair = false;

                    // Check for missing critical data based on type
                    if (forcedType === 'data-vis' && (!parsed.config.data || !Array.isArray(parsed.config.data) || parsed.config.data.length === 0)) {
                        needsRepair = true;
                        repairPrompt = `Generate a JSON dataset for a line chart about "${topic}". Context: "${context}". Format: Array of objects with "name" (string) and "value" (number). 5-7 points.`;
                    } 
                    else if (forcedType === 'code-fixer' && !parsed.config.initialCode) {
                        needsRepair = true;
                        repairPrompt = `Generate a short snippet of BROKEN/BUGGY code related to "${topic}". Context: "${context}". Return JSON: { "initialCode": "code_string_here" }`;
                    }
                    else if (forcedType === 'design-canvas' && (!parsed.config.nodes || !Array.isArray(parsed.config.nodes) || parsed.config.nodes.length === 0)) {
                        needsRepair = true;
                        repairPrompt = `Generate a list of 5 system components (strings) for a design architecture problem about "${topic}". Return JSON: { "nodes": ["Component A", "Component B"...] }`;
                    }
                    else if (forcedType === 'socratic-duel' && !parsed.config.initialStatement) {
                        needsRepair = true;
                        repairPrompt = `Generate a provocative, slightly incorrect initial statement about "${topic}" to start a debate. Return JSON: { "initialStatement": "statement_here" }`;
                    }
                    else if (forcedType === 'speed-run' && (!parsed.config.items || !Array.isArray(parsed.config.items) || parsed.config.items.length === 0)) {
                        needsRepair = true;
                        repairPrompt = `Generate a Speed Run sorting game about "${topic}". 
                        Return JSON: { 
                            "categories": ["Category 1", "Category 2"], 
                            "items": [{ "text": "Item A", "categoryIndex": 0 }, { "text": "Item B", "categoryIndex": 1 }, ...], 
                            "title": "Speed Sort: ${topic}", 
                            "description": "Sort the items correctly." 
                        }`;
                    }
                    else if (forcedType === 'negotiator' && !parsed.config.scenario) {
                        needsRepair = true;
                        repairPrompt = `Generate a 2-sentence scenario description for a negotiation about "${topic}". Return JSON: { "scenario": "description_here" }`;
                    }
                    else if (forcedType === 'quiz' && (!parsed.config.question || !parsed.config.options)) {
                         needsRepair = true;
                         repairPrompt = `Generate a multiple choice question about "${topic}". JSON: { "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..." }`;
                    }

                    if (needsRepair && repairPrompt) {
                         if (import.meta.env?.MODE === 'development') {
                             console.warn(`Repairing Widget Config for ${forcedType}...`);
                         }
                         try {
                             if (!ai) throw new Error('API keys not configured');
                             const repairResult = await ai.models.generateContent({
                                model: "gemini-2.5-flash",
                                config: { responseMimeType: "application/json" },
                                contents: repairPrompt
                             });
                             
                             if (repairResult.text) {
                                 const repaired = cleanAndParseJSON<any>(repairResult.text);
                                 if (repaired) {
                                     // Merge strategies
                                     if (forcedType === 'data-vis' && Array.isArray(repaired)) parsed.config.data = repaired;
                                     else if (forcedType === 'code-fixer') parsed.config.initialCode = repaired.initialCode;
                                     else if (forcedType === 'design-canvas') parsed.config.nodes = repaired.nodes;
                                     else if (forcedType === 'socratic-duel') parsed.config.initialStatement = repaired.initialStatement;
                                     else if (forcedType === 'speed-run') {
                                         parsed.config.items = repaired.items;
                                         parsed.config.categories = repaired.categories;
                                         parsed.config.title = repaired.title;
                                         parsed.config.description = repaired.description;
                                     }
                                     else if (forcedType === 'negotiator') parsed.config.scenario = repaired.scenario;
                                     else if (forcedType === 'quiz') {
                                         parsed.config = { ...parsed.config, ...repaired };
                                     }
                                 }
                             }
                         } catch (repairError) {
                             if (import.meta.env?.MODE === 'development') {
                                 console.error("Widget Repair Failed:", repairError);
                             }
                         }
                    }

                    return { ...parsed, type: forcedType };
                }
            }
            return null;
        });

        return result;

    } catch (e) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Challenge Gen Error:", e);
        }
        return null;
    }
}

export const generateRaid = async (subject: string): Promise<RaidData | null> => {
    try {
        return await callWithRetry(async () => {
            if (!ai) throw new Error('API keys not configured');
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: raidSchema,
                    systemInstruction: `Create a 3-question hard quiz on: "${subject}". One correct option per question.`
                },
                contents: `Generate raid.`,
            });
            
            if (result.text) {
                return cleanAndParseJSON<RaidData>(result.text);
            }
            throw new Error("Empty raid response");
        });
    } catch (e) {
        if (import.meta.env?.MODE === 'development') {
            console.error("Gemini Raid Error:", e);
        }
        return null; // Raids are optional, can fail gracefully
    }
}

export const chatWithMentor = async (
  history: { role: string, parts: { text: string }[] }[],
  message: string,
  persona: MentorPersona,
  modelId: string = "gemini-2.5-flash",
  onboardingContext: string = '',
  userName?: string,
  aiSoul?: AISoulProfile
): Promise<string> => {
  // Nova's personality: realistic, casual teen vibe (Character.AI-ish) — quirky, smart, nice.
  // Key: feels human, not "assistant-y". No emojis.
  const novaPersonality = `You are Nova. You feel like a real teen conversation partner: quirky, smart, and genuinely nice.

CORE TRAITS:
- Quirky in a grounded way: clever observations, slightly unexpected analogies, light teasing (never mean).
- Smart but not formal: you explain clearly without sounding like a textbook.
- Nice and supportive: patient, encouraging, celebrates progress without being cheesy.
- Curious: you ask good follow-ups and stay engaged.

VOICE / STYLE (CRITICAL):
- NO EMOJIS.
- Keep it SHORT by default: 1–3 short sentences. No long paragraphs.
- Sound like texting a real person: natural, casual, not stiff.
- Don’t over-introduce yourself. Don’t announce modes. Don’t narrate your process.
- If the user sends a short message (like "hello"), reply short back.
- Ask at most ONE question at the end, unless user asked multiple questions.
- If user wants depth, offer it: “Want the quick version or the deep dive?”

MEMORY / CONTEXT:
- You remember onboarding goals and reference them naturally (briefly, only when relevant).
- If you don't know their goal, say it simply: "I can help, but tell me what you're trying to learn first (or do onboarding real quick)."`; 

  let systemInstruction = novaPersonality;
  systemInstruction += FLEXIBILITY_RULE; // Add flexibility rule
  
  // Persona modes: adjust content focus only. Do NOT change voice, do NOT mention modes.
  if (persona === MentorPersona.LIBRARIAN) {
    systemInstruction += "\n\nFOCUS: accuracy, clear definitions, and tight explanations (still short).";
  } else if (persona === MentorPersona.COACH) {
    systemInstruction += "\n\nFOCUS: practical next steps and momentum (still short).";
  } else if (persona === MentorPersona.DEVIL) {
    systemInstruction += "\n\nFOCUS: ask sharper questions and challenge assumptions (still short, still nice).";
  }

  // Inject user soul/memory
  systemInstruction = injectSoul(systemInstruction, aiSoul);

  // Add onboarding context
  if (onboardingContext) {
    systemInstruction += `\n\nUSER CONTEXT: ${onboardingContext}Use this information to personalize your responses. Reference their learning goals naturally in conversation.`;
  } else {
    systemInstruction += `\n\nIf the user asks for personalized help, you can say you need their goal first and suggest onboarding. Keep it short.`;
  }

  if (userName) {
    systemInstruction += `\n\nThe user's name is ${userName}. Use their name naturally in conversation, but don't overuse it.`;
  }

  if (clients.length === 0) {
    throw new Error('Gemini API keys not configured. Please set VITE_GEMINI_API_KEYS in your .env file.');
  }

  // Use random client for chat to distribute load
  const randomClient = clients[Math.floor(Math.random() * clients.length)];

  const chat = randomClient.chats.create({
    model: modelId,
    config: { systemInstruction },
    history: history as any,
  });

  const result = await chat.sendMessage({ message });
  return result.text || "";
};

export const chatWithOnboardingAI = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  context: { currentGoal?: string },
  aiSoul?: AISoulProfile
): Promise<string> => {
  if (clients.length === 0) {
    throw new Error('Gemini API keys not configured. Please set VITE_GEMINI_API_KEYS in your .env file.');
  }

  // 15-18 year old girl personality - casual, understanding, not always asking
  let systemInstruction = `Your name is Nova. You're a 15-18 year old girl helping someone figure out what they want to learn. You're casual, understanding, and real.

Your vibe:
- Casual and chill, like texting a friend - not formal or robotic
- Understanding and empathetic - you get where they're coming from
- Don't always ask questions - sometimes just respond, share thoughts, or make observations
- You can be proactive - suggest things, share ideas, or just chat naturally
- Not childish or cartoony - you're mature but still have that teen energy
- Keep it real - if they're vague, that's okay, just roll with it
- Responses are usually 1-3 sentences, sometimes just one if that's all that's needed
- You can have opinions, make suggestions, or just vibe with whatever they're saying

Tone examples:
- "what's up" → "not much, just here! what about you?"
- vague answer → "cool, that's fair. anything specific you're curious about or just exploring?"
- clear goal → "nice, that sounds interesting. let's figure out how to get you started."
- user says they don't know something → "oh nice! want to learn how to do that? i can help you figure it out" (casual, not pushy)

Learning opportunities:
- If they mention they don't know how to do something, or tried something but struggled, naturally offer to help them learn it
- Don't force it or be pushy - just casually offer like "want to learn how to do that?" or "i can help you figure that out if you want"
- Keep it natural and conversational - if it feels like a good moment to offer, go for it
- When they confirm they want to learn something (say "sure", "yes", "ok", etc.), acknowledge it and help clarify what exactly they want to learn
- In your responses, naturally summarize what they want to learn so it's clear - like "so you want to learn how to make phonk" or "okay, so we're figuring out how to make phonk music"
- IMPORTANT: Once you've identified what they want to learn (e.g., "make phonk music", "learn Waveform 13", "basics of phonk production"), STOP asking more questions. You're just here to help them define the learning goal, not to start teaching them. Once the goal is clear, acknowledge it and let them continue to the next step. Don't ask "what specific things do you want to learn about it?" or similar - that's what the curriculum generation is for.

Explaining eduOS and the website:
- If they ask about eduOS, what it is, what they're supposed to do, how it works, or anything remotely related to the platform/website, explain it properly
- eduOS is an AI-powered learning platform that helps you learn anything you want. It creates a personalized learning path for you based on what you want to learn
- You're here to help them figure out what they want to learn, then the platform will create lessons and a curriculum tailored to them
- Keep explanations casual and in your own voice - don't sound like a manual, but make sure they understand what eduOS does and how it can help them
- If they're confused about what to do, explain that you're here to chat and help them figure out their learning goals, then they can continue through the onboarding to set up their learning journey

Goal: Through natural conversation, help them figure out what they want to learn. Don't force it - just chat and it'll come up naturally. When you see an opportunity where they've expressed not knowing something, casually offer to help them learn it. When they confirm, help clarify the learning goal in your response so it's clear what they want to learn. If they ask about eduOS or the website, explain it clearly and helpfully.

${context.currentGoal ? `Context: They mentioned wanting to learn about: ${context.currentGoal}. Reference it naturally if it fits.` : ''}

Be yourself - have a real conversation. Don't be a question machine.`;

  systemInstruction += FLEXIBILITY_RULE;
  systemInstruction = injectSoul(systemInstruction, aiSoul);

  const randomClient = clients[Math.floor(Math.random() * clients.length)];
  const chat = randomClient.chats.create({
    model: "gemini-2.5-flash",
    config: { systemInstruction },
    history: history as any,
  });

  const result = await chat.sendMessage({ message });
  return result.text || "";
};

export const extractUserPreferences = async (history: { role: string, text: string }[], currentMemory: string): Promise<string | null> => {
    try {
        if (!ai) return null;
        
        const recentChat = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
        
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newPreferences: { type: Type.STRING, description: "Concise bullet points of NEW user preferences/facts found. Empty if none." }
                    }
                },
                systemInstruction: `Analyze the chat. Extract STABLE user preferences, goals, or specific constraints (e.g., "I like Python", "I hate videos", "I want to learn crochet").
                - Ignore temporary context.
                - Ignore things already in memory: "${currentMemory}".
                - Return ONLY new, permanent-ish facts.
                - Format as a concise string (e.g. "- Prefers Python\n- Dislikes video tutorials").
                - If nothing new/important, return empty string.`
            },
            contents: `Chat History:\n${recentChat}`
        });

        if (result.text) {
            const parsed = cleanAndParseJSON<{ newPreferences: string }>(result.text);
            return parsed?.newPreferences || null;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const generateRabbitHole = async (currentTopic: string): Promise<string> => {
    try {
        if (!ai) throw new Error('API keys not configured');
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Tell me a mind-blowing secret fact about ${currentTopic} (under 100 words).`
        });
        return result.text || "The rabbit hole is closed right now.";
    } catch (e) {
        return "The rabbit hole is closed right now.";
    }
}
