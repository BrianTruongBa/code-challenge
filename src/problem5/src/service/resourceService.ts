import { withTransaction } from '@/config/database'
import { MainError } from '@/errors/mainError'
import { ERROR } from '@/utils/enum'
import { Resource, PaginatedResult } from '@/models/resourceInterface'
import { CreateResourceDto } from '@/dto/createResourceDto'
import { UpdateResourceDto, ListResourceDto } from '@/dto/updateResourceDto'
import resourceRepo from '@/repository/resourceRepo'

class ResourceService {
  async list(dto: ListResourceDto): Promise<PaginatedResult<Resource>> {
    return withTransaction(() => resourceRepo.findAll(dto))
  }

  async getById(id: string): Promise<Resource> {
    const resource = await resourceRepo.findById(id)
    if (!resource) {
      throw new MainError('Resource not found', ERROR.NOT_FOUND)
    }
    return resource
  }

  async create(dto: CreateResourceDto): Promise<Resource> {
    return resourceRepo.insert(dto)
  }

  async update(id: string, dto: UpdateResourceDto): Promise<Resource> {
    return withTransaction(async () => {
      const existing = await resourceRepo.findById(id)
      if (!existing) {
        throw new MainError('Resource not found', ERROR.NOT_FOUND)
      }

      const updated = await resourceRepo.update(id, dto)
      if (!updated) {
        throw new MainError('Conflict — stale version', ERROR.CONFLICT)
      }

      return updated
    })
  }

  async delete(id: string, version: number): Promise<void> {
    await withTransaction(async () => {
      const existing = await resourceRepo.findById(id)
      if (!existing) {
        throw new MainError('Resource not found', ERROR.NOT_FOUND)
      }

      const deleted = await resourceRepo.delete(id, version)
      if (!deleted) {
        throw new MainError('Conflict — stale version', ERROR.CONFLICT)
      }
    })
  }
}

export default new ResourceService()
