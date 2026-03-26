import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Modal = 'none' | 'report' | 'ad' | 'profile' | 'businessInfo' | 'iab'
type ChatRole = 'assistant' | 'user'
type ChatKind = 'text' | 'contact' | 'typing' | 'merchantCard' | 'leadCard' | 'scheduleCard'
type MerchantCard = {
  name: string
  subtitle: string
  websiteLabel: string
  websiteUrl: string
  phone: string
  hours: string
  address: string
}
type LeadRegion = 'APAC' | 'China' | 'NAMER' | 'METAP' | 'LATAM' | 'EasternEurope' | 'EuropeOthers'
type LeadField = 'phone' | 'email' | 'name' | 'location'
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
type ChatMessage = {
  id: string
  role: ChatRole
  kind: ChatKind
  text?: string
  merchant?: MerchantCard
  lead?: LeadCard
  schedule?: ScheduleCard
}
type ReplyResult = {
  text: string
  action?: () => void
  extras?: Array<Omit<ChatMessage, 'id'>>
}

function App() {
  const baseUrl = import.meta.env.BASE_URL
  const figmaAsset = (fileName: string) => `${baseUrl}assets/figma/${fileName}`

  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [hasSharedContact, setHasSharedContact] = useState(false)
  const [isContactPanelVisible, setIsContactPanelVisible] = useState(true)
  const [modal, setModal] = useState<Modal>('none')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const catalogPrice = useMemo(() => {
    if (!hasSharedContact) return null
    return { integer: '40,998', decimal: '.99' }
  }, [hasSharedContact])

  const buildId = useRef(0)

  const leadRequiredFieldsByRegion: Record<LeadRegion, LeadField[]> = useMemo(
    () => ({
      APAC: ['phone'],
      China: ['phone'],
      NAMER: ['phone', 'email'],
      METAP: ['phone', 'email'],
      LATAM: ['phone', 'email'],
      EasternEurope: ['phone', 'email'],
      EuropeOthers: ['phone', 'email', 'name'],
    }),
    [],
  )

  const defaultLeadRegion = (): LeadRegion => {
    const lang = (navigator.language || '').toLowerCase()
    if (lang.startsWith('zh')) return 'China'

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Europe/')) {
      if (/kyiv|kiev|warsaw|prague|bucharest|sofia|budapest|vilnius|riga|tallinn/i.test(tz)) {
        return 'EasternEurope'
      }
      return 'EuropeOthers'
    }
    if (tz.startsWith('America/')) return 'NAMER'
    if (tz.startsWith('Asia/')) return 'APAC'
    return 'NAMER'
  }

  const createLeadCard = (intent: LeadCard['intent']): LeadCard => {
    const region = defaultLeadRegion()
    return {
      region,
      required: leadRequiredFieldsByRegion[region],
      values: {},
      intent,
    }
  }

  const updateLeadCard = (messageId: string, updater: (lead: LeadCard) => LeadCard) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || m.kind !== 'leadCard' || !m.lead) return m
        return { ...m, lead: updater(m.lead) }
      }),
    )
  }

  const createScheduleCard = (): ScheduleCard => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const lang = (navigator.language || '').toLowerCase()
    const isZh = lang.startsWith('zh')
    const now = new Date()

    const formatDate = (d: Date) => {
      const day = new Intl.DateTimeFormat(isZh ? 'zh-CN' : undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: tz,
      }).format(d)
      return isZh ? day.replace('周', '周') : day
    }

    const dateOptions = Array.from({ length: 3 }).map((_, idx) => {
      const d = new Date(now)
      d.setDate(d.getDate() + idx + 1)
      const key = d.toISOString().slice(0, 10)
      return { key, label: formatDate(d) }
    })

    const makeTimeLabel = (h: number, m: number) => {
      const d = new Date(now)
      d.setHours(h, m, 0, 0)
      return new Intl.DateTimeFormat(isZh ? 'zh-CN' : undefined, {
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

  const updateScheduleCard = (messageId: string, updater: (card: ScheduleCard) => ScheduleCard) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || m.kind !== 'scheduleCard' || !m.schedule) return m
        return { ...m, schedule: updater(m.schedule) }
      }),
    )
  }

  const systemItems = useMemo(
    () => [
      { type: 'timestamp' as const, text: '8:00 PM' },
      {
        type: 'info' as const,
        text: 'You open this chat through business Ads.',
        link: {
          label: 'Learn more about business chats and your privacy.',
          action: () => setModal('businessInfo'),
        },
      },
      {
        type: 'info' as const,
        text: 'You viewed an ad before opening this chat.',
        link: { label: 'View ad', action: () => setModal('ad') },
      },
    ],
    [],
  )

  const lastMessageId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastMessageId, isContactPanelVisible, modal])

  const isChinese = (s: string) => /[\u4e00-\u9fff]/.test(s)

  const reply = (input: string): ReplyResult => {
    const normalized = input.trim().toLowerCase()
    const normalizedNoSpace = normalized.replace(/\s+/g, '')
    const inputNoSpace = input.replace(/\s+/g, '')

    const wantsPrice =
      /price|cost|\$|how much/.test(normalized) || /价格|多少钱|多少錢|报价|報價/.test(input)
    const wantsAvailability =
      /available|availability|in stock/.test(normalized) || /在售|库存|还有吗|有货|還有嗎/.test(input)
    const wantsMileage = /mileage|odometer/.test(normalized) || /里程|公里|公里数|公里數/.test(input)
    const wantsAccident =
      /accident|carfax|history/.test(normalized) || /事故|出险|出險|车况|車況|维修|維修/.test(input)
    const wantsFinancing =
      /finance|loan|apr|monthly/.test(normalized) || /分期|贷款|貸款|月供|首付|利率/.test(input)
    const wantsTradeIn = /trade ?in/.test(normalized) || /置换|置換|旧车|舊車/.test(input)
    const wantsTestDrive =
      /test\s*drive|testdrive|drive\s*test/.test(normalized) || /试驾|試駕/.test(input)
    const wantsDelivery =
      /delivery|ship|shipping|pickup/.test(normalized) || /交付|送车|送車|配送|自提/.test(input)
    const wantsWarranty =
      /warranty|guarantee|return/.test(normalized) || /质保|保修|保固|退换|退換|退车|退車/.test(input)
    const wantsWebsite =
      /website|open.*site|carmax\.com/.test(normalized) || /官网|官網|打开网站|打開網站/.test(input)
    const wantsStoreAddress =
      /(store|dealership).*(address|location)/.test(normalized) ||
      /(address|location).*(store|dealership)/.test(normalized) ||
      /where.*(store|dealership)|where are you/.test(normalized) ||
      normalizedNoSpace.includes('storeaddress') ||
      normalizedNoSpace.includes('dealershipaddress') ||
      /门店地址|門店地址|店铺地址|店鋪地址|地址在哪里|地址在哪|门店在哪|門店在哪|在哪儿|在哪裡|位置|怎么去|怎麼去/.test(
        input,
      )
    const wantsMerchantInfo =
      /carmax|dealer|dealership|seller|business|company|store|shop|about you|who are you|contact|address|hours|location/.test(
        normalized,
      ) ||
      /商家|店铺|店鋪|门店|門店|车商|車商|公司|关于你|你是谁|你是誰|联系方式|聯繫方式|电话|電話|地址|营业时间|營業時間|位置/.test(
        input,
      ) ||
      normalizedNoSpace.includes('carmax') ||
      /营业时间|營業時間|联系方式|聯繫方式|门店|門店|店铺|店鋪|地址|电话|電話/.test(inputNoSpace)
    const wantsLeadCapture =
      /lead|contact info|reach you|call me|email me|quote|get quote|booking|book/.test(normalized) ||
      /留资|留資|留信息|留資料|联系方式|聯繫方式|报价|報價|获取报价|獲取報價|预约|預約|联系我|聯繫我/.test(
        input,
      )

    const zh = isChinese(input)

    if (wantsWebsite) {
      return {
        text: zh
          ? '我可以打开 carmax.com 的页面给你查看（演示版 WebView）。'
          : 'I can open a carmax.com page in the demo web view.',
        action: () => setModal('iab'),
      }
    }

    if (wantsStoreAddress) {
      return {
        text: zh
          ? '门店地址：Demo location · United States。你也可以直接在这里预约一个试驾时间（演示）。'
          : 'Store address: Demo location · United States. You can also book a test drive time here (demo).',
        extras: [{ role: 'assistant', kind: 'scheduleCard', schedule: createScheduleCard() }],
      }
    }

    if (wantsMerchantInfo) {
      const mentionsAddress =
        /(address|location|where|map)/.test(normalized) ||
        /地址|位置|怎么去|怎麼去|在哪儿|在哪裡/.test(inputNoSpace)
      if (mentionsAddress) {
        return {
          text: zh
            ? '门店地址：Demo location · United States。你也可以直接在这里预约一个试驾时间（演示）。'
            : 'Store address: Demo location · United States. You can also book a test drive time here (demo).',
          extras: [{ role: 'assistant', kind: 'scheduleCard', schedule: createScheduleCard() }],
        }
      }

      const card: MerchantCard = {
        name: 'CarMax',
        subtitle: 'Business chat',
        websiteLabel: 'carmax.com',
        websiteUrl: 'https://www.carmax.com/',
        phone: '+1 (800) 519-1511',
        hours: 'Mon–Sun · 10:00 AM–9:00 PM',
        address: 'Demo location · United States',
      }

      return {
        text: zh
          ? '当然可以。这里是商家信息卡（演示版），你也可以点击打开官网页面。'
          : 'Sure — here’s the merchant info card (demo). You can also open the website.',
        extras: [{ role: 'assistant', kind: 'merchantCard', merchant: card }],
      }
    }

    if (wantsLeadCapture) {
      return {
        text: zh
          ? '为了更好地服务你，请填写留资信息（演示版）。我会根据地区组合收集字段。'
          : 'To better help you, please share your contact details (demo). Fields vary by region.',
        extras: [{ role: 'assistant', kind: 'leadCard', lead: createLeadCard('general') }],
      }
    }

    if (wantsPrice) {
      if (!hasSharedContact) {
        return {
          text: zh
            ? '为了展示价格，请先留资（演示版）。我会根据地区组合收集字段，提交后我会展示价格。'
            : 'To reveal the price, please share your contact details (demo). After you submit, I can show the price.',
          extras: [{ role: 'assistant', kind: 'leadCard', lead: createLeadCard('revealPrice') }],
        }
      }

      return {
        text: zh
          ? `这辆 Porsche Macan S 的价格是 $${catalogPrice?.integer}${catalogPrice?.decimal}。你想了解里程、车况历史还是贷款分期？`
          : `The price for this Porsche Macan S is $${catalogPrice?.integer}${catalogPrice?.decimal}. Want mileage, vehicle history, or financing?`,
      }
    }

    if (wantsAvailability) {
      return {
        text: zh
          ? '目前这辆车在演示中显示为可售。如果你想继续，我可以帮你安排试驾或查看交付/配送选项。'
          : 'In this demo, the vehicle is available. I can help you schedule a test drive or check delivery options.',
      }
    }

    if (wantsMileage) {
      return {
        text: zh
          ? '演示数据：里程约 42,000 miles（可在真实场景接入库存数据）。你更关心通勤还是长途使用？'
          : 'Demo data: ~42,000 miles. In production this can be wired to inventory. Are you using it for commute or long trips?',
      }
    }

    if (wantsAccident) {
      return {
        text: zh
          ? '我可以帮你看车辆历史（事故/出险/维保等）。演示版暂时返回“无重大事故记录”的示例结论；真实接入可对接 Carfax/内部检测报告。'
          : 'I can help check vehicle history (accidents/repairs). In this demo: “no major accidents reported”. Production can integrate Carfax/inspection reports.',
      }
    }

    if (wantsFinancing) {
      return {
        text: zh
          ? '分期通常取决于首付、期限、信用情况。你期望的月供区间是多少？（例如 $500-$800）'
          : 'Financing depends on down payment, term, and credit profile. What monthly payment range are you targeting (e.g. $500–$800)?',
      }
    }

    if (wantsTradeIn) {
      return {
        text: zh
          ? '可以置换。你现在的车型/年份/里程大概是多少？我可以给一个估价范围（演示）。'
          : 'Trade-in is available. What’s your current car model/year/mileage? I can provide a demo estimate range.',
      }
    }

    if (wantsTestDrive) {
      return {
        text: zh
          ? '可以安排试驾。你可以直接在下方选择日期和时间提交预约（演示）。'
          : 'We can schedule a test drive. Pick a date and time below to submit (demo).',
        extras: [{ role: 'assistant', kind: 'scheduleCard', schedule: createScheduleCard() }],
      }
    }

    if (wantsDelivery) {
      return {
        text: zh
          ? '交付方式通常包括到店自提或送车到家（视地区）。你在哪个城市？'
          : 'Delivery can be pickup or home delivery depending on location. What city are you in?',
      }
    }

    if (wantsWarranty) {
      return {
        text: zh
          ? '演示版：支持一定期限的质保/退车政策。你更关注动力总成、整车质保还是退车窗口期？'
          : 'Demo: warranty/return policy available. Are you asking about powertrain, bumper-to-bumper, or the return window?',
      }
    }

    return {
      text: zh
        ? '我可以帮你解答关于价格、里程、车况历史、分期、试驾、交付、置换等问题。你想先问哪一个？'
        : 'I can help with price, mileage, vehicle history, financing, test drive, delivery, and trade-in. What would you like to ask first?',
    }
  }

  const send = () => {
    const value = draft.trim()
    if (!value) return
    const id = `${Date.now()}-${buildId.current++}`
    setChatMessages((prev) => [...prev, { id, role: 'user', kind: 'text', text: value }])
    setDraft('')

    const typingId = `${Date.now()}-${buildId.current++}`
    setChatMessages((prev) => [...prev, { id: typingId, role: 'assistant', kind: 'typing' }])

    window.setTimeout(() => {
      const response = reply(value)
      setChatMessages((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== typingId)
        const respId = `${Date.now()}-${buildId.current++}`
        const base: ChatMessage[] = [
          ...withoutTyping,
          { id: respId, role: 'assistant', kind: 'text', text: response.text },
        ]
        if (!response.extras || response.extras.length === 0) return base
        const extraWithIds: ChatMessage[] = response.extras.map((e) => ({
          id: `${Date.now()}-${buildId.current++}`,
          ...e,
        }))
        return [...base, ...extraWithIds]
      })
      if (response.action) response.action()
    }, 550)
  }

  const shareContact = () => {
    const contact = '+19876543210'
    const id = `${Date.now()}-${buildId.current++}`
    setChatMessages((prev) => [...prev, { id, role: 'user', kind: 'contact', text: contact }])
    setHasSharedContact(true)
    setIsContactPanelVisible(false)

    const typingId = `${Date.now()}-${buildId.current++}`
    setChatMessages((prev) => [...prev, { id: typingId, role: 'assistant', kind: 'typing' }])
    window.setTimeout(() => {
      setChatMessages((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== typingId)
        const respId = `${Date.now()}-${buildId.current++}`
        const text = 'Thanks! The price is $40,998.99. Would you like to schedule a test drive?'
        return [...withoutTyping, { id: respId, role: 'assistant', kind: 'text', text }]
      })
    }, 600)
  }

  const closeAllOverlays = () => {
    setIsMoreOpen(false)
    setModal('none')
  }

  return (
    <div className="appRoot">
      <div className="phone" role="application" aria-label="DM demo">
        {(isMoreOpen || (modal !== 'none' && modal !== 'iab')) && (
          <button
            className="overlay"
            aria-label="Close overlay"
            onClick={closeAllOverlays}
          />
        )}

        <div className="navBar">
          <div className="statusBar">
            <div className="statusTime">8:00</div>
            <div className="statusIcons">
              <div className="statusCellular" aria-hidden="true">
                <img src={figmaAsset('icon-cellular-1.svg')} alt="" />
                <img src={figmaAsset('icon-cellular-2.svg')} alt="" />
                <img src={figmaAsset('icon-cellular-3.svg')} alt="" />
                <img src={figmaAsset('icon-cellular-4.svg')} alt="" />
              </div>
              <div className="statusWifi" aria-hidden="true">
                <img src={figmaAsset('icon-wifi-1.svg')} alt="" />
                <img src={figmaAsset('icon-wifi-2.svg')} alt="" />
                <img src={figmaAsset('icon-wifi-3.svg')} alt="" />
              </div>
              <img
                className="statusBattery"
                src={figmaAsset('icon-battery.svg')}
                alt=""
              />
            </div>
          </div>

          <div className="chatNavBar">
            <div className="chatNavRow">
              <div className="chatNavLeft">
                <button
                  className="iconButton navIconButton navBackButton"
                  aria-label="Back"
                  onClick={() => setModal('none')}
                >
                  <img src={figmaAsset('icon-chevron-left.svg')} alt="" />
                </button>
                <button
                  className="avatarButton"
                  aria-label="Open profile"
                  onClick={() => setModal('profile')}
                >
                  <img src={figmaAsset('avatar.png')} alt="" />
                </button>
              </div>

              <button
                className="chatNavCenter"
                aria-label="Business chat info"
                onClick={() => setModal('businessInfo')}
              >
                <div className="chatTitleRow">
                  <div className="chatTitle">Car Max</div>
                  <img
                    className="chatVerified"
                    src={figmaAsset('icon-tick-circle.svg')}
                    alt=""
                  />
                </div>
                <div className="chatSubtitle">Business chat</div>
              </button>

              <div className="chatNavRight">
                <button
                  className="iconButton navIconButton"
                  aria-label="Report"
                  onClick={() => setModal('report')}
                >
                  <img src={figmaAsset('icon-flag.svg')} alt="" />
                </button>
                <button
                  className="iconButton navIconButton"
                  aria-label="More"
                  aria-expanded={isMoreOpen}
                  onClick={() => setIsMoreOpen((v) => !v)}
                >
                  <img src={figmaAsset('icon-ellipsis.svg')} alt="" />
                </button>
              </div>
            </div>
            <div className="chatNavHairline" />
          </div>
        </div>

        {isMoreOpen && (
          <div className="popover" role="menu" aria-label="More actions">
            <button
              className="popoverItem"
              role="menuitem"
              onClick={() => {
                setIsMoreOpen(false)
              }}
            >
              Mute
            </button>
            <button
              className="popoverItem"
              role="menuitem"
              onClick={() => {
                setIsMoreOpen(false)
              }}
            >
              Block
            </button>
            <button
              className="popoverItem danger"
              role="menuitem"
              onClick={() => {
                setIsMoreOpen(false)
              }}
            >
              Delete chat
            </button>
          </div>
        )}

        <div className="messages" aria-label="Messages">
          <div className="headerCard">
            <img className="headerAvatar" src={figmaAsset('avatar.png')} alt="" />
            <div className="headerName">Car Max</div>
            <div className="headerIntro">128 videos · 1.1M followers</div>
            <div className="headerReply">
              <img
                className="headerReplyIcon"
                src={figmaAsset('icon-timer-moving.svg')}
                alt=""
              />
              <div className="headerReplyText">Typically replies in 10 minutes</div>
            </div>
          </div>

          <div className="systemStack">
            {systemItems.map((item, idx) => {
              if (item.type === 'timestamp') {
                return (
                  <div key={idx} className="systemTimestamp">
                    {item.text}
                  </div>
                )
              }

              return (
                <div key={idx} className="systemInfo">
                  <span>{item.text} </span>
                  {item.link && (
                    <button
                      className="inlineLink"
                      onClick={() => item.link?.action()}
                    >
                      {item.link.label}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="receivedStack" aria-label="Received messages">
            <div className="receivedBubble">
              <div className="receivedText">
                Thanks for reaching out! I'd love to tell you more on how we might be able to
                collaborate. Please share your contact information.
              </div>
              <button
                className="productCard"
                type="button"
                aria-label="Open product catalog"
                onClick={() => setModal('iab')}
              >
                <img
                  className="productThumb"
                  src={figmaAsset('product-thumb-1.png')}
                  alt=""
                />
                <div className="productMeta">
                  <div className="productTextStack">
                    <div className="productTitle">Porsche Macan S</div>
                    <div className="productDesc">
                      Premium Package 4WD/AWD Turbo Charged Engine Leather Seats BOSE Sound System
                      Satellite Radio Ready Parking Sensors Rear View Camera Panoramic Sunroof
                      Navigation System Tow Hitch Front Seat Heater
                    </div>
                  </div>
                  <div className="productPrice" aria-label="Price">
                    <span className="productCurrency">$</span>
                    <span className="productNum">{catalogPrice ? catalogPrice.integer : '*****'}</span>
                    {catalogPrice && <span className="productDecimal">{catalogPrice.decimal}</span>}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {chatMessages.length > 0 && (
            <div className="chatStack" aria-label="Chat messages">
              {chatMessages.map((m) => {
                const isUser = m.role === 'user'
                if (m.kind === 'merchantCard' && m.role === 'assistant' && m.merchant) {
                  return (
                    <div key={m.id} className="messageRow left">
                      <div className="merchantCard" role="group" aria-label="Merchant info card">
                        <div className="merchantHeader">
                          <img className="merchantLogo" src={figmaAsset('avatar.png')} alt="" />
                          <div className="merchantHeaderText">
                            <div className="merchantName">{m.merchant.name}</div>
                            <div className="merchantSubtitle">{m.merchant.subtitle}</div>
                          </div>
                        </div>
                        <div className="merchantDetails">
                          <div className="merchantDetailRow">
                            <span className="merchantDetailLabel">Hours</span>
                            <span className="merchantDetailValue">{m.merchant.hours}</span>
                          </div>
                          <div className="merchantDetailRow">
                            <span className="merchantDetailLabel">Phone</span>
                            <span className="merchantDetailValue">{m.merchant.phone}</span>
                          </div>
                          <div className="merchantDetailRow">
                            <span className="merchantDetailLabel">Address</span>
                            <span className="merchantDetailValue">{m.merchant.address}</span>
                          </div>
                        </div>
                        <div className="merchantActions">
                          <button
                            className="merchantAction"
                            onClick={() => setModal('businessInfo')}
                            type="button"
                          >
                            Business info
                          </button>
                          <button
                            className="merchantAction primary"
                            onClick={() => setModal('iab')}
                            type="button"
                          >
                            Open website
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (m.kind === 'leadCard' && m.role === 'assistant' && m.lead) {
                  const required = new Set(m.lead.required)
                  const zh = (navigator.language || '').toLowerCase().startsWith('zh')
                  const regionLabel =
                    m.lead.region === 'EuropeOthers'
                      ? 'Europe (Others)'
                      : m.lead.region === 'EasternEurope'
                        ? 'Eastern Europe'
                        : m.lead.region

                  const fieldLabel = (f: LeadField) => {
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

                  const fieldPlaceholder = (f: LeadField) => {
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

                  const fields: LeadField[] = ['phone', 'email', 'name', 'location']
                  const canSubmit = fields
                    .filter((f) => required.has(f))
                    .every((f) => (m.lead?.values[f] || '').trim().length > 0)

                  const onSubmit = () => {
                    if (!m.lead) return
                    if (!canSubmit) return

                    const id = `${Date.now()}-${buildId.current++}`
                    const parts: string[] = []
                    if (m.lead.values.phone) parts.push(String(m.lead.values.phone))
                    if (m.lead.values.email) parts.push(String(m.lead.values.email))
                    if (m.lead.values.name) parts.push(String(m.lead.values.name))
                    if (m.lead.values.location) parts.push(String(m.lead.values.location))
                    setChatMessages((prev) => [...prev, { id, role: 'user', kind: 'text', text: parts.join(' · ') }])
                    setHasSharedContact(true)
                    setIsContactPanelVisible(false)

                    const typingId = `${Date.now()}-${buildId.current++}`
                    setChatMessages((prev) => [...prev, { id: typingId, role: 'assistant', kind: 'typing' }])
                    window.setTimeout(() => {
                      setChatMessages((prev) => {
                        const withoutTyping = prev.filter((x) => x.id !== typingId)
                        const respId = `${Date.now()}-${buildId.current++}`
                        const text =
                          m.lead?.intent === 'revealPrice'
                            ? 'Thanks! The price is $40,998.99. Would you like to schedule a test drive?'
                            : 'Thanks! We’ve saved your details. What would you like to do next (price, test drive, financing)?'
                        return [...withoutTyping, { id: respId, role: 'assistant', kind: 'text', text }]
                      })
                    }, 550)
                  }

                  return (
                    <div key={m.id} className="messageRow left">
                      <div className="leadCard" role="group" aria-label="Lead capture card">
                        <div className="leadTitle">Contact information to collect</div>
                        <div className="leadMeta">
                          <span className="leadMetaLabel">Region</span>
                          <select
                            className="leadSelect"
                            value={m.lead.region}
                            onChange={(e) => {
                              const region = e.target.value as LeadRegion
                              updateLeadCard(m.id, (lead) => ({
                                ...lead,
                                region,
                                required: leadRequiredFieldsByRegion[region],
                              }))
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
                          <span className="leadRegionHint">{regionLabel}</span>
                        </div>

                        <div className="leadFields">
                          {fields.map((f) => (
                            <label key={f} className="leadField">
                              <div className="leadFieldLabel">
                                <span>{fieldLabel(f)}</span>
                                <span className={required.has(f) ? 'leadTag req' : 'leadTag opt'}>
                                  {required.has(f) ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              <input
                                className="leadInput"
                                value={m.lead?.values[f] ?? ''}
                                placeholder={fieldPlaceholder(f)}
                                onChange={(e) => {
                                  const v = e.target.value
                                  updateLeadCard(m.id, (lead) => ({
                                    ...lead,
                                    values: { ...lead.values, [f]: v },
                                  }))
                                }}
                              />
                            </label>
                          ))}
                        </div>

                        <div className="leadActions">
                          <button
                            className="leadButton secondary"
                            type="button"
                            onClick={() => updateLeadCard(m.id, (lead) => ({ ...lead, values: {} }))}
                          >
                            Clear
                          </button>
                          <button
                            className="leadButton primary"
                            type="button"
                            disabled={!canSubmit}
                            onClick={onSubmit}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (m.kind === 'scheduleCard' && m.role === 'assistant' && m.schedule) {
                  const lang = (navigator.language || '').toLowerCase()
                  const zh = lang.startsWith('zh')
                  const card = m.schedule
                  const canConfirm = Boolean(card.selectedDateKey && card.selectedTimeKey)

                  const onConfirm = () => {
                    if (!card.selectedDateKey || !card.selectedTimeKey) return
                    const id = `${Date.now()}-${buildId.current++}`
                    const summary = zh
                      ? `试驾预约：${card.selectedDateKey} · ${card.selectedTimeKey}`
                      : `Test drive: ${card.selectedDateKey} · ${card.selectedTimeKey}`
                    setChatMessages((prev) => [...prev, { id, role: 'user', kind: 'text', text: summary }])

                    const typingId = `${Date.now()}-${buildId.current++}`
                    setChatMessages((prev) => [...prev, { id: typingId, role: 'assistant', kind: 'typing' }])
                    window.setTimeout(() => {
                      setChatMessages((prev) => {
                        const withoutTyping = prev.filter((x) => x.id !== typingId)
                        const respId = `${Date.now()}-${buildId.current++}`
                        const text = zh
                          ? '已为你提交试驾预约（演示）。如需修改时间，重新选择后再次提交即可。'
                          : 'Your test drive request has been submitted (demo). To change it, pick another slot and submit again.'
                        return [...withoutTyping, { id: respId, role: 'assistant', kind: 'text', text }]
                      })
                    }, 550)
                  }

                  return (
                    <div key={m.id} className="messageRow left">
                      <div className="scheduleCard" role="group" aria-label="Test drive scheduling card">
                        <div className="scheduleTitle">
                          {zh ? '预约试驾' : 'Schedule a test drive'}
                        </div>
                        <div className="scheduleStore">
                          <span className="scheduleStoreName">{card.storeName}</span>
                          <span className="scheduleStoreTz">{card.timezone}</span>
                        </div>
                        <div className="scheduleAddress">{card.address}</div>

                        <div className="scheduleSection">
                          <div className="scheduleLabel">{zh ? '日期' : 'Date'}</div>
                          <div className="scheduleOptions">
                            {card.dateOptions.map((o) => (
                              <button
                                key={o.key}
                                type="button"
                                className={
                                  o.key === card.selectedDateKey
                                    ? 'scheduleOption selected'
                                    : 'scheduleOption'
                                }
                                onClick={() =>
                                  updateScheduleCard(m.id, (prev) => ({
                                    ...prev,
                                    selectedDateKey: o.key,
                                  }))
                                }
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="scheduleSection">
                          <div className="scheduleLabel">{zh ? '时间' : 'Time'}</div>
                          <div className="scheduleOptions">
                            {card.timeOptions.map((o) => (
                              <button
                                key={o.key}
                                type="button"
                                className={
                                  o.key === card.selectedTimeKey
                                    ? 'scheduleOption selected'
                                    : 'scheduleOption'
                                }
                                onClick={() =>
                                  updateScheduleCard(m.id, (prev) => ({
                                    ...prev,
                                    selectedTimeKey: o.key,
                                  }))
                                }
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="scheduleActions">
                          <button
                            className="scheduleButton secondary"
                            type="button"
                            onClick={() =>
                              updateScheduleCard(m.id, (prev) => ({
                                ...prev,
                                selectedDateKey: undefined,
                                selectedTimeKey: undefined,
                              }))
                            }
                          >
                            {zh ? '清除' : 'Clear'}
                          </button>
                          <button
                            className="scheduleButton primary"
                            type="button"
                            disabled={!canConfirm}
                            onClick={onConfirm}
                          >
                            {zh ? '提交预约' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                const bubbleClass =
                  m.kind === 'typing'
                    ? 'assistantBubble typingBubble'
                    : isUser
                      ? m.kind === 'contact'
                        ? 'sentBubble sentContactBubble'
                        : 'sentBubble'
                      : 'assistantBubble'

                return (
                  <div key={m.id} className={isUser ? 'messageRow right' : 'messageRow left'}>
                    <div className={bubbleClass}>
                      {m.kind === 'typing' ? (
                        <div className="typingDots" aria-label="Typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="composer">
          {isContactPanelVisible && (
            <div className="contactPanel" aria-label="Contact prompt">
              <div className="contactPrompt">
                <div className="contactPromptText">
                  Tap to send your contact and see the price
                </div>
                <button
                  className="contactClose"
                  aria-label="Dismiss"
                  onClick={() => setIsContactPanelVisible(false)}
                >
                  <img src={figmaAsset('icon-x-mark.svg')} alt="" />
                </button>
              </div>
              <button className="contactChip" onClick={shareContact}>
                +19876543210
              </button>
            </div>
          )}
          <div className="composerBar">
            <div className="composerPill">
              <button
                className="cameraButton"
                aria-label="Camera"
                onClick={() => {}}
              >
                <img src={figmaAsset('icon-camera.svg')} alt="" />
              </button>
              <input
                className="textInput"
                value={draft}
                placeholder="Message..."
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  send()
                }}
              />
              <button
                className="ctaButton"
                aria-label="Open sticker and photo"
                onClick={() => {}}
              >
                <img src={figmaAsset('icon-cta-chat.svg')} alt="" />
              </button>
            </div>
          </div>
          <div className="homeIndicator" aria-hidden="true">
            <img src={figmaAsset('home-indicator.svg')} alt="" />
          </div>
        </div>

        {modal === 'iab' && (
          <div className="iabScreen" role="dialog" aria-modal="true" aria-label="Web view">
            <div className="iabStatusBar">
              <div className="statusTime">8:00</div>
              <div className="statusIcons">
                <div className="statusCellular" aria-hidden="true">
                  <img src={figmaAsset('icon-cellular-1.svg')} alt="" />
                  <img src={figmaAsset('icon-cellular-2.svg')} alt="" />
                  <img src={figmaAsset('icon-cellular-3.svg')} alt="" />
                  <img src={figmaAsset('icon-cellular-4.svg')} alt="" />
                </div>
                <div className="statusWifi" aria-hidden="true">
                  <img src={figmaAsset('icon-wifi-1.svg')} alt="" />
                  <img src={figmaAsset('icon-wifi-2.svg')} alt="" />
                  <img src={figmaAsset('icon-wifi-3.svg')} alt="" />
                </div>
                <img
                  className="statusBattery"
                  src={figmaAsset('icon-battery.svg')}
                  alt=""
                />
              </div>
            </div>

            <div className="iabNavbar">
              <button
                className="iabClose"
                aria-label="Close web view"
                onClick={() => setModal('none')}
              >
                <img src={figmaAsset('icon-x-mark.svg')} alt="" />
              </button>
              <div className="iabTitleArea" aria-label="Web view title">
                <div className="iabTitle">Carmax</div>
                <div className="iabSubtitle">You are visiting: carmax.com</div>
              </div>
              <button
                className="iabMore"
                aria-label="More web view actions"
                onClick={() => {}}
              >
                <img src={figmaAsset('icon-ellipsis.svg')} alt="" />
              </button>
            </div>

            <div className="iabContent" aria-label="Web view content">
              <img
                className="iabScreenshot"
                src={figmaAsset('iab-screenshot-4d1182.png')}
                alt=""
              />
            </div>

            <div className="iabHomeIndicator" aria-hidden="true">
              <img src={figmaAsset('home-indicator.svg')} alt="" />
            </div>
          </div>
        )}

        {modal !== 'none' && modal !== 'iab' && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modalTitle">
              {modal === 'report'
                ? 'Report'
                : modal === 'ad'
                  ? 'View ad'
                  : modal === 'profile'
                    ? 'Profile'
                    : 'Business chat'}
            </div>
            <div className="modalBody">
              {modal === 'report' && 'Thanks for helping keep the community safe.'}
              {modal === 'ad' && 'This is a lightweight preview for the ad you viewed.'}
              {modal === 'profile' && 'Car Max · 1.1M followers'}
              {modal === 'businessInfo' &&
                'You’re chatting with a business account. Your privacy and controls may differ.'}
            </div>
            <button className="modalCta" onClick={() => setModal('none')}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
