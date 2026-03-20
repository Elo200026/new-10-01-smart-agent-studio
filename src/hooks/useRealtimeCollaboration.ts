import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Collaborator {
  id: string;
  email: string;
  cursor?: { x: number; y: number };
  color: string;
  lastActive: Date;
}

interface CollaboratorPresence {
  collaborators: Collaborator[];
  broadcastCursor: (position: { x: number; y: number }) => void;
  broadcastNodeChange: (nodeId: string, change: Record<string, unknown>) => void;
  isConnected: boolean;
}

interface PresencePayload {
  email?: string;
  cursor?: { x: number; y: number };
  color?: string;
  lastActive?: string;
}

interface CursorBroadcastPayload {
  userId: string;
  position: { x: number; y: number };
}

interface NodeChangeBroadcastPayload {
  userId: string;
  nodeId: string;
  change: Record<string, unknown>;
  timestamp: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCursorBroadcastPayload = (value: unknown): value is CursorBroadcastPayload => {
  if (!isRecord(value)) return false;
  return (
    typeof value.userId === 'string' &&
    isRecord(value.position) &&
    typeof value.position.x === 'number' &&
    typeof value.position.y === 'number'
  );
};

const COLORS = [
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#84CC16', // lime
];

export function useRealtimeCollaboration(
  workflowId: string | undefined,
  userId: string | undefined,
  userEmail: string | undefined
): CollaboratorPresence {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!workflowId || !userId || !userEmail) return;

    const channelName = `workflow:${workflowId}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const newChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync
    newChannel.on('presence', { event: 'sync' }, () => {
      const state = newChannel.presenceState();
      const presentUsers: Collaborator[] = [];

      Object.entries(state).forEach(([key, presences]) => {
        if (key !== userId && Array.isArray(presences) && presences.length > 0) {
          const presence = presences[0] as PresencePayload;
          presentUsers.push({
            id: key,
            email: presence.email || 'Unknown',
            cursor: presence.cursor,
            color: presence.color || COLORS[0],
            lastActive: new Date(presence.lastActive || Date.now()),
          });
        }
      });

      setCollaborators(presentUsers);
    });

    // Handle cursor broadcasts
    newChannel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (isCursorBroadcastPayload(payload) && payload.userId !== userId) {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.id === payload.userId
              ? { ...c, cursor: payload.position, lastActive: new Date() }
              : c
          )
        );
      }
    });

    // Handle node change broadcasts
    newChannel.on('broadcast', { event: 'node_change' }, ({ payload }) => {
      if (!isRecord(payload)) return;
      const detail: NodeChangeBroadcastPayload = {
        userId: typeof payload.userId === 'string' ? payload.userId : '',
        nodeId: typeof payload.nodeId === 'string' ? payload.nodeId : '',
        change: isRecord(payload.change) ? payload.change : {},
        timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
      };
      window.dispatchEvent(new CustomEvent('workflow-node-change', { detail }));
    });

    // Subscribe to channel
    newChannel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await newChannel.track({
            email: userEmail,
            color,
            lastActive: new Date().toISOString(),
          });
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [workflowId, userId, userEmail]);

  const broadcastCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (channel && isConnected && userId) {
        channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { userId, position },
        });
      }
    },
    [channel, isConnected, userId]
  );

  const broadcastNodeChange = useCallback(
    (nodeId: string, change: Record<string, unknown>) => {
      if (channel && isConnected && userId) {
        channel.send({
          type: 'broadcast',
          event: 'node_change',
          payload: { userId, nodeId, change, timestamp: Date.now() },
        });
      }
    },
    [channel, isConnected, userId]
  );

  return {
    collaborators,
    broadcastCursor,
    broadcastNodeChange,
    isConnected,
  };
}
