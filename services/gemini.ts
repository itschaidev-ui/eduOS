import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContentMode, LessonContent, MentorPersona, CurriculumOption, KnowledgeNode, RaidData, ChaosBattle } from "../types";

// Helper to get API Key from various environment variable formats (Vite, CRA, Standard)
const getApiKey = () => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_API_KEY;
    }
    // Fallback keys provided by user
    const keys = [
        "AIzaSyCfQOG3Y_sjnpjaUflKhYdB7F-N_V-32I8",
        "AIzaSyB_gsYSWHHeIl2s1AwsG8Sj0FZrt92gIJI"
    ];
    return keys[Math.floor(Math.random() * keys.length)];
};

const apiKey = getApiKey();
// We will create specific clients for cross-checking
const keys = [
    "AIzaSyCfQOG3Y_sjnpjaUflKhYdB7F-N_V-32I8",
    "AIzaSyB_gsYSWHHeIl2s1AwsG8Sj0FZrt92gIJI"
];
const clients = keys.map(k => new GoogleGenAI({ apiKey: k }));
const ai = clients[0]; // Default client

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
        console.error("JSON Parse Error:", e);
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
            console.warn(`API Issue (${error.message}). Retrying in ${delay}ms...`);
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
    console.log("🚀 Initiating Acceleration Plan: Cross-Check Mode");

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
                model: "gemini-2.0-flash-exp",
                ...variantConfig
            }).then(res => res.text).catch(e => {
                console.warn(`Provider ${index} failed:`, e);
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
                 model: "gemini-2.0-flash-exp",
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
        console.error("Cross-check failed, falling back to single stream:", error);
        // Fallback to single stream immediately if fancy logic fails
        try {
             const fallbackClient = clients[0];
             const fallbackResult = await fallbackClient.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
    console.warn("Using Fallback Graph for:", title);
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
    try {
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

            // Fallback to single stream if cross-check failed or returned null internally
            const singleResult = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: curriculumOptionsSchema,
                    systemInstruction: "You are the Curriculum Architect. Generate 4 distinct learning paths."
                },
                contents: `User Goal: "${goal}". Time: ${timeConstraints}.`,
            });
    
            if (singleResult.text) {
                const parsed = cleanAndParseJSON<CurriculumOption[]>(singleResult.text);
                return parsed || [];
            }
            throw new Error("Empty response");
        });
    } catch (error) {
        console.error("Gemini Curriculum Gen Error:", error);
        return [
            { id: 'c1', title: 'Foundations', description: 'Academic approach.', estimatedWeeks: 8, tags: ['Academic', 'Slow'] },
            { id: 'c2', title: 'Quick Start', description: 'Practical basics.', estimatedWeeks: 4, tags: ['Practical', 'Fast'] }
        ];
    }
};

