# Frontend architecture

## Component tree

```
App.tsx
├── Sidebar.tsx          # Logo, nav, example cards, theme toggle
├── TopBar.tsx           # Search, model, latency, tokens, profile
├── ChatPanel.tsx        # Messages, input, typing, follow-ups
│   ├── PipelineViz.tsx  # RAG stage timeline
│   └── DebugPanel.tsx   # Prompt / scores (debug mode)
└── SourcePanel.tsx      # Collapsible source cards + filter
```

## Stack

| Layer | Choice |
|-------|--------|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 (dark mode class) |
| Motion | Framer Motion |
| Icons | Lucide React |
| Build | Vite 6 |
| API | REST + SSE (`/api/chat/stream`) |

## Design tokens

- Primary: teal → blue gradient
- Surfaces: white / `#0f1419` dark
- Confidence: emerald (high), amber (medium), slate (low)
- Effects: glass panels, soft shadows, 12px radii

## Data flow

1. User sends message → `streamChat()` SSE
2. Meta event → sources, pipeline metrics, confidence, follow-ups
3. Token events → streamed answer text
4. Source click → highlights active chunk card
