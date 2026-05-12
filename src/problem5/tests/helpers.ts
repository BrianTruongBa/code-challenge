/** Extra console output when `TEST_LOG=1` (e.g. `npm run test:verbose`). */
export function testLog(...args: unknown[]): void {
  if (process.env.TEST_LOG === '1') {
    console.log('[TEST]', ...args)
  }
}

export function logRaceHistogram(label: string, statuses: number[]): void {
  const counts = statuses.reduce<Record<number, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  console.log(`[RACE] ${label}`, counts, `n=${statuses.length}`)
}
