import {
  Briefcase,
  Building2,
  Cpu,
  Euro,
  Globe2,
  GraduationCap,
  HeartPulse,
  Hourglass,
  House,
  Landmark,
  Leaf,
  Palmtree,
  Receipt,
  Scale,
  Shield,
  Theater,
  Users,
  Wallet,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Theme } from '../data/schema'

const ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Cpu,
  Euro,
  Globe2,
  GraduationCap,
  HeartPulse,
  Hourglass,
  House,
  Landmark,
  Leaf,
  Palmtree,
  Receipt,
  Scale,
  Shield,
  Theater,
  Users,
  Wallet,
  Wheat,
  Zap,
}

export function ThemeIcon({ theme, className = 'size-4' }: { theme: Theme; className?: string }) {
  const Icon = ICONS[theme.icon] ?? Landmark
  return <Icon className={className} aria-hidden="true" />
}
