// Kode asal: Achmadghalib725/LKPS_LAM-TEKNIK@c718eff (Achmad Ghalib), src/components/common/icon-badge.tsx.
// Gabung LKPS G5: dipindah tanpa perubahan perilaku; kelas icon-badge-* ada di gaya-lkps.css.
import React from 'react'

export type IconColor =
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'pink'
  | 'orange'
  | 'teal'
  | 'indigo'
  | 'rose'
  | 'gray'

export type IconSize = 'sm' | 'md' | 'lg' | 'xl'

interface IconBadgeProps {
  children?: React.ReactNode
  icon?: React.ComponentType<{ size?: number | string; className?: string }>
  color?: IconColor
  variant?: IconColor
  size?: IconSize
  className?: string
  glow?: boolean
  style?: React.CSSProperties
}

const iconSizePxMap: Record<IconSize, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
}

export default function IconBadge({
  children,
  icon: IconComponent,
  color,
  variant,
  size = 'md',
  className = '',
  glow = false,
  style,
}: IconBadgeProps) {
  const activeColor = color || variant || 'blue'
  const iconPixelSize = iconSizePxMap[size]

  return (
    <div
      className={`icon-badge icon-badge-${activeColor} icon-badge-${size} ${glow ? 'icon-badge-glow' : ''} ${className}`}
      style={style}
    >
      {IconComponent ? <IconComponent size={iconPixelSize} /> : children}
    </div>
  )
}

