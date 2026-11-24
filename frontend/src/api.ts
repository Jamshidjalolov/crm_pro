import axios from 'axios';
import type { AdminUser, AdminUsersResponse, Customer, DashboardStats, Lead, LeadStatus, LoginPayload, MonthlySalesDetails, SessionUser, UserPreferences } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crmpro_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const saveToken = (token: string) => localStorage.setItem('crmpro_token', token);
export const getToken = () => localStorage.getItem('crmpro_token');
export const saveSessionUser = (user: SessionUser) => localStorage.setItem('crmpro_user', JSON.stringify(user));
export const getStoredUser = (): SessionUser | null => {
  const stored = localStorage.getItem('crmpro_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionUser;
  } catch {
    localStorage.removeItem('crmpro_user');
    return null;
  }
};
export const removeToken = () => {
  localStorage.removeItem('crmpro_token');
  localStorage.removeItem('crmpro_user');
};

export const login = async (payload: LoginPayload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const register = async (payload: { name: string; email: string; password: string }) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const getCurrentUser = async (): Promise<SessionUser> => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const updateProfile = async (
  payload: Pick<SessionUser, 'name' | 'email' | 'phone' | 'company' | 'language' | 'avatarData'>,
): Promise<SessionUser> => {
  const { data } = await api.put('/auth/profile', payload);
  return data;
};

export const updatePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const { data } = await api.put('/auth/password', payload);
  return data;
};

export const updatePreferences = async (payload: UserPreferences): Promise<Pick<SessionUser, 'notifications' | 'systemSettings'>> => {
  const { data } = await api.put('/auth/preferences', payload);
  return data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/dashboard');
  return data;
};

export const getMonthlySales = async (year: number, month: number): Promise<MonthlySalesDetails> => {
  const { data } = await api.get('/dashboard/sales', { params: { year, month } });
  return data;
};

export const getCustomers = async (): Promise<Customer[]> => {
  const { data } = await api.get('/customers');
  return data;
};

export const createCustomer = async (payload: Customer): Promise<Customer> => {
  const { data } = await api.post('/customers', payload);
  return data;
};

export const updateCustomer = async (id: string, payload: Customer): Promise<Customer> => {
  const { data } = await api.put(`/customers/${id}`, payload);
  return data;
};

export const deleteCustomer = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};

export const getAdminUsers = async (): Promise<AdminUsersResponse> => {
  const { data } = await api.get('/admin/users');
  return data;
};

export const createAdminUser = async (
  payload: Pick<AdminUser, 'name' | 'email' | 'role' | 'isActive'> & { password: string },
): Promise<AdminUser> => {
  const { data } = await api.post('/admin/users', payload);
  return data;
};

export const updateAdminUser = async (
  id: string,
  payload: Pick<AdminUser, 'name' | 'email' | 'role' | 'isActive'> & { password?: string },
): Promise<AdminUser> => {
  const { data } = await api.put(`/admin/users/${id}`, payload);
  return data;
};

export const deleteAdminUser = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
};

export const getLeads = async (): Promise<Lead[]> => {
  const { data } = await api.get('/leads');
  return data;
};

export const createLead = async (
  payload: Omit<Lead, '_id' | 'createdAt'>,
): Promise<Lead> => {
  const { data } = await api.post('/leads', payload);
  return data;
};

export const updateLead = async (
  id: string,
  payload: Omit<Lead, '_id' | 'createdAt'>,
): Promise<Lead> => {
  const { data } = await api.put(`/leads/${id}`, payload);
  return data;
};

export const deleteLead = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/leads/${id}`);
  return data;
};

export const updateLeadStatus = async (id: string, status: LeadStatus): Promise<Lead> => {
  const { data } = await api.patch(`/leads/${id}/status`, { status });
  return data;
};

export const addLeadNote = async (id: string, text: string): Promise<Lead> => {
  const { data } = await api.post(`/leads/${id}/notes`, { text });
  return data;
};
