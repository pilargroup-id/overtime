import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  user_id: '',
  permission_category: 'REQUEST',
  scope_type: 'COMPANY',
}

const PERMISSION_CATEGORY_OPTIONS = [
  { label: 'Request', value: 'REQUEST' },
  { label: 'Report', value: 'REPORT' },
]
const REQUEST_SCOPE_TYPE_OPTIONS = ['GLOBAL', 'COMPANY', 'DEPARTMENT']
const REPORT_SCOPE_TYPE_OPTIONS = ['GLOBAL']

function normalizeScopeType(permissionCategory, currentScopeType) {
  if (permissionCategory === 'REPORT') {
    return 'GLOBAL'
  }

  return REQUEST_SCOPE_TYPE_OPTIONS.includes(currentScopeType)
    ? currentScopeType
    : 'COMPANY'
}

function getPermissionType(permissionCategory, scopeType) {
  if (permissionCategory === 'REPORT') {
    return 'REPORT_MANAGE'
  }

  return scopeType === 'GLOBAL' ? 'REQUEST_CREATE_ALL' : 'REQUEST_CREATE_SCOPED'
}

function getAuthUser(responseData) {
  if (responseData?.data && typeof responseData.data === 'object') {
    return responseData.data
  }

  if (responseData && typeof responseData === 'object') {
    return responseData
  }

  return null
}

function normalizeEligibleEmployees(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results
  }

  return []
}

function getEmployeeLabel(employee) {
  const name = employee?.name || employee?.username || employee?.email || employee?.id || '-'
  const internalId = employee?.internal_id ? ` (${employee.internal_id})` : ''

  return `${name}${internalId}`
}

