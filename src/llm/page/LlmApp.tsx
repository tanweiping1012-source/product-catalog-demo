import { useEffect, useMemo, useRef, useState } from 'react'

type LeadRegion = 'APAC' | 'China' | 'NAMER' | 'METAP' | 'LATAM' | 'EasternEurope' | 'EuropeOthers'
type LeadField = 'phone' | 'email' | 'name' | 'location'

type MerchantCard = {
  name: string
  subtitle: string
  websiteLabel: string
  websiteUrl: string
  phone: string
  hours: string
  address: string
}

type LeadCard = {
  region: LeadRegion
  required: LeadField[]
  values: Partial<Record<LeadField, string>>
  intent: 'general' | 'revealPrice'
}

type ScheduleCard = {
  storeName: string
  address: string
  timezone: string
  dateOptions: Array<{ key: string; label: string }>
  timeOptions: Array<{ key: string; label: string }>
  selectedDateKey?: string
  selectedTimeKey?: string
}

type ChatKind = 'text' | 'typing' | 'merchantCard' | 'leadCard' | 'scheduleCard'
type ChatRole = 'user' | 'assistant'
type ChatMessage = {
  id: string
  role: ChatRole
  kind: ChatKind
  text?: string
  merchant?: MerchantCard
  lead?: LeadCard
  schedule?: ScheduleCard
}

