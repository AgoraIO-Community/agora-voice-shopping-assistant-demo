'use client';

import type { MouseEventHandler, ReactNode } from 'react';
import { MessageSquareText, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GlassSurface } from '@/components/glass-surface';
import { Status, type VoiceState } from '@/components/status';

import { cn } from '@/lib/utils';

export interface VoiceDockProps {
  state: VoiceState;
  micEnabled: boolean;
  disabled?: boolean;
  ending?: boolean;
  micPending?: boolean;
  conversationOpen: boolean;
  conversationId: string;
  onToggleVoice: () => void;
  onEnd: () => void;
  onBuild: MouseEventHandler<HTMLButtonElement>;
  onToggleConversation: () => void;
  devices: ReactNode;
  className?: string;
}
export function VoiceDock({
  state,
  micEnabled,
  disabled = false,
  ending = false,
  micPending = false,
  conversationOpen,
  conversationId,
  onToggleVoice,
  onEnd,
  onBuild,
  onToggleConversation,
  devices,
  className,
}: VoiceDockProps) {
  return (
    <GlassSurface
      className={cn('ag-voice-dock', className)}
      data-voice-state={state}
      role="group"
      aria-label="Voice session controls"
      material="liquid"
    >
      {devices}
      <div className="ag-dock-copy" role="status">
        <Status state={state} />
        <span className="ag-caption">
          {ending
            ? 'Ending session…'
            : micEnabled
              ? 'Your microphone is on'
              : 'Your microphone is off'}
        </span>
      </div>
      <div className="ag-action-row">
        <div className="ag-dock-build">
          <Button variant="outline" onClick={onBuild}>Build Now</Button>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              aria-label={
                conversationOpen ? 'Hide conversation' : 'Show conversation'
              }
              aria-expanded={conversationOpen}
              aria-controls={conversationId}
              aria-pressed={conversationOpen}
              onClick={onToggleConversation}
            >
              <MessageSquareText data-icon="inline-start" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Conversation</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              disabled={disabled || ending || micPending || state === 'ended'}
              aria-pressed={micEnabled}
              onClick={onToggleVoice}
            >
              {micEnabled ? (
                <Mic data-icon="inline-start" />
              ) : (
                <MicOff data-icon="inline-start" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="ag-dock-end"
              disabled={ending || state === 'ended'}
              aria-label="End voice session"
              onClick={onEnd}
            >
              <PhoneOff data-icon="inline-start" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End session</TooltipContent>
        </Tooltip>
      </div>
    </GlassSurface>
  );
}
