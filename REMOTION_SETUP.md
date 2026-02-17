# Remotion Video Creation Setup

Remotion has been successfully installed and configured in your eduOS project! 🎬

## Quick Start

### 1. Start Remotion Studio
```bash
npm run remotion
```

This will open the Remotion Studio in your browser where you can:
- Preview your videos
- Edit compositions
- Render videos

### 2. Available Video Templates

#### MyVideo
A simple welcome video template with animated title and subtitle.

#### LessonIntroVideo
An educational video template perfect for lesson introductions with:
- Animated title
- Topic badge
- Description text

## Creating New Videos

### Step 1: Create a Video Component
Create a new file in `src/` (e.g., `src/MyNewVideo.tsx`):

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const MyNewVideo: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#0a0a0a',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: 'white', opacity }}>{title}</h1>
    </AbsoluteFill>
  );
};
```

### Step 2: Register in Root.tsx
Add your composition to `src/Root.tsx`:

```tsx
<Composition
  id="MyNewVideo"
  component={MyNewVideo}
  durationInFrames={300}
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    title: 'My Video Title',
  }}
/>
```

### Step 3: Preview in Studio
Run `npm run remotion` and select your composition from the list.

## Rendering Videos

### Render via CLI
```bash
npm run remotion:render
```

Or use the Remotion Studio UI to render videos with custom settings.

## Documentation

- [Remotion Docs](https://www.remotion.dev/docs)
- [Remotion API Reference](https://www.remotion.dev/docs)

## Tips

1. **Use Remotion Studio** for the best development experience - it provides a timeline, preview, and easy parameter editing
2. **Frame-based animations** - Remotion uses frames instead of time, so `useCurrentFrame()` gives you the current frame number
3. **Interpolate for smooth animations** - Use `interpolate()` to create smooth transitions between values
4. **Compositions are reusable** - Create parameterized videos that can be rendered with different props

## Example Use Cases for eduOS

- Lesson introduction videos
- Tutorial walkthroughs
- Achievement celebration videos
- Progress summary videos
- Educational explainer videos
- The `EduosVideo` composition stitches five scenes together:
  1. **Title Scene:** Nova + eduOS hero headline
  2. **Command Center Scene:** Mentor Core highlights, Nova stability
  3. **Highlights Scene:** Rotating feature list showcasing every capability
  4. **Infrastructure Scene:** Tech stack / Gemini + Firebase / Remotion
  5. **Closing Scene:** Tagline and recap

  Use this composition to render a full “everything about eduOS” showcase.