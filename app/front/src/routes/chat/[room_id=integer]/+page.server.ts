import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  return parent;
}
