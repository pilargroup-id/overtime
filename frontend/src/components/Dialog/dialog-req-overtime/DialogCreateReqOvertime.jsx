import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import Time24HourInput from './Time24HourInput.jsx'

const initialFormValues = {
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

function DialogCreateReqOvertime({
  isOpen = false,
  eyebrow = 'Create Req Overtime',
  title = 'Create Req Overtime',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [compensationTypes, setCompensationTypes] = useState([])
  const [isLoadingCompensationTypes, setIsLoadingCompensationTypes] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
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

  const buildPayload = () => ({
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
      !payload.day_type ||
      !payload.work_date ||
      !payload.start_time ||
      !payload.end_time ||
      !payload.task_description ||
      !payload.result_description ||
      !payload.compensation_type_id
    ) {
      setErrorMessage('Lengkapi seluruh data request overtime terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdReqOvertime = await api.overtimeRequests.create(payload)

      onCreated?.(createdReqOvertime)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal membuat request overtime.')
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
        aria-labelledby="dialog-create-req-overtime-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-req-overtime-title">
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

export default DialogCreateReqOvertime