export const generateKnowledgeGraph = async (curriculumTitle: string, userGoal: string): Promise<KnowledgeNode[]> => {
    // 1. Try API Generation with Retry
    try {
        return await callWithRetry(async () => {
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
        console.error("Gemini Graph Gen Error (Falling back to local):", error);
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
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
        console.error("Expansion failed:", e);
        return [];
    }
};

export const generateChaosBattle = async (curriculumTitle: string): Promise<ChaosBattle | null> => {
    try {
        return await callWithRetry(async () => {
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
        console.error("Chaos Gen Error:", e);
        return null;
    }
}

export const generateLesson = async (topic: string, context: string, mode: ContentMode, isFirstLesson: boolean = false): Promise<LessonContent | null> => {
  try {
    return await callWithRetry(async () => {
        // Use Cross-Check for Lessons to ensure depth and accuracy
        const result = await generateWithCrossCheck<LessonContent>({
            config: {
                responseMimeType: "application/json",
                responseSchema: lessonSchema,
                systemInstruction: `Expert Tutor. Context: "${context}". Topic: "${topic}".
              
              STRICTLY STAY ON TOPIC. Provide detailed, educational content.
              
              INTERACTIVE TRIGGERS:
              Instead of a single quiz at the end, insert 'interactive_trigger' sections WHEREVER appropriate in the flow (e.g. after explaining a key concept).
              - For 'interactive_trigger', provide a 'triggerContext' (what did they just learn?) and a suggested 'triggerArchetype'.
              - Archetypes: 'Debugger' (Code), 'Architect' (System Design), 'Skeptic' (Debate), 'SpeedRun' (Quick Recall), 'Analyst' (Data), 'Negotiator' (Persuasion).
              
              Mode: ${mode}.
              ${isFirstLesson ? "No summary." : "Include short summary."}
              `
            },
            contents: `Teach ${topic}`,
        }, "Combine these lessons. Ensure 2-3 interactive triggers are placed naturally within the content.", lessonSchema);

        if (result) return result;

        const singleResult = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          config: {
            responseMimeType: "application/json",
            responseSchema: lessonSchema,
            systemInstruction: `Expert Tutor. Context: "${context}". Topic: "${topic}".
          
          STRICTLY STAY ON TOPIC. Provide detailed, educational content.
          
          INTERACTIVE TRIGGERS:
          Insert 'interactive_trigger' sections WHEREVER appropriate.
          - 'triggerContext': summary of preceding concept.
          - 'triggerArchetype': 'Debugger' | 'Architect' | 'Skeptic' | 'SpeedRun' | 'Analyst' | 'Negotiator'.
          
          Mode: ${mode}.
          ${isFirstLesson ? "No summary." : "Include short summary."}
          `
          },
          contents: `Teach ${topic}`,
        });
    
        if (singleResult.text) {
          return cleanAndParseJSON<LessonContent>(singleResult.text);
        }
        throw new Error("Empty lesson response");
    });
  } catch (error) {
    console.error("Gemini Lesson Gen Error (Using fallback):", error);
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
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
                         console.warn(`Repairing Widget Config for ${forcedType}...`);
                         try {
                             const repairResult = await ai.models.generateContent({
                                model: "gemini-2.0-flash-exp",
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
                             console.error("Widget Repair Failed:", repairError);
                         }
                    }

                    return { ...parsed, type: forcedType };
                }
            }
            return null;
        });

        return result;

    } catch (e) {
        console.error("Challenge Gen Error:", e);
        return null;
    }
}

export const generateRaid = async (subject: string): Promise<RaidData | null> => {
    try {
        return await callWithRetry(async () => {
            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
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
        console.error("Gemini Raid Error:", e);
        return null; // Raids are optional, can fail gracefully
    }
}

export const chatWithMentor = async (
  history: { role: string, parts: { text: string }[] }[],
  message: string,
  persona: MentorPersona,
  modelId: string = "gemini-2.0-flash-exp"
): Promise<string> => {
  try {
    let systemInstruction = "You are a helpful AI tutor. Keep responses concise.";
    if (persona === MentorPersona.LIBRARIAN) systemInstruction = "You are The Librarian. Precise, neutral, factual.";
    if (persona === MentorPersona.COACH) systemInstruction = "You are The Coach. High energy, motivational, firm.";
    if (persona === MentorPersona.DEVIL) systemInstruction = "You are The Devil's Advocate. Skeptical, challenging.";

    // Use random client for chat to distribute load
    const randomClient = clients[Math.floor(Math.random() * clients.length)];

    const chat = randomClient.chats.create({
      model: modelId,
      config: { systemInstruction },
      history: history as any,
    });

    const result = await chat.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "The neural link is experiencing static (Rate Limited). Please try again in a moment.";
  }
};

export const generateRabbitHole = async (currentTopic: string): Promise<string> => {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: `Tell me a mind-blowing secret fact about ${currentTopic} (under 100 words).`
        });
        return result.text || "The rabbit hole is closed right now.";
    } catch (e) {
        return "The rabbit hole is closed right now.";
    }
}
