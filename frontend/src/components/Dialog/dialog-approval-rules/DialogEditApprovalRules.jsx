import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import Switch from '../../forms/Switch.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'

const emptyFormValues = {
  code: '',
  name: '',
  requester_min_job_level_value: '',
  requester_max_job_level_value: '',
  department_id: '',
  approver_scope_type: 'SAME_DEPARTMENT',
  approver_department_id: '',
  approver_job_level_name: '',
  approval_type: '',
  use_intermediate_approver: false,
  intermediate_job_level_value: '',
  priority: '100',
  is_active: '1',
}

const APPROVER_SCOPE_TYPE_OPTIONS = ['SAME_DEPARTMENT', 'GLOBAL', 'SPECIFIC_DEPARTMENT']
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

function toFieldString(value) {
  return value === null || value === undefined ? '' : String(value)
}

function createFormValuesFromApprovalRule(approvalRule) {
  if (!approvalRule) {
    return emptyFormValues
  }

  return {
    code: toFieldString(approvalRule.code),
    name: toFieldString(approvalRule.name),
    requester_min_job_level_value: toFieldString(approvalRule.requester_min_job_level_value),
    requester_max_job_level_value: toFieldString(approvalRule.requester_max_job_level_value),
    department_id: toFieldString(approvalRule.department_id),
    approver_scope_type: approvalRule.approver_scope_type || 'SAME_DEPARTMENT',
    approver_department_id: toFieldString(approvalRule.approver_department_id),
    approver_job_level_name: toFieldString(approvalRule.approver_job_level_name),
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

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
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

  const buildPayload = () => {
    const useIntermediate = formValues.use_intermediate_approver ? 1 : 0

    return {
      code: formValues.code.trim(),
      name: formValues.name.trim(),
      requester_min_job_level_value: toRequiredInt(formValues.requester_min_job_level_value),
      requester_max_job_level_value: toRequiredInt(formValues.requester_max_job_level_value),
      department_id: toOptionalInt(formValues.department_id),
      approver_scope_type: formValues.approver_scope_type,
      approver_department_id: isSpecificDepartment
        ? toOptionalInt(formValues.approver_department_id)
        : null,
      approver_job_level_name: formValues.approver_job_level_name.trim(),
      approval_type: formValues.approval_type.trim(),
      use_intermediate_approver: useIntermediate,
      intermediate_job_level_value: useIntermediate
        ? toRequiredInt(formValues.intermediate_job_level_value)
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

    if (!payload.approver_job_level_name) {
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
                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-min-level"
                    >
                      Requester Min Job Level
                    </label>
                    <input
                      id="edit-approval-rule-min-level"
                      name="requester_min_job_level_value"
                      type="number"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.requester_min_job_level_value}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-max-level"
                    >
                      Requester Max Job Level
                    </label>
                    <input
                      id="edit-approval-rule-max-level"
                      name="requester_max_job_level_value"
                      type="number"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.requester_max_job_level_value}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-department-id"
                    >
                      Requester Department ID
                    </label>
                    <input
                      id="edit-approval-rule-department-id"
                      name="department_id"
                      type="number"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.department_id}
                      onChange={handleInputChange}
                      placeholder="Kosongkan untuk semua department"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-approver-department-id"
                    >
                      Approver Department ID
                    </label>
                    <input
                      id="edit-approval-rule-approver-department-id"
                      name="approver_department_id"
                      type="number"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.approver_department_id}
                      onChange={handleInputChange}
                      placeholder="Wajib untuk SPECIFIC_DEPARTMENT"
                      disabled={isSubmitting || !isSpecificDepartment}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-approver-job-level"
                    >
                      Approver Job Level / Position
                    </label>
                    <input
                      id="edit-approval-rule-approver-job-level"
                      name="approver_job_level_name"
                      type="text"
                      className="register-user-popup__input"
                      value={formValues.approver_job_level_name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                    <p className="register-user-popup__hint">
                      Dicocokkan exact match terhadap job_level atau job_position.
                    </p>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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

                  <div className="register-user-popup__field register-user-popup__field--full">
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
                    <label
                      className="register-user-popup__label"
                      htmlFor="edit-approval-rule-intermediate-level"
                    >
                      Intermediate Job Level
                    </label>
                    <input
                      id="edit-approval-rule-intermediate-level"
                      name="intermediate_job_level_value"
                      type="number"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.intermediate_job_level_value}
                      onChange={handleInputChange}
                      placeholder="5"
                      disabled={isSubmitting || !formValues.use_intermediate_approver}
                    />
                    <p className="register-user-popup__hint">
                      Job level value yang dicari sebagai intermediate approver.
                    </p>
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
