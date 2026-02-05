/**
 * Единая настройка иконок маркеров Leaflet для всех карт в проекте.
 * Вызывать один раз при первом использовании карты (из любого компонента).
 */
let configured = false

export function configureLeafletIcons(): void {
  if (configured) return
  configured = true

  void import('leaflet').then((L) => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: `${base}/leaflet/marker-icon-2x.png`,
      iconUrl: `${base}/leaflet/marker-icon.png`,
      shadowUrl: `${base}/leaflet/marker-shadow.png`,
    })
  })
}
