'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ScenarioIdentity } from './ScenarioIdentity';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
} from '../types/conversation';
import { getScenarioPresentation } from '@/lib/presentation';
import type { AgentSignalSnapshot } from '@/lib/agent-signal';
import { EMPTY_INSPECTION, type InspectionSnapshot } from '@/lib/inspection';
import { DeveloperGuide } from './DeveloperGuide';
import { ScenarioInspector } from './ScenarioInspector';
import { ConversationPanel } from './agent-ui/conversation-panel';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import {
  QuickstartPreCallCard,
} from './QuickstartPreCallCard';
import { ConversationWorkspace } from './ConversationWorkspace';
import { ScenarioFaq } from './ScenarioFaq';

// Dynamically import the ConversationComponent with ssr disabled
const ConversationComponent = dynamic(() => import('./ConversationComponent'), {
  ssr: false,
});

// Dynamically import AgoraRTCProvider (browser-only).
// The AgoraVoiceAI toolkit is initialized inside ConversationComponent after
// the RTC join succeeds, so this wrapper only needs to provide the RTC client.
const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        // useRef persists across StrictMode's simulated unmount/remount, so only
        // one RTC client is ever created per session (useMemo creates two in StrictMode).
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

const SESSION_LIMIT_MS = 10 * 60 * 1000;

