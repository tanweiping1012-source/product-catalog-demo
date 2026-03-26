import { useMemo, useState } from 'react'

type NavItemKey = 'inbox' | 'messageSettings' | 'messageAssistant' | 'knowledgeBase'

type KnowledgeSourceKey =
  | 'chatHistory'
  | 'adsCreative'
  | 'externalWebsite'
  | 'productCatalog'
  | 'currentAdsDestination'
  | 'organicCreative'

type ProductKey = 'aiChatbot' | 'aiGeneratedForm' | 'prefilledMessageTemplate'

type KnowledgeSource = {
  key: KnowledgeSourceKey
  name: string
  description: string
  lastSyncLabel: string
  enabled: boolean
}

type ProductSourceUsage = {
  key: ProductKey
  name: string
  description: string
  sources: Record<KnowledgeSourceKey, boolean>
}

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Toggle({
  checked,
  onChange,
  size = 'md',
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`ttamToggle ${size === 'sm' ? 'ttamToggleSm' : ''} ${checked ? 'ttamToggleOn' : ''} ${
        disabled ? 'ttamToggleDisabled' : ''
      }`}
      aria-pressed={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return
        onChange(!checked)
      }}
    >
      <span className="ttamToggleThumb" />
    </button>
  )
}

function Chip({ label }: { label: string }) {
  return <span className="ttamChip">{label}</span>
}

function SidebarItem({
  iconPath,
  label,
  itemKey,
  activeKey,
  onSelect,
}: {
  iconPath: string
  label: string
  itemKey: NavItemKey
  activeKey: NavItemKey
  onSelect: (next: NavItemKey) => void
}) {
  const active = activeKey === itemKey
  return (
    <button
      type="button"
      className={`ttamSidebarItem ${active ? 'ttamSidebarItemActive' : ''}`}
      onClick={() => onSelect(itemKey)}
    >
      <span className="ttamSidebarIcon">
        <Icon path={iconPath} />
      </span>
      <span className="ttamSidebarLabel">{label}</span>
    </button>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="ttamSectionTitle">
      <div className="ttamSectionTitleText">{title}</div>
      {subtitle ? <div className="ttamSectionTitleSub">{subtitle}</div> : null}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="ttamCard">{children}</div>
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="ttamTable">{children}</div>
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" className="ttamButton ttamButtonPrimary" onClick={onClick}>
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" className="ttamButton ttamButtonGhost" onClick={onClick}>
      {children}
    </button>
  )
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ttamLabelRow">
      <div className="ttamLabelRowLabel">{label}</div>
      <div className="ttamLabelRowValue">{value}</div>
    </div>
  )
}

