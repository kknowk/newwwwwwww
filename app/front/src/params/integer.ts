export function match(param: string): boolean {
  const num = Number.parseInt(param);
  return Number.isSafeInteger(num);
}
