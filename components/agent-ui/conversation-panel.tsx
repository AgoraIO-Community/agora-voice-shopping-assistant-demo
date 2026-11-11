'use client';

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageContent,
  MessageHeader,
} from '@/components/ui/message';
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
} from '@/components/ui/message-scroller';

import type { VoiceState } from '@/components/status';
import { cn } from '@/lib/utils';

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  createdAt?: number;
  streaming?: boolean;
}
export interface ConversationPanelProps {
  id: string;
  name?: string;
  messages: TranscriptMessage[];
  pending: boolean;

  voiceState?: VoiceState;
  hidden?: boolean;
  className?: string;
  agentRun?: {
    afterMessageId: string;
    content: ReactNode;
  };
}
function TranscriptScrollRestoration({
  hidden,
  messages,
  following,
  viewport,
  position,
}: {
  hidden?: boolean;
  messages: TranscriptMessage[];
  following: RefObject<boolean>;
  viewport: RefObject<HTMLDivElement | null>;
  position: RefObject<number>;
}) {
  const { scrollToEnd } = useMessageScroller();

  useLayoutEffect(() => {
    if (hidden) return;
    if (following.current) scrollToEnd({ behavior: 'auto' });
    else viewport.current?.scrollTo({ top: position.current, behavior: 'auto' });
  }, [hidden, messages, following, viewport, position, scrollToEnd]);

  return null;
}

export function ConversationPanel({
  id,
  name = 'IT Support Assistant',
  messages,
  pending,
  voiceState = 'ready',
  hidden,
  className,
  agentRun,
}: ConversationPanelProps) {
  // Layout changes may move scrollTop; only user input should pause following.
  const following = useRef(true);
  const userScrolling = useRef(false);
  const viewport = useRef<HTMLDivElement>(null);
  const position = useRef(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const displayedMessages: TranscriptMessage[] =
    messages.length === 0 && !agentRun
      ? [
          {
            id: 'conversation-placeholder',
            role: 'agent',
            text:
              voiceState === 'connecting'
                ? 'Connecting…'
                : 'Describe your IT issue to get started.',
          },
        ]
      : messages;
  const agentRunAnchorFound = agentRun
    ? messages.some((message) => message.id === agentRun.afterMessageId)
    : false;
  return (
    <section
      id={id}
      hidden={hidden}
      className={cn('ag-conversation', className)}
      aria-label={`Conversation with ${name}`}
      aria-busy={pending}
      data-voice-state={voiceState}
    >
      <div className="ag-transcript">
        <MessageScrollerProvider autoScroll={!hidden && autoScroll} defaultScrollPosition="end">
          <TranscriptScrollRestoration hidden={hidden} messages={displayedMessages} following={following} viewport={viewport} position={position} />
          <MessageScroller>
            <MessageScrollerViewport
              ref={viewport}
              role="log"
              aria-label={`${name} live transcript`}
              aria-live="polite"
              tabIndex={0}
              onWheelCapture={(event) => {
                userScrolling.current = true;
                if (event.deltaY < 0) { following.current = false; setAutoScroll(false); }
              }}
              onTouchMoveCapture={() => { userScrolling.current = true; }}
              onPointerDownCapture={() => { userScrolling.current = true; }}
              onKeyDownCapture={(event) => {
                if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
                  userScrolling.current = true;
                  if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) { following.current = false; setAutoScroll(false); }
                }
              }}
              onScroll={(event) => {
                const viewport = event.currentTarget;
                if (!viewport.clientHeight) return;
                const movingDown = viewport.scrollTop > position.current;
                position.current = viewport.scrollTop;
                const atEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 8;
                if (atEnd && (following.current || movingDown)) {
                  following.current = true;
                  userScrolling.current = false;
                  setAutoScroll(true);
                } else if (userScrolling.current) {
                  following.current = false;
                  setAutoScroll(false);
                }
              }}
            >
              <MessageScrollerContent>
                {displayedMessages.map((message) => (
                  <Fragment key={message.id}>
                    <MessageScrollerItem messageId={message.id}>
                      <Message
                        align={message.role === 'user' ? 'end' : 'start'}
                      >
                        <MessageContent>
                          <MessageHeader>
                            {message.role === 'user' ? 'You' : 'Assistant'}
                            {message.createdAt && (
                              <time
                                className="ml-2 font-normal"
                                dateTime={new Date(
                                  message.createdAt,
                                ).toISOString()}
                              >
                                {new Intl.DateTimeFormat('en', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                }).format(new Date(message.createdAt))}
                              </time>
                            )}
                            {message.streaming && (
                              <span className="ml-2 font-normal">Live</span>
                            )}
                          </MessageHeader>
                          <Bubble
                            variant={
                              message.role === 'user' ? 'tinted' : 'ghost'
                            }
                            align={message.role === 'user' ? 'end' : 'start'}
                          >
                            <BubbleContent>{message.text}</BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                    {agentRun?.afterMessageId === message.id ? (
                      <MessageScrollerItem
                        messageId={`${message.id}-agent-run`}
                      >
                        {agentRun.content}
                      </MessageScrollerItem>
                    ) : null}
                  </Fragment>
                ))}
                {agentRun && !agentRunAnchorFound ? (
                  <MessageScrollerItem messageId="unanchored-agent-run">
                    {agentRun.content}
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton behavior="auto" onClick={() => {
              following.current = true;
              userScrolling.current = false;
              setAutoScroll(true);
            }} />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </section>
  );
}
