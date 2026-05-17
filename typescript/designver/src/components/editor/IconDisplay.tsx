import {
  Heart,
  CircleDot,
  Crown,
  Gem,
  Gift,
  GlassWater,
  Cake,
  Music,
  Flower,
  Flower2,
  Leaf,
  TreePine,
  Sun,
  Moon,
  Cloud,
  Star,
  Sparkles,
  Diamond,
  Zap,
  MapPin,
  Calendar,
  Clock,
  Mail,
  Phone,
} from 'lucide-react'

const ICON_MAP: Record<
  string,
  React.FC<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  heart: Heart,
  ring: CircleDot,
  crown: Crown,
  gem: Gem,
  gift: Gift,
  'glass-water': GlassWater,
  cake: Cake,
  music: Music,
  flower: Flower,
  'flower-2': Flower2,
  leaf: Leaf,
  tree: TreePine,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  star: Star,
  sparkles: Sparkles,
  diamond: Diamond,
  zap: Zap,
  'map-pin': MapPin,
  calendar: Calendar,
  clock: Clock,
  mail: Mail,
  phone: Phone,
}

interface IconDisplayProps {
  iconKey: keyof typeof ICON_MAP
  color?: string
  size?: number
  strokeWidth?: number
}

export function IconDisplay({
  iconKey,
  color = 'currentColor',
  size = 24,
  strokeWidth = 1.5,
}: IconDisplayProps) {
  const Icon = ICON_MAP[iconKey]
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}
