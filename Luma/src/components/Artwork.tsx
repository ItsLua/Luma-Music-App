import { useState } from 'react'
import { Music2 } from 'lucide-react'
import { safeHttpsUrl } from '../utilities/safeUrl'
export function Artwork({
  src,
  alt = '',
  className = '',
  eager = false,
}: {
  src: string | null | undefined
  alt?: string
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const safe = safeHttpsUrl(src)
  return (
    <span className={`artwork ${className} ${loaded === safe ? 'loaded' : ''}`}>
      <Music2 aria-hidden="true" className="artwork-fallback" />
      {safe && failed !== safe && (
        <img
          src={safe}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(safe)}
          onError={() => setFailed(safe)}
        />
      )}
    </span>
  )
}
