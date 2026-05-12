import express from 'express'
import { env } from '@/config/env'
import routes from '@/routes'
import errorMiddleware from '@/middlewares/errorMiddleware'

const app = express()

app.use(express.json())
app.use(routes)

app.use(errorMiddleware.handle)

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`)
})
