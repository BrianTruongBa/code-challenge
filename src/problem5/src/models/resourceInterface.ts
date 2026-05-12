export type ResourceStatus = 'active' | 'inactive'

export interface Resource {
  id: string
  name: string
  description: string | null
  status: ResourceStatus
  version: number
  created_at: Date
  updated_at: Date
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
