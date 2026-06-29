const MALVINAS_LABEL_POSITION: [number, number] = [-51.7963, -59.5236];
const MALVINAS_PANE_NAME = 'urbanfix-malvinas-label-pane';

type LeafletMapLike = {
  createPane?: (name: string) => HTMLElement;
  getPane?: (name: string) => HTMLElement | undefined;
  _urbanfixMalvinasLabel?: unknown;
};

export const addMalvinasArgentinaLabel = (L: any, map: LeafletMapLike) => {
  if (!L || !map || map._urbanfixMalvinasLabel) return map?._urbanfixMalvinasLabel || null;

  if (typeof map.getPane === 'function' && !map.getPane(MALVINAS_PANE_NAME) && typeof map.createPane === 'function') {
    const pane = map.createPane(MALVINAS_PANE_NAME);
    pane.style.zIndex = '675';
    pane.style.pointerEvents = 'none';
  }

  const marker = L.marker(MALVINAS_LABEL_POSITION, {
    interactive: false,
    keyboard: false,
    pane: MALVINAS_PANE_NAME,
    icon: L.divIcon({
      html: '<div class="ufx-malvinas-map-label">Islas Malvinas Argentinas</div>',
      className: 'ufx-malvinas-map-label-shell',
      iconSize: [218, 34],
      iconAnchor: [109, 17],
    }),
    zIndexOffset: 1200,
  });

  map._urbanfixMalvinasLabel = marker.addTo(map);
  return map._urbanfixMalvinasLabel;
};
