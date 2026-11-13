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
    "assistantPrompt": "Help me create and run the Voice Shopping Assistant using Agora CLI.\n\nCheck that Agora CLI is installed and ready. If installation or an upgrade is needed, ask before proceeding. Guide me through browser login when required.\n\nGet the recipe details:\nagora recipes show agora-voice-shopping-assistant-demo --json\n\nRead its implementation guide:\nhttps://raw.githubusercontent.com/AgoraIO-Community/agora-voice-shopping-assistant-demo/main/RECIPE.md\n\nReference source:\nhttps://github.com/AgoraIO-Community/agora-voice-shopping-assistant-demo\n\nBefore initialization, confirm which Agora project to use. Ask before creating a new Agora project.\n\nInitialize the app in a new or empty directory. Replace <confirmed-project-id> with the actual ID of the project confirmed above before running:\nagora init my-shopping-app --recipe agora-voice-shopping-assistant-demo --project <confirmed-project-id> --json\n\nLet the CLI configure the credentials. Never print the App Certificate in chat or expose it in browser code.\n\nFollow the returned nextSteps to install dependencies and start the app. Help diagnose and resolve any errors.\n\nProvide the local URL and guide me through microphone access. Help me test this request:\n\"Find running shoes under $100 that ship to the United States.\"\n\nReport what was verified and what still needs testing. Follow the capabilities and limits in the implementation guide; do not claim external actions were completed without verification.",
    "docsUrl": "https://docs.agora.io/en/ai/build/build-server-client",
    "sdkUrl": "https://github.com/AgoraIO/agora-agents-ts",
    "consoleUrl": "https://console.agora.io/",
    "cliUrl": "https://github.com/AgoraIO/cli",
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
    ],
    "createCommand": "npx agora-voice-shopping-assistant-demo@latest my-shopping-app\ncd my-shopping-app",
    "testRequest": "Find running shoes under $100 that ship to the United States.",
    "configurationNote": "Optional Shopify settings can remain empty for a limited anonymous trial."
  }
};

export function getScenarioPresentation(): ScenarioPresentation { return presentation; }
