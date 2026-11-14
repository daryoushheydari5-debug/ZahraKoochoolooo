import { useEffect, useState } from "react";
import { Ext } from "./common";

/** How to have maps with no signal: this app's own cache, plus full offline maps of Japan in a maps app. */
export function OfflineHelp() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(() => setReady(true)).catch(() => {});
  }, []);
  return (
    <section className="box offline" aria-labelledby="off-h">
      <h3 id="off-h" className="h3">📥 Maps with no signal</h3>
      <h4>This app</h4>
      <p className="small">{ready ? "✓ Offline is on for this phone. " : ""}Once you've opened the site with internet, it keeps working offline: your plan, the ideas and every bit of this map you've already looked at. Before you fly, zoom around each area you'll visit on wifi so those map pieces are saved.</p>
      <p className="small">Put it on your home screen so it opens like an app. <b>iPhone:</b> Safari → Share → Add to Home Screen. <b>Android:</b> Chrome → ⋮ → Add to Home screen.</p>
      <p className="small muted">This app can't download all of Japan in detail: the free map it uses doesn't allow bulk downloads, and it would be several gigabytes. Use one of these for that:</p>
      <h4>The whole of Japan, offline</h4>
      <ol className="small steps">
        <li><b>Organic Maps</b> (free, no account): install it, search "Japan" in Download maps, and download the regions you'll be in: Kyushu (Fukuoka), Kansai (Osaka, Kyoto, Nara) and Kanto (Tokyo, Fuji, Hakone). Walking and driving directions work with no signal. <Ext href="https://organicmaps.app/">organicmaps.app ↗</Ext></li>
        <li><b>Google Maps</b>: tap your profile picture → Offline maps → Select your own map, drag the box over an area and tap Download. Do one box per base. Driving directions work offline but train directions need signal. If Google won't offer a download for an area, use Organic Maps there.</li>
        <li><b>Shanghai</b>: Google Maps doesn't work on Chinese networks. On Australian roaming or a travel eSIM it usually does; otherwise use Apple Maps or Amap. Download a Shanghai region in Organic Maps too.</li>
      </ol>
    </section>
  );
}
