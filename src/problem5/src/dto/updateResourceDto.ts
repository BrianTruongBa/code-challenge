import { z } from 'zod'
import { ResourceStatus } from '@/models/resourceInterface'

export const resourceIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updateResourceSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    version: z.number({ required_error: 'version is required' }).int().min(0),
  })
  .strict()

export const deleteResourceSchema = z
  .object({
    version: z.number({ required_error: 'version is required' }).int().min(0),
  })
  .strict()

export const listResourceSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  name: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type UpdateResourceDto = {
  name?: string
  description?: string
  status?: ResourceStatus
  version: number
}

export type ListResourceDto = {
  status?: ResourceStatus
  name?: string
  page?: number
  limit?: number
}
