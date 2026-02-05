'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, User, Specialization, Service } from '@/lib/supabase'
import { logAdminAction, type MasterVerification } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSearch, FiCheckCircle, FiXCircle, FiShield, FiTrendingUp, FiUsers, FiBriefcase } from 'react-icons/fi'

interface MasterWithStats {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'master'
  phone?: string
  city?: string
  description?: string
  created_at: string
  experience_years?: number
  verification?: MasterVerification
  specializations?: Specialization[]
  services?: Service[]
  responses_count?: number
  accepted_responses_count?: number
  portfolio_count?: number
}

const PAGE_SIZE = 20

export default function AdminMastersPage() {
  const { user: currentUser } = useAuth()
  const [masters, setMasters] = useState<MasterWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [verificationFilter, setVerificationFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedMaster, setSelectedMaster] = useState<MasterWithStats | null>(null)

  useEffect(() => {
    fetchMasters()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_masters', 'masters')
    }
  }, [currentUser, verificationFilter, page])

  const fetchMasters = async (pageOverride?: number) => {
    const currentPage = pageOverride ?? page
    try {
      setLoading(true)
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'master')
      let dataQuery = supabase
        .from('profiles')
        .select(`
          *,
          profile_subcategories (
            subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
          ),
          profile_services (
            service:services (id, name, slug, subcategory_id)
          )
        `)
        .eq('role', 'master')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)

      if (searchQuery) {
        const or = `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
        countQuery = countQuery.or(or)
        dataQuery = dataQuery.or(or)
      }

      const [{ count }, { data: mastersData, error: mastersError }] = await Promise.all([
        countQuery,
        dataQuery,
      ])
      if (mastersError) throw mastersError
      setTotalCount(count ?? 0)

      const masterIds = (mastersData || []).map((m: any) => m.id)
      if (masterIds.length === 0) {
        setMasters([])
        return
      }

      const [verificationsData, responsesData, portfolioData] = await Promise.all([
        supabase.from('master_verification').select('*').in('master_id', masterIds),
        supabase.from('order_responses').select('master_id, status').in('master_id', masterIds),
        supabase.from('portfolio_items').select('master_id').in('master_id', masterIds),
      ])

      const mastersWithStats = (mastersData || []).map((master: any) => {
        const verification = verificationsData.data?.find((v: any) => v.master_id === master.id)
        const responses = responsesData.data?.filter((r: any) => r.master_id === master.id) || []
        const portfolioCount = portfolioData.data?.filter((p: any) => p.master_id === master.id).length || 0
        const specializations = (master.profile_subcategories || [])
          .map((ps: any) => ps.subcategory)
          .filter(Boolean)
        const services = (master.profile_services || [])
          .map((ps: any) => ps.service)
          .filter(Boolean)
        return {
          ...master,
          verification,
          specializations,
          services,
          responses_count: responses.length,
          accepted_responses_count: responses.filter((r: any) => r.status === 'accepted').length,
          portfolio_count: portfolioCount,
        } as MasterWithStats
      })

      let filtered = mastersWithStats
      if (verificationFilter === 'verified') {
        filtered = mastersWithStats.filter((m) => m.verification?.is_verified)
      } else if (verificationFilter === 'unverified') {
        filtered = mastersWithStats.filter((m) => !m.verification?.is_verified)
      }
      setMasters(filtered)
    } catch (error) {
      console.error('Error fetching masters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMaster = async (masterId: string, verified: boolean, level?: 'basic' | 'advanced' | 'premium') => {
    if (!currentUser) return

    try {
      // Check if verification record exists
      const { data: existing } = await supabase
        .from('master_verification')
        .select('id')
        .eq('master_id', masterId)
        .maybeSingle()

      if (existing) {
        // Update existing
        await supabase
          .from('master_verification')
          .update({
            is_verified: verified,
            verification_level: level || null,
            verified_by: currentUser.id,
            verified_at: verified ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        // Create new
        await supabase.from('master_verification').insert({
          master_id: masterId,
          is_verified: verified,
          verification_level: level || null,
          verified_by: currentUser.id,
          verified_at: verified ? new Date().toISOString() : null,
        })
      }

      await logAdminAction(currentUser.id, verified ? 'verify_master' : 'unverify_master', 'master', masterId, {
        verification_level: level,
      })

      alert(verified ? 'Мастер верифицирован' : 'Верификация отменена')
      fetchMasters(page)
      if (selectedMaster?.id === masterId) {
        const updated = masters.find((m) => m.id === masterId)
        if (updated) setSelectedMaster(updated)
      }
    } catch (error) {
      console.error('Error verifying master:', error)
      alert('Ошибка при верификации')
    }
  }

  const handleRestrictServices = async (masterId: string, reason: string) => {
    if (!currentUser) return
    // TODO: Implement service restrictions
    alert('Функция ограничения услуг будет реализована')
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Управление мастерами</h1>
        <p className="text-text-secondary">Верификация, управление статусами и аналитика мастеров</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Всего в выборке</div>
              <div className="text-2xl font-bold text-text-primary">{totalCount}</div>
            </div>
            <FiUsers className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Верифицировано</div>
              <div className="text-2xl font-bold text-brand-accent">
                {masters.filter((m) => m.verification?.is_verified).length}
              </div>
            </div>
            <FiCheckCircle className="text-brand-accent" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Не верифицировано</div>
              <div className="text-2xl font-bold text-text-primary">
                {masters.filter((m) => !m.verification?.is_verified).length}
              </div>
            </div>
            <FiXCircle className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">С откликами</div>
              <div className="text-2xl font-bold text-text-primary">
                {masters.filter((m) => (m.responses_count || 0) > 0).length}
              </div>
            </div>
            <FiTrendingUp className="text-text-secondary" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchMasters(1))}
              placeholder="Поиск по имени, email, городу..."
              className="input pl-10 w-full h-10 text-sm"
            />
          </div>
          <div className={`relative select-wrapper w-full ${verificationFilter ? 'has-value' : ''}`} data-placeholder="Верификация">
            <select
              value={verificationFilter || ''}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="input w-full h-10 text-sm appearance-none cursor-pointer"
              style={{
                color: !verificationFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                Верификация
              </option>
              <option value="verified">Верифицированные</option>
              <option value="unverified">Не верифицированные</option>
            </select>
          </div>
          <button
            onClick={() => { setPage(1); fetchMasters(1); }}
            className="btn btn-primary h-10 w-full text-sm"
          >
            Найти
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="text-sm text-text-secondary">
          Показано {masters.length} из {totalCount}
        </div>
      )}

      {/* Masters List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {masters.map((master) => (
            <div
              key={master.id}
              onClick={() => setSelectedMaster(master)}
              className={`card cursor-pointer transition-colors ${
                selectedMaster?.id === master.id ? 'border-brand-accent border-2' : 'hover:shadow-lg'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center text-text-primary font-semibold flex-shrink-0">
                  {master.avatar_url ? (
                    <img src={master.avatar_url} alt={master.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    master.full_name[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-text-primary truncate">{master.full_name}</div>
                    {master.verification?.is_verified && (
                      <FiCheckCircle className="text-brand-accent flex-shrink-0" size={18} title="Верифицирован" />
                    )}
                  </div>
                  <div className="text-sm text-text-secondary mb-2">{master.email}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {master.city && <span className="text-text-secondary">📍 {master.city}</span>}
                    {master.verification?.verification_level && (
                      <span className="px-2 py-1 bg-bg-secondary rounded">
                        {master.verification.verification_level}
                      </span>
                    )}
                    {master.experience_years && (
                      <span className="text-text-secondary">Опыт: {master.experience_years} лет</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span>📦 Работ: {master.portfolio_count || 0}</span>
                    <span>Откликов: {master.responses_count || 0}</span>
                    {master.accepted_responses_count && master.accepted_responses_count > 0 && (
                      <span className="text-brand-accent">✅ Принято: {master.accepted_responses_count}</span>
                    )}
                  </div>
                  {master.specializations && master.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {master.specializations.slice(0, 3).map((spec) => (
                        <span key={spec.id} className="text-xs px-2 py-0.5 bg-bg-secondary rounded">
                          {spec.name}
                        </span>
                      ))}
                      {master.specializations.length > 3 && (
                        <span className="text-xs text-text-secondary">+{master.specializations.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="lg:col-span-2 flex items-center justify-between gap-4 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn btn-outline text-sm disabled:opacity-50"
            >
              ← Назад
            </button>
            <span className="text-sm text-text-secondary">
              Страница {page} из {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE) || loading}
              className="btn btn-outline text-sm disabled:opacity-50"
            >
              Вперёд →
            </button>
          </div>
        )}

        {/* Master Details */}
        {selectedMaster && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Детали мастера</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Имя</div>
                <div className="font-medium text-text-primary">{selectedMaster.full_name}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Email</div>
                <div className="font-medium text-text-primary">{selectedMaster.email}</div>
              </div>
              {selectedMaster.phone && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Телефон</div>
                  <div className="font-medium text-text-primary">{selectedMaster.phone}</div>
                </div>
              )}
              {selectedMaster.city && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Город</div>
                  <div className="font-medium text-text-primary">{selectedMaster.city}</div>
                </div>
              )}
              {selectedMaster.experience_years && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Опыт</div>
                  <div className="font-medium text-text-primary">{selectedMaster.experience_years} лет</div>
                </div>
              )}

              {/* Verification Status */}
              <div className="pt-4 border-t border-border-color">
                <div className="text-sm font-semibold text-text-primary mb-2">Статус верификации</div>
                <div className="text-sm text-text-secondary mb-3">
                  {selectedMaster.verification?.is_verified ? (
                    <span className="text-brand-accent flex items-center gap-1">
                      <FiCheckCircle size={16} /> Верифицирован
                      {selectedMaster.verification.verification_level && (
                        <span>({selectedMaster.verification.verification_level})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-text-secondary">Не верифицирован</span>
                  )}
                </div>
                {selectedMaster.verification?.verified_at && (
                  <div className="text-xs text-text-secondary">
                    Верифицирован: {format(new Date(selectedMaster.verification.verified_at), 'd MMM yyyy', { locale: ru })}
                  </div>
                )}
              </div>

              {/* Specializations */}
              {selectedMaster.specializations && selectedMaster.specializations.length > 0 && (
                <div className="pt-4 border-t border-border-color">
                  <div className="text-sm font-semibold text-text-primary mb-2">Специализации</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedMaster.specializations.map((spec) => (
                      <span key={spec.id} className="text-xs px-2 py-1 bg-bg-secondary rounded">
                        {spec.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="pt-4 border-t border-border-color">
                <div className="text-sm font-semibold text-text-primary mb-2">Статистика</div>
                <div className="space-y-1 text-sm text-text-secondary">
                  <div>Работ в портфолио: {selectedMaster.portfolio_count || 0}</div>
                  <div>Откликов на заказы: {selectedMaster.responses_count || 0}</div>
                  <div>Принятых откликов: {selectedMaster.accepted_responses_count || 0}</div>
                  {selectedMaster.responses_count && selectedMaster.responses_count > 0 && (
                    <div className="text-brand-accent">
                      Конверсия:{' '}
                      {Math.round(
                        ((selectedMaster.accepted_responses_count || 0) / selectedMaster.responses_count) * 100
                      )}
                      %
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border-color space-y-2">
                {!selectedMaster.verification?.is_verified ? (
                  <button
                    onClick={() => {
                      const levelInput = prompt('Уровень верификации (basic/advanced/premium, или пусто):')
                      if (levelInput === null) return // User cancelled
                      
                      const level = levelInput.trim()
                      if (level && ['basic', 'advanced', 'premium'].includes(level)) {
                        handleVerifyMaster(selectedMaster.id, true, level as 'basic' | 'advanced' | 'premium')
                      } else if (!level) {
                        handleVerifyMaster(selectedMaster.id, true)
                      }
                    }}
                    className="w-full btn btn-primary text-sm"
                  >
                    Верифицировать
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerifyMaster(selectedMaster.id, false)}
                    className="w-full btn btn-outline text-sm"
                  >
                    Отменить верификацию
                  </button>
                )}
                <button
                  onClick={() => {
                    const reason = prompt('Причина ограничения услуг:')
                    if (reason) {
                      handleRestrictServices(selectedMaster.id, reason)
                    }
                  }}
                  className="w-full btn btn-outline text-sm"
                >
                  Ограничить услуги
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
