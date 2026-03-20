import React, { useState } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageFeedback } from './MessageFeedback';
import { CitationDisplay, Citation } from './CitationDisplay';
import { CorrectionInterface } from './CorrectionInterface';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ChatMessageData {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  citations?: Citation[];
  conversationId?: string;
  chunkId?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  showFeedback?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showFeedback = true,
}) => {
  const [showCorrection, setShowCorrection] = useState(false);
  const isAssistant = message.role === 'assistant';

  return (
    <>
      <div
        className={cn(
          "flex gap-3 animate-fade-in group",
          isAssistant ? 'justify-start' : 'justify-end'
        )}
      >
        {isAssistant && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="max-w-[70%]">
          <div
            className={cn(
              "rounded-2xl px-4 py-3 relative",
              isAssistant ? 'bg-muted' : 'bg-primary text-primary-foreground'
            )}
          >
            {isAssistant ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-background/80 prose-pre:rounded-lg prose-pre:p-3 prose-a:text-primary prose-table:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded-sm" />
            )}
          </div>

          {/* Citations */}
          {isAssistant && message.citations && message.citations.length > 0 && (
            <CitationDisplay citations={message.citations} />
          )}

          {/* Feedback controls - only show for completed assistant messages */}
          {isAssistant && showFeedback && !message.isStreaming && message.id && (
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <MessageFeedback
                messageId={message.id}
                conversationId={message.conversationId}
                chunkId={message.chunkId}
                onOpenCorrection={() => setShowCorrection(true)}
              />
            </div>
          )}
        </div>
        {!isAssistant && (
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Correction dialog */}
      {message.id && (
        <CorrectionInterface
          isOpen={showCorrection}
          onClose={() => setShowCorrection(false)}
          messageId={message.id}
          conversationId={message.conversationId}
          chunkId={message.chunkId}
          originalContent={message.content}
        />
      )}
    </>
  );
};
