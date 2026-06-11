import {
  Utensils, Car, Home, HeartPulse, Gamepad2, GraduationCap, Banknote, Laptop,
  ShoppingCart, ShoppingBag, Shirt, Plane, Bus, Fuel, Wifi, Smartphone, Zap,
  Droplets, PawPrint, Gift, Baby, Dumbbell, Music, Film, Coffee, PiggyBank,
  TrendingUp, Briefcase, Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Subconjunto curado de lucide-react para ícones de categoria.
// As chaves (kebab-case) são o que vai para a coluna categories.icon.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'coffee': Coffee,
  'car': Car,
  'bus': Bus,
  'fuel': Fuel,
  'plane': Plane,
  'home': Home,
  'zap': Zap,
  'droplets': Droplets,
  'wifi': Wifi,
  'smartphone': Smartphone,
  'heart-pulse': HeartPulse,
  'dumbbell': Dumbbell,
  'gamepad-2': Gamepad2,
  'music': Music,
  'film': Film,
  'graduation-cap': GraduationCap,
  'shirt': Shirt,
  'paw-print': PawPrint,
  'gift': Gift,
  'baby': Baby,
  'banknote': Banknote,
  'laptop': Laptop,
  'briefcase': Briefcase,
  'piggy-bank': PiggyBank,
  'trending-up': TrendingUp,
  'tag': Tag,
}

export function getCategoryIcon(name?: string): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Tag
}
