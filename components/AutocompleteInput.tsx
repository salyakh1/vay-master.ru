'use client'

import { useState, useEffect, useRef } from 'react'
import { FiSearch } from 'react-icons/fi'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e?: React.FormEvent) => void
  placeholder?: string
  type?: 'master' | 'product' | 'all'
  disabled?: boolean
}

interface AutocompleteOption {
  id: string
  name: string
  type: 'master' | 'product' | 'service' | 'specialization'
}

export default function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Введите запрос...',
  type = 'all',
  disabled = false,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Загрузка подсказок
  useEffect(() => {
    if (!value.trim() || value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(value)}&type=${type}`)
        if (!response.ok) return

        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [value, type])

  // Закрытие подсказок при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setShowSuggestions(true)
  }

  const handleSelectSuggestion = (suggestion: AutocompleteOption) => {
    onChange(suggestion.name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSubmit()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex])
        } else {
          onSubmit()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      master: 'Мастер',
      product: 'Товар',
      service: 'Услуга',
      specialization: 'Специализация',
    }
    return labels[type] || type
  }

  return (
    <div className="relative">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="input pl-12 pr-4"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-bg-primary border border-border-color rounded-lg shadow-card max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-bg-secondary transition-colors ${
                index === selectedIndex ? 'bg-bg-secondary' : ''
              } ${index > 0 ? 'border-t border-border-color' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base text-text-primary font-medium">{suggestion.name}</span>
                <span className="text-xs text-text-secondary px-2 py-1 bg-bg-secondary rounded">
                  {getTypeLabel(suggestion.type)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

