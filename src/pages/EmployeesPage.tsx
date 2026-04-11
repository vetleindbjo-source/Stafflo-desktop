import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { EmployeeModal } from '../components/EmployeeModal'
import { Employee, DAY_NAMES, LEAVE_TYPE_LABELS } from '../types'
import { useT } from '../utils/i18n'

export function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, settings } = useAppStore()
  const tr = useT(settings.language ?? 'no')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  function handleSave(employee: Employee) {
    if (editingEmployee) {
      updateEmployee(employee)
    } else {
      addEmployee(employee)
    }
    setShowModal(false)
    setEditingEmployee(null)
  }

  function openEdit(e: Employee) {
    setEditingEmployee(e)
    setShowModal(true)
  }

  function openAdd() {
    setEditingEmployee(null)
    setShowModal(true)
  }

  function confirmDelete(id: string) {
    deleteEmployee(id)
    setDeleteConfirm(null)
  }

  function getActiveLeaves(employee: Employee) {
    const today = new Date().toISOString().split('T')[0]
    return employee.leaves.filter((l) => l.startDate <= today && l.endDate >= today)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-theme-border bg-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-1">{tr('employees_title')}</h1>
            <p className="text-text-2 text-sm mt-0.5">{tr('employees_subtitle', employees.length)}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {tr('employees_add')}
          </button>
        </div>

        {employees.length > 0 && (
          <div className="mt-4 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={tr('employees_search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs pl-9 pr-4 border border-theme-border bg-surface text-text-1 placeholder:text-text-3 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-1 mb-1">{tr('employees_empty_title')}</h3>
            <p className="text-text-3 text-sm mb-6 max-w-xs">{tr('employees_empty_desc')}</p>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {tr('employees_add_first')}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-text-3">
            <p>{tr('employees_no_match', search)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((employee) => {
              const activeLeaves = getActiveLeaves(employee)
              const isOnLeave = activeLeaves.length > 0
              return (
                <div
                  key={employee.id}
                  className="bg-surface rounded-xl border border-theme-border shadow-card hover:shadow-md transition-shadow p-4 flex items-center gap-4"
                >
                  {/* Color avatar */}
                  <div
                    className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-semibold text-lg"
                    style={{ backgroundColor: employee.color || '#3b82f6' }}
                  >
                    {employee.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-1">{employee.name}</span>
                      {isOnLeave && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {LEAVE_TYPE_LABELS[activeLeaves[0].type]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {employee.role && (
                        <span className="text-sm text-text-2">{employee.role}</span>
                      )}
                      <span className="text-sm font-medium text-primary">{employee.positionPercent}%</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <span
                          key={d}
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            employee.availableDays.includes(d)
                              ? 'bg-primary/10 text-primary'
                              : 'bg-slate-100 dark:bg-slate-700/60 text-text-3'
                          }`}
                        >
                          {DAY_NAMES[d]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Leave count */}
                  {employee.leaves.length > 0 && (
                    <div className="text-center px-3">
                      <div className="text-lg font-bold text-text-1">{employee.leaves.length}</div>
                      <div className="text-xs text-text-3">{tr('leaves_label')}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(employee)}
                      className="p-2 text-text-3 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title={tr('edit')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {deleteConfirm === employee.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => confirmDelete(employee.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          {tr('delete')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700/60 text-text-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          {tr('no_word')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(employee.id)}
                        className="p-2 text-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={tr('delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingEmployee(null) }}
        />
      )}
    </div>
  )
}
