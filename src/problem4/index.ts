// Time: O(1) | Space: O(1) — single arithmetic expression, optimal for all valid inputs.
export function sum_to_n_a(n: number): number {
  return (n * (n + 1)) / 2;
}

// Time: O(n) | Space: O(1) — single accumulator, no allocation.
export function sum_to_n_b(n: number): number {
  let acc = 0;
  for (let i = 1; i <= n; i++) {
    acc += i;
  }
  return acc;
}

// Time: O(n) | Space: O(n) — builds an array of length n before reducing; less memory-efficient than B.
export function sum_to_n_c(n: number): number {
  const range = Array.from({ length: n }, (_, i) => i + 1);
  return range.reduce((acc, val) => acc + val, 0);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────
const cases: Array<[n: number, expected: number]> = [
  [0, 0],
  [1, 1],
  [5, 15],
  [10, 55],
  [100, 5050],
];

let allPassed = true;
for (const [n, expected] of cases) {
  const a = sum_to_n_a(n);
  const b = sum_to_n_b(n);
  const c = sum_to_n_c(n);
  const pass = a === expected && b === expected && c === expected;
  if (!pass) allPassed = false;
  console.log(
    `n=${String(n).padStart(3)} | expected=${String(expected).padStart(4)} | a=${a} b=${b} c=${c} | ${pass ? "PASS" : "FAIL"}`
  );
}
console.log(allPassed ? "\nAll tests passed." : "\nSome tests FAILED.");
