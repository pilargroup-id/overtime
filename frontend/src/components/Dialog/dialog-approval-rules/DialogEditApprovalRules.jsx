import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import Switch from '../../forms/Switch.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'
import {
  addCurrentOption,
  createDepartmentOptions,
  createJobLevelNameOptions,
  createJobLevelValueOptions,
  createUserOptions,
  normalizeResourceResponseRows,
} from './approvalRuleOptions.js'

const emptyFormValues = {
  code: '',
  name: '',
  requester_min_job_level_value: '',
  requester_max_job_level_value: '',
  department_id: '',
  approver_scope_type: 'SAME_DEPARTMENT',
  approver_department_id: '',
  approver_job_level_name: '',
  approver_user_id: '',
  approval_type: '',
  use_intermediate_approver: false,
  intermediate_job_level_value: '',
  priority: '100',
  is_active: '1',
}

const APPROVER_SCOPE_TYPE_OPTIONS = [
  'SAME_DEPARTMENT',
  'GLOBAL',
  'SPECIFIC_DEPARTMENT',
  'SPECIFIC_USER',
]
const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

function toRequiredInt(value) {
  const trimmed = String(value ?? '').trim()

  if (!trimmed) {
    return null
  }

  const parsedValue = Number(trimmed)

  return Number.isInteger(parsedValue) ? parsedValue : null
}

function toOptionalInt(value) {
  return toRequiredInt(value)
}

function toRequiredNumber(value) {
  const trimmed = String(value ?? '').trim()

  if (!trimmed) {
    return null
  }

  const parsedValue = Number(trimmed)

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function toFieldString(value) {
  return value === null || value === undefined ? '' : String(value)
}

function createFormValuesFromApprovalRule(approvalRule) {
  if (!approvalRule) {
    return emptyFormValues
  }

  const isSpecificUser = approvalRule.approver_scope_type === 'SPECIFIC_USER'

  return {
    code: toFieldString(approvalRule.code),
    name: toFieldString(approvalRule.name),
    requester_min_job_level_value: toFieldString(approvalRule.requester_min_job_level_value),
    requester_max_job_level_value: toFieldString(approvalRule.requester_max_job_level_value),
    department_id: toFieldString(approvalRule.department_id),
    approver_scope_type: approvalRule.approver_scope_type || 'SAME_DEPARTMENT',
    approver_department_id: toFieldString(approvalRule.approver_department_id),
    approver_job_level_name: isSpecificUser ? '' : toFieldString(approvalRule.approver_job_level_name),
    approver_user_id: isSpecificUser
      ? toFieldString(approvalRule.approver_user_id ?? approvalRule.approver_job_level_name)
      : '',
    approval_type: toFieldString(approvalRule.approval_type),
    use_intermediate_approver: Number(approvalRule.use_intermediate_approver) === 1,
    intermediate_job_level_value: toFieldString(approvalRule.intermediate_job_level_value),
    priority: toFieldString(approvalRule.priority ?? 100),
    is_active: String(Number(approvalRule.is_active ?? 1)),
  }
}

function getApprovalRuleId(approvalRule) {
  return approvalRule?.id ?? null
}

function DialogEditApprovalRules({
  isOpen = false,
  eyebrow = 'Edit Approval Rule',
  title = 'Edit Approval Rule',
  approvalRules = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() =>
    createFormValuesFromApprovalRule(approvalRules),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [departmentErrorMessage, setDepartmentErrorMessage] = useState('')
  const [jobLevels, setJobLevels] = useState([])
  const [isLoadingJobLevels, setIsLoadingJobLevels] = useState(false)
  const [jobLevelErrorMessage, setJobLevelErrorMessage] = useState('')
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userErrorMessage, setUserErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromApprovalRule(approvalRules))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [approvalRules])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromApprovalRule(approvalRules))
  }, [approvalRules])

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

    const loadDepartments = async () => {
      setIsLoadingDepartments(true)
      setDepartmentErrorMessage('')

      try {
        const response = await api.departments.list({ active: 'all', limit: 1000 })

        if (!isMounted) {
          return
        }

        setDepartmentOptions(createDepartmentOptions(normalizeResourceResponseRows(response)))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setDepartmentOptions([])
        setDepartmentErrorMessage(error?.message || 'Gagal memuat data department.')
      } finally {
        if (isMounted) {
          setIsLoadingDepartments(false)
        }
      }
    }

    loadDepartments()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true

    const loadJobLevels = async () => {
      setIsLoadingJobLevels(true)
      setJobLevelErrorMessage('')

      try {
        const response = await api.jobLevels.list({ active: 'all', limit: 1000 })

        if (!isMounted) {
          return
        }

        setJobLevels(normalizeResourceResponseRows(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setJobLevels([])
        setJobLevelErrorMessage(error?.message || 'Gagal memuat data job level.')
      } finally {
        if (isMounted) {
          setIsLoadingJobLevels(false)
        }
      }
    }

    loadJobLevels()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      setUserErrorMessage('')

      try {
        const response = await api.users.list({ active: 'all', limit: 1000 })

        if (!isMounted) {
          return
        }

        setUsers(normalizeResourceResponseRows(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setUsers([])
        setUserErrorMessage(error?.message || 'Gagal memuat data user.')
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const updateFormValue = (name, value) => {
    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: value,
      }

      if (name === 'approver_scope_type' && value !== 'SPECIFIC_DEPARTMENT') {
        nextValues.approver_department_id = ''
      }

      if (name === 'approver_scope_type' && value !== 'SPECIFIC_USER') {
        nextValues.approver_user_id = ''
      }

      return nextValues
    })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    updateFormValue(name, value)
  }

  const handleIntermediateToggle = (event) => {
    const { checked } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      use_intermediate_approver: checked,
      intermediate_job_level_value: checked ? currentValues.intermediate_job_level_value : '',
    }))
  }

  const isSpecificDepartment = formValues.approver_scope_type === 'SPECIFIC_DEPARTMENT'
  const isSpecificUser = formValues.approver_scope_type === 'SPECIFIC_USER'
  const departmentSearchOptions = [{ value: '', label: 'Semua department' }, ...departmentOptions]
  const requesterDepartmentOptions = addCurrentOption(
    departmentSearchOptions,
    formValues.department_id,
    `Department ${formValues.department_id}`,
  )
  const approverDepartmentOptions = addCurrentOption(
    [{ value: '', label: 'Pilih department' }, ...departmentOptions],
    formValues.approver_department_id,
    `Department ${formValues.approver_department_id}`,
  )
  const jobLevelValueOptions = createJobLevelValueOptions(jobLevels)
  const jobLevelNameOptions = createJobLevelNameOptions(jobLevels)
  const requesterMinJobLevelOptions = addCurrentOption(
    jobLevelValueOptions,
    formValues.requester_min_job_level_value,
    `Level ${formValues.requester_min_job_level_value}`,
  )
  const requesterMaxJobLevelOptions = addCurrentOption(
    jobLevelValueOptions,
    formValues.requester_max_job_level_value,
    `Level ${formValues.requester_max_job_level_value}`,
  )
  const approverJobLevelOptions = addCurrentOption(
    jobLevelNameOptions,
    formValues.approver_job_level_name,
  )
  const userOptions = createUserOptions(users)
  const approverUserOptions = addCurrentOption(
    userOptions,
    formValues.approver_user_id,
    approvalRules?.approver_user_name || `User ${formValues.approver_user_id}`,
  )
  const intermediateJobLevelOptions = addCurrentOption(
    jobLevelValueOptions,
    formValues.intermediate_job_level_value,
    `Level ${formValues.intermediate_job_level_value}`,
  )

  const buildPayload = () => {
    const useIntermediate = formValues.use_intermediate_approver ? 1 : 0

    return {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      requester_min_job_level_value: toRequiredNumber(formValues.requester_min_job_level_value),
      requester_max_job_level_value: toRequiredNumber(formValues.requester_max_job_level_value),
      department_id: toOptionalInt(formValues.department_id),
      approver_scope_type: formValues.approver_scope_type,
      approver_department_id: isSpecificDepartment
        ? toOptionalInt(formValues.approver_department_id)
        : null,
      approver_job_level_name: isSpecificUser ? '' : formValues.approver_job_level_name.trim(),
      approver_user_id: isSpecificUser ? formValues.approver_user_id.trim() : null,
      approval_type: formValues.approval_type.trim(),
      use_intermediate_approver: useIntermediate,
      intermediate_job_level_value: useIntermediate
        ? toRequiredNumber(formValues.intermediate_job_level_value)
        : null,
      priority: toRequiredInt(formValues.priority) ?? 100,
      is_active: Number(formValues.is_active),
    }
  }

  const validatePayload = (payload) => {
    if (!payload.code) {
      return 'Code wajib diisi.'
    }

    if (!payload.name) {
      return 'Name wajib diisi.'
    }

    if (payload.requester_min_job_level_value === null) {
      return 'Requester min job level wajib diisi dengan angka.'
    }

    if (payload.requester_max_job_level_value === null) {
      return 'Requester max job level wajib diisi dengan angka.'
    }

    if (payload.requester_min_job_level_value > payload.requester_max_job_level_value) {
      return 'Requester max job level harus lebih besar atau sama dengan min job level.'
    }

    if (!APPROVER_SCOPE_TYPE_OPTIONS.includes(payload.approver_scope_type)) {
      return 'Approver scope type tidak valid.'
    }

    if (payload.approver_scope_type === 'SPECIFIC_DEPARTMENT' && payload.approver_department_id === null) {
      return 'Approver department wajib diisi untuk scope SPECIFIC_DEPARTMENT.'
    }

    if (payload.approver_scope_type === 'SPECIFIC_USER' && !payload.approver_user_id) {
      return 'Approver user wajib diisi untuk scope SPECIFIC_USER.'
    }

    if (payload.approver_scope_type !== 'SPECIFIC_USER' && !payload.approver_job_level_name) {
      return 'Approver job level wajib diisi.'
    }

    if (!payload.approval_type) {
      return 'Approval type wajib diisi.'
    }

    if (payload.use_intermediate_approver === 1 && payload.intermediate_job_level_value === null) {
      return 'Intermediate job level wajib diisi dengan angka saat intermediate approval ON.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const approvalRuleId = getApprovalRuleId(approvalRules)

    if (!approvalRuleId) {
      setErrorMessage('ID approval rule tidak ditemukan.')
      return
    }

    const payload = buildPayload()
    const validationMessage = validatePayload(payload)

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedApprovalRule = await api.approvalRules.update(approvalRuleId, payload)

      onEdited?.(editedApprovalRule, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah approval rule.')
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
        aria-labelledby="dialog-edit-approval-rule-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-approval-rule-title">
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
                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label className="register-user-popup__label" htmlFor="edit-approval-rule-code">
                      Code
                    </label>
                    <input
                      id="edit-approval-rule-code"
                      name="code"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.code}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label className="register-user-popup__label" htmlFor="edit-approval-rule-name">
                      Name
                    </label>
                    <input
                      id="edit-approval-rule-name"
                      name="name"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <DropdownSearch
                      id="edit-approval-rule-min-level"
                      label="Requester Min Job Level"
                      value={formValues.requester_min_job_level_value}
                      options={requesterMinJobLevelOptions}
                      placeholder={isLoadingJobLevels ? 'Loading job levels...' : 'Pilih min job level'}
                      searchPlaceholder="Cari job level..."
                      emptyMessage="Job level tidak ditemukan."
                      onChange={(value) => updateFormValue('requester_min_job_level_value', value)}
                      disabled={isSubmitting || isLoadingJobLevels}
                    />
                    {jobLevelErrorMessage ? (
                      <p className="register-user-popup__hint" role="alert">
                        {jobLevelErrorMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <DropdownSearch
                      id="edit-approval-rule-max-level"
                      label="Requester Max Job Level"
                      value={formValues.requester_max_job_level_value}
                      options={requesterMaxJobLevelOptions}
                      placeholder={isLoadingJobLevels ? 'Loading job levels...' : 'Pilih max job level'}
                      searchPlaceholder="Cari job level..."
                      emptyMessage="Job level tidak ditemukan."
                      onChange={(value) => updateFormValue('requester_max_job_level_value', value)}
                      disabled={isSubmitting || isLoadingJobLevels}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <DropdownSearch
                      id="edit-approval-rule-department-id"
                      label="Requester Department ID"
                      value={formValues.department_id}
                      options={requesterDepartmentOptions}
                      placeholder={isLoadingDepartments ? 'Loading departments...' : 'Semua department'}
                      searchPlaceholder="Cari department..."
                      emptyMessage="Department tidak ditemukan."
                      onChange={(value) => updateFormValue('department_id', value)}
                      disabled={isSubmitting || isLoadingDepartments}
                    />
                    <p className="register-user-popup__hint">
                      Kosongkan agar rule berlaku generik untuk semua department.
                    </p>
                    {departmentErrorMessage ? (
                      <p className="register-user-popup__hint" role="alert">
                        {departmentErrorMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-scope-type"
                    >
                      Approver Scope Type
                    </label>
                    <select
                      id="edit-approval-rule-scope-type"
                      name="approver_scope_type"
                      className="register-user-popup__select"
                      value={formValues.approver_scope_type}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      {APPROVER_SCOPE_TYPE_OPTIONS.map((scopeType) => (
                        <option key={scopeType} value={scopeType}>
                          {scopeType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <DropdownSearch
                      id="edit-approval-rule-approver-department-id"
                      label="Approver Department ID"
                      value={formValues.approver_department_id}
                      options={approverDepartmentOptions}
                      placeholder={isLoadingDepartments ? 'Loading departments...' : 'Pilih department'}
                      searchPlaceholder="Cari department..."
                      emptyMessage="Department tidak ditemukan."
                      onChange={(value) => updateFormValue('approver_department_id', value)}
                      disabled={isSubmitting || !isSpecificDepartment || isLoadingDepartments}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--full">
                    {isSpecificUser ? (
                      <>
                        <DropdownSearch
                          id="edit-approval-rule-approver-user"
                          label="Approver User"
                          value={formValues.approver_user_id}
                          options={approverUserOptions}
                          placeholder={isLoadingUsers ? 'Loading users...' : 'Pilih approver user'}
                          searchPlaceholder="Cari nama, jabatan, atau department..."
                          emptyMessage="User tidak ditemukan."
                          onChange={(value) => updateFormValue('approver_user_id', value)}
                          disabled={isSubmitting || isLoadingUsers}
                        />
                        <p className="register-user-popup__hint">
                          Semua request yang cocok dengan rule ini akan diarahkan ke satu user ini.
                        </p>
                        {userErrorMessage ? (
                          <p className="register-user-popup__hint" role="alert">
                            {userErrorMessage}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <DropdownSearch
                          id="edit-approval-rule-approver-job-level"
                          label="Approver Job Level"
                          value={formValues.approver_job_level_name}
                          options={approverJobLevelOptions}
                          placeholder={isLoadingJobLevels ? 'Loading job levels...' : 'Pilih approver job level'}
                          searchPlaceholder="Cari job level..."
                          emptyMessage="Job level tidak ditemukan."
                          onChange={(value) => updateFormValue('approver_job_level_name', value)}
                          disabled={isSubmitting || isLoadingJobLevels}
                        />
                        <p className="register-user-popup__hint">
                          Dicocokkan exact match terhadap job_level.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <div className="register-user-popup__grid">
                      <div className="register-user-popup__field overtime-create-popup__field--third">
                        <label
                          className="register-user-popup__label"
                          htmlFor="edit-approval-rule-approval-type"
                        >
                          Approval Type
                        </label>
                        <input
                          id="edit-approval-rule-approval-type"
                          name="approval_type"
                          type="text"
                          className="register-user-popup__input"
                          value={formValues.approval_type}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="register-user-popup__field overtime-create-popup__field--third">
                        <label
                          className="register-user-popup__label"
                          htmlFor="edit-approval-rule-priority"
                        >
                          Priority
                        </label>
                        <input
                          id="edit-approval-rule-priority"
                          name="priority"
                          type="number"
                          step="1"
                          className="register-user-popup__input"
                          value={formValues.priority}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="register-user-popup__field overtime-create-popup__field--third">
                        <label
                          className="register-user-popup__label"
                          htmlFor="edit-approval-rule-status"
                        >
                          Status
                        </label>
                        <select
                          id="edit-approval-rule-status"
                          name="is_active"
                          className="register-user-popup__select"
                          value={formValues.is_active}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <div className="register-user-popup__grid">
                      <div className="register-user-popup__field overtime-create-popup__field--half">
                        <Switch
                          id="edit-approval-rule-use-intermediate"
                          label="Use Intermediate Approver"
                          description="Aktifkan agar backend mencoba mencari intermediate approver sebelum final approver."
                          checked={formValues.use_intermediate_approver}
                          onChange={handleIntermediateToggle}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="register-user-popup__field overtime-create-popup__field--half">
                        <DropdownSearch
                          id="edit-approval-rule-intermediate-level"
                          label="Intermediate Job Level"
                          value={formValues.intermediate_job_level_value}
                          options={intermediateJobLevelOptions}
                          placeholder={isLoadingJobLevels ? 'Loading job levels...' : 'Pilih intermediate job level'}
                          searchPlaceholder="Cari job level..."
                          emptyMessage="Job level tidak ditemukan."
                          onChange={(value) => updateFormValue('intermediate_job_level_value', value)}
                          disabled={
                            isSubmitting ||
                            !formValues.use_intermediate_approver ||
                            isLoadingJobLevels
                          }
                        />
                        <p className="register-user-popup__hint">
                          Job level value yang dicari sebagai intermediate approver.
                        </p>
                      </div>
                    </div>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditApprovalRules
