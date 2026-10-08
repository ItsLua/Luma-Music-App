import type { Track } from '../types/music'
import { versionLabels } from '../music/ranking/VersionClassifier'
export function TrackBadges({ track }: { track: Track }) {
  const authenticity = {
    official: 'Official',
    'likely-official': 'Likely Official',
    alternate: 'Alternate Version',
    cover: 'Cover',
    unknown: 'YouTube',
  }[track.authenticity]
  const version = versionLabels[track.versionType]
  return (
    <span
      className="track-badges"
      title={`Luma classification from metadata. ${track.authenticityReasons.join('. ')}`}
    >
      <span>{authenticity}</span>
      {version !== authenticity && version !== 'YouTube' && <span>{version}</span>}
    </span>
  )
}
