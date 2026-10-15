import './brandBadge.css'

export function BrandBadge() {
  return (
    <aside className="brand-badge chrome" aria-label="Palaka Whiteboard">
      <img
        src="/palaka_logo.webp"
        alt="Palaka logo"
        className="brand-badge__logo"
        width={24}
        height={24}
      />
      <div className="brand-badge__text">
        <span className="brand-badge__name">Palaka</span>
        <span className="brand-badge__sub">The SurfBoard</span>
      </div>
    </aside>
  )
}
