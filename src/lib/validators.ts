import { z } from 'zod'
import { NextResponse } from 'next/server'

// ── Auth Schemas ──
export const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı').max(128),
})

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(1, 'Şifre gerekli'),
})

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token gerekli'),
})

// ── Business Schemas ──
export const businessCreateSchema = z.object({
  name: z.string().min(1, 'İşletme adı gerekli').max(200),
  location: z.string().max(500).optional().nullable(),
  business_type: z.string().max(100).optional().nullable(),
  place_id: z.string().max(500).optional().nullable(),
  maps_url: z.string().max(1000).optional().nullable(),
  maps_rating: z.preprocess((v) => v != null ? Number(v) : null, z.number().nullable().optional()),
  maps_review_count: z.preprocess((v) => v != null ? Number(v) : null, z.number().nullable().optional()),
})

export const businessUpdateSchema = z.object({
  id: z.string().min(1, 'İşletme ID gerekli'),
  name: z.string().min(1, 'İşletme adı gerekli').max(200),
  location: z.string().max(500).optional().nullable(),
})

// ── Message Schema ──
export const messageSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  platform: z.string().max(50).default('unknown'),
  content: z.string().max(10000).optional().default(''),
  message: z.string().max(10000).optional(),
  response: z.string().max(10000).optional().nullable(),
  user_id: z.string().max(200).optional().nullable(),
})

// ── Reservation Schema ──
export const reservationSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  customer_name: z.string().max(200).default('Misafir'),
  date: z.string().min(1, 'Tarih gerekli'),
  time: z.string().min(1, 'Saat gerekli'),
  party_size: z.preprocess((v) => Number(v) || 1, z.number()),
})

// ── Chatbot Message Schema ──
export const chatbotMessageSchema = z.object({
  business_id: z.string().min(1),
  platform: z.string().max(50),
  content: z.string().max(10000),
  response: z.string().max(10000).optional().nullable(),
})

// ── Chatbot Reservation Schema ──
export const chatbotReservationSchema = z.object({
  business_id: z.string().min(1),
  customer_name: z.string().max(200),
  date: z.string().min(1),
  time: z.string().min(1),
  party_size: z.preprocess((v) => Number(v) || 1, z.number()),
})

// ── Dashboard Settings Schema ──
export const settingsSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  tone: z.string().max(50).optional(),
  table_count: z.preprocess((v) => Number(v) || 0, z.number()).optional(),
  menu_pdf_url: z.string().max(1000).optional().nullable(),
  campaigns: z.string().max(5000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
})

// ── Integration Schema ──
export const integrationCreateSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  platform: z.string().min(1, 'Platform gerekli').max(50),
  platform_identifier: z.string().min(1, 'Platform identifier gerekli').max(500),
  access_token: z.string().max(2000).optional().nullable(),
})

export const integrationDeleteSchema = z.object({
  id: z.string().min(1, 'Integration ID gerekli'),
})

// ── Chatbot Control Schema ──
export const chatbotControlSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  chatbot_enabled: z.boolean().optional(),
  webhook_url: z.string().max(1000).optional().nullable(),
})

// ── Analyzer Schemas ──
export const analyzerTriggerSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  category: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  competitor_urls: z.array(z.string()).optional().default([]),
  target_business_url: z.string().optional().nullable(),
})

export const analysisSchema = z.object({
  business_id: z.string().min(1, 'business_id gerekli'),
  strengths: z.string().max(50000).optional().nullable(),
  weaknesses: z.string().max(50000).optional().nullable(),
  competitors: z.string().max(50000).optional().nullable(),
  suggestions: z.string().max(50000).optional().nullable(),
})

// ── Type exports ──
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type BusinessCreateInput = z.infer<typeof businessCreateSchema>
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type ReservationInput = z.infer<typeof reservationSchema>
export type ChatbotMessageInput = z.infer<typeof chatbotMessageSchema>
export type ChatbotReservationInput = z.infer<typeof chatbotReservationSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type IntegrationCreateInput = z.infer<typeof integrationCreateSchema>
export type IntegrationDeleteInput = z.infer<typeof integrationDeleteSchema>
export type ChatbotControlInput = z.infer<typeof chatbotControlSchema>
export type AnalyzerTriggerInput = z.infer<typeof analyzerTriggerSchema>
export type AnalysisInput = z.infer<typeof analysisSchema>

// ── Validation Helper ──
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      ),
    }
  }
  return { success: true, data: result.data }
}
