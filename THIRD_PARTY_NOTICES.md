# Third-party notices

## UI source and adaptations

Source: https://github.com/shczhen/agent-ui, Agora Glass system.

Copied from the actual vendored components and theme in scenario 01 on 2026-10-21. Scenario 01 records its original adoption at revision `29d3aa3ed9e1a4d2cd5fcc1747689e3bc2915e2d`; no fresh upstream revision or license audit is claimed.

Reused source includes Dialog, Tabs, Button, Alert, Message, Bubble, Tooltip, Empty, Status, VoiceDock, GlassSurface, ConversationPanel, control-light, theme tokens and recipes. The application-owned AgentSignal canvas uses semantic state and measured track amplitude.

Adaptations: scenario-specific content and start actions; real session callbacks, microphone/device selection, live transcript and Inspector. The Tailwind 4/PostCSS configuration follows scenario 01. Typography uses the system fallback; existing UI source attribution and repository licenses remain in place.

## Typography

The interface uses the installed Helvetica Neue font when available, followed by the browser’s sans-serif fallback. This repository does not bundle or download font files. Rendering can vary by operating system.
