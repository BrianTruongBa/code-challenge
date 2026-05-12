import { v4 as uuidv4 } from 'uuid'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getDb } from '@/config/database'
import { Resource, PaginatedResult } from '@/models/resourceInterface'
import { CreateResourceDto } from '@/dto/createResourceDto'
import { UpdateResourceDto, ListResourceDto } from '@/dto/updateResourceDto'

/** DB access always via `getDb()` — pool, or transaction connection inside `withTransaction` (AsyncLocalStorage). */
class ResourceRepo {
  async findById(id: string): Promise<Resource | null> {
    const [rows] = await getDb().execute<RowDataPacket[]>(
      'SELECT * FROM resources WHERE id = :id',
      { id },
    )
    const first = rows[0]
    return first ? (first as Resource) : null
  }

  async findAll(dto: ListResourceDto): Promise<PaginatedResult<Resource>> {
    const { status, name, page = 1, limit = 10 } = dto
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit))))
    const safePage = Math.max(1, Math.floor(Number(page)))
    const offset = (safePage - 1) * safeLimit

    const conditions: string[] = []
    const params: Record<string, string | number> = {}

    if (status) {
      conditions.push('status = :status')
      params.status = status
    }

    if (name) {
      conditions.push('name LIKE :name')
      params.name = `%${name}%`
    }

    let where = ''
    if (conditions.length > 0) {
      where = `WHERE ${conditions.join(' AND ')}`
    }

    const [countRows] = await getDb().execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM resources ${where}`,
      params,
    )

    // LIMIT/OFFSET as bound params triggers ER_WRONG_ARGUMENTS on some MySQL + mysql2 combos; values are sanitized ints.
    const [rows] = await getDb().execute<RowDataPacket[]>(
      `SELECT * FROM resources ${where} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`,
      params,
    )

    const total = Number((countRows[0] as { total?: number | string } | undefined)?.total ?? 0)

    return {
      data: rows as Resource[],
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    }
  }

  async insert(dto: CreateResourceDto): Promise<Resource> {
    const id = uuidv4()
    const now = new Date()

    await getDb().execute(
      `INSERT INTO resources (id, name, description, status, version, created_at, updated_at)
       VALUES (:id, :name, :description, :status, 0, :now, :now)`,
      {
        id,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        status: dto.status ?? 'active',
        now,
      },
    )

    const created = await this.findById(id)
    return created as Resource
  }

  /**
   * Optimistic lock — only writes if DB version matches the client's expected version.
   * Returns null when version check fails (stale read → caller throws 409).
   */
  async update(id: string, dto: UpdateResourceDto): Promise<Resource | null> {
    const { version: expectedVersion, ...fields } = dto

    const sets: string[] = ['version = version + 1', 'updated_at = NOW()']
    const params: Record<string, string | number | null> = { id, expectedVersion }

    if (fields.name !== undefined) {
      sets.push('name = :name')
      params.name = fields.name.trim()
    }

    if (fields.description !== undefined) {
      sets.push('description = :description')
      params.description = fields.description.trim()
    }

    if (fields.status !== undefined) {
      sets.push('status = :status')
      params.status = fields.status
    }

    const [result] = await getDb().execute<ResultSetHeader>(
      `UPDATE resources SET ${sets.join(', ')} WHERE id = :id AND version = :expectedVersion`,
      params,
    )

    if (result.affectedRows === 0) {
      return null
    }

    const updated = await this.findById(id)
    return updated as Resource
  }

  async delete(id: string, expectedVersion: number): Promise<boolean> {
    const [result] = await getDb().execute<ResultSetHeader>(
      'DELETE FROM resources WHERE id = :id AND version = :expectedVersion',
      { id, expectedVersion },
    )
    const removed = result.affectedRows > 0
    return removed
  }
}

export default new ResourceRepo()
