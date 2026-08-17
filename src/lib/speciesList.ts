export interface SpeciesOption {
  id: number;
  name: string;
}

let cache: Promise<SpeciesOption[]> | null = null;

/** Fetches the full national dex name/ID list once and caches it for the session. */
export function loadSpeciesList(): Promise<SpeciesOption[]> {
  if (!cache) {
    cache = fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1302')
      .then((res) => res.json())
      .then((data: { results: { name: string; url: string }[] }) =>
        data.results
          .map((r) => {
            const id = Number(r.url.match(/\/(\d+)\/$/)?.[1] ?? 0);
            return { id, name: r.name.replace(/-/g, ' ') };
          })
          .filter((s) => s.id > 0)
          .sort((a, b) => a.id - b.id),
      )
      .catch(() => []);
  }
  return cache;
}
