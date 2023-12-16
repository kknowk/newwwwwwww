import { redirect } from '@sveltejs/kit';
import type { LayoutLoadEvent } from './$types';

export async function load(ev: LayoutLoadEvent) {
  if (ev.data.user == null) {
    redirect(307, '/authentication');
  }
  return {
    user: ev.data.user,
  };
}
