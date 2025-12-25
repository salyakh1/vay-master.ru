'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase, Complaint } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiAlertCircle, FiCheck, FiX, FiClock, FiUser, FiMessageCircle } from 'react-icons/fi'

const statusLabels: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В обработке',
  resolved: 'Решена',
  rejected: 'Отклонена',
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function AdminComplaintsPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchComplaints()
    }
  }, [user])

  const fetchComplaints = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          complainer:profiles!complaints_complainer_id_fkey(id, full_name, avatar_url, email),
          reported_user:profiles!complaints_reported_user_id_fkey(id, full_name, avatar_url, email),
          chat:chats(id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComplaints((data as any) || [])
    } catch (error) {
      console.error('Error fetching complaints:', error)
      alert('Ошибка при загрузке жалоб')
    } finally {
      setLoading(false)
    }
  }

  const updateComplaintStatus = async (complaintId: string, status: string, notes?: string) => {
    if (!user) return

    setUpdating(true)
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (notes !== undefined) {
        updateData.admin_notes = notes
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId)

      if (error) throw error

      // Обновляем локальное состояние
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status, admin_notes: notes } : c))
      )

      setSelectedComplaint(null)
      setAdminNotes('')
      alert('Статус жалобы обновлен')
    } catch (error) {
      console.error('Error updating complaint:', error)
      alert('Ошибка при обновлении жалобы')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-text-secondary">Загрузка жалоб...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Жалобы</h1>
        <p className="text-text-secondary">
          Всего жалоб: {complaints.length} | Новых: {complaints.filter((c) => c.status === 'new').length}
        </p>
      </div>

      {complaints.length === 0 ? (
        <div className="card text-center py-12">
          <FiAlertCircle size={48} className="mx-auto text-text-secondary mb-4" />
          <p className="text-text-secondary">Жалоб пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => {
            const complainer = (complaint as any).complainer
            const reportedUser = (complaint as any).reported_user

            return (
              <div key={complaint.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[complaint.status] || statusColors.new}`}
                      >
                        {statusLabels[complaint.status] || complaint.status}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {format(new Date(complaint.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FiUser size={16} className="text-text-secondary" />
                          <span className="text-sm font-medium text-text-secondary">Пожаловался:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {complainer?.avatar_url && (
                            <img
                              src={complainer.avatar_url}
                              alt={complainer.full_name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-text-primary">{complainer?.full_name || 'Неизвестно'}</div>
                            <div className="text-sm text-text-secondary">{complainer?.email}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FiAlertCircle size={16} className="text-red-600" />
                          <span className="text-sm font-medium text-text-secondary">На пользователя:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {reportedUser?.avatar_url && (
                            <img
                              src={reportedUser.avatar_url}
                              alt={reportedUser.full_name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-text-primary">{reportedUser?.full_name || 'Неизвестно'}</div>
                            <div className="text-sm text-text-secondary">{reportedUser?.email}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {complaint.chat_id && (
                      <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
                        <FiMessageCircle size={16} />
                        <span>Чат ID: {complaint.chat_id}</span>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="text-sm font-medium text-text-secondary mb-1">Комментарий:</div>
                      <div className="p-3 bg-bg-secondary rounded-lg text-text-primary whitespace-pre-wrap">
                        {complaint.comment}
                      </div>
                    </div>

                    {complaint.admin_notes && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-text-secondary mb-1">Заметки администратора:</div>
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-text-primary whitespace-pre-wrap">
                          {complaint.admin_notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {complaint.status === 'new' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint)
                          setAdminNotes(complaint.admin_notes || '')
                        }}
                        className="btn btn-outline flex items-center gap-2"
                      >
                        <FiClock size={16} />
                        В обработку
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                        className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        disabled={updating}
                      >
                        <FiCheck size={16} />
                        Решена
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(complaint.id, 'rejected')}
                        className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                        disabled={updating}
                      >
                        <FiX size={16} />
                        Отклонить
                      </button>
                    </>
                  )}

                  {complaint.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => updateComplaintStatus(complaint.id, 'resolved', adminNotes)}
                        className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        disabled={updating}
                      >
                        <FiCheck size={16} />
                        Решена
                      </button>
                      <button
                        onClick={() => updateComplaintStatus(complaint.id, 'rejected', adminNotes)}
                        className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                        disabled={updating}
                      >
                        <FiX size={16} />
                        Отклонить
                      </button>
                    </>
                  )}

                  {(complaint.status === 'resolved' || complaint.status === 'rejected') && (
                    <button
                      onClick={() => updateComplaintStatus(complaint.id, 'new')}
                      className="btn btn-outline"
                      disabled={updating}
                    >
                      Вернуть в новые
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal for updating complaint with notes */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-primary border border-border-color rounded-lg shadow-card max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Обновить жалобу</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-text-primary">
                Заметки администратора
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="input w-full min-h-[100px] resize-none"
                placeholder="Добавьте заметки о решении жалобы..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedComplaint(null)
                  setAdminNotes('')
                }}
                className="btn btn-outline flex-1"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  updateComplaintStatus(selectedComplaint.id, 'in_progress', adminNotes)
                }}
                className="btn btn-primary flex-1"
                disabled={updating}
              >
                {updating ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
