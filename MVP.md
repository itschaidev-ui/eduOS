# Eduos MVP Scope & Shipable Checklist

## MVP Scope

### Raid MVP
- **Single-session quiz:** Works start to finish.
- **Votes:** Local only (no multiplayer sync).
- **Persistence:** None for raid XP or results.
- **Lobby:** No live lobby.
- **Goal:** User can do a "Raid" solo or with a mock squad experience.

### Coop MVP
- **Teams:** Create, join, and delete works (Firestore + Guest localStorage).
- **Dashboard:** Lists members, shows team name/code.
- **Raid Entry:** Captain can deploy squad (including solo).
- **Missing:** Member presence (online/offline), Scribe/Skeptic roles, Weekly goal progress.
- **Goal:** Users can create a squad, join, and enter a raid session.

### App MVP
- **Core:** Auth, onboarding, dashboard, knowledge map, lessons, Mentor chat, content modes, XP/streak/momentum.
- **Persistence:** Firestore + localStorage.
- **Missing:** Daily quests full tracking, full raid/coop sync.
- **Goal:** App is functional, shows the "Eduos experience," and can demo to users.

---

## Shipable State Checklist

### Raid
- [x] Solo Raid works start → finish
- [x] Boss health and round results show correctly
- [x] Question and options display correctly
- [x] 15s timer works

### Coop
- [x] Team creation/join/delete works
- [x] Captain can deploy squad into raid (Solo or Multi)
- [x] Dashboard shows current team members

### App
- [x] Auth works (Google + Guest)
- [x] Lessons / knowledge map / Mentor chat basic functionality
- [x] XP/streak/momentum updates correctly
- [x] No crashes on key flows

---

## Phase 2 / Future Enhancements (Post-MVP)

- Real-time multiplayer vote sync
- Raid XP persistence and leaderboards
- Live raid lobby / join link auto-join
- Presence indicators and Scribe/Skeptic role logic
- Weekly goal progress and completion tracking
- Daily quests full wiring
