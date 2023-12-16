import type { SkyWayBag as SkyWayBagType } from "$lib/skyway-bag";
import { writable } from "svelte/store";

export const store = writable<SkyWayBagType | null>(null);
