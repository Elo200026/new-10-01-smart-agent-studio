

# Implementation Plan: High-Priority Improvements

I understand the frustration with wasted credits. This plan is designed to maximize value per credit by bundling related changes together efficiently.

## What We Will Implement (in order)

### 1. Markdown Rendering in AI Chat (Priority 1 - Very High Impact, Low Effort)
Currently, AI responses display as plain text. We will add `react-markdown` with syntax highlighting so code blocks, lists, bold text, and tables render properly -- just like ChatGPT/Claude.

**Changes:**
- Install `react-markdown` and `remark-gfm` packages
- Update `ChatMessage.tsx` to render assistant messages with markdown instead of plain `<p>` tags
- Add prose styling for proper typography in chat bubbles

### 2. Replace Placeholder Stats on Landing Page (Priority 3 - High Impact, Low Effort)
The landing page shows fake numbers ("10K+ Active Agents", "1M+ Conversations"). We will replace them with real counts from the database, falling back to "0" if empty.

**Changes:**
- Update `Index.tsx` to query actual counts from `ai_profiles`, `chat_messages`, and `usage_logs` tables
- Display real numbers with animated counters
- Keep "99.9% Uptime" and "<100ms Response Time" as static claims

### 3. Agent Templates / One-Click Presets (Priority 2 - Very High Impact, Medium Effort)
Add pre-built agent templates so new users can deploy a working agent instantly instead of configuring from scratch.

**Changes:**
- Create a `src/lib/agentTemplates.ts` file with 4 templates: Customer Support, Research Analyst, Code Reviewer, Content Writer
- Each template includes pre-configured persona, role description, RAG policy, and response rules
- Add a "Templates" section at the top of the Agents page with clickable template cards
- Clicking a template navigates to `/agents/new` with pre-filled configuration

### 4. Mobile Responsive Layout (Priority 4 - High Impact, Medium Effort)
Make the sidebar collapsible and the chat layout work on mobile.

**Changes:**
- Update `Sidebar.tsx` to collapse into a hamburger menu on mobile (using the existing `useIsMobile` hook)
- Update `MainLayout.tsx` to remove the fixed `ms-72` margin on mobile
- Update `AIChat.tsx` to hide the conversation sidebar on mobile and show chat full-width

---

## Technical Details

### Markdown Rendering (ChatMessage.tsx)
- Replace the plain `<p>` tag with `<ReactMarkdown>` for assistant messages
- Add `remark-gfm` plugin for GitHub-flavored markdown (tables, strikethrough, task lists)
- Wrap in `prose prose-sm dark:prose-invert` classes for proper styling
- Keep user messages as plain text (no markdown needed)

### Landing Page Stats (Index.tsx)
- Use `supabase` client to run count queries on page load
- Queries: `ai_profiles.count()`, `chat_messages.count()`, `usage_logs.count()`
- These are public-facing counts so we use the anon key (no auth needed)
- Format numbers with K/M suffixes

### Agent Templates (agentTemplates.ts)
- 4 templates with complete `AIProfile`-compatible data:
  - **Customer Support**: Empathetic, step-by-step, cites knowledge base
  - **Research Analyst**: Deep analysis, confidence scores, bullet points
  - **Code Reviewer**: Technical, structured feedback, summarize at end
  - **Content Writer**: Creative, medium creativity level, template-based

### Mobile Responsive
- Sidebar: Add a state toggle + overlay on mobile using `useIsMobile()`
- MainLayout: Conditional `ms-72` only on desktop
- AIChat: Stack conversation list above chat on mobile, or hide behind a toggle

## Implementation Order
All four items will be implemented in a single pass to maximize credit efficiency. The changes are independent and can be done together.