export default function LandingPage() {
  const scenario = getScenarioPresentation();
  const [showConversation, setShowConversation] = useState(false);
  const [activity, setActivity] = useState<AgentSignalSnapshot>({
    state: 'idle',
    micEnabled: false,
  });
  const [inspection, setInspection] =
    useState<InspectionSnapshot>(EMPTY_INSPECTION);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [outcome, setOutcome] = useState('');

  // Preload heavy modules on mount so they're already cached when the user
  // clicks the start button — eliminates the ~1.8s dynamic-import delay.
  useEffect(() => {
    import('./ConversationComponent').catch(() => {});
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endedByTimeout, setEndedByTimeout] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(SESSION_LIMIT_MS / 1000);
  const stopInFlight = useRef(false);

  const handleStartConversation = async () => {
    if (isLoading || showConversation) return;
    setIsLoading(true);
    setActivity({ state: 'connecting', micEnabled: false });
    setInspection({
      ...EMPTY_INSPECTION,
      lifecycle: 'starting',
      startedAt: Date.now(),
    });
    setOutcome('');
    setEnded(false);
    setEndedByTimeout(false);
    setSessionTimeRemaining(SESSION_LIMIT_MS / 1000);
    setError(null);
    setAgentJoinError(false);

    try {
      // 1. Fetch RTC token + channel
      // console.log('Fetching Agora token...');
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();
      // console.log('Agora token response: uid =', responseData.uid, 'channel =', responseData.channel);

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      // 2. Run agent invite and RTM setup in parallel — both only need the token response.
      //    RTM must be ready before ConversationComponent mounts so AgoraVoiceAI
      //    can subscribe immediately. Agent invite is non-fatal.
      const [agentData, rtm] = await Promise.all([
        // 2a. Start the AI agent
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
          } as ClientStartRequest),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),

        // 2b. Set up RTM (dynamically imported to keep it client-only)
        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          // console.log('RTM ready, channel:', responseData.channel);
          return rtm;
        })(),
      ]);

      // 3. All dependencies ready — store state and show conversation
      setRtmClient(rtm);
      setAgoraData({
        ...responseData,
        agentId: agentData?.agent_id,
        startedAt: Date.now(),
      });
      setShowConversation(true);
    } catch (err) {
      setActivity({ state: 'error', micEnabled: false });
      setInspection((previous) => ({
        ...previous,
        lifecycle: 'error',
        agentState: 'error',
        events: [
          {
            id: 'startup-error',
            time: Date.now(),
            kind: 'error',
            label: 'Could not start voice conversation',
            detail: 'Check the server configuration and try again.',
          },
        ],
      }));
      setError(
        'Could not connect to ' + scenario.name + '. Please try again.',
      );
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) {
          throw new Error('Missing channel for token renewal');
        }

        // RTC and RTM tokens are renewed independently:
        //   - RTC uses the browser client's assigned UID (passed in from ConversationComponent).
        //   - RTM uses the same UID that was used during RTM login (agoraData.uid).
        // Both are fetched in parallel to stay within the token-expiry grace-period window.
        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(
            `/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`,
          ),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = useCallback(async () => {
    if (stopInFlight.current) return;
    stopInFlight.current = true;
    setEnding(true);
    setError(null);
    try {
      if (agoraData?.agentId) {
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        const result = await response.json();
        if (!response.ok || result.success !== true)
          throw new Error('Agent stop failed');
      }
      await rtmClient
        ?.logout()
        .catch((err) => console.error('RTM logout error:', err));
      setRtmClient(null);
      setAgoraData(null);
      setShowConversation(false);
      setActivity({ state: 'ended', micEnabled: false });
      setInspection((previous) => ({
        ...previous,
        lifecycle: 'ended',
        agentState: 'ended',
        micEnabled: false,
        transport: 'DISCONNECTED',
        endedAt: Date.now(),
        events: [
          ...previous.events,
          {
            id: `session-ended-${Date.now()}`,
            time: Date.now(),
            kind: 'transport' as const,
            label: 'Session ended',
          },
        ].slice(-100),
      }));
      setEndedByTimeout(
        agoraData?.startedAt != null &&
          Date.now() >= agoraData.startedAt + SESSION_LIMIT_MS,
      );
      setEnded(true);
    } catch (err) {
      console.error('Error ending voice session:', err);
      setError(
        'Could not end the conversation. Your session is still open. Try ending it again.',
      );
    } finally {
      stopInFlight.current = false;
      setEnding(false);
    }
  }, [agoraData, rtmClient]);

  useEffect(() => {
    if (!showConversation || agoraData?.startedAt == null) return;

    const deadline = agoraData.startedAt + SESSION_LIMIT_MS;
    let nextAttemptAt = deadline;
    const checkDeadline = () => {
      const now = Date.now();
      setSessionTimeRemaining(Math.max(0, Math.ceil((deadline - now) / 1000)));
      if (now < nextAttemptAt || stopInFlight.current) return;
      // Retry failed stops without flooding the endpoint. Wall time also
      // catches overdue sessions when a background tab becomes active again.
      nextAttemptAt = now + 5000;
      void handleEndConversation();
    };
    const timer = window.setInterval(checkDeadline, 1000);
    document.addEventListener('visibilitychange', checkDeadline);
    window.addEventListener('focus', checkDeadline);
    checkDeadline();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', checkDeadline);
      window.removeEventListener('focus', checkDeadline);
    };
  }, [showConversation, agoraData, handleEndConversation]);

  return (
    <div className="demo-shell">
      <Dialog>
        <ScenarioIdentity
          scenario={scenario}
          onInspect={() => setInspectorOpen(true)}
          onBuild={() => setBuildOpen(true)}
        />
        <ScenarioFaq />
      </Dialog>
      <ConversationWorkspace
        scenario={scenario}
        activity={
          agentJoinError
            ? { state: 'error', micEnabled: activity.micEnabled }
            : activity
        }
        inspection={inspection}
      >
        {ended ? (
          <section className="demo-session demo-session-ended">
            <div className="demo-session-heading">
              <div>
                <h2>Session ended.</h2>
                {endedByTimeout && (
                  <p className="demo-note" role="status">
                    Your 10-minute session has ended. Start again to continue.
                  </p>
                )}
              </div>
            </div>
            <ConversationPanel
              id="last-session-transcript"
              name={scenario.name}
              messages={inspection.messages}
              pending={false}
              voiceState="ended"
              className="demo-conversation"
            />
            <div className="demo-ended-actions">
              <Button onClick={handleStartConversation}>Start again</Button>
            </div>
          </section>
        ) : !showConversation ? (
          <QuickstartPreCallCard
            scenario={scenario}
            isLoading={isLoading}
            error={error}
            onStart={handleStartConversation}
          />
        ) : agoraData && rtmClient ? (
          <Suspense fallback={<LoadingSkeleton />}>
            <ErrorBoundary
              fallback={
                <div className="demo-workspace-fallback" role="alert">
                  <p>Could not load the voice session.</p>
                  <Button
                    variant="outline"
                    disabled={ending}
                    onClick={handleEndConversation}
                  >
                    End conversation
                  </Button>
                </div>
              }
            >
              <AgoraProvider>
                <ConversationComponent
                  agoraData={agoraData}
                  rtmClient={rtmClient}
                  onTokenWillExpire={handleTokenWillExpire}
                  onEndConversation={handleEndConversation}
                  onActivityChange={setActivity}
                  onInspectionChange={setInspection}
                  ending={ending}
                  sessionTimeRemaining={sessionTimeRemaining}
                  startupError={
                    agentJoinError
                      ? `Could not start ${scenario.name}. End this session and try again.`
                      : undefined
                  }
                  feedback={
                    <>
                      {agentJoinError && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            The assistant could not connect. End this session and try again.
                          </AlertDescription>
                        </Alert>
                      )}
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {error}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              disabled={ending}
                              onClick={handleEndConversation}
                            >
                              Retry ending session
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  }
                />
              </AgoraProvider>
            </ErrorBoundary>
          </Suspense>
        ) : (
          <p className="demo-workspace-fallback" role="alert">
            Could not load the voice session.
          </p>
        )}
      </ConversationWorkspace>
      <ScenarioInspector
        scenario={scenario}
        snapshot={inspection}
        outcome={outcome}
        onOutcomeChange={setOutcome}
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
      />
      <DeveloperGuide
        scenario={scenario}
        open={buildOpen}
        onOpenChange={setBuildOpen}
      />
    </div>
  );
}
