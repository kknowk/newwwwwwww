import type { PageLoadEvent } from './$types';

export async function load(ev: PageLoadEvent) {
  const data = ev.data;
  return {
    user: data.user,
    friends: data.friends,
  };
}
