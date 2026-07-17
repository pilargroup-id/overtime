import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import Time24HourInput from './Time24HourInput.jsx'

const initialFormValues = {
  employee_ids: [],
  day_type: 'WORKDAY',
  work_date: '',
  start_time: '',
  end_time: '',
  task_description: '',
  result_description: '',
  compensation_type_id: '',
}

const dayTypeOptions = ['WORKDAY', 'HOLIDAY', 'WEEKEND', 'NATIONAL_HOLIDAY']

const reqOvertimeTextFields = [
  {
    name: 'work_date',
    label: 'Work Date',
    type: 'date',
    className: 'overtime-create-popup__field--half',
  },
  {
    name: 'start_time',
    label: 'Start Time',
    type: 'time',
    className: 'overtime-create-popup__field--third',
  },
  {
    name: 'end_time',
    label: 'End Time',
    type: 'time',
    className: 'overtime-create-popup__field--third',
  },
]

const reqOvertimeTextareaFields = [
  {
    name: 'task_description',
    label: 'Task Description',
    placeholder: 'Task Description..',
  },
  {
    name: 'result_description',
    label: 'Result Description',
    placeholder: 'Result Description..',
  },
]

function normalizeCompensationTypes(responseData) {
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
  const name = employee.name || employee.username || employee.email || employee.id
  const internalId = employee.internal_id ? ` (${employee.internal_id})` : ''

  return `${name}${internalId}`
}

