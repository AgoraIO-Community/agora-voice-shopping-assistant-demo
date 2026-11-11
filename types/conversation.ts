import type { RTMClient } from 'agora-rtm';
import type { ReactNode } from 'react';
import type { AgentSignalSnapshot } from '@/lib/agent-signal';
import type { InspectionSnapshot } from '@/lib/inspection';

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
  startedAt?: number;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: RTMClient;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onEndConversation: () => void | Promise<void>;
  ending?: boolean;
  startupError?: string;
  feedback?: ReactNode;
  onActivityChange?: (snapshot: AgentSignalSnapshot) => void;
  onInspectionChange?: (snapshot: InspectionSnapshot) => void;
}
