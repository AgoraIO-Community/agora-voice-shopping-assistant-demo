import type { ScenarioPresentation } from '@/types/presentation';
export type { ScenarioPresentation } from '@/types/presentation';

export const presentation: ScenarioPresentation = {
  "id": "10-voice-shopping",
  "name": "Voice Shopping Assistant",
  "purpose": "Find and compare products from real stores",
  "summary": "Describe what you need, compare products, and get recommendations through natural conversation.",
  "featuresHeading": "In this conversation",
  "features": [
    {
      "emoji": "💬",
      "title": "Live product discovery"
    },
    {
      "emoji": "🎙️",
      "title": "Budget-aware comparisons"
    },
    {
      "emoji": "📝",
      "title": "Merchant guidance"
    }
  ],
  "builtWith": [
    "Agora Conversational AI",
    "Agents SDK",
    "Next.js",
    "Shopify Catalog"
  ],
  "startLabel": "Start voice shopping",
  "boundaryShort": "Live product discovery. Complete any purchase on the merchant website.",
  "outcomes": [
    {
      "id": "helpful",
      "label": "The conversation helped"
    },
    {
      "id": "needs-guidance",
      "label": "I need more guidance"
    }
  ],
  "developer": {
    "sourceUrl": "https://github.com/AgoraIO-Community/agora-voice-shopping-assistant-demo",
    "runCommand": "pnpm install --frozen-lockfile\npnpm run doctor\npnpm run dev",
    "skillsCommand": "npx skills add github:AgoraIO/skills",
    "assistantPrompt": "Work in this existing Voice Shopping Assistant voice demo. Preserve Agora RTC/RTM lifecycle, read-only Shopify Catalog tools and the usage FAQ. Keep the page focused on voice conversations, product queries uncached and credentials server-only. Preserve the built-in static waiting fillers and disabled simulated cart/order routes. Do not add persistence or payment collection.",
    "docsUrl": "https://docs.agora.io/en/ai/build/build-server-client",
    "sdkUrl": "https://www.npmjs.com/package/agora-agents",
    "consoleUrl": "https://console.agora.io/",
    "cliUrl": "https://github.com/AgoraIO/cli",
    "skillsUrl": "https://github.com/AgoraIO/skills",
    "extensionPoints": [
      {
        "title": "Change the conversation",
        "path": "lib/agent-config.ts"
      },
      {
        "title": "Configure Shopify Catalog",
        "path": "lib/shopify-config.ts"
      },
      {
        "title": "Choose models and voice",
        "path": "lib/runtime-profile.ts"
      },
      {
        "title": "Adapt scenario UI copy",
        "path": "lib/presentation.ts"
      }
    ]
  }
};

export function getScenarioPresentation(): ScenarioPresentation { return presentation; }