export default function TtamApp() {
  const baseUrl = import.meta.env.BASE_URL
  const [activeKey, setActiveKey] = useState<NavItemKey>('knowledgeBase')

  const [assistantEnabled, setAssistantEnabled] = useState(true)
  const [assistantTab, setAssistantTab] = useState<'knowledgeBase' | 'leadInstructions'>('knowledgeBase')
  const [assistantDataSourceCatalogEnabled, setAssistantDataSourceCatalogEnabled] = useState(true)
  const [assistantConfigureTab, setAssistantConfigureTab] = useState<'businessInfo' | 'customQa'>('businessInfo')

  const [sources, setSources] = useState<KnowledgeSource[]>([
    {
      key: 'chatHistory',
      name: 'Chat history',
      description: 'Past conversations between you and customers.',
      lastSyncLabel: 'Synced 2h ago',
      enabled: true,
    },
    {
      key: 'adsCreative',
      name: 'Ads creative',
      description: 'Creatives and copy from ads used to start chats.',
      lastSyncLabel: 'Synced 1d ago',
      enabled: true,
    },
    {
      key: 'externalWebsite',
      name: 'External website',
      description: 'Pages from your website that describe products and policies.',
      lastSyncLabel: 'Synced 3d ago',
      enabled: true,
    },
    {
      key: 'productCatalog',
      name: 'Product catalog',
      description: 'Product feeds from Catalog Manager.',
      lastSyncLabel: 'Synced 10m ago',
      enabled: true,
    },
    {
      key: 'currentAdsDestination',
      name: 'Current ads destination',
      description: 'Ads Form and message template destination content.',
      lastSyncLabel: 'Synced 8h ago',
      enabled: true,
    },
    {
      key: 'organicCreative',
      name: 'Organic content',
      description: 'Business account posts and creative content.',
      lastSyncLabel: 'Synced 5d ago',
      enabled: false,
    },
  ])

  const [products, setProducts] = useState<ProductSourceUsage[]>([
    {
      key: 'aiChatbot',
      name: 'AI chatbot',
      description: 'Answers customer questions in chat.',
      sources: {
        chatHistory: true,
        adsCreative: true,
        externalWebsite: true,
        productCatalog: true,
        currentAdsDestination: true,
        organicCreative: false,
      },
    },
    {
      key: 'aiGeneratedForm',
      name: 'AI generated form',
      description: 'Generates a form based on available knowledge.',
      sources: {
        chatHistory: false,
        adsCreative: false,
        externalWebsite: true,
        productCatalog: false,
        currentAdsDestination: true,
        organicCreative: false,
      },
    },
    {
      key: 'prefilledMessageTemplate',
      name: 'AI prefilled message template',
      description: 'Prefills the first message to customers.',
      sources: {
        chatHistory: true,
        adsCreative: true,
        externalWebsite: false,
        productCatalog: true,
        currentAdsDestination: true,
        organicCreative: false,
      },
    },
  ])

  const enabledSourceKeys = useMemo(() => new Set(sources.filter((s) => s.enabled).map((s) => s.key)), [sources])

  const syncNow = () => {
    setSources((prev) =>
      prev.map((s) => (s.enabled ? { ...s, lastSyncLabel: 'Synced just now' } : s)),
    )
  }

  const setSourceEnabled = (key: KnowledgeSourceKey, enabled: boolean) => {
    setSources((prev) => prev.map((s) => (s.key === key ? { ...s, enabled } : s)))
  }

  const setProductSourceEnabled = (productKey: ProductKey, sourceKey: KnowledgeSourceKey, enabled: boolean) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.key !== productKey) return p
        return { ...p, sources: { ...p.sources, [sourceKey]: enabled } }
      }),
    )
  }

  const openUrl = (path: string) => `${baseUrl.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`

  const icons = useMemo(
    () => ({
      burger: 'M4 6h16M4 12h16M4 18h16',
      dm: 'M7 8h10a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H12l-3.5 2.5V16H7a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3Z',
      inbox: 'M4 12l3-6h10l3 6v7H4v-7Z M4 12h6l2 2h4l2-2h6',
      settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3h-6l-.4 2.3a7.6 7.6 0 0 0-1.7 1L4.6 5.4l-2 3.4L4.6 10a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.6 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1L9 21h6l.4-2.3c.6-.3 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.6Z',
      assistant: 'M9 11a3 3 0 1 1 6 0v1c0 1.5-1 3-3 3s-3-1.5-3-3v-1Z M5 20c1.5-2.3 4-3.5 7-3.5S17.5 17.7 19 20',
      book: 'M6 4h9a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V7a3 3 0 0 1 3-3Z M6 4v13',
      help: 'M12 18h.01M9.5 9.5a2.5 2.5 0 1 1 4.5 1.5c-.8.8-1.5 1.1-1.5 2.5',
      chevron: 'M9 6l6 6-6 6',
    }),
    [],
  )

  const renderMessageAssistantPage = () => {
    return (
      <div className="ttamMainGrid">
        <div className="ttamMainPanel">
          <div className="ttamPanelHeader">
            <div>
              <div className="ttamPanelTitleRow">
                <div className="ttamPanelTitle">Message assistant</div>
                <Toggle checked={assistantEnabled} onChange={setAssistantEnabled} />
              </div>
              <div className="ttamPanelSubtitle">
                Message assistant is the AI bot to help you talk with customers.
              </div>
            </div>
            <div className="ttamPanelHeaderRight">
              <button type="button" className="ttamIconButton" aria-label="Settings">
                <Icon path={icons.settings} />
              </button>
              <div className="ttamAccountPill">
                <span className="ttamAvatar" aria-hidden="true">
                  M
                </span>
                <span className="ttamAccountName">Margo Gonzalez</span>
                <span className="ttamAccountChevron">
                  <Icon path={icons.chevron} size={14} />
                </span>
              </div>
            </div>
          </div>

          <div className="ttamTabs">
            <button
              type="button"
              className={`ttamTab ${assistantTab === 'knowledgeBase' ? 'ttamTabActive' : ''}`}
              onClick={() => setAssistantTab('knowledgeBase')}
            >
              Knowledge base
            </button>
            <button
              type="button"
              className={`ttamTab ${assistantTab === 'leadInstructions' ? 'ttamTabActive' : ''}`}
              onClick={() => setAssistantTab('leadInstructions')}
            >
              Lead instructions
            </button>
          </div>

          {assistantTab === 'knowledgeBase' ? (
            <div className="ttamPanelBody">
              <SectionTitle title="Data source" />
              <Card>
                <div className="ttamRowBetween">
                  <div>
                    <div className="ttamCardTitle">Catalog</div>
                    <div className="ttamCardSub">
                      Utilize product catalog data to empower AI precise responses to user inquiries.
                    </div>
                    <a className="ttamInlineLink" href={openUrl('')} onClick={(e) => e.preventDefault()}>
                      Edit catalog
                    </a>
                  </div>
                  <Toggle checked={assistantDataSourceCatalogEnabled} onChange={setAssistantDataSourceCatalogEnabled} />
                </div>
              </Card>

              <SectionTitle title="Configure" />
              <div className="ttamSubTabs">
                <button
                  type="button"
                  className={`ttamSubTab ${assistantConfigureTab === 'businessInfo' ? 'ttamSubTabActive' : ''}`}
                  onClick={() => setAssistantConfigureTab('businessInfo')}
                >
                  Business information
                </button>
                <button
                  type="button"
                  className={`ttamSubTab ${assistantConfigureTab === 'customQa' ? 'ttamSubTabActive' : ''}`}
                  onClick={() => setAssistantConfigureTab('customQa')}
                >
                  Custom Q&amp;A
                </button>
                <button type="button" className="ttamImportLink">
                  <span className="ttamImportIcon">
                    <Icon path="M12 3v10m0 0 4-4m-4 4-4-4M5 21h14" size={16} />
                  </span>
                  Import
                </button>
              </div>

              <Card>
                {assistantConfigureTab === 'businessInfo' ? (
                  <div className="ttamForm">
                    <div className="ttamFormLabelRow">
                      <div className="ttamFormLabel">Business introduction</div>
                      <div className="ttamFormCounter">0/300</div>
                    </div>
                    <textarea
                      className="ttamTextarea"
                      rows={4}
                      defaultValue="GreenScape Innovations is a sustainable home and garden company specializing in smart, vertical gardening systems."
                    />
                  </div>
                ) : (
                  <div className="ttamForm">
                    <div className="ttamFormLabelRow">
                      <div className="ttamFormLabel">Custom Q&amp;A</div>
                    </div>
                    <div className="ttamMuted">
                      Add common questions and approved answers. (Static demo placeholder)
                    </div>
                  </div>
                )}
              </Card>

              <div className="ttamPublishRow">
                <div className="ttamMuted">Last published: 21/5/26, 13:33</div>
                <PrimaryButton>Publish</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="ttamPanelBody">
              <SectionTitle title="Lead instructions" subtitle="Control what information to collect in chat." />
              <Card>
                <div className="ttamStack">
                  <LabelRow label="High priority" value="Phone number" />
                  <LabelRow label="Medium priority" value="Email address" />
                  <LabelRow label="Low priority" value="Name, Location" />
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="ttamPreviewPanel">
          <div className="ttamPreviewHeader">Preview</div>
          <div className="ttamPreviewBody">
            <div className="ttamPreviewCard">
              <div className="ttamPreviewAvatar" aria-hidden="true">
                <span className="ttamPreviewAvatarInner">E</span>
              </div>
              <div className="ttamPreviewName">Enterprise</div>
              <div className="ttamPreviewHandle">@Enterprise</div>
              <div className="ttamPreviewMeta">36 videos · 227 followers</div>
            </div>
            <div className="ttamPreviewComposer">
              <div className="ttamComposerPlaceholder">What would your customers ask?</div>
              <div className="ttamComposerRow">
                <button type="button" className="ttamIconButton" aria-label="Upload">
                  <Icon path="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2M12 3v12m0 0 4-4m-4 4-4-4" />
                </button>
                <button type="button" className="ttamSendButton" aria-label="Send" disabled>
                  <Icon path="M4 12l16-8-6 16-2-6-8-2Z" />
                </button>
              </div>
              <div className="ttamComposerHint">Messages are generated by AI and may be inaccurate.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderKnowledgeBasePage = () => {
    return (
      <div className="ttamMainGrid">
        <div className="ttamMainPanel">
          <div className="ttamPanelHeader">
            <div>
              <div className="ttamPanelTitle">Knowledge base</div>
              <div className="ttamPanelSubtitle">
                Manage extracted information, knowledge sources, and instructions used across AI products.
              </div>
            </div>
            <div className="ttamPanelHeaderRight">
              <GhostButton onClick={syncNow}>Sync now</GhostButton>
              <div className="ttamSyncHint">Automatic sync · Every 6h</div>
            </div>
          </div>

          <div className="ttamPanelBody">
            <SectionTitle title="Extracted information" subtitle="Information the system has extracted about your business." />
            <Card>
              <div className="ttamInfoGrid">
                <LabelRow label="Business name" value="GreenScape Innovations" />
                <LabelRow label="Business description" value="Smart, sustainable vertical gardening systems for homes." />
                <LabelRow label="Support email" value="support@greenscape.example" />
                <LabelRow label="Phone" value="+1 (555) 012-3456" />
                <LabelRow label="Website" value="https://greenscape.example" />
                <LabelRow label="Location" value="San Francisco, CA" />
              </div>
            </Card>

            <SectionTitle title="Knowledge sources" subtitle="Choose which sources are used to extract and refresh knowledge." />
            <div className="ttamSourcesGrid">
              {sources.map((s) => (
                <Card key={s.key}>
                  <div className="ttamRowBetween">
                    <div className="ttamStack">
                      <div className="ttamCardTitle">{s.name}</div>
                      <div className="ttamCardSub">{s.description}</div>
                      <div className="ttamMetaRow">
                        <Chip label={s.lastSyncLabel} />
                        {s.enabled ? <Chip label="In use" /> : <Chip label="Off" />}
                      </div>
                    </div>
                    <Toggle checked={s.enabled} onChange={(next) => setSourceEnabled(s.key, next)} />
                  </div>
                </Card>
              ))}
            </div>

            <SectionTitle
              title="Source usage by product"
              subtitle="Turn on and off usage of each source for each product."
            />
            <Table>
              <div className="ttamTableHeader">
                <div className="ttamTableCell ttamTableCellGrow">Product</div>
                {sources.map((s) => (
                  <div key={s.key} className="ttamTableCell ttamTableCellCenter">
                    <span className={`ttamTableHeaderPill ${enabledSourceKeys.has(s.key) ? '' : 'ttamDisabled'}`}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
              {products.map((p) => (
                <div key={p.key} className="ttamTableRow">
                  <div className="ttamTableCell ttamTableCellGrow">
                    <div className="ttamTableProductName">{p.name}</div>
                    <div className="ttamTableProductSub">{p.description}</div>
                  </div>
                  {sources.map((s) => {
                    const disabled = !enabledSourceKeys.has(s.key)
                    const checked = p.sources[s.key] && !disabled
                    return (
                      <div key={s.key} className="ttamTableCell ttamTableCellCenter">
                        <Toggle
                          size="sm"
                          checked={checked}
                          disabled={disabled}
                          onChange={(next) => setProductSourceEnabled(p.key, s.key, next)}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </Table>

            <SectionTitle title="Instructions and memory" subtitle="Control what to collect and review memory summaries." />
            <div className="ttamTwoCol">
              <Card>
                <div className="ttamCardTitle">Contact information collection</div>
                <div className="ttamCardSub">Control what information to collect, and in what priority.</div>
                <div className="ttamStack ttamTopGap">
                  <LabelRow label="Priority 1" value="Phone number" />
                  <LabelRow label="Priority 2" value="Email address" />
                  <LabelRow label="Priority 3" value="Name, Location" />
                </div>
              </Card>
              <Card>
                <div className="ttamCardTitle">Memory summary</div>
                <div className="ttamCardSub">Summarized from previous conversations with customers.</div>
                <div className="ttamMemoryBlock ttamTopGap">
                  <div className="ttamMemoryRow">
                    <div className="ttamMemoryKey">Communication style</div>
                    <div className="ttamMemoryVal">Friendly, concise, and solution-oriented.</div>
                  </div>
                  <div className="ttamMemoryRow">
                    <div className="ttamMemoryKey">Preferred answers</div>
                    <div className="ttamMemoryVal">Recommend products with concrete benefits and pricing ranges.</div>
                  </div>
                  <div className="ttamMemoryRow">
                    <div className="ttamMemoryKey">Escalation rules</div>
                    <div className="ttamMemoryVal">Escalate warranty and refund questions to a human agent.</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="ttamPreviewPanel">
          <div className="ttamPreviewHeader">Preview</div>
          <div className="ttamPreviewBody">
            <div className="ttamPreviewCard">
              <div className="ttamPreviewAvatar" aria-hidden="true">
                <span className="ttamPreviewAvatarInner">E</span>
              </div>
              <div className="ttamPreviewName">Enterprise</div>
              <div className="ttamPreviewHandle">@Enterprise</div>
              <div className="ttamPreviewMeta">36 videos · 227 followers</div>
            </div>
            <div className="ttamPreviewComposer">
              <div className="ttamComposerPlaceholder">Ask something about your business…</div>
              <div className="ttamComposerRow">
                <button type="button" className="ttamIconButton" aria-label="Help">
                  <Icon path={icons.help} />
                </button>
                <button type="button" className="ttamSendButton" aria-label="Send" disabled>
                  <Icon path="M4 12l16-8-6 16-2-6-8-2Z" />
                </button>
              </div>
              <div className="ttamComposerHint">Static preview placeholder.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ttamRoot">
      <div className="ttamShell">
        <div className="ttamTopBar">
          <div className="ttamTopLeft">
            <button type="button" className="ttamIconButton" aria-label="Menu">
              <Icon path={icons.burger} />
            </button>
            <div className="ttamBrand">
              <span className="ttamBrandMark" aria-hidden="true">
                ♪
              </span>
              <span className="ttamBrandText">TikTok</span>
              <span className="ttamBrandTextStrong">Lead Center</span>
            </div>
          </div>
          <div className="ttamTopRight">
            <div className="ttamTopRightPill">Adv account</div>
          </div>
        </div>

        <div className="ttamBody">
          <div className="ttamSidebar">
            <div className="ttamSidebarSection">
              <div className="ttamSidebarSectionTitle">Lead management</div>
            </div>

            <div className="ttamSidebarSection ttamSidebarGroup">
              <div className="ttamSidebarGroupHeader">
                <span className="ttamSidebarGroupIcon">
                  <Icon path={icons.dm} />
                </span>
                <span className="ttamSidebarGroupLabel">Direct Message</span>
                <span className="ttamSidebarGroupChevron">
                  <Icon path={icons.chevron} size={14} />
                </span>
              </div>
              <div className="ttamSidebarGroupItems">
                <SidebarItem iconPath={icons.inbox} label="Inbox" itemKey="inbox" activeKey={activeKey} onSelect={setActiveKey} />
                <SidebarItem iconPath={icons.settings} label="Message settings" itemKey="messageSettings" activeKey={activeKey} onSelect={setActiveKey} />
                <SidebarItem iconPath={icons.assistant} label="Message assistant" itemKey="messageAssistant" activeKey={activeKey} onSelect={setActiveKey} />
                <SidebarItem iconPath={icons.book} label="Knowledge base" itemKey="knowledgeBase" activeKey={activeKey} onSelect={setActiveKey} />
              </div>
            </div>
          </div>

          <div className="ttamContent">
            {activeKey === 'messageAssistant' ? renderMessageAssistantPage() : null}
            {activeKey === 'knowledgeBase' ? renderKnowledgeBasePage() : null}
            {activeKey === 'inbox' || activeKey === 'messageSettings' ? (
              <div className="ttamEmptyState">
                <div className="ttamEmptyTitle">Static demo</div>
                <div className="ttamEmptySub">
                  Switch to <strong>Message assistant</strong> or <strong>Knowledge base</strong>.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="ttamFooter">
        <a className="ttamFooterLink" href={openUrl('')}>
          Back to demo
        </a>
        <a className="ttamFooterLink" href={openUrl('llm/')}>
          Go to LLM demo
        </a>
        <a className="ttamFooterLink" href={openUrl('ttam/')}>
          Open in new tab
        </a>
      </div>
    </div>
  )
}