function DialogCreateBulkReqOvertime({
  isOpen = false,
  eyebrow = 'Create Bulk Req Overtime',
  title = 'Create Bulk Req Overtime',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [eligibleEmployees, setEligibleEmployees] = useState([])
  const [compensationTypes, setCompensationTypes] = useState([])
  const [isLoadingEligibleEmployees, setIsLoadingEligibleEmployees] = useState(false)
  const [isLoadingCompensationTypes, setIsLoadingCompensationTypes] = useState(false)
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsEmployeeDropdownOpen(false)
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

    const loadCompensationTypes = async () => {
      setIsLoadingCompensationTypes(true)
      setErrorMessage('')

      try {
        const response = await api.compensationTypes.list({
          is_active: 1,
          limit: 100,
        })

        if (!isMounted) {
          return
        }

        setCompensationTypes(normalizeCompensationTypes(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setCompensationTypes([])
        setErrorMessage(error?.message || 'Gagal memuat compensation types.')
      } finally {
        if (isMounted) {
          setIsLoadingCompensationTypes(false)
        }
      }
    }

    loadEligibleEmployees()
    loadCompensationTypes()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleEmployeeToggle = (employeeId) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      employee_ids: currentValues.employee_ids.includes(employeeId)
        ? currentValues.employee_ids.filter(
            (selectedEmployeeId) => selectedEmployeeId !== employeeId,
          )
        : [...currentValues.employee_ids, employeeId],
    }))
  }

  const buildPayload = () => ({
    employee_ids: formValues.employee_ids,
    day_type: formValues.day_type,
    work_date: formValues.work_date,
    start_time: formValues.start_time,
    end_time: formValues.end_time,
    task_description: formValues.task_description.trim(),
    result_description: formValues.result_description.trim(),
    compensation_type_id: Number(formValues.compensation_type_id),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (
      !payload.employee_ids.length ||
      !payload.day_type ||
      !payload.work_date ||
      !payload.start_time ||
      !payload.end_time ||
      !payload.task_description ||
      !payload.result_description ||
      !payload.compensation_type_id
    ) {
      setErrorMessage('Pilih employee dan lengkapi seluruh data request overtime terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdBulkOvertime = await api.overtimeRequests.bulkCreate(payload)

      onCreated?.(createdBulkOvertime)
      handleClose()
    } catch (error) {
      const failedItems = error?.data?.errors?.failed_items
      const failedMessage = Array.isArray(failedItems)
        ? failedItems.map((item) => item.message).filter(Boolean).join(', ')
        : ''

      setErrorMessage(
        failedMessage || error?.message || 'Gagal membuat bulk request overtime.',
      )
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

  const selectedEmployees = eligibleEmployees.filter((employee) =>
    formValues.employee_ids.includes(employee.id),
  )
  const employeeDropdownLabel = isLoadingEligibleEmployees
    ? 'Loading eligible employees...'
    : selectedEmployees.length
      ? `${selectedEmployees.length} employee selected`
      : 'Select employees'

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
        aria-labelledby="dialog-create-bulk-req-overtime-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-bulk-req-overtime-title">
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
                  <div className="register-user-popup__field overtime-create-popup__field--full">
                    <label
                      className="register-user-popup__label"
                      htmlFor="bulk-req-overtime-employee-dropdown"
                    >
                      Employee
                    </label>
                    <div className="overtime-create-popup__employee-dropdown">
                      <button
                        id="bulk-req-overtime-employee-dropdown"
                        type="button"
                        className="register-user-popup__select overtime-create-popup__employee-trigger"
                        onClick={() =>
                          setIsEmployeeDropdownOpen((currentValue) => !currentValue)
                        }
                        disabled={isSubmitting || isLoadingEligibleEmployees}
                        aria-expanded={isEmployeeDropdownOpen}
                      >
                        <span>{employeeDropdownLabel}</span>
                        <span aria-hidden="true">v</span>
                      </button>

                      {isEmployeeDropdownOpen ? (
                        <div className="overtime-create-popup__employee-menu">
                          {eligibleEmployees.length > 0 ? (
                            eligibleEmployees.map((employee) => {
                              const employeeId = employee.id

                              return (
                                <label
                                  key={employeeId}
                                  className="overtime-create-popup__employee-option"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formValues.employee_ids.includes(employeeId)}
                                    onChange={() => handleEmployeeToggle(employeeId)}
                                    disabled={isSubmitting}
                                  />
                                  <span>{getEmployeeLabel(employee)}</span>
                                </label>
                              )
                            })
                          ) : (
                            <p className="overtime-create-popup__employee-empty">
                              Tidak ada eligible employee.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <p className="register-user-popup__hint">
                      Pilih satu atau lebih employee untuk bulk request.
                    </p>
                    {selectedEmployees.length > 0 ? (
                      <div className="overtime-create-popup__employee-selected">
                        {selectedEmployees.map((employee) => (
                          <span key={employee.id}>{getEmployeeLabel(employee)}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-day-type"
                    >
                      Day Type
                    </label>
                    <select
                      id="req-overtime-day-type"
                      name="day_type"
                      className="register-user-popup__select"
                      value={formValues.day_type}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      {dayTypeOptions.map((dayType) => (
                        <option key={dayType} value={dayType}>
                          {dayType}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reqOvertimeTextFields.map((field) => (
                    <div
                      key={field.name}
                      className={`register-user-popup__field ${field.className}`}
                    >
                      <label
                        className="register-user-popup__label"
                        htmlFor={`req-overtime-${field.name}`}
                      >
                        {field.label}
                      </label>
                      {field.type === 'time' ? (
                        <Time24HourInput
                          id={`req-overtime-${field.name}`}
                          name={field.name}
                          value={formValues[field.name]}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <input
                          id={`req-overtime-${field.name}`}
                          name={field.name}
                          type={field.type}
                          className="register-user-popup__input"
                          value={formValues[field.name]}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  ))}

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-compensation-type"
                    >
                      Compensation
                    </label>
                    <select
                      id="req-overtime-compensation-type"
                      name="compensation_type_id"
                      className="register-user-popup__select"
                      value={formValues.compensation_type_id}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingCompensationTypes}
                    >
                      <option value="">
                        {isLoadingCompensationTypes ? 'Loading...' : 'Select compensation'}
                      </option>
                      {compensationTypes.map((compensationType) => (
                        <option key={compensationType.id} value={compensationType.id}>
                          {compensationType.name ?? compensationType.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reqOvertimeTextareaFields.map((field) => (
                    <div
                      key={field.name}
                      className="register-user-popup__field register-user-popup__field--full"
                    >
                      <label
                        className="register-user-popup__label"
                        htmlFor={`req-overtime-${field.name}`}
                      >
                        {field.label}
                      </label>
                      <textarea
                        id={`req-overtime-${field.name}`}
                        name={field.name}
                        className="register-user-popup__input master-project-popup__textarea"
                        value={formValues[field.name]}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}
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

export default DialogCreateBulkReqOvertime
