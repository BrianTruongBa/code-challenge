import { MainError } from '@/errors/mainError'
import { ERROR } from '@/utils/enum'

export class ReturnableError extends MainError {
  constructor(message = 'Something wrong with this action, please check your inputs') {
    super(message, ERROR.BAD_REQUEST)
  }
}
