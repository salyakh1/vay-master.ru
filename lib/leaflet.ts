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
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
      iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
      shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    })
  })
}
