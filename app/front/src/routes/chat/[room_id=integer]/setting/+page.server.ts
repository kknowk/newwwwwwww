import { error } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

export async function load(ev: PageServerLoadEvent) {
  const parent = await ev.parent();
  if (parent.room.owner_id !== parent.user.id) {
    throw error(403);
  }
  return parent;
}
