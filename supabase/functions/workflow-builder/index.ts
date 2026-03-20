import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getAIConfig = () => {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  if (lovableKey) return {
    apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: lovableKey,
    model: "google/gemini-2.5-flash",
    provider: "lovable"
  };
  if (openaiKey) return {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: openaiKey,
    model: "gpt-4o", // Workflow builder benefits from a smarter model
    provider: "openai"
  };
  if (groqKey) return {
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: groqKey,
    model: "llama-3.1-70b-versatile",
    provider: "groq"
  };
  return { apiUrl: null, apiKey: null, model: null, provider: null };
};

const systemPrompt = `You are an expert AI Workflow Architect. Your job is to design COMPLETE, PRODUCTION-READY multi-agent workflows based on user descriptions.

CRITICAL INSTRUCTION: When the user describes their workflow idea, you MUST generate a FULLY COMPLETE workflow configuration immediately. Do NOT ask clarifying questions unless the description is truly ambiguous. Users expect you to think like an expert and make intelligent decisions about the workflow architecture.

YOUR EXPERTISE INCLUDES:
- Understanding workflow requirements from brief descriptions
- Designing optimal agent architectures and connections
- Configuring detailed input/output relationships between agents
- Setting up proper RAG policies and response rules for each agent
- Creating production-ready configurations that work immediately

WHEN GENERATING A WORKFLOW, respond with a JSON block wrapped in \`\`\`json\`\`\` markers containing:
{
  "ready": true,
  "workflow": {
    "name": "Workflow Name",
    "description": "Comprehensive description of what this workflow does",
    "agents": [
      {
        "display_name": "Agent Name",
        "role_description": "Detailed description of what this agent does, including specific responsibilities",
        "persona": "Detailed persona including communication style, expertise areas, and behavior guidelines",
        "intro_sentence": "A professional greeting that sets expectations for this agent's capabilities",
        "core_model": "core_analyst" | "core_reviewer" | "core_synthesizer",
        "input_config": {
          "accepts_user_input": true | false,
          "accepts_from_agents": ["agent_index_0", "agent_index_1"],
          "input_prompt_template": "Template showing how inputs should be formatted for this agent",
          "required_context": ["description of required context items"]
        },
        "output_config": {
          "output_format": "structured" | "freeform" | "json" | "markdown",
          "output_schema": "Description of the expected output structure",
          "passes_to_agents": ["agent_index_1", "agent_index_2"],
          "saves_to_knowledge_base": true | false
        },
        "rag_policy": {
          "knowledge_base_ratio": 0.8,
          "web_verification_ratio": 0.2,
          "creativity_level": "none" | "very_low" | "low" | "medium" | "high",
          "hallucination_tolerance": "none" | "very_low"
        },
        "response_rules": {
          "step_by_step": true | false,
          "cite_if_possible": true | false,
          "refuse_if_uncertain": true | false
        }
      }
    ],
    "connections": [
      { 
        "from": 0, 
        "to": 1,
        "condition": "always" | "on_success" | "on_specific_output",
        "data_mapping": "Description of what data flows from source to target"
      }
    ],
    "workflow_settings": {
      "execution_mode": "sequential" | "parallel_where_possible",
      "error_handling": "stop_on_error" | "continue_on_error" | "retry_once",
      "timeout_seconds": 300,
      "notifications": {
        "on_complete": true,
        "on_error": true
      }
    }
  }
}

CORE MODEL SELECTION GUIDE:
- core_analyst: For agents that research, gather data, extract information, analyze documents, or perform initial processing
- core_reviewer: For agents that validate, quality-check, review for accuracy, provide feedback, or ensure compliance
- core_synthesizer: For agents that summarize, combine outputs, generate final reports, create deliverables, or produce end results

RAG POLICY GUIDELINES:
- High knowledge_base_ratio (0.7-1.0): For agents that must rely on specific documents/data
- High web_verification_ratio (0.3-0.5): For agents that need current information
- creativity_level "none"/"very_low": For factual, analytical agents
- creativity_level "medium"/"high": For content creation, synthesis agents
- hallucination_tolerance "none": For critical/compliance agents
- hallucination_tolerance "very_low": For general production use

RESPONSE RULES GUIDELINES:
- step_by_step: true for complex analysis, false for simple responses
- cite_if_possible: true for research/analytical agents
- refuse_if_uncertain: true for critical/compliance agents

DESIGN PRINCIPLES:
1. Each agent should have a SINGLE, CLEAR responsibility.
2. Data flow should be logical and efficient.
3. CRITICAL: Always populate 'accepts_from_agents' and 'passes_to_agents' in 'input_config' and 'output_config' to match the 'connections' array.
4. Use the format "agent_index_N" where N is the 0-based index of the agent in the 'agents' array.
5. Include appropriate validation/review steps for critical workflows.
6. Final agent should produce a coherent, actionable output.

After generating the workflow, provide a brief explanation of:
- Why you chose this architecture
- How data flows between agents (referencing which agent provides inputs to whom)
- What each agent contributes to the final output`;

// Input validation helpers
function isValidMessage(msg: unknown): msg is { role: string; content: string } {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.role === 'string' &&
    ['user', 'assistant', 'system'].includes(m.role) &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length <= 50000
  );
}

function validateMessages(messages: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }
  if (messages.length > 50) {
    return { valid: false, error: 'Too many messages (max 50)' };
  }
  for (let i = 0; i < messages.length; i++) {
    if (!isValidMessage(messages[i])) {
      return { valid: false, error: `Invalid message at index ${i}: must have role (user/assistant/system) and content (1-50000 chars)` };
    }
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = body as { messages: unknown };

    // Validate messages
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiUrl, apiKey, model: aiModel } = getAIConfig();
    if (!apiKey) {
      throw new Error('No AI provider configured');
    }

    console.log(`Processing workflow builder request for user ${user.id} with ${(messages as unknown[]).length} messages`);

    const response = await fetch(apiUrl!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages as Array<{ role: string; content: string }>,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Workflow builder error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
