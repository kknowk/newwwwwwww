import type { LayoutLoadEvent } from './$types';

export async function load(ev: LayoutLoadEvent) {
  return await ev.parent();
}
