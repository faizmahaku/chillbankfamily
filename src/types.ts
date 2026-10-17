export type Profile = { id: string; full_name: string; role: 'member' | 'admin'; phone?: string|null; bio?: string|null }
export type PiggyBank = { id: string; serial: string; owner_id: string | null; name: string; status: 'active' | 'inactive' | 'lost'; created_at: string }
export type SavingsEntry = { id: string; piggy_bank_id: string; user_id: string; entry_type: 'deposit' | 'withdrawal'; amount: number; note: string; created_at: string }
export type SavingsGoal = { id: string; user_id: string; name: string; target_amount: number; target_date: string | null; created_at: string }

export type PiggyBankOrder = { id:string; user_id:string; recipient_name:string; phone:string; address:string; quantity:number; note:string|null; status:'pending'|'confirmed'|'processing'|'shipped'|'delivered'|'received'|'cancelled'; tracking_number:string|null; admin_note:string|null; created_at:string; updated_at:string }
