import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Modal = 'none' | 'report' | 'ad' | 'profile' | 'businessInfo' | 'iab'

function App() {
  const [draft, setDraft] = useState('')
  const [sentMessages, setSentMessages] = useState<string[]>([])
  const [hasSharedContact, setHasSharedContact] = useState(false)
  const [isContactPanelVisible, setIsContactPanelVisible] = useState(true)
  const [modal, setModal] = useState<Modal>('none')
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [sentMessages.length])

  const send = () => {
    const value = draft.trim()
    if (!value) return
    setSentMessages((prev) => [...prev, value])
    setDraft('')
  }

  const shareContact = () => {
    const contact = '+19876543210'
    setSentMessages((prev) => [...prev, contact])
    setHasSharedContact(true)
    setIsContactPanelVisible(false)
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
                <img src="/assets/figma/icon-cellular-1.svg" alt="" />
                <img src="/assets/figma/icon-cellular-2.svg" alt="" />
                <img src="/assets/figma/icon-cellular-3.svg" alt="" />
                <img src="/assets/figma/icon-cellular-4.svg" alt="" />
              </div>
              <div className="statusWifi" aria-hidden="true">
                <img src="/assets/figma/icon-wifi-1.svg" alt="" />
                <img src="/assets/figma/icon-wifi-2.svg" alt="" />
                <img src="/assets/figma/icon-wifi-3.svg" alt="" />
              </div>
              <img
                className="statusBattery"
                src="/assets/figma/icon-battery.svg"
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
                  <img src="/assets/figma/icon-chevron-left.svg" alt="" />
                </button>
                <button
                  className="avatarButton"
                  aria-label="Open profile"
                  onClick={() => setModal('profile')}
                >
                  <img src="/assets/figma/avatar.png" alt="" />
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
                    src="/assets/figma/icon-tick-circle.svg"
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
                  <img src="/assets/figma/icon-flag.svg" alt="" />
                </button>
                <button
                  className="iconButton navIconButton"
                  aria-label="More"
                  aria-expanded={isMoreOpen}
                  onClick={() => setIsMoreOpen((v) => !v)}
                >
                  <img src="/assets/figma/icon-ellipsis.svg" alt="" />
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
            <img className="headerAvatar" src="/assets/figma/avatar.png" alt="" />
            <div className="headerName">Car Max</div>
            <div className="headerIntro">128 videos · 1.1M followers</div>
            <div className="headerReply">
              <img
                className="headerReplyIcon"
                src="/assets/figma/icon-timer-moving.svg"
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
                  src="/assets/figma/product-thumb-1.png"
                  alt=""
                />
                <div className="productMeta">
                  <div className="productTitle">Porsche Macan S</div>
                  <div className="productDesc">
                    Premium Package 4WD/AWD Turbo Charged Engine Leather Seats BOSE Sound System
                    Satellite Radio Ready Parking Sensors Rear View Camera Panoramic Sunroof
                    Navigation System Tow Hitch Front Seat Heater
                  </div>
                  <div className="productPrice" aria-label="Price">
                    <span className="productCurrency">$</span>
                    <span className="productNum">
                      {hasSharedContact ? '56,999' : '*****'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {sentMessages.length > 0 && (
            <div className="sentStack" aria-label="Sent messages">
              {sentMessages.map((m, idx) => (
                <div key={`${idx}-${m}`} className="sentBubble">
                  {m}
                </div>
              ))}
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
                  <img src="/assets/figma/icon-x-mark.svg" alt="" />
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
                <img src="/assets/figma/icon-camera.svg" alt="" />
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
                <img src="/assets/figma/icon-cta-chat.svg" alt="" />
              </button>
            </div>
          </div>
          <div className="homeIndicator" aria-hidden="true">
            <img src="/assets/figma/home-indicator.svg" alt="" />
          </div>
        </div>

        {modal === 'iab' && (
          <div className="iabScreen" role="dialog" aria-modal="true" aria-label="Web view">
            <div className="iabStatusBar">
              <div className="statusTime">8:00</div>
              <div className="statusIcons">
                <div className="statusCellular" aria-hidden="true">
                  <img src="/assets/figma/icon-cellular-1.svg" alt="" />
                  <img src="/assets/figma/icon-cellular-2.svg" alt="" />
                  <img src="/assets/figma/icon-cellular-3.svg" alt="" />
                  <img src="/assets/figma/icon-cellular-4.svg" alt="" />
                </div>
                <div className="statusWifi" aria-hidden="true">
                  <img src="/assets/figma/icon-wifi-1.svg" alt="" />
                  <img src="/assets/figma/icon-wifi-2.svg" alt="" />
                  <img src="/assets/figma/icon-wifi-3.svg" alt="" />
                </div>
                <img
                  className="statusBattery"
                  src="/assets/figma/icon-battery.svg"
                  alt=""
                />
              </div>
            </div>

            <div className="iabNavbar">
              <button className="iabClose" aria-label="Close web view" onClick={() => setModal('none')}>
                <img src="/assets/figma/icon-x-mark.svg" alt="" />
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
                <img src="/assets/figma/icon-ellipsis.svg" alt="" />
              </button>
            </div>

            <div className="iabContent" aria-label="Web view content">
              <img
                className="iabScreenshot"
                src="/assets/figma/iab-screenshot-4d1182.png"
                alt=""
              />
            </div>

            <div className="iabHomeIndicator" aria-hidden="true">
              <img src="/assets/figma/home-indicator.svg" alt="" />
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