type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
  mode: 'mock' | 'llm'
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
        mode: 'mock',
      }
    }
    const parsed = JSON.parse(raw) as Partial<LlmConfig>
    return {
      baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
      apiKey: parsed.apiKey || '',
      model: parsed.model || 'gpt-4o-mini',
      mode: parsed.mode === 'llm' ? 'llm' : 'mock',
    }
  } catch {
    return {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      mode: 'mock',
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

function isChinese(s: string) {
  return /[\u4e00-\u9fff]/.test(s)
}

function normalizeNoSpace(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function createScheduleCard(langIsZh: boolean): ScheduleCard {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const now = new Date()

  const dateOptions = Array.from({ length: 3 }).map((_, idx) => {
    const d = new Date(now)
    d.setDate(d.getDate() + idx + 1)
    const key = d.toISOString().slice(0, 10)
    const label = new Intl.DateTimeFormat(langIsZh ? 'zh-CN' : undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: tz,
    }).format(d)
    return { key, label }
  })

  const makeTimeLabel = (h: number, m: number) => {
    const d = new Date(now)
    d.setHours(h, m, 0, 0)
    return new Intl.DateTimeFormat(langIsZh ? 'zh-CN' : undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }

  const timeOptions = [
    { key: '10:00', label: makeTimeLabel(10, 0) },
    { key: '14:00', label: makeTimeLabel(14, 0) },
    { key: '18:00', label: makeTimeLabel(18, 0) },
  ]

  return {
    storeName: 'CarMax',
    address: 'Demo location · United States',
    timezone: tz,
    dateOptions,
    timeOptions,
  }
}

function leadRequiredFieldsByRegion(region: LeadRegion): LeadField[] {
  if (region === 'APAC' || region === 'China') return ['phone']
  if (region === 'EuropeOthers') return ['phone', 'email', 'name']
  return ['phone', 'email']
}

function defaultLeadRegion(): LeadRegion {
  const lang = (navigator.language || '').toLowerCase()
  if (lang.startsWith('zh')) return 'China'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  if (tz.startsWith('Europe/')) {
    if (/kyiv|kiev|warsaw|prague|bucharest|sofia|budapest|vilnius|riga|tallinn/i.test(tz)) {
      return 'EasternEurope'
    }
    return 'EuropeOthers'
  }
  if (tz.startsWith('Asia/')) return 'APAC'
  if (tz.startsWith('America/')) return 'NAMER'
  return 'NAMER'
}

function createLeadCard(intent: LeadCard['intent']): LeadCard {
  const region = defaultLeadRegion()
  return { region, required: leadRequiredFieldsByRegion(region), values: {}, intent }
}

type LocalIntent =
  | { type: 'merchant' }
  | { type: 'address' }
  | { type: 'price' }
  | { type: 'lead' }
  | { type: 'other' }

function detectIntent(input: string): LocalIntent {
  const n = normalizeNoSpace(input)
  const hasAddress =
    n.includes('storeaddress') ||
    n.includes('dealershipaddress') ||
    /(store|dealership).*(address|location)/.test(input.toLowerCase()) ||
    /门店地址|地址在哪|地址在哪里|怎么去|位置/.test(input)
  if (hasAddress) return { type: 'address' }

  const hasMerchant =
    n.includes('carmax') ||
    /about.*carmax|merchant|dealer|dealership|business|company|store|shop/.test(input.toLowerCase()) ||
    /商家|门店|店铺|公司|营业时间|联系方式|电话|地址/.test(input)
  if (hasMerchant) return { type: 'merchant' }

  const hasPrice = /price|cost|\$|howmuch/.test(n) || /价格|多少钱|报价/.test(input)
  if (hasPrice) return { type: 'price' }

  const hasLead =
    /lead|contactinfo|getquote|quote|booking|book/.test(n) || /留资|留信息|获取报价|预约|联系我/.test(input)
  if (hasLead) return { type: 'lead' }

  return { type: 'other' }
}

function mockRespond(input: string, hasLead: boolean) {
  const zh = isChinese(input)
  const intent = detectIntent(input)
  if (intent.type === 'address') {
    return zh
      ? '门店地址：Demo location · United States。我也可以帮你安排试驾。'
      : 'Store address: Demo location · United States. I can also help you schedule a test drive.'
  }
  if (intent.type === 'merchant') {
    return zh
      ? '这里是 CarMax 的商家信息（演示）。你也可以打开官网查看。'
      : 'Here is the CarMax merchant info (demo). You can also open the website.'
  }
  if (intent.type === 'price') {
    if (!hasLead) {
      return zh ? '为了展示价格，请先留资（演示）。' : 'To show the price, please share your contact details (demo).'
    }
    return zh ? '这辆车价格是 $40,998.99。需要分期还是试驾？' : 'The price is $40,998.99. Want financing or a test drive?'
  }
  if (intent.type === 'lead') {
    return zh ? '好的，我这边需要你填写留资信息（演示）。' : 'Sure — please fill in the lead capture form (demo).'
  }
  return zh
    ? '我可以帮你解答价格、车况、分期、试驾、交付等问题。你想先问哪一个？'
    : 'I can help with price, history, financing, test drive, and delivery. What would you like to ask first?'
}

export default function LlmApp() {
  const baseUrl = import.meta.env.BASE_URL
  const figmaAsset = (fileName: string) => `${baseUrl}assets/figma/${fileName}`

  const [cfg, setCfg] = useState<LlmConfig>(() => loadConfig())
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'seed-1',
      role: 'assistant',
      kind: 'text',
      text: 'Hi! Ask about price, store address, merchant info, financing, or test drive.',
    },
  ])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef(0)
  const [hasLead, setHasLead] = useState(false)

  useEffect(() => {
    saveConfig(cfg)
  }, [cfg])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatMessages.length, isSending])

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
    setChatMessages((prev) => [...prev, { id: userId, role: 'user', kind: 'text', text }])

    const zh = isChinese(text)
    const intent = detectIntent(text)
    const typingId = `${Date.now()}-${idRef.current++}`
    setChatMessages((prev) => [...prev, { id: typingId, role: 'assistant', kind: 'typing' }])
    setIsSending(true)

    const pushAssistant = (payload: Omit<ChatMessage, 'id' | 'role'>) => {
      const id = `${Date.now()}-${idRef.current++}`
      setChatMessages((prev) => [...prev, { id, role: 'assistant', ...payload }])
    }

    const removeTyping = () => {
      setChatMessages((prev) => prev.filter((m) => m.id !== typingId))
    }

    const runLocal = () => {
      removeTyping()
      const content = mockRespond(text, hasLead)

      if (intent.type === 'merchant') {
        pushAssistant({ kind: 'text', text: content })
        pushAssistant({
          kind: 'merchantCard',
          merchant: {
            name: 'CarMax',
            subtitle: 'Business chat',
            websiteLabel: 'carmax.com',
            websiteUrl: 'https://www.carmax.com/',
            phone: '+1 (800) 519-1511',
            hours: 'Mon–Sun · 10:00 AM–9:00 PM',
            address: 'Demo location · United States',
          },
        })
        return
      }

      if (intent.type === 'address') {
        pushAssistant({ kind: 'text', text: content })
        pushAssistant({ kind: 'scheduleCard', schedule: createScheduleCard(zh) })
        return
      }

      if (intent.type === 'lead' || (intent.type === 'price' && !hasLead)) {
        pushAssistant({ kind: 'text', text: content })
        pushAssistant({ kind: 'leadCard', lead: createLeadCard(intent.type === 'price' ? 'revealPrice' : 'general') })
        return
      }

      pushAssistant({ kind: 'text', text: content })
    }

    const runLlm = async () => {
      try {
        const textOnlyHistory = chatMessages
          .filter((m) => m.kind === 'text')
          .map((m) => ({ role: m.role, content: m.text || '' }))
        const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...textOnlyHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ]

        const content = await callOpenAiCompatible({
          baseUrl: cfg.baseUrl,
          apiKey: cfg.apiKey,
          model: cfg.model,
          messages: llmMessages,
        })
        removeTyping()
        pushAssistant({ kind: 'text', text: content })
      } catch (e) {
        removeTyping()
        setError(e instanceof Error ? e.message : String(e))
        runLocal()
      }
    }

    window.setTimeout(() => {
      if (cfg.mode === 'llm' && cfg.apiKey) {
        void runLlm().finally(() => setIsSending(false))
      } else {
        runLocal()
        setIsSending(false)
      }
    }, 500)
  }

  return (
    <div className="llmRoot">
      <div className="llmShell">
        <header className="llmHeader">
          <div className="llmTitle">LLM Chat Demo</div>
          <div className="llmHeaderActions">
            <a className="llmLink" href={import.meta.env.BASE_URL} target="_self">
              Back to demo
            </a>
            <button className="llmConfigButton" type="button" onClick={() => setIsConfigOpen((v) => !v)}>
              Config
            </button>
          </div>
        </header>

        <div className="llmBody">
          <section className="llmPhone" aria-label="Phone demo">
            <div className="llmPhoneTop">
              <div className="llmStatusTime">8:00</div>
              <div className="llmStatusIcons" aria-hidden="true">
                <img src={figmaAsset('icon-cellular-4.svg')} alt="" />
                <img src={figmaAsset('icon-wifi-3.svg')} alt="" />
                <img src={figmaAsset('icon-battery.svg')} alt="" />
              </div>
            </div>
            <div className="llmNav">
              <div className="llmNavLeft">
                <button className="llmNavIcon" type="button" onClick={() => {}}>
                  <img src={figmaAsset('icon-chevron-left.svg')} alt="" />
                </button>
                <img className="llmNavAvatar" src={figmaAsset('avatar.png')} alt="" />
              </div>
              <div className="llmNavCenter">
                <div className="llmNavTitleRow">
                  <div className="llmNavTitle">Car Max</div>
                  <img className="llmNavVerified" src={figmaAsset('icon-tick-circle.svg')} alt="" />
                </div>
                <div className="llmNavSubtitle">Business chat</div>
              </div>
              <div className="llmNavRight">
                <button className="llmNavIcon" type="button" onClick={() => {}}>
                  <img src={figmaAsset('icon-flag.svg')} alt="" />
                </button>
                <button className="llmNavIcon" type="button" onClick={() => {}}>
                  <img src={figmaAsset('icon-ellipsis.svg')} alt="" />
                </button>
              </div>
            </div>

            <div className="llmChat">
              {chatMessages.map((m) => {
                if (m.kind === 'merchantCard' && m.merchant) {
                  return (
                    <div key={m.id} className="llmRow left">
                      <div className="llmMerchantCard">
                        <div className="llmMerchantHeader">
                          <img className="llmMerchantLogo" src={figmaAsset('avatar.png')} alt="" />
                          <div className="llmMerchantHeaderText">
                            <div className="llmMerchantName">{m.merchant.name}</div>
                            <div className="llmMerchantSubtitle">{m.merchant.subtitle}</div>
                          </div>
                        </div>
                        <div className="llmMerchantDetails">
                          <div className="llmMerchantDetailRow">
                            <span className="llmMerchantDetailLabel">Hours</span>
                            <span className="llmMerchantDetailValue">{m.merchant.hours}</span>
                          </div>
                          <div className="llmMerchantDetailRow">
                            <span className="llmMerchantDetailLabel">Phone</span>
                            <span className="llmMerchantDetailValue">{m.merchant.phone}</span>
                          </div>
                          <div className="llmMerchantDetailRow">
                            <span className="llmMerchantDetailLabel">Address</span>
                            <span className="llmMerchantDetailValue">{m.merchant.address}</span>
                          </div>
                        </div>
                        <div className="llmCardActions">
                          <button className="llmCardButton secondary" type="button" onClick={() => {}}>
                            Business info
                          </button>
                          <button className="llmCardButton primary" type="button" onClick={() => window.open(m.merchant?.websiteUrl || '#', '_blank')}>
                            Open website
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (m.kind === 'leadCard' && m.lead) {
                  const required = new Set(m.lead.required)
                  const zh = (navigator.language || '').toLowerCase().startsWith('zh')
                  const fields: LeadField[] = ['phone', 'email', 'name', 'location']
                  const canSubmit = fields
                    .filter((f) => required.has(f))
                    .every((f) => (m.lead?.values[f] || '').trim().length > 0)

                  const label = (f: LeadField) => {
                    if (!zh) {
                      if (f === 'phone') return 'Phone number'
                      if (f === 'email') return 'Email address'
                      if (f === 'name') return 'Full name'
                      return 'Location / city'
                    }
                    if (f === 'phone') return '手机号'
                    if (f === 'email') return '邮箱'
                    if (f === 'name') return '姓名'
                    return '城市/地区'
                  }

                  const placeholder = (f: LeadField) => {
                    if (!zh) {
                      if (f === 'phone') return '+1 555 000 0000'
                      if (f === 'email') return 'name@example.com'
                      if (f === 'name') return 'Your name'
                      return 'City'
                    }
                    if (f === 'phone') return '例如：+86 13800000000'
                    if (f === 'email') return '例如：name@example.com'
                    if (f === 'name') return '例如：张三'
                    return '例如：上海'
                  }

                  const update = (updater: (lead: LeadCard) => LeadCard) => {
                    setChatMessages((prev) =>
                      prev.map((x) => {
                        if (x.id !== m.id || x.kind !== 'leadCard' || !x.lead) return x
                        return { ...x, lead: updater(x.lead) }
                      }),
                    )
                  }

                  const submit = () => {
                    if (!canSubmit) return
                    const parts: string[] = []
                    if (m.lead?.values.phone) parts.push(String(m.lead.values.phone))
                    if (m.lead?.values.email) parts.push(String(m.lead.values.email))
                    if (m.lead?.values.name) parts.push(String(m.lead.values.name))
                    if (m.lead?.values.location) parts.push(String(m.lead.values.location))
                    const userId = `${Date.now()}-${idRef.current++}`
                    setChatMessages((prev) => [...prev, { id: userId, role: 'user', kind: 'text', text: parts.join(' · ') }])
                    setHasLead(true)
                    const assistantId = `${Date.now()}-${idRef.current++}`
                    const replyText =
                      m.lead?.intent === 'revealPrice'
                        ? 'Thanks! The price is $40,998.99. Would you like to schedule a test drive?'
                        : 'Thanks! We saved your details. What would you like to do next?'
                    setChatMessages((prev) => [...prev, { id: assistantId, role: 'assistant', kind: 'text', text: replyText }])
                  }

                  return (
                    <div key={m.id} className="llmRow left">
                      <div className="llmLeadCard">
                        <div className="llmLeadTitle">Contact information to collect</div>
                        <div className="llmLeadMeta">
                          <span className="llmLeadMetaLabel">Region</span>
                          <select
                            className="llmLeadSelect"
                            value={m.lead.region}
                            onChange={(e) => {
                              const region = e.target.value as LeadRegion
                              update((lead) => ({ ...lead, region, required: leadRequiredFieldsByRegion(region) }))
                            }}
                          >
                            <option value="APAC">APAC</option>
                            <option value="China">China</option>
                            <option value="NAMER">NAMER</option>
                            <option value="METAP">METAP</option>
                            <option value="LATAM">LATAM</option>
                            <option value="EasternEurope">Eastern Europe</option>
                            <option value="EuropeOthers">Europe, Others</option>
                          </select>
                        </div>

                        <div className="llmLeadFields">
                          {fields.map((f) => (
                            <label key={f} className="llmLeadField">
                              <div className="llmLeadFieldLabel">
                                <span>{label(f)}</span>
                                <span className={required.has(f) ? 'llmLeadTag req' : 'llmLeadTag opt'}>
                                  {required.has(f) ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              <input
                                className="llmLeadInput"
                                value={m.lead?.values[f] ?? ''}
                                placeholder={placeholder(f)}
                                onChange={(e) => {
                                  const v = e.target.value
                                  update((lead) => ({ ...lead, values: { ...lead.values, [f]: v } }))
                                }}
                              />
                            </label>
                          ))}
                        </div>

                        <div className="llmCardActions">
                          <button className="llmCardButton secondary" type="button" onClick={() => update((lead) => ({ ...lead, values: {} }))}>
                            Clear
                          </button>
                          <button className="llmCardButton primary" type="button" disabled={!canSubmit} onClick={submit}>
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (m.kind === 'scheduleCard' && m.schedule) {
                  const lang = (navigator.language || '').toLowerCase()
                  const zh = lang.startsWith('zh')
                  const card = m.schedule
                  const canConfirm = Boolean(card.selectedDateKey && card.selectedTimeKey)

                  const update = (updater: (card: ScheduleCard) => ScheduleCard) => {
                    setChatMessages((prev) =>
                      prev.map((x) => {
                        if (x.id !== m.id || x.kind !== 'scheduleCard' || !x.schedule) return x
                        return { ...x, schedule: updater(x.schedule) }
                      }),
                    )
                  }

                  const confirm = () => {
                    if (!card.selectedDateKey || !card.selectedTimeKey) return
                    const userId = `${Date.now()}-${idRef.current++}`
                    const summary = zh
                      ? `试驾预约：${card.selectedDateKey} · ${card.selectedTimeKey}`
                      : `Test drive: ${card.selectedDateKey} · ${card.selectedTimeKey}`
                    setChatMessages((prev) => [...prev, { id: userId, role: 'user', kind: 'text', text: summary }])
                    const assistantId = `${Date.now()}-${idRef.current++}`
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        id: assistantId,
                        role: 'assistant',
                        kind: 'text',
                        text: zh
                          ? '已为你提交试驾预约（演示）。'
                          : 'Your test drive request has been submitted (demo).',
                      },
                    ])
                  }

                  return (
                    <div key={m.id} className="llmRow left">
                      <div className="llmScheduleCard">
                        <div className="llmScheduleTitle">{zh ? '预约试驾' : 'Schedule a test drive'}</div>
                        <div className="llmScheduleStore">
                          <span className="llmScheduleStoreName">{card.storeName}</span>
                          <span className="llmScheduleStoreTz">{card.timezone}</span>
                        </div>
                        <div className="llmScheduleAddress">{card.address}</div>

                        <div className="llmScheduleSection">
                          <div className="llmScheduleLabel">{zh ? '日期' : 'Date'}</div>
                          <div className="llmScheduleOptions">
                            {card.dateOptions.map((o) => (
                              <button
                                key={o.key}
                                className={o.key === card.selectedDateKey ? 'llmScheduleOption selected' : 'llmScheduleOption'}
                                type="button"
                                onClick={() => update((c) => ({ ...c, selectedDateKey: o.key }))}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="llmScheduleSection">
                          <div className="llmScheduleLabel">{zh ? '时间' : 'Time'}</div>
                          <div className="llmScheduleOptions">
                            {card.timeOptions.map((o) => (
                              <button
                                key={o.key}
                                className={o.key === card.selectedTimeKey ? 'llmScheduleOption selected' : 'llmScheduleOption'}
                                type="button"
                                onClick={() => update((c) => ({ ...c, selectedTimeKey: o.key }))}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="llmCardActions">
                          <button className="llmCardButton secondary" type="button" onClick={() => update((c) => ({ ...c, selectedDateKey: undefined, selectedTimeKey: undefined }))}>
                            {zh ? '清除' : 'Clear'}
                          </button>
                          <button className="llmCardButton primary" type="button" disabled={!canConfirm} onClick={confirm}>
                            {zh ? '提交预约' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                const rowClass = m.role === 'user' ? 'llmRow right' : 'llmRow left'
                const bubbleClass =
                  m.role === 'user'
                    ? 'llmBubble user'
                    : m.kind === 'typing'
                      ? 'llmBubble assistant typing'
                      : 'llmBubble assistant'

                return (
                  <div key={m.id} className={rowClass}>
                    <div className={bubbleClass}>{m.kind === 'typing' ? '…' : m.text}</div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            <div className="llmComposer">
              <input
                className="llmComposerInput"
                placeholder="Message..."
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

          {isConfigOpen && (
            <section className="llmConfig" aria-label="LLM config">
              <div className="llmConfigTitle">Config</div>
              <label className="llmField">
                <div className="llmLabel">Mode</div>
                <select
                  className="llmSelect"
                  value={cfg.mode}
                  onChange={(e) =>
                    setCfg((p) => ({ ...p, mode: e.target.value === 'llm' ? 'llm' : 'mock' }))
                  }
                >
                  <option value="mock">Mock (works on Pages)</option>
                  <option value="llm">LLM (OpenAI-compatible)</option>
                </select>
              </label>
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
                GitHub Pages is static. Many providers block browser CORS. Use a CORS-enabled OpenAI-compatible proxy if LLM requests fail.
              </div>
              {error && <div className="llmError">{error}</div>}
              <div className="llmExamples">
                <div className="llmExamplesTitle">Try</div>
                <button className="llmChip" type="button" onClick={() => setDraft('store address')}>
                  store address
                </button>
                <button className="llmChip" type="button" onClick={() => setDraft('about CarMax')}>
                  about CarMax
                </button>
                <button className="llmChip" type="button" onClick={() => setDraft('price?')}>
                  price?
                </button>
                <button className="llmChip" type="button" onClick={() => setDraft('get quote')}>
                  get quote
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
