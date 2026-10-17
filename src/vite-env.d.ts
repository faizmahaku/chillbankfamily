/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react'

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number
    color?: string
    strokeWidth?: string | number
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >

  export const ArrowDownLeft: LucideIcon
  export const ArrowUpRight: LucideIcon
  export const Award: LucideIcon
  export const Banknote: LucideIcon
  export const Box: LucideIcon
  export const Camera: LucideIcon
  export const ChartNoAxesCombined: LucideIcon
  export const CheckCircle2: LucideIcon
  export const ChevronRight: LucideIcon
  export const CircleHelp: LucideIcon
  export const Coins: LucideIcon
  export const CreditCard: LucideIcon
  export const Download: LucideIcon
  export const Flame: LucideIcon
  export const Globe: LucideIcon
  export const Home: LucideIcon
  export const Info: LucideIcon
  export const Layers: LucideIcon
  export const LogIn: LucideIcon
  export const LogOut: LucideIcon
  export const Menu: LucideIcon
  export const Plus: LucideIcon
  export const Printer: LucideIcon
  export const QrCode: LucideIcon
  export const Radio: LucideIcon
  export const Search: LucideIcon
  export const ShieldAlert: LucideIcon
  export const ShieldCheck: LucideIcon
  export const SmartphoneNfc: LucideIcon
  export const Sparkles: LucideIcon
  export const Tag: LucideIcon
  export const Target: LucideIcon
  export const Truck: LucideIcon
  export const UserCheck: LucideIcon
  export const UserRound: LucideIcon
  export const Users: LucideIcon
  export const Wallet: LucideIcon
  export const X: LucideIcon
}
