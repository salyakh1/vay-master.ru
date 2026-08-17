'use client'

import { useState } from 'react'

type Value = { city: string; address: string } | null

export default function OrderLocationPicker({
  value,
  onChange,
}: {
  value: Value
  onChange: (v: Value) => void
}) {
  const [city, setCity] = useState(value?.city || '')
  const [address, setAddress] = useState(value?.address || '')

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCity = e.target.value
    setCity(newCity)
    onChange({ city: newCity, address })
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value
    setAddress(newAddress)
    onChange({ city, address: newAddress })
  }

  return (
    <div className="order-location-picker bg-bg-card rounded-lg border border-border-light/60 overflow-hidden">
      <div className="px-4 py-3 space-y-3">
        <div>
          <div className="text-sm font-semibold text-graphite-secondary mb-2">Место выполнения работ *</div>
        </div>

        {/* Город */}
        <div>
          <label className="block text-sm font-semibold text-graphite-secondary mb-2">
            Город *
          </label>
          <input
            type="text"
            value={city}
            onChange={handleCityChange}
            required
            className="input"
            placeholder="Ваш город"
          />
        </div>

        {/* Адрес */}
        <div>
          <label className="block text-sm font-semibold text-graphite-secondary mb-2">
            Адрес *
          </label>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            required
            className="input"
            placeholder="Например: ул. Ленина, д. 10"
          />
        </div>
      </div>
    </div>
  )
}

