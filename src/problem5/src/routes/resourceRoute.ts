import { Router } from 'express'
import resourceController from '@/controllers/resourceController'
import validateMiddleware from '@/middlewares/validateMiddleware'
import { createResourceSchema } from '@/dto/createResourceDto'
import {
  updateResourceSchema,
  deleteResourceSchema,
  listResourceSchema,
  resourceIdParamsSchema,
} from '@/dto/updateResourceDto'

const router = Router()

router.get('/', [validateMiddleware.query(listResourceSchema)], resourceController.list)
router.get('/:id', [validateMiddleware.params(resourceIdParamsSchema)], resourceController.getById)
router.post('/', [validateMiddleware.body(createResourceSchema)], resourceController.create)
router.patch(
  '/:id',
  [
    validateMiddleware.params(resourceIdParamsSchema),
    validateMiddleware.body(updateResourceSchema),
  ],
  resourceController.update,
)
router.delete(
  '/:id',
  [
    validateMiddleware.params(resourceIdParamsSchema),
    validateMiddleware.body(deleteResourceSchema),
  ],
  resourceController.remove,
)

export default router
