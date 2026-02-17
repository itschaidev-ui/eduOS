# Polishing Notes & Recent Updates

## AI Soul & Memory System (Latest Major Update)

### Core Features
- **Model Upgrade**: Standardized on `gemini-2.5-flash` for all AI operations (Mentor, Lesson Generation, Onboarding) to improve reasoning and speed.
- **Flexibility Protocol**: Implemented a strict "No Refusal" policy for practical tasks. The AI will now provide step-by-step guides for physical tasks (crochet, cooking, etc.) instead of refusing due to being a digital entity.
- **User "Soul" Profile**:
  - **Soul Prompt**: Users can define the AI's personality (e.g., "Strict Sensei", "Pirate Captain").
  - **Long-Term Memory**: A persistent notes field where the AI stores facts about the user.
  - **Help Style**: Users can specify how they want to be helped (e.g., "Socratic", "Code-heavy").
- **Evolving Memory**: The Mentor Chat now analyzes conversation history every 3 turns to automatically extract and save new user preferences to the Long-Term Memory.

### Implementation Details
- **Settings UI**: Added a "Neural Personality" section in the Settings modal for manual editing of the AI profile.
- **Persistence**: Profile data is saved in Firestore (`users/{uid}`) and mirrored in Local Storage for guest/offline support.
- **Context Injection**: The AI profile is dynamically injected into system instructions for every chat and lesson generation request.

## Future Polishing & TODOs

### AI & Personalization
- [ ] **Memory Pruning**: Implement a strategy to summarize or prune `memoryNotes` as they grow too large for the context window.
- [ ] **Voice Personality**: Tie the "Soul Prompt" to specific TTS voice settings if voice output is expanded.
- [ ] **Topic-Specific Personas**: Allow different personas for different subjects (e.g., "Math Professor" vs. "Art Critic").

### UI/UX
- [ ] **Mobile Optimization**: Further refine the Settings modal and Chat interface for smaller screens.
- [ ] **Visual Feedback**: Add subtle animations when the "Memory Evolved" background process triggers.
- [ ] **Onboarding Integration**: Ask for basic "Soul" preferences (like "How do you like to learn?") during the initial onboarding flow.

### Codebase
- [ ] **Type Safety**: Stricter typing for the `aiSoul` object across all components.
- [ ] **Error Handling**: Add more robust error recovery if the `extractUserPreferences` call fails or times out.
- [ ] **Testing**: Add unit tests for the `injectSoul` and `inferMoodFromUserText` functions.
