'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { ScenarioPresentation } from '@/lib/presentation';

function CopyText({ text, label }: { text: string; label: string }) {
  const [result, setResult] = useState('');
  return (
    <div className="demo-copy">
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setResult('Copied');
          } catch {
            setResult('Select the text to copy it.');
          }
        }}
      >
        {result === 'Copied' ? (
          <Check data-icon="inline-start" />
        ) : (
          <Copy data-icon="inline-start" />
        )}
        {label}
      </Button>
      <span role="status">{result}</span>
    </div>
  );
}

export function DeveloperGuide({
  scenario,
  open,
  onOpenChange,
}: {
  scenario: ScenarioPresentation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const d = scenario.developer;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="demo-build-dialog">
        <DialogHeader>
          <DialogTitle>Make this scenario your own</DialogTitle>
          <DialogDescription>
            Integrate {scenario.name} with help from an AI coding assistant,
            or follow the steps yourself.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="assistant">
          <TabsList variant="line" aria-label="Ways to integrate this scenario">
            <TabsTrigger value="assistant">Integrate with AI</TabsTrigger>
            <TabsTrigger value="manual">Integrate it yourself</TabsTrigger>
            <TabsTrigger value="stack">Under the hood</TabsTrigger>
          </TabsList>
          <TabsContent value="assistant" className="demo-build-content">
            <h3>Let your AI coding assistant guide the integration</h3>
            <p>
              Copy this prompt into your AI coding assistant. It will use Agora
              CLI to set up this scenario, guide you through project selection
              and credentials, and help you run and test it locally.
            </p>
            <CopyText text={d.assistantPrompt} label="Copy integration prompt" />
            <pre tabIndex={0} className="demo-integration-prompt">
              <code>{d.assistantPrompt}</code>
            </pre>
            <a href={d.cliUrl} target="_blank" rel="noopener noreferrer">
              About Agora CLI <ArrowUpRight aria-hidden="true" />
            </a>
          </TabsContent>
          <TabsContent value="manual" className="demo-build-content">
            <h3>Set up and integrate the scenario yourself</h3>
            <p>
              Follow these steps to create a working app, then adapt its
              conversation and UI for your product. Requires Node.js 24,
              pnpm 9.15.9, and an Agora project with Conversational AI enabled.
            </p>
            <h3>1. Create the app</h3>
            <CopyText text={d.createCommand} label="Copy create commands" />
            <pre tabIndex={0}><code>{d.createCommand}</code></pre>
            <h3>2. Configure credentials</h3>
            <p>
              Copy <code>env.local.example</code> to <code>.env.local</code> and
              enter your Agora project credentials. Keep the App Certificate
              server-side.
            </p>
            <CopyText text="cp env.local.example .env.local" label="Copy configuration command" />
            <pre tabIndex={0}><code>cp env.local.example .env.local</code></pre>
            <p>Set these values in <code>.env.local</code>:</p>
            <pre tabIndex={0}><code>{`NEXT_PUBLIC_AGORA_APP_ID=your_app_id
NEXT_AGORA_APP_CERTIFICATE=your_app_certificate`}</code></pre>
            {d.configurationNote && <p>{d.configurationNote}</p>}
            <h3>3. Install and start</h3>
            <CopyText text={d.runCommand} label="Copy startup commands" />
            <pre tabIndex={0}><code>{d.runCommand}</code></pre>
            <p>
              Open the local URL shown in your terminal, allow microphone
              access, and try:
            </p>
            <blockquote>{d.testRequest}</blockquote>
            <p>
              Use Under the hood to find the conversation, model and UI files
              to customize. For integration details, follow the Build guide below.
              {scenario.boundaryShort}
            </p>
          </TabsContent>
          <TabsContent value="stack" className="demo-build-content">
            <h3>From your application to a voice response</h3>
            <dl className="demo-stack">
              <div>
                <dt>Agora Agents SDK</dt>
                <dd>
                  Creates and stops the server-side agent; configures
                  instructions, models, voice and tools.
                </dd>
              </div>
              <div>
                <dt>Web RTC + Signaling</dt>
                <dd>
                  Carry live audio, transcripts, Agent activity and reported
                  timing events.
                </dd>
              </div>
              <div>
                <dt>Client Toolkit + UIkit</dt>
                <dd>
                  Connect session events to the conversation, controls and
                  Inspector.
                </dd>
              </div>
            </dl>
            <h3>Change one thing at a time</h3>
            <ul className="demo-extension-list">
              {d.extensionPoints.map((point) => (
                <li key={point.path}>
                  <span>{point.title}</span>
                  <code>{point.path}</code>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
        <nav
          className="demo-developer-links"
          aria-label="Agora developer resources"
        >
          <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source <ArrowUpRight aria-hidden="true" />
          </a>
          <a href={d.docsUrl} target="_blank" rel="noopener noreferrer">
            Build guide <ArrowUpRight aria-hidden="true" />
          </a>
          <a href={d.sdkUrl} target="_blank" rel="noopener noreferrer">
            Agents SDK <ArrowUpRight aria-hidden="true" />
          </a>
          <a href={d.consoleUrl} target="_blank" rel="noopener noreferrer">
            Agora Console <ArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
