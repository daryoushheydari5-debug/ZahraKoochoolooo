/** Licensed photos from Wikimedia Commons, looked up at runtime with their author and licence. */
export interface Photo { url: string; pageUrl: string; author: string; license: string; licenseUrl?: string; title: string }

const strip = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function commonsSearchUrl(query: string, width = 800): string {
  const p = new URLSearchParams({
    action: "query", format: "json", origin: "*", generator: "search", gsrnamespace: "6", gsrlimit: "5",
    gsrsearch: `${query} filetype:bitmap`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: String(width),
  });
  return "https://commons.wikimedia.org/w/api.php?" + p.toString();
}

const OK_LICENSE = /^(CC BY|CC0|Public domain|CC BY-SA)/i;

export function parseCommons(json: any): Photo | null {
  const pages = Object.values(json?.query?.pages ?? {}) as any[];
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const p of pages) {
    const ii = p?.imageinfo?.[0];
    const meta = ii?.extmetadata ?? {};
    const lic = strip(meta.LicenseShortName?.value ?? "");
    if (!ii?.thumburl || !OK_LICENSE.test(lic)) continue;
    return {
      url: ii.thumburl,
      pageUrl: ii.descriptionurl,
      author: strip(meta.Artist?.value ?? "Unknown author") || "Unknown author",
      license: lic,
      licenseUrl: meta.LicenseUrl?.value,
      title: String(p.title ?? "").replace(/^File:/, ""),
    };
  }
  return null;
}

const mem = new Map<string, Promise<Photo | null>>();
export function getPhoto(query: string, fetchImpl: typeof fetch = fetch): Promise<Photo | null> {
  const key = "aa.photo." + query;
  if (mem.has(query)) return mem.get(query)!;
  const pr = (async () => {
    try { const c = localStorage.getItem(key); if (c) return JSON.parse(c) as Photo | null; } catch { /* ignore */ }
    const res = await fetchImpl(commonsSearchUrl(query));
    if (!res.ok) throw new Error("Commons " + res.status);
    const photo = parseCommons(await res.json());
    try { localStorage.setItem(key, JSON.stringify(photo)); } catch { /* ignore */ }
    return photo;
  })().catch(() => null);
  mem.set(query, pr);
  return pr;
}
