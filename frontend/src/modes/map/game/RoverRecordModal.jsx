import { useEffect } from 'react'
import { ROVER_RECORDS } from '../data/roverRecords'

export default function RoverRecordModal({
  record,
  collectedIds = [],
  onClose,
  onSelectRecord,
}) {
  useEffect(() => {
    if (!record) return
    const onKeyDown = event => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [record, onClose])

  if (!record) return null

  const collectedRecords = ROVER_RECORDS.filter(item => collectedIds.includes(item.id))
  const currentCollectedIndex = collectedRecords.findIndex(item => item.id === record.id)

  return (
    <div
      className="rover-record-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rover-record-title"
      onClick={onClose}
    >
      <article
        className="rover-record-paper"
        onClick={event => event.stopPropagation()}
      >
        {/* Decorative torn top & bottom edges and Martian dust stain */}
        <div className="rover-record-burn" aria-hidden="true" />

        <header className="rover-record-masthead">
          <div className="rover-record-meta-row">
            <span className="rover-record-edition">{record.edition}</span>
            <span className="rover-record-num">
              ARCHIVE RECORD #{record.number} / {ROVER_RECORDS.length}
            </span>
          </div>
          <div className="rover-record-rule" />
          <div className="rover-record-submeta">
            <span className="rover-record-badge">{record.category}</span>
            <span className="rover-record-sub">{record.subtitle}</span>
          </div>
        </header>

        <h2 id="rover-record-title" className="rover-record-headline">
          {record.title}
        </h2>

        <div className="rover-record-columns">
          <p className="rover-record-story">{record.story}</p>

          <aside className="rover-record-factbox">
            <span className="rover-record-fact-label">
              ✦ OFFICIAL MISSION ARCHIVE ENTRY
            </span>
            <p className="rover-record-fact-text">{record.fact}</p>
            <a
              className="rover-record-link"
              href={record.url}
              target="_blank"
              rel="noreferrer"
            >
              Open NASA Archive Source ↗
            </a>
          </aside>
        </div>

        <footer className="rover-record-footer">
          <div className="rover-record-pager">
            {collectedRecords.length > 1 && currentCollectedIndex !== -1 && (
              <>
                <button
                  type="button"
                  className="rover-record-nav-btn"
                  onClick={() => {
                    const prev =
                      collectedRecords[
                        (currentCollectedIndex - 1 + collectedRecords.length) %
                          collectedRecords.length
                      ]
                    onSelectRecord?.(prev)
                  }}
                >
                  ← Prev Record
                </button>
                <span className="rover-record-pager-count">
                  Recovered: {collectedIds.length}/{ROVER_RECORDS.length}
                </span>
                <button
                  type="button"
                  className="rover-record-nav-btn"
                  onClick={() => {
                    const next =
                      collectedRecords[
                        (currentCollectedIndex + 1) % collectedRecords.length
                      ]
                    onSelectRecord?.(next)
                  }}
                >
                  Next Record →
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="rover-record-close-btn"
            onClick={onClose}
          >
            Store in Hologram Files &amp; Close [ESC]
          </button>
        </footer>
      </article>
    </div>
  )
}
