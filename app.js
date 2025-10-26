// Inicializace mapy bez časové osy + lightbox s animovaným přechodem

document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map", { zoomControl: true }).setView([50.6025, 14.8015], 14);

  const base = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap přispěvatelé"
  }).addTo(map);

  // ČÚZK ORTOFOTO (WMTS) – přímý tile URL bez pluginu
  // Využívá GoogleMapsCompatible mřížku (EPSG:3857)
  const cuzkOrto = L.tileLayer(
    "https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/WMTS/tile/1.0.0/ORTOFOTO_WM/default/GoogleMapsCompatible/{z}/{y}/{x}.jpeg",
    {
      maxZoom: 19,
      attribution: "Ortofoto © ČÚZK",
    }
  );

  const detailPanel = document.getElementById("feature-detail");
  const viewer3d = document.getElementById("viewer3d");

  // DEM/relief – zástupná vrstva (poloprůhledný polygon)
  const demReliefData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "DEM – stínovaný reliéf" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [14.7960, 50.6065], [14.8085, 50.6065], [14.8085, 50.5980], [14.7960, 50.5980], [14.7960, 50.6065]
          ]]
        }
      }
    ]
  };

  const demRelief = L.geoJSON(demReliefData, {
    style: { color: "#4A6A4A", weight: 1, fillColor: "#4A6A4A", fillOpacity: 0.15 }
  });

  const historicalFootprintData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Historický půdorys Holiček",
          period: "1842",
          description: "Přibližné vymezení zastavěného území dle stabilního katastru.",
          source: "Archivní mapy"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [14.7969, 50.6054], [14.8041, 50.6058], [14.8064, 50.6009], [14.8010, 50.5987], [14.7952, 50.6008], [14.7969, 50.6054]
          ]]
        }
      }
    ]
  };

  const historicalFootprint = L.geoJSON(historicalFootprintData, {
    style: { color: "#4A6A4A", weight: 2, fillColor: "#B87333", fillOpacity: 0.35 },
    onEachFeature: attachEvents
  });

  const pointsOfInterestData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Základy kostela",
          description: "Dochované zdi a fragmenty podlahy. Vhodné pro skenování a 3D dokumentaci.",
          media: "Fotogalerie, plánovaný 3D model"
        },
        geometry: { type: "Point", coordinates: [14.8009, 50.6027] }
      },
      {
        type: "Feature",
        properties: {
          name: "Rodinný archiv – statek č.p. 12",
          description: "Série snímků před vystěhováním a po zániku.",
          media: "10 fotografií, přepis vzpomínek"
        },
        geometry: { type: "Point", coordinates: [14.8043, 50.6039] }
      }
    ]
  };

  const pointsOfInterest = L.geoJSON(pointsOfInterestData, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 8, color: "#4A6A4A", weight: 1, fillColor: "#B87333", fillOpacity: 0.9
    }),
    onEachFeature: attachEvents
  });

  // Ilustrativní linie pro fázi VVP
  const vvpPhaseData = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { name: "Demolice/VVP (po 1950)" }, geometry: { type: "LineString", coordinates: [ [14.7945, 50.6040], [14.8072, 50.6040] ] } },
      { type: "Feature", properties: { name: "Demolice/VVP (po 1950)" }, geometry: { type: "LineString", coordinates: [ [14.8072, 50.6000], [14.7945, 50.6000] ] } }
    ]
  };
  const vvpPhase = L.geoJSON(vvpPhaseData, { style: { color: "#B87333", weight: 3, dashArray: "6 4", opacity: 0.85 } });

  const layers = { base, cuzkOrto, historicalFootprint, demRelief, pointsOfInterest, vvpPhase };

  // Výchozí zobrazení
  historicalFootprint.addTo(map);
  demRelief.addTo(map);
  pointsOfInterest.addTo(map);

  // Přepínače vrstev
  document.querySelectorAll("input[data-layer]").forEach((el) => {
    const key = el.dataset.layer;
    el.addEventListener("change", () => {
      if (!layers[key]) return;
      if (el.checked) {
        layers[key].addTo(map);
      } else {
        map.removeLayer(layers[key]);
      }
    });
  });

  // 3D mód – placeholder
  const mode3d = document.getElementById("mode3d");
  if (mode3d) {
    mode3d.addEventListener("change", () => {
      viewer3d.style.display = mode3d.checked ? "grid" : "none";
    });
  }

  // Reset mapy
  document.getElementById("reset-map")?.addEventListener("click", () => {
    map.setView([50.6025, 14.8015], 14);
    document.querySelectorAll("input[data-layer]").forEach((el) => {
      const key = el.dataset.layer;
      el.checked = true;
      if (layers[key] && !map.hasLayer(layers[key])) layers[key].addTo(map);
    });
    if (mode3d) { mode3d.checked = false; viewer3d.style.display = "none"; }
    detailPanel.innerHTML = "<h3>Detail prvku</h3><p>Vyberte objekt v mapě pro popis a média.</p>";
  });

  function attachEvents(feature, layer) {
    const props = feature.properties || {};
    layer.on("click", () => updateDetail(props));
    if (props.name) layer.bindTooltip(props.name, { direction: "top", offset: [0, -10] });
  }

  function updateDetail(props) {
    const rows = [];
    if (props.name) rows.push(`<strong>${props.name}</strong>`);
    if (props.period) rows.push(`<p><em>${props.period}</em></p>`);
    if (props.description) rows.push(`<p>${props.description}</p>`);
    if (props.media) rows.push(`<p><strong>Materiály:</strong> ${props.media}</p>`);
    if (props.source) rows.push(`<p><strong>Zdroj:</strong> ${props.source}</p>`);
    detailPanel.innerHTML = `<h3>Detail prvku</h3>${rows.join("") || "<p>Bez dalších údajů.</p>"}`;
  }
});

