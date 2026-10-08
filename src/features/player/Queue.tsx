import { ChevronDown, ChevronUp, Play, X } from 'lucide-react'
import { Artwork } from '../../components/Artwork'
import { Dialog } from '../../components/Dialog'
import { EmptyState } from '../../components/Feedback'
import { usePlayerStore } from '../../stores/playerStore'
export default function Queue({ onClose }: { onClose(): void }) {
  const queue = usePlayerStore((s) => s.queue),
    index = usePlayerStore((s) => s.index)
  return (
    <Dialog title="Your queue" onClose={onClose} className="queue-dialog">
      {!queue.length ? (
        <EmptyState
          title="Room for your next favorite"
          description="Choose a song, or add tracks using their options menu."
        />
      ) : (
        <>
          <div className="section-heading">
            <span className="eyebrow">{queue.length - index - 1} up next</span>
            <button
              className="text-button"
              disabled={index === queue.length - 1}
              onClick={() => usePlayerStore.getState().clearUpcoming()}
            >
              Clear upcoming
            </button>
          </div>
          <ol className="queue-list">
            {queue.slice(Math.max(0, index)).map((item, offset) => (
              <li key={item.key} className={offset === 0 ? 'current' : ''}>
                <Artwork src={item.track.artwork.small} />
                <button
                  className="queue-track"
                  onClick={() => usePlayerStore.getState().select(index + offset)}
                  aria-label={`Play ${item.track.title}`}
                >
                  <strong className="truncate">{item.track.title}</strong>
                  <small>{offset === 0 ? 'Current track' : item.track.artist.name}</small>
                </button>
                {offset === 0 ? (
                  <Play size={18} />
                ) : (
                  <>
                    <div className="queue-move">
                      <button
                        className="icon-button"
                        disabled={offset === 1}
                        aria-label={`Move ${item.track.title} up`}
                        onClick={() => usePlayerStore.getState().move(item.key, -1)}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={index + offset === queue.length - 1}
                        aria-label={`Move ${item.track.title} down`}
                        onClick={() => usePlayerStore.getState().move(item.key, 1)}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${item.track.title} from queue`}
                      onClick={() => usePlayerStore.getState().remove(item.key)}
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Dialog>
  )
}
