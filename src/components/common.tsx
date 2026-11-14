import { useEffect, useRef, useState, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity, LatLon } from "../types";
import { getPhoto, type Photo } from "../lib/photos";
import { drawScene } from "../data/scenes";
import { WEATHER_ATTRIBUTION } from "../lib/weather";

/* ---------------- Photo with attribution, falling back to the drawing ---------------- */
/** Anything with a photo search and a fallback drawing: an activity or a place on the map. */
export type PhotoSubject = Pick<Activity, "id" | "title" | "photoQuery" | "scene">;
export function ActivityPhoto({ a, children }: { a: PhotoSubject; children?: ReactNode }) {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { getPhoto(a.photoQuery).then((p) => live && setPhoto(p)); return () => { live = false; }; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); getPhoto(a.photoQuery).then((p) => live && setPhoto(p)); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [a.photoQuery]);
  const showPhoto = photo && !broken;
  return (
    <div className="art" ref={ref}>
      {showPhoto ? (
        <img src={photo.url} alt={a.title} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="svgart" dangerouslySetInnerHTML={{ __html: drawScene(a.scene, a.id) }} />
      )}
      {children}
      {showPhoto ? (
        <a className="credit" href={photo.pageUrl} target="_blank" rel="noopener noreferrer">
          📷 {photo.author.slice(0, 40)} · {photo.license} · Wikimedia Commons
        </a>
      ) : (
        <a className="credit" href={"https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(a.photoQuery)} target="_blank" rel="noopener noreferrer">
          {photo === undefined ? "Loading photo…" : "Illustration · see real photos ↗"}
        </a>
      )}
    </div>
  );
}

/** Small square photo for calendar chips: same Commons lookup (and cache) as ActivityPhoto, SVG illustration as fallback. */
export function Thumb({ a }: { a: Activity }) {
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let live = true;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { getPhoto(a.photoQuery).then((p) => live && setPhoto(p)); return () => { live = false; }; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); getPhoto(a.photoQuery).then((p) => live && setPhoto(p)); }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [a.photoQuery]);
  const showPhoto = photo && !broken;
  return (
    <span className="thumb" ref={ref} aria-hidden="true" title={showPhoto ? `Photo: ${photo.author.slice(0, 40)} · ${photo.license} · Wikimedia Commons` : undefined}>
      {showPhoto ? <img src={photo.url} alt="" loading="lazy" draggable={false} onError={() => setBroken(true)} /> : <span className="svgart" dangerouslySetInnerHTML={{ __html: drawScene(a.scene, a.id) }} />}
    </span>
  );
}

/* ---------------- Leaflet map ---------------- */
export interface Pin { pos: LatLon; label: string; color: string; href?: string; highlight?: boolean; sub?: string; onClick?: () => void; big?: boolean }
export function MapView({ pins, line, height = 280, focus }: { pins: Pin[]; line?: [number, number][]; height?: number | string; focus?: LatLon }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" });
    let errs = 0;
    tiles.on("tileerror", () => { if (++errs > 3) setTilesFailed(true); });
    tiles.addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    for (const p of pins) {
      const icon = L.divIcon({ className: "", html: `<span class="pin${p.highlight ? " hi" : ""}${p.big ? " big" : ""}" style="--c:${p.color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      const mk = L.marker([p.pos.lat, p.pos.lon], { icon, title: p.label }).addTo(g);
      const div = document.createElement("div");
      const b = document.createElement("b"); b.textContent = p.label; div.appendChild(b);
      if (p.sub) { const s = document.createElement("div"); s.textContent = p.sub; div.appendChild(s); }
      if (p.href) { const a = document.createElement("a"); a.href = p.href; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Book / open ↗"; div.appendChild(a); }
      mk.bindPopup(div);
      if (p.onClick) mk.on("click", p.onClick);
      if (p.highlight) setTimeout(() => mk.openPopup(), 50);
      pts.push([p.pos.lat, p.pos.lon]);
    }
    if (line && line.length > 1) { L.polyline(line, { color: "#2f55c4", weight: 4, opacity: 0.8 }).addTo(g); pts.push(...line); }
    setTimeout(() => {
      m.invalidateSize();
      if (focus) m.setView([focus.lat, focus.lon], 13);
      else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [28, 28] });
      else if (pts.length === 1) m.setView(pts[0], 12);
    }, 0);
  }, [pins, line, focus]);
  return (
    <div className="mapwrap">
      <div ref={el} className="map" style={{ height }} role="region" aria-label="Map" />
      {tilesFailed && <p className="maperr">Map tiles couldn't load (offline or blocked). Pins still work; use the Google Maps links for directions.</p>}
    </div>
  );
}

/* ---------------- Confirm dialog ---------------- */
export function Confirm({ title, children, confirmLabel = "Confirm", onConfirm, onCancel, danger, disabled }: { title: string; children: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open && typeof d.showModal === "function") d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="dlg-title">
      <h3 id="dlg-title">{title}</h3>
      <div className="dlgbody">{children}</div>
      <div className="dlgbtns">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className={"btn " + (danger ? "danger" : "primary")} onClick={onConfirm} disabled={disabled}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}

export const Ext = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
);

export function WeatherAttribution() {
  return <p className="attr">Weather: <Ext href={WEATHER_ATTRIBUTION.url}>{WEATHER_ATTRIBUTION.label}</Ext> ({WEATHER_ATTRIBUTION.license})</p>;
}

export function Score({ n }: { n: number }) {
  const cls = n >= 85 ? "hi" : n >= 72 ? "mid" : "lo";
  return <span className={"score " + cls} title="Suitability for your group, out of 100">{n}</span>;
}
