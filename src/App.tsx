import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Modal = 'none' | 'report' | 'ad' | 'profile' | 'businessInfo' | 'iab'
type ChatRole = 'assistant' | 'user'
type ChatKind = 'text' | 'contact' | 'typing'
type ChatMessage = {
  id: string
  role: ChatRole
  kind: ChatKind
  text?: string
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

  const reply = (input: string) => {
    const normalized = input.trim().toLowerCase()

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
    const wantsTestDrive = /test drive/.test(normalized) || /试驾|試駕/.test(input)
    const wantsDelivery =
      /delivery|ship|shipping|pickup/.test(normalized) || /交付|送车|送車|配送|自提/.test(input)
    const wantsWarranty =
      /warranty|guarantee|return/.test(normalized) || /质保|保修|保固|退换|退換|退车|退車/.test(input)
    const wantsWebsite = /website|open.*site|carmax\.com/.test(normalized) || /官网|官網|打开网站|打開網站/.test(input)

    const zh = isChinese(input)

    if (wantsWebsite) {
      return {
        text: zh
          ? '我可以打开 carmax.com 的页面给你查看（演示版 WebView）。'
          : 'I can open a carmax.com page in the demo web view.',
        action: () => setModal('iab'),
      }
    }

    if (wantsPrice) {
      if (!hasSharedContact) {
        return {
          text: zh
            ? '为了展示价格，请先发送你的联系方式（点击下方 +19876543210）。发送后我就能显示车辆价格。'
            : 'To show the price, please share your contact (tap +19876543210 below). After that, I can reveal the price.',
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
          ? '可以安排试驾。你方便的城市/时间段是？我会给你几个可选档期（演示）。'
          : 'We can schedule a test drive. What city and time window works for you? I’ll propose a few slots (demo).',
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
        return [...withoutTyping, { id: respId, role: 'assistant', kind: 'text', text: response.text }]
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
