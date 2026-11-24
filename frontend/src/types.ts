export type CustomerStatus = 'new' | 'contacted' | 'active' | 'inactive';
export type CustomerSource = 'telegram' | 'instagram' | 'website' | 'other';

export interface Customer {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  status: CustomerStatus;
  source: CustomerSource;
  budget: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  contactedCustomers: number;
  recentCustomers: Customer[];
  totalSales: number;
  totalWonLeads: number;
  leadStatusCounts: Record<LeadStatus, number>;
  monthlySales: MonthlySales[];
  undatedSales: number;
  undatedDealCount: number;
  salesOutsideChartWindow: number;
  dealsOutsideChartWindow: number;
}

export interface MonthlySales {
  year: number;
  month: number;
  totalSales: number;
  dealCount: number;
}

export interface MonthlySalesDetails extends MonthlySales {
  deals: Array<{
    _id: string;
    name: string;
    company: string;
    budget: number;
    wonAt: string;
  }>;
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarData?: string;
  phone?: string;
  company?: string;
  language?: 'uz' | 'ru' | 'en';
  notifications?: {
    email: boolean;
    leads: boolean;
    tasks: boolean;
  };
  systemSettings?: {
    timeZone: string;
    dateFormat: 'DD.MM.YYYY' | 'YYYY-MM-DD';
  };
}

export interface UserPreferences {
  notifications: NonNullable<SessionUser['notifications']>;
  systemSettings: NonNullable<SessionUser['systemSettings']>;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export interface AdminUserStats {
  totalUsers: number;
  administrators: number;
  managers: number;
  activeUsers: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  stats: AdminUserStats;
}

export type LeadStatus = 'new' | 'contacted' | 'proposal' | 'won';

export interface Lead {
  _id: string;
  name?: string;
  company: string;
  budget: number;
  status: LeadStatus;
  contactName?: string;
  owner: string;
  email?: string;
  phone?: string;
  description: string;
  notes?: LeadNote[];
  activities?: LeadActivity[];
  createdAt?: string;
}

export interface LeadNote {
  _id?: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface LeadActivity {
  _id?: string;
  text: string;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
