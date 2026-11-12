'use client';

import { Loader2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import type { ScenarioPresentation } from '@/lib/presentation';

function ScenarioFeatures({ scenario }: { scenario: ScenarioPresentation }) {
  return (
    <>
      {scenario.features.length ? (
        <section
          className="demo-features"
          aria-label={scenario.featuresHeading}
        >
          <h3>
            <span className="demo-feature-comparison">
              {scenario.featuresHeading}
            </span>
          </h3>
          <ul>
            {scenario.features.map((feature) => (
              <li key={feature.title}>
                <span className="demo-feature-emoji" aria-hidden="true">
                  {feature.emoji}
                </span>
                {feature.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="demo-built-with">
        <span>Built with</span>
        <ul aria-label="Technology stack">
          {scenario.builtWith.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function QuickstartPreCallCard({
  scenario,
  isLoading,
  disabled = false,
  error,
  onStart,
}: {
  scenario: ScenarioPresentation;
  isLoading: boolean;
  disabled?: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <section className="demo-welcome">
      <h2>{scenario.name}</h2>
      <p className="demo-lead">{scenario.summary}</p>
      <ScenarioFeatures scenario={scenario} />
      <div className="demo-welcome-actions">
        <Button
          size="lg"
          disabled={isLoading || disabled}
          aria-busy={isLoading}
          onClick={onStart}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Mic data-icon="inline-start" />
          )}
          {isLoading ? 'Connecting…' : scenario.startLabel}
        </Button>
      </div>
      <p className="demo-note">Microphone access required. Sessions end automatically after 10 minutes.</p>
      <p className="demo-note">{scenario.boundaryShort}</p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