// Rozbalování galerií v časové ose + LIGHTBOX s animovaným přechodem
(function(){
  const galleries = Array.from(document.querySelectorAll('.timeline-gallery'));
  const items = Array.from(document.querySelectorAll('.timeline-item'));

  // Toggle otevření položek (klik na tlačítko i na celý box)
  items.forEach((it) => {
    const btn = it.querySelector('.timeline-toggle');
    const gallery = it.querySelector('.timeline-gallery');
    if(!btn || !gallery) return;

    const setOpen = (open) => {
      it.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { gallery.removeAttribute('hidden'); } else { gallery.setAttribute('hidden',''); }
    };
    const toggle = () => setOpen(!it.classList.contains('open'));

    btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggle(); });
    btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); e.stopPropagation(); toggle(); } });
    it.addEventListener('click', (e)=>{ if(gallery.contains(e.target)) return; toggle(); });
    it.addEventListener('keydown', (e)=>{ if((e.key==='Enter' || e.key===' ') && !gallery.contains(e.target)) { e.preventDefault(); toggle(); } });
    gallery.addEventListener('click', (e)=>{ e.stopPropagation(); });
  });

  if (!galleries.length) return;

  // LIGHTBOX
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.innerHTML = `
    <button class="lightbox-close" aria-label="Zavřít">×</button>
    <button class="lightbox-prev" aria-label="Předchozí">‹</button>
    <figure class="lightbox-figure">
      <img alt="Náhled" />
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button class="lightbox-next" aria-label="Další">›</button>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector('img');
  const captionEl = overlay.querySelector('.lightbox-caption');
  const btnClose = overlay.querySelector('.lightbox-close');
  const btnPrev = overlay.querySelector('.lightbox-prev');
  const btnNext = overlay.querySelector('.lightbox-next');

  let currentGroup = [];
  let currentIndex = 0;
  let animating = false;

  function setContentFrom(el) {
    imgEl.src = el.src;
    imgEl.alt = el.alt || '';
    const figcap = el.closest('figure')?.querySelector('figcaption')?.textContent || '';
    captionEl.textContent = figcap;
  }

  function showIndex(newIndex, animate = true) {
    if (!currentGroup.length) return;
    currentIndex = (newIndex + currentGroup.length) % currentGroup.length;
    const target = currentGroup[currentIndex];
    if (!animate) { setContentFrom(target); return; }
    if (animating) return; // jednoduchá ochrana proti spam klikům
    animating = true;
    // fade-out
    imgEl.classList.add('is-fading');
    const onEnd = () => {
      imgEl.removeEventListener('transitionend', onEnd);
      // změna obsahu
      setContentFrom(target);
      // force reflow a fade-in
      void imgEl.offsetWidth;
      imgEl.classList.remove('is-fading');
      // krátké zpoždění, než zase dovolíme další animaci
      setTimeout(()=>{ animating = false; }, 200);
    };
    imgEl.addEventListener('transitionend', onEnd);
  }

  function openLightbox(group, index) {
    currentGroup = group;
    showIndex(index, false); // bez animace při otevření
    overlay.classList.add('open');
    document.body.classList.add('lb-open');
  }

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.classList.remove('lb-open');
  }

  btnClose.addEventListener('click', (e)=>{ e.stopPropagation(); closeLightbox(); });
  btnPrev.addEventListener('click', (e)=>{ e.stopPropagation(); showIndex(currentIndex-1, true); });
  btnNext.addEventListener('click', (e)=>{ e.stopPropagation(); showIndex(currentIndex+1, true); });

  overlay.addEventListener('click', (e)=>{
    if (e.target === overlay) closeLightbox();
  });
  document.addEventListener('keydown', (e)=>{
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') showIndex(currentIndex-1, true);
    else if (e.key === 'ArrowRight') showIndex(currentIndex+1, true);
  });

  // navěsit na všechny obrázky v galeriích
  galleries.forEach(gal => {
    const imgs = Array.from(gal.querySelectorAll('img'));
    imgs.forEach((im, idx) => {
      im.style.cursor = 'zoom-in';
      im.addEventListener('click', (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        openLightbox(imgs, idx);
      });
    });
  });
})();
