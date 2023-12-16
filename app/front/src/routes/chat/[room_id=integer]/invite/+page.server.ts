import { error } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.members === null || parent.members.get(parent.user.id) !== 2) {
    throw error(403);
  }
  return parent;
}