function DialogCreateUserPermission({
  isOpen = false,
  eyebrow = 'Create User Permission',
  title = 'Create User Permission',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [eligibleEmployees, setEligibleEmployees] = useState([])
  const [isLoadingAuthUser, setIsLoadingAuthUser] = useState(false)
  const [isLoadingEligibleEmployees, setIsLoadingEligibleEmployees] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setUserSearchQuery('')
    setIsUserDropdownOpen(false)
    setAuthUser(null)
    setEligibleEmployees([])
    setIsLoadingAuthUser(false)
    setIsLoadingEligibleEmployees(false)
    setIsSubmitting(false)
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, isSubmitting])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true

    const loadAuthUser = async () => {
      setIsLoadingAuthUser(true)
      setErrorMessage('')

      try {
        const response = await api.auth.me()

        if (!isMounted) {
          return
        }

        setAuthUser(getAuthUser(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAuthUser(null)
        setErrorMessage(error?.message || 'Gagal memuat data auth user.')
      } finally {
        if (isMounted) {
          setIsLoadingAuthUser(false)
        }
      }
    }

    const loadEligibleEmployees = async () => {
      setIsLoadingEligibleEmployees(true)
      setErrorMessage('')

      try {
        const response = await api.overtimeRequests.eligibleEmployees({
          limit: 100,
        })

        if (!isMounted) {
          return
        }

        setEligibleEmployees(normalizeEligibleEmployees(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setEligibleEmployees([])
        setErrorMessage(error?.message || 'Gagal memuat eligible employees.')
      } finally {
        if (isMounted) {
          setIsLoadingEligibleEmployees(false)
        }
      }
    }

    loadAuthUser()
    loadEligibleEmployees()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      if (name === 'permission_category') {
        return {
          ...currentValues,
          permission_category: value,
          scope_type: normalizeScopeType(value, currentValues.scope_type),
        }
      }

      if (name === 'scope_type') {
        return {
          ...currentValues,
          scope_type: value,
        }
      }

      return {
        ...currentValues,
        [name]: value,
      }
    })
  }

  const handleUserSelect = (employeeId) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      user_id: String(employeeId),
    }))
    setUserSearchQuery('')
    setIsUserDropdownOpen(false)
  }

  const buildPayload = () => {
    const normalizedScopeType = normalizeScopeType(
      formValues.permission_category,
      formValues.scope_type,
    )
    const permissionType = getPermissionType(
      formValues.permission_category,
      normalizedScopeType,
    )
    const isScopedPermission = permissionType === 'REQUEST_CREATE_SCOPED'
    const selectedEmployee = eligibleEmployees.find(
      (employee) => String(employee.id) === String(formValues.user_id),
    )

    return {
      user_id: formValues.user_id.trim(),
      permission_type: permissionType,
      scope_type: normalizedScopeType,
      company_id: isScopedPermission ? selectedEmployee?.company_id ?? null : null,
      department_id:
        isScopedPermission && normalizedScopeType === 'DEPARTMENT'
          ? selectedEmployee?.department_id ?? null
          : null,
      is_active: 1,
      valid_from: null,
      valid_until: null,
      granted_by: authUser?.id ?? null,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.user_id) {
      setErrorMessage('User wajib dipilih terlebih dahulu.')
      return
    }

    if (payload.permission_type === 'REQUEST_CREATE_SCOPED' && !payload.company_id) {
      setErrorMessage('Company user yang dipilih tidak tersedia.')
      return
    }

    if (payload.scope_type === 'DEPARTMENT' && !payload.department_id) {
      setErrorMessage('Department user yang dipilih tidak tersedia.')
      return
    }

    if (!payload.granted_by) {
      setErrorMessage('Data auth user untuk granted_by tidak tersedia.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdUserPermission = await api.userPermissions.create(payload)

      onCreated?.(createdUserPermission)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal membuat user permission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const grantedByLabel =
    authUser?.name || authUser?.username || authUser?.email || authUser?.id || '-'
  const normalizedUserSearchQuery = userSearchQuery.trim().toLowerCase()
  const filteredEmployees = eligibleEmployees.filter((employee) => {
    if (!normalizedUserSearchQuery) {
      return true
    }

    return [
      employee?.name,
      employee?.username,
      employee?.email,
      employee?.internal_id,
      employee?.id,
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(normalizedUserSearchQuery),
    )
  })
  const selectedEmployee = eligibleEmployees.find(
    (employee) => String(employee.id) === String(formValues.user_id),
  )
  const userDropdownLabel = isLoadingEligibleEmployees
    ? 'Loading users...'
    : selectedEmployee
      ? getEmployeeLabel(selectedEmployee)
      : 'Select user'
  const companyLabel =
    selectedEmployee?.company_name ||
    selectedEmployee?.company_code ||
    selectedEmployee?.company_id ||
    '-'
  const departmentLabel =
    selectedEmployee?.department_name ||
    selectedEmployee?.department_code ||
    selectedEmployee?.department_id ||
    '-'
  const scopeTypeOptions =
    formValues.permission_category === 'REPORT'
      ? REPORT_SCOPE_TYPE_OPTIONS
      : REQUEST_SCOPE_TYPE_OPTIONS

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup overtime-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-user-permission-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-user-permission-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="register-user-popup__grid">
                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-user-dropdown"
                    >
                      User
                    </label>
                    <div
                      className="overtime-create-popup__employee-dropdown"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setIsUserDropdownOpen(false)
                        }
                      }}
                    >
                      <button
                        id="create-user-permission-user-dropdown"
                        type="button"
                        className="register-user-popup__select overtime-create-popup__employee-trigger"
                        onClick={() =>
                          setIsUserDropdownOpen((currentValue) => !currentValue)
                        }
                        disabled={
                          isSubmitting || isLoadingAuthUser || isLoadingEligibleEmployees
                        }
                        aria-expanded={isUserDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span>{userDropdownLabel}</span>
                        <span aria-hidden="true">v</span>
                      </button>

                      {isUserDropdownOpen ? (
                        <div className="overtime-create-popup__employee-menu">
                          <input
                            type="text"
                            className="register-user-popup__input overtime-create-popup__employee-search"
                            value={userSearchQuery}
                            placeholder="Cari nama / username / email / internal id"
                            onChange={(event) => setUserSearchQuery(event.target.value)}
                            autoFocus
                          />
                          <div
                            className="overtime-create-popup__employee-options"
                            role="listbox"
                            aria-label="User"
                          >
                            {filteredEmployees.length > 0 ? (
                              filteredEmployees.map((employee) => (
                                <button
                                  key={employee.id}
                                  type="button"
                                  className="overtime-create-popup__employee-option overtime-create-popup__employee-option--button"
                                  onClick={() => handleUserSelect(employee.id)}
                                  disabled={isSubmitting}
                                  role="option"
                                  aria-selected={
                                    String(employee.id) === String(formValues.user_id)
                                  }
                                >
                                  <span>{getEmployeeLabel(employee)}</span>
                                </button>
                              ))
                            ) : (
                              <p className="overtime-create-popup__employee-empty">
                                Tidak ada user yang sesuai.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <p className="register-user-popup__hint">
                      Pilih user dari daftar eligible employees.
                    </p>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-permission-type"
                    >
                      Permission Type
                    </label>
                    <select
                      id="create-user-permission-permission-type"
                      name="permission_category"
                      className="register-user-popup__select"
                      value={formValues.permission_category}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingAuthUser}
                    >
                      {PERMISSION_CATEGORY_OPTIONS.map((permissionType) => (
                        <option key={permissionType.value} value={permissionType.value}>
                          {permissionType.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-scope-type"
                    >
                      Scope Type
                    </label>
                    <select
                      id="create-user-permission-scope-type"
                      name="scope_type"
                      className="register-user-popup__select"
                      value={formValues.scope_type}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingAuthUser}
                    >
                      {scopeTypeOptions.map((scopeType) => (
                        <option key={scopeType} value={scopeType}>
                          {scopeType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-company-id"
                    >
                      Company
                    </label>
                    <input
                      id="create-user-permission-company-id"
                      type="text"
                      className="register-user-popup__input"
                      value={companyLabel}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-department-id"
                    >
                      Department
                    </label>
                    <input
                      id="create-user-permission-department-id"
                      type="text"
                      className="register-user-popup__input"
                      value={departmentLabel}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="create-user-permission-granted-by"
                    >
                      Granted By
                    </label>
                    <input
                      id="create-user-permission-granted-by"
                      type="text"
                      className="register-user-popup__input"
                      value={grantedByLabel}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
                {errorMessage ? (
                  <p className="register-user-popup__hint" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="dashboard-popup__button dashboard-popup__button--primary"
            disabled={isSubmitting || isLoadingAuthUser || isLoadingEligibleEmployees}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateUserPermission
