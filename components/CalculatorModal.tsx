'use client'

import { useState } from 'react'
import { FiX, FiSend } from 'react-icons/fi'

type CalculatorMode = 'basic' | 'construction' | 'materials' | 'financial'

interface CalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onSendResult: (result: string) => void
}

export default function CalculatorModal({ isOpen, onClose, onSendResult }: CalculatorModalProps) {
  const [mode, setMode] = useState<CalculatorMode>('basic')
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)

  // Construction mode states
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [area, setArea] = useState('')
  const [volume, setVolume] = useState('')

  // Materials mode states
  const [materialPrice, setMaterialPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [totalCost, setTotalCost] = useState('')

  // Financial mode states
  const [workPrice, setWorkPrice] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [totalEstimate, setTotalEstimate] = useState('')

  if (!isOpen) return null

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const handleOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForNewValue(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue
      case '-':
        return firstValue - secondValue
      case '*':
        return firstValue * secondValue
      case '/':
        return secondValue !== 0 ? firstValue / secondValue : 0
      default:
        return secondValue
    }
  }

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const inputValue = parseFloat(display)
      const newValue = calculate(previousValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForNewValue(true)
    }
  }

  const handleClear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForNewValue(false)
  }

  const calculateArea = () => {
    const l = parseFloat(length) || 0
    const w = parseFloat(width) || 0
    const result = l * w
    setArea(result.toFixed(2))
    setDisplay(result.toFixed(2))
  }

  const calculateVolume = () => {
    const l = parseFloat(length) || 0
    const w = parseFloat(width) || 0
    const h = parseFloat(height) || 0
    const result = l * w * h
    setVolume(result.toFixed(2))
    setDisplay(result.toFixed(2))
  }

  const calculateMaterialCost = () => {
    const price = parseFloat(materialPrice) || 0
    const qty = parseFloat(quantity) || 0
    const result = price * qty
    setTotalCost(result.toFixed(2))
    setDisplay(result.toFixed(2))
  }

  const calculateEstimate = () => {
    const work = parseFloat(workPrice) || 0
    const hours = parseFloat(workHours) || 0
    const materials = parseFloat(materialCost) || 0
    const result = work * hours + materials
    setTotalEstimate(result.toFixed(2))
    setDisplay(result.toFixed(2))
  }

  const handleSendResult = () => {
    let resultText = ''
    
    switch (mode) {
      case 'basic':
        resultText = `📊 Расчет:\nРезультат: ${display}`
        break
      case 'construction':
        if (area) {
          const l = parseFloat(length) || 0
          const w = parseFloat(width) || 0
          resultText = `📐 Расчет площади:\n\nДлина: ${length} м\nШирина: ${width} м\n\nФормула: Площадь = Длина × Ширина\nПлощадь = ${l} × ${w} = ${area} м²\n\n✅ Итого: ${area} м²`
        } else if (volume) {
          const l = parseFloat(length) || 0
          const w = parseFloat(width) || 0
          const h = parseFloat(height) || 0
          resultText = `📦 Расчет объема:\n\nДлина: ${length} м\nШирина: ${width} м\nВысота: ${height} м\n\nФормула: Объем = Длина × Ширина × Высота\nОбъем = ${l} × ${w} × ${h} = ${volume} м³\n\n✅ Итого: ${volume} м³`
        } else {
          resultText = `📊 Расчет:\nРезультат: ${display}`
        }
        break
      case 'materials':
        const price = parseFloat(materialPrice) || 0
        const qty = parseFloat(quantity) || 0
        const cost = totalCost || display
        resultText = `🛠️ Расчет стоимости материалов:\n\nЦена за единицу: ${materialPrice} ₽\nКоличество: ${quantity} шт.\n\nФормула: Стоимость = Цена × Количество\nСтоимость = ${price} × ${qty} = ${cost} ₽\n\n✅ Итого: ${cost} ₽`
        break
      case 'financial':
        const work = parseFloat(workPrice) || 0
        const hours = parseFloat(workHours) || 0
        const materials = parseFloat(materialCost) || 0
        const workTotal = work * hours
        const estimate = totalEstimate || display
        resultText = `💰 Смета работ:\n\n📋 Работа:\n  Цена за час: ${workPrice} ₽\n  Часов работы: ${workHours} ч\n  Стоимость работы: ${work} × ${hours} = ${workTotal.toFixed(2)} ₽\n\n📦 Материалы:\n  Стоимость материалов: ${materialCost} ₽\n\nФормула: Итого = Работа + Материалы\nИтого = ${workTotal.toFixed(2)} + ${materials} = ${estimate} ₽\n\n✅ Итого: ${estimate} ₽`
        break
    }

    // Убеждаемся, что текст не пустой
    if (resultText.trim()) {
      onSendResult(resultText)
      onClose()
    } else {
      alert('Нет данных для отправки. Выполните расчет.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border border-border-color rounded-lg shadow-card w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔢</span>
            <h2 className="text-lg font-semibold text-text-primary">Калькулятор</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b border-border-color">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('basic')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                mode === 'basic'
                  ? 'bg-brand-accent text-white'
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-primary'
              }`}
            >
              Обычный
            </button>
            <button
              onClick={() => setMode('construction')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                mode === 'construction'
                  ? 'bg-brand-accent text-white'
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-primary'
              }`}
            >
              Строительный
            </button>
            <button
              onClick={() => setMode('materials')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                mode === 'materials'
                  ? 'bg-brand-accent text-white'
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-primary'
              }`}
            >
              Материалы
            </button>
            <button
              onClick={() => setMode('financial')}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                mode === 'financial'
                  ? 'bg-brand-accent text-white'
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-primary'
              }`}
            >
              Смета
            </button>
          </div>
        </div>

        {/* Calculator Content */}
        <div className="p-4">
          {mode === 'basic' && (
            <div>
              <div className="bg-bg-secondary p-4 rounded-lg mb-4 text-right">
                <div className="text-3xl font-semibold text-text-primary">{display}</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9', '/'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => (btn === '/' ? handleOperation('/') : handleNumber(btn))}
                    className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color h-12"
                  >
                    {btn}
                  </button>
                ))}
                {['4', '5', '6', '*'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => (btn === '*' ? handleOperation('*') : handleNumber(btn))}
                    className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color h-12"
                  >
                    {btn}
                  </button>
                ))}
                {['1', '2', '3', '-'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => (btn === '-' ? handleOperation('-') : handleNumber(btn))}
                    className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color h-12"
                  >
                    {btn}
                  </button>
                ))}
                {['0', '.', '=', '+'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => {
                      if (btn === '=') handleEquals()
                      else if (btn === '+') handleOperation('+')
                      else if (btn === '.') handleNumber('.')
                      else handleNumber(btn)
                    }}
                    className={`btn h-12 ${
                      btn === '='
                        ? 'bg-brand-accent text-white border-brand-accent col-span-2'
                        : 'bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 h-12 col-span-2"
                >
                  Очистить
                </button>
              </div>
            </div>
          )}

          {mode === 'construction' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Длина (м)</label>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Ширина (м)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Высота (м)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={calculateArea} className="btn btn-primary flex-1">
                  Площадь (м²)
                </button>
                <button onClick={calculateVolume} className="btn btn-primary flex-1">
                  Объем (м³)
                </button>
              </div>
              {(area || volume) && (
                <div className="bg-bg-secondary p-4 rounded-lg">
                  {area && <div className="text-lg font-semibold text-text-primary">Площадь: {area} м²</div>}
                  {volume && <div className="text-lg font-semibold text-text-primary">Объем: {volume} м³</div>}
                </div>
              )}
            </div>
          )}

          {mode === 'materials' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Цена за единицу (₽)</label>
                <input
                  type="number"
                  value={materialPrice}
                  onChange={(e) => setMaterialPrice(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Количество</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <button onClick={calculateMaterialCost} className="btn btn-primary w-full">
                Рассчитать стоимость
              </button>
              {totalCost && (
                <div className="bg-bg-secondary p-4 rounded-lg">
                  <div className="text-lg font-semibold text-text-primary">Итого: {totalCost} ₽</div>
                </div>
              )}
            </div>
          )}

          {mode === 'financial' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Цена работы за час (₽)</label>
                <input
                  type="number"
                  value={workPrice}
                  onChange={(e) => setWorkPrice(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Часов работы</label>
                <input
                  type="number"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Стоимость материалов (₽)</label>
                <input
                  type="number"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <button onClick={calculateEstimate} className="btn btn-primary w-full">
                Рассчитать смету
              </button>
              {totalEstimate && (
                <div className="bg-bg-secondary p-4 rounded-lg">
                  <div className="text-lg font-semibold text-text-primary">Итого: {totalEstimate} ₽</div>
                </div>
              )}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendResult}
            className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <FiSend size={16} />
            <span>Отправить результат</span>
          </button>
        </div>
      </div>
    </div>
  )
}

