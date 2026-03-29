import React from "react";

export function LeafletMap({ items, visibleIds, activeItemId, onSelectItem }) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markersRef = React.useRef({});

  React.useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, { zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
    }
    if (window.L) { init(); }
    else if (!document.getElementById("leaflet-js")) {
      const s = document.createElement("script");
      s.id = "leaflet-js";
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = init;
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => { if (window.L) { clearInterval(t); init(); } }, 100);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  React.useEffect(() => {
    function update() {
      if (!window.L || !mapRef.current) return;
      const L = window.L;
      const map = mapRef.current;
      Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
      markersRef.current = {};
      const toShow = items.filter((i) => visibleIds.has(i.id) && i.lat && i.lng);
      toShow.forEach((item) => {
        const active = item.id === activeItemId;
        const icon = L.divIcon({
          html: `<div style="width:36px;height:36px;background:${active ? "#1c1917" : "#fff"};border:2.5px solid #1c1917;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(0,0,0,.25)">${item.thumbnail}</div>`,
          className: "", iconSize: [36, 36], iconAnchor: [18, 18],
        });
        const marker = L.marker([item.lat, item.lng], { icon })
          .addTo(map)
          .bindTooltip(item.name, { permanent: false, direction: "top" });
        marker.on("click", () => onSelectItem(item.id));
        markersRef.current[item.id] = marker;
      });
      if (toShow.length) {
        try { map.fitBounds(L.latLngBounds(toShow.map((i) => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 16 }); }
        catch {}
      }
    }
    if (window.L && mapRef.current) update();
    else { const t = setTimeout(update, 800); return () => clearTimeout(t); }
  }, [items, visibleIds, activeItemId]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", minHeight: 420 }} />;
}
