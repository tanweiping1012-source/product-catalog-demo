import { useEffect, useMemo, useRef, useState } from 'react'

type Role = 'system' | 'user' | 'assistant'
type Message = { id: string; role: Role; content: string }

type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

const storageKey = 'pc_demo_llm_config_v1'

function loadConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
      }
    }
    const parsed = JSON.parse(raw) as Partial<LlmConfig>
    return {
      baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
      apiKey: parsed.apiKey || '',
      model: parsed.model || 'gpt-4o-mini',
    }
  } catch {
    return {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    }
  }
}

function saveConfig(cfg: LlmConfig) {
  localStorage.setItem(storageKey, JSON.stringify(cfg))
}

async function callOpenAiCompatible(params: {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
}) {
  const url = `${params.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.apiKey ? { Authorization: `Bearer ${params.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LLM request failed (${res.status}): ${text || res.statusText}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM returned empty content')
  return content
}

export default function LlmApp() {
  const [cfg, setCfg] = useState<LlmConfig>(() => loadConfig())
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'seed',
      role: 'assistant',
      content:
        'Hi! This is a demo CarMax business chat powered by an OpenAI-compatible LLM endpoint. Ask about price, test drive, financing, or store address.',
    },
  ])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)

  useEffect(() => {
    saveConfig(cfg)
  }, [cfg])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isSending])

  const systemPrompt = useMemo(() => {
    return [
      'You are a CarMax business chat assistant for an auto product-catalog scenario.',
      'Be concise, helpful, and ask clarifying questions when needed.',
      'If asked for the exact price, ask the user to share contact details (phone/email) first.',
      'If asked about store address, provide the address and propose test drive scheduling.',
      'Do not claim you performed actions you did not perform.',
    ].join('\n')
  }, [])

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setError(null)
    const userId = `${Date.now()}-${idRef.current++}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', content: text }])
    setIsSending(true)

    try {
      const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ]

      const content = await callOpenAiCompatible({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages: llmMessages,
      })

      const assistantId = `${Date.now()}-${idRef.current++}`
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content }])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="llmRoot">
      <div className="llmShell">
        <header className="llmHeader">
          <div className="llmTitle">LLM Chat (New Page)</div>
          <a className="llmLink" href={import.meta.env.BASE_URL} target="_self">
            Back to demo
          </a>
        </header>

        <section className="llmConfig" aria-label="LLM config">
          <label className="llmField">
            <div className="llmLabel">Base URL</div>
            <input
              className="llmInput"
              value={cfg.baseUrl}
              onChange={(e) => setCfg((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="llmField">
            <div className="llmLabel">Model</div>
            <input
              className="llmInput"
              value={cfg.model}
              onChange={(e) => setCfg((p) => ({ ...p, model: e.target.value }))}
              placeholder="gpt-4o-mini"
            />
          </label>
          <label className="llmField">
            <div className="llmLabel">API Key (stored in this browser)</div>
            <input
              className="llmInput"
              value={cfg.apiKey}
              onChange={(e) => setCfg((p) => ({ ...p, apiKey: e.target.value }))}
              placeholder="sk-..."
            />
          </label>
          <div className="llmHint">
            Notes: GitHub Pages is static. Many LLM providers block browser CORS. If requests fail,
            use a CORS-enabled OpenAI-compatible proxy.
          </div>
          {error && <div className="llmError">{error}</div>}
        </section>

        <section className="llmChat" aria-label="Chat">
          <div className="llmMessages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'user' ? 'llmMsgRow right' : 'llmMsgRow left'}
              >
                <div className={m.role === 'user' ? 'llmBubble user' : 'llmBubble assistant'}>
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="llmMsgRow left">
                <div className="llmBubble assistant">…</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="llmComposer">
            <input
              className="llmComposerInput"
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                void send()
              }}
            />
            <button className="llmSend" onClick={() => void send()} disabled={isSending}>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
