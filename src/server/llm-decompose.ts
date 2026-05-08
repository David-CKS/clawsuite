import { gatewayRpc } from './gateway'
import { makeSubtask, type SubTask } from './orchestrator-store'

const SYSTEM_PROMPT = `You are a planning orchestrator. The user gives you a high-level goal.
Decompose it into 3-7 concrete sub-tasks. Each sub-task should:
- Have a short, action-oriented title (verb + object).
- Have a one-paragraph description with concrete deliverables.
- Be assignable to a single agent persona ("general", "coder", "researcher", "qa", "writer", "ops").
- Optionally depend on previous sub-task indices (1-based).

Return STRICTLY a JSON object with this shape and nothing else:
{
  "subtasks": [
    {
      "title": "string",
      "description": "string",
      "agent": "general|coder|researcher|qa|writer|ops",
      "depends_on": [1, 2]
    }
  ]
}
`.trim()

type GatewayChatResponse = {
  text?: string
  output?: string
  message?: { content?: string }
}

type DecomposedItem = {
  title?: unknown
  description?: unknown
  agent?: unknown
  depends_on?: unknown
}

const VALID_AGENTS = new Set([
  'general',
  'coder',
  'researcher',
  'qa',
  'writer',
  'ops',
])

function extractJsonObject(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return null
}

function normalizeSubtasks(raw: unknown): SubTask[] {
  if (!raw || typeof raw !== 'object') return []
  const list = (raw as { subtasks?: unknown }).subtasks
  if (!Array.isArray(list)) return []

  const created: SubTask[] = []
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return
    const it = item as DecomposedItem
    const title = typeof it.title === 'string' ? it.title.trim() : ''
    if (!title) return
    const description =
      typeof it.description === 'string' ? it.description.trim() : ''
    const agentRaw = typeof it.agent === 'string' ? it.agent.trim() : 'general'
    const agent = VALID_AGENTS.has(agentRaw) ? agentRaw : 'general'

    const dependsOnIndices = Array.isArray(it.depends_on)
      ? (it.depends_on as unknown[])
          .map((n) => (typeof n === 'number' ? n : Number(n)))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= idx)
      : []

    const subtask = makeSubtask({ title, description, agent })
    created.push(subtask)
    const dependsOn = dependsOnIndices
      .map((n) => created[n - 1]?.id)
      .filter((id): id is string => typeof id === 'string')
    subtask.dependsOn = dependsOn
  })
  return created
}

function fallbackDecomposition(title: string, description: string): SubTask[] {
  const head = title.trim() || 'Goal'
  const detail = description.trim()
  const research = makeSubtask({
    title: `Research context for: ${head}`,
    description:
      detail.length > 0
        ? `Gather background, prior art, and constraints relevant to: ${detail}`
        : `Gather background and constraints for "${head}".`,
    agent: 'researcher',
  })
  const plan = makeSubtask({
    title: `Draft execution plan for: ${head}`,
    description:
      'Translate research into a concrete step-by-step plan with deliverables and acceptance criteria.',
    agent: 'general',
  })
  plan.dependsOn = [research.id]
  const execute = makeSubtask({
    title: `Execute the plan for: ${head}`,
    description:
      'Implement the plan. Produce the artifacts, code, or content required to meet acceptance criteria.',
    agent: 'coder',
  })
  execute.dependsOn = [plan.id]
  const review = makeSubtask({
    title: `Review and ship: ${head}`,
    description:
      'Validate the deliverables, run any tests/checks, document the result, and hand off.',
    agent: 'qa',
  })
  review.dependsOn = [execute.id]
  return [research, plan, execute, review]
}

function extractText(payload: GatewayChatResponse | string | unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as GatewayChatResponse
  if (typeof p.text === 'string') return p.text
  if (typeof p.output === 'string') return p.output
  if (p.message && typeof p.message.content === 'string') return p.message.content
  return ''
}

export type DecomposeResult = {
  subtasks: SubTask[]
  source: 'llm' | 'fallback'
  rawText?: string
  error?: string
}

export async function decomposeGoal(input: {
  title: string
  description: string
  sessionKey?: string
}): Promise<DecomposeResult> {
  const userPrompt = [
    `Goal title: ${input.title}`,
    input.description ? `Goal description:\n${input.description}` : '',
    'Decompose this goal. Return only the JSON object described in the system prompt.',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const payload = await gatewayRpc<GatewayChatResponse | string>(
      'chat.complete',
      {
        sessionKey: input.sessionKey,
        system: SYSTEM_PROMPT,
        message: userPrompt,
        temperature: 0.2,
        timeoutMs: 60_000,
      },
    )
    const text = extractText(payload).trim()
    if (!text) {
      return {
        subtasks: fallbackDecomposition(input.title, input.description),
        source: 'fallback',
        error: 'gateway returned empty response',
      }
    }
    const jsonChunk = extractJsonObject(text)
    if (!jsonChunk) {
      return {
        subtasks: fallbackDecomposition(input.title, input.description),
        source: 'fallback',
        rawText: text,
        error: 'no JSON object detected in response',
      }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonChunk)
    } catch (err) {
      return {
        subtasks: fallbackDecomposition(input.title, input.description),
        source: 'fallback',
        rawText: text,
        error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
    const subtasks = normalizeSubtasks(parsed)
    if (subtasks.length === 0) {
      return {
        subtasks: fallbackDecomposition(input.title, input.description),
        source: 'fallback',
        rawText: text,
        error: 'parsed JSON did not yield any valid subtasks',
      }
    }
    return { subtasks, source: 'llm', rawText: text }
  } catch (err) {
    return {
      subtasks: fallbackDecomposition(input.title, input.description),
      source: 'fallback',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
