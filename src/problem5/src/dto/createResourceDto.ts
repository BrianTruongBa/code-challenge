import { z } from 'zod'
import { ResourceStatus } from '@/models/resourceInterface'

export const createResourceSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(255),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strict()

export type CreateResourceDto = {
  name: string
  description?: string
  status?: ResourceStatus
}
