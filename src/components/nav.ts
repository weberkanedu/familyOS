import { HouseIcon, CalendarBlankIcon, CheckSquareIcon, ShoppingCartIcon, ForkKnifeIcon, GraduationCapIcon, ChatCircleIcon, GearIcon } from '@phosphor-icons/react'
import type { TabKey } from '../state/store'

export interface NavItem {
  key: TabKey
  label: string
  short: string
  icon: typeof HouseIcon
  inBottomBar?: boolean
}

export const NAV: NavItem[] = [
  { key: 'home', label: 'Ana Sayfa', short: 'Ana', icon: HouseIcon, inBottomBar: true },
  { key: 'calendar', label: 'Takvim', short: 'Takvim', icon: CalendarBlankIcon, inBottomBar: true },
  { key: 'chores', label: 'Görevler', short: 'Görev', icon: CheckSquareIcon },
  { key: 'shopping', label: 'Alışveriş', short: 'Market', icon: ShoppingCartIcon, inBottomBar: true },
  { key: 'meals', label: 'Yemekler', short: 'Yemek', icon: ForkKnifeIcon },
  { key: 'learn', label: 'Öğrenme', short: 'Öğren', icon: GraduationCapIcon, inBottomBar: true },
  { key: 'chat', label: 'Mesajlar', short: 'Mesaj', icon: ChatCircleIcon, inBottomBar: true },
  { key: 'settings', label: 'Ayarlar', short: 'Ayar', icon: GearIcon },
]
