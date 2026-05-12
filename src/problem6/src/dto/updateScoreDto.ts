import { z } from 'zod'
import { ACTION_TOKEN_MIN_LEN } from '@/config/const'

export const updateScoreSchema = z
  .object({
    actionToken: z.string().min(ACTION_TOKEN_MIN_LEN, 'actionToken is required'),
  })
  .strict()

export type UpdateScoreDto = z.infer<typeof updateScoreSchema>
