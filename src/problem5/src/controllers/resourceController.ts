import { Request, Response } from 'express'
import resourceService from '@/service/resourceService'
import { asyncHandler } from '@/utils/asyncHandler'
import { successResponse } from '@/utils/helpers'
import { CreateResourceDto } from '@/dto/createResourceDto'
import { UpdateResourceDto, ListResourceDto } from '@/dto/updateResourceDto'

class ResourceController {
  list = asyncHandler(async (req, res) => {
    res.json(successResponse(await resourceService.list(req.query as unknown as ListResourceDto)))
  })

  getById = asyncHandler(async (req: Request<{ id: string }>, res) => {
    res.json(successResponse(await resourceService.getById(req.params.id)))
  })

  create = asyncHandler(
    async (req: Request<Record<string, never>, unknown, CreateResourceDto>, res: Response) => {
      res.status(201).json(successResponse(await resourceService.create(req.body)))
    },
  )

  update = asyncHandler(
    async (req: Request<{ id: string }, unknown, UpdateResourceDto>, res: Response) => {
      res.json(successResponse(await resourceService.update(req.params.id, req.body)))
    },
  )

  remove = asyncHandler(
    async (req: Request<{ id: string }, unknown, { version: number }>, res: Response) => {
      await resourceService.delete(req.params.id, req.body.version)
      res.status(204).send()
    },
  )
}

export default new ResourceController()
