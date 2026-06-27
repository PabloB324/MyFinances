import type { Category, TransactionType } from '@/types/models'

export const GROUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const GROUP_CODE_LENGTH = 7

export const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 15,
  monthly: 30,
}

export const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  yearly: 12,
}

export const REMINDER_DAYS: Record<string, number> = {
  sameDay: 0,
  oneDayBefore: 1,
  threeDaysBefore: 3,
  oneWeekBefore: 7,
}

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

export const RECURRENCE_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

export const REMINDER_LABELS: Record<string, string> = {
  sameDay: 'El mismo día',
  oneDayBefore: '1 día antes',
  threeDaysBefore: '3 días antes',
  oneWeekBefore: '1 semana antes',
}

export const GOAL_ICONS = [
  { key: 'travel', emoji: '✈️', label: 'Viaje' },
  { key: 'technology', emoji: '💻', label: 'Tecnología' },
  { key: 'education', emoji: '📚', label: 'Educación' },
  { key: 'health', emoji: '🏥', label: 'Salud' },
  { key: 'home', emoji: '🏠', label: 'Hogar' },
  { key: 'vehicle', emoji: '🚗', label: 'Vehículo' },
  { key: 'other', emoji: '⭐', label: 'Otro' },
]

export const PAYMENT_ICONS = [
  { key: 'utilities', emoji: '⚡', label: 'Servicios' },
  { key: 'rent', emoji: '🏠', label: 'Renta' },
  { key: 'subscription', emoji: '📱', label: 'Suscripción' },
  { key: 'credit', emoji: '💳', label: 'Crédito' },
  { key: 'health', emoji: '🏥', label: 'Salud' },
  { key: 'education', emoji: '📚', label: 'Educación' },
  { key: 'transport', emoji: '🚗', label: 'Transporte' },
  { key: 'other', emoji: '📋', label: 'Otro' },
]

export const CATEGORY_ICONS = [
  { key: 'food', emoji: '🍔', label: 'Comida' },
  { key: 'transport', emoji: '🚌', label: 'Transporte' },
  { key: 'health', emoji: '🏥', label: 'Salud' },
  { key: 'home', emoji: '🏠', label: 'Hogar' },
  { key: 'utilities', emoji: '⚡', label: 'Servicios' },
  { key: 'entertainment', emoji: '🎬', label: 'Entretenimiento' },
  { key: 'salary', emoji: '💼', label: 'Salario' },
  { key: 'sales', emoji: '💰', label: 'Ventas' },
  { key: 'gift', emoji: '🎁', label: 'Regalo' },
  { key: 'other', emoji: '📋', label: 'Otros' },
  { key: 'savings', emoji: '🐷', label: 'Ahorro' },
]

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Comida', icon: '🍔', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Transporte', icon: '🚌', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Salud', icon: '🏥', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Hogar', icon: '🏠', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Servicios', icon: '⚡', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Entretenimiento', icon: '🎬', colorName: 'expense', type: 'Gasto' as TransactionType },
  { name: 'Salario', icon: '💼', colorName: 'income', type: 'Ingreso' as TransactionType },
  { name: 'Ventas', icon: '💰', colorName: 'income', type: 'Ingreso' as TransactionType },
  { name: 'Regalo', icon: '🎁', colorName: 'income', type: 'Ingreso' as TransactionType },
  { name: 'Otros ingresos', icon: '📋', colorName: 'income', type: 'Ingreso' as TransactionType },
]

export const SCORE_WEIGHTS = {
  savings: 35,
  payments: 30,
  goals: 20,
  activity: 15,
}

export const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
  '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#84cc16',
]
