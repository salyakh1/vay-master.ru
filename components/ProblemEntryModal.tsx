'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { FiX, FiUser, FiShoppingBag } from 'react-icons/fi'
import AutocompleteInput from './AutocompleteInput'

const STORAGE_KEY = 'vaymaster_problem_entry_skipped' // sessionStorage вместо localStorage

type SearchType = 'master' | 'product' | null

export default function ProblemEntryModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchType, setSearchType] = useState<SearchType>(null)
  const [problemText, setProblemText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()

  // Убеждаемся, что компонент монтирован на клиенте
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Ждем монтирования на клиенте
    if (!mounted) return

    // Ждем, пока pathname определится (избегаем проблем с гидратацией)
    if (!pathname) return

    // Показываем модалку только на главной странице
    if (pathname !== '/') return

    // Проверяем, не пропустил ли пользователь модалку в текущей сессии
    // sessionStorage очищается при закрытии вкладки/браузера
    const skipped = sessionStorage.getItem(STORAGE_KEY)
    if (!skipped) {
      // Небольшая задержка для плавного появления
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [mounted, pathname])

  useEffect(() => {
    // Автофокус на input при выборе типа поиска
    if (isOpen && searchType && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, searchType])

  const handleClose = () => {
    setIsOpen(false)
    // Сохраняем в sessionStorage - будет показываться при следующем открытии браузера
    sessionStorage.setItem(STORAGE_KEY, 'true')
  }

  const handleSkip = () => {
    handleClose()
  }

  const handleSelectType = (type: 'master' | 'product') => {
    // Для всех пользователей (включая неавторизованных) показываем поле для ввода проблемы
    setSearchType(type)
  }

  const handleBackToTypeSelection = () => {
    setSearchType(null)
    setProblemText('')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!problemText.trim() || isSubmitting) return

    setIsSubmitting(true)
    
    try {
      // Для неавторизованных пользователей просто перенаправляем на страницу поиска с запросом
      if (!authLoading && !user) {
        handleClose()
        if (searchType === 'master') {
          router.push(`/search?q=${encodeURIComponent(problemText.trim())}`)
        } else {
          router.push(`/products?q=${encodeURIComponent(problemText.trim())}`)
        }
        setIsSubmitting(false)
        return
      }

      // Для авторизованных пользователей используем API для обработки проблемы
      const response = await fetch('/api/problem-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ problemText: problemText.trim() }),
      })

      if (!response.ok) {
        throw new Error('Ошибка при поиске решения')
      }

      // Сохраняем результат в sessionStorage
      const data = await response.json()
      sessionStorage.setItem('problem_result', JSON.stringify(data.data))
      sessionStorage.setItem('problem_text', problemText.trim())
      
      // Закрываем модалку и переходим на страницу результата
      handleClose()
      router.push(`/problem-result?text=${encodeURIComponent(problemText.trim())}`)
    } catch (error) {
      console.error('Error submitting problem:', error)
      alert('Произошла ошибка при поиске решения. Попробуйте еще раз.')
      setIsSubmitting(false)
    }
  }

  // Не рендерим до монтирования на клиенте
  if (!mounted) return null

  if (!isOpen) return null

  const isSubmitDisabled = !problemText.trim() || isSubmitting

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-lg bg-bg-primary border border-border-color rounded-lg shadow-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-graphite-secondary transition-colors p-1"
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-graphite-secondary mb-2 tracking-tight">
              {searchType === null ? 'Что вы ищете?' : searchType === 'master' ? 'Ищете мастера?' : 'Ищете инструмент?'}
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              {searchType === null
                ? 'Выберите, что вам нужно'
                : searchType === 'master'
                ? 'Опишите проблему или выберите специализацию'
                : 'Опишите нужный инструмент или выберите категорию'}
            </p>
          </div>

          {/* Type Selection */}
          {searchType === null ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleSelectType('master')}
                className="w-full p-6 border-2 border-border-color hover:border-brand-accent transition-colors text-left rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-accent flex items-center justify-center rounded-lg">
                    <FiUser size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg text-text-primary mb-1">
                      Ищете мастера?
                    </div>
                    <div className="text-sm text-text-secondary">
                      Найдем специалиста для решения вашей задачи
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('product')}
                className="w-full p-6 border-2 border-border-color hover:border-brand-accent transition-colors text-left rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-accent flex items-center justify-center rounded-lg">
                    <FiShoppingBag size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg text-text-primary mb-1">
                      Ищете инструмент?
                    </div>
                    <div className="text-sm text-text-secondary">
                      Найдем нужный инструмент или материал
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 px-4 font-medium text-sm bg-bg-primary text-text-secondary border border-border-color hover:border-brand-accent hover:text-text-primary transition-colors mt-4 rounded-lg"
              >
                Пропустить
              </button>
            </div>
          ) : (
            /* Search Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackToTypeSelection}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors mb-2"
              >
                ← Назад к выбору
              </button>

              {/* Autocomplete Input */}
              <div>
                <AutocompleteInput
                  value={problemText}
                  onChange={setProblemText}
                  onSubmit={handleSubmit}
                  placeholder={
                    searchType === 'master'
                      ? 'Например: кровельщик, сантехник, электрик...'
                      : 'Например: дрель, перфоратор, краска...'
                  }
                  type={searchType}
                  disabled={isSubmitting}
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`w-full py-3 px-4 font-medium text-sm transition-colors rounded-lg ${
                    isSubmitDisabled
                      ? 'bg-bg-secondary text-text-secondary border border-border-color cursor-not-allowed'
                      : 'btn btn-primary'
                  }`}
                >
                  {isSubmitting ? 'Поиск...' : 'Найти решение'}
                </button>
                
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-3 px-4 font-medium text-sm bg-bg-primary text-text-secondary border border-border-color hover:border-brand-accent hover:text-text-primary transition-colors rounded-lg"
                >
                  Пропустить
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

