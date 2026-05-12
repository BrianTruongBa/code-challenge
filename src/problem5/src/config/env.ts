import dotenv from 'dotenv'
dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return val
}

export const env = {
  port: parseInt(process.env.PORT ?? '8001', 10),
  db: {
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    name: required('DB_NAME'),
  },
}
