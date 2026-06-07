'use client'

/**
 * Обёртки react-leaflet с ослабленной типизацией MapContainer:
 * в проекте используются whenCreated / onClick, которые не совпадают с типами v4.
 */
import {
  MapContainer as RLMapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
} from 'react-leaflet'

export const MapContainer = RLMapContainer as any
export { TileLayer, Marker, Circle, Popup }
