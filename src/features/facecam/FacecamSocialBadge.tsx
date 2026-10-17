import type { BadgePlatform } from './facecamStore'

export function YoutubeIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export function InstagramIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

type FacecamSocialBadgeProps = {
  platform: BadgePlatform
  bannerText: string
  onToggle: () => void
}

export function FacecamSocialBadge({
  platform,
  bannerText,
  onToggle,
}: FacecamSocialBadgeProps) {
  const isYt = platform === 'youtube'
  const defaultText = isYt ? 'Subscribe' : 'Follow'
  const displayText =
    !bannerText || bannerText === 'Subscribe' || bannerText === 'Follow'
      ? defaultText
      : bannerText
  const title = isYt
    ? 'YouTube (Click to switch to Instagram)'
    : 'Instagram (Click to switch to YouTube)'

  return (
    <button
      type="button"
      className={`facecam-badge is-${platform}`}
      title={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {isYt ? <YoutubeIcon size={13} /> : <InstagramIcon size={12} />}
      <span>{displayText}</span>
    </button>
  )
}
