'use client'

import L from 'leaflet'

/**
 * Единая настройка иконок маркеров Leaflet для всех карт в проекте.
 * Вызывать один раз при первом использовании карты (из любого компонента).
 */
let configured = false

export function configureLeafletIcons(): void {
  if (configured || typeof window === 'undefined') return
  configured = true

  delete (L.Icon.Default.prototype as any)._getIconUrl
  const base = window.location.origin
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${base}/leaflet/marker-icon-2x.png`,
    iconUrl: `${base}/leaflet/marker-icon.png`,
    shadowUrl: `${base}/leaflet/marker-shadow.png`,
  })
}

export { L as leaflet }
