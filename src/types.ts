export type FamilyRole = 'parent' | 'child' | 'admin' | 'member'

export type Profile = {
  id: string
  full_name: string
  role: FamilyRole
  phone?: string | null
  bio?: string | null
  avatar_color?: string | null
  created_at?: string
}

export type PiggyBank = {
  id: string
  serial: string
  owner_id: string | null
  name: string
  category?: 'smart-classic' | 'smart-box' | 'junior-edition' | string
  color?: 'emerald' | 'mint' | 'forest' | 'amber' | string
  status: 'active' | 'inactive' | 'lost'
  nfc_uid?: string | null
  created_at: string
}

export type SavingsEntry = {
  id: string
  piggy_bank_id: string
  user_id: string
  entry_type: 'deposit' | 'withdrawal'
  amount: number
  note: string
  created_at: string
}

export type SavingsGoal = {
  id: string
  user_id: string
  piggy_bank_id?: string | null
  name: string
  target_amount: number
  target_date: string | null
  created_at: string
}

export type PiggyBankOrder = {
  id: string
  user_id: string
  recipient_name: string
  phone: string
  address: string
  product_model?: string
  quantity: number
  note: string | null
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'received' | 'cancelled'
  tracking_number: string | null
  admin_note: string | null
  created_at: string
  updated_at: string
}

export type CelenganCatalogItem = {
  id: string
  name: string
  modelName: string
  tagline: string
  price: number
  chip: string
  frequency: string
  capacityText: string
  description: string
  features: string[]
  badge?: string
  colorTheme: string
}
