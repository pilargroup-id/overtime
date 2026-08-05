import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import Time24HourInput from './Time24HourInput.jsx'

const initialFormValues = {
  day_type: 'WORKDAY',
  work_date: '',
  department_id: '',
  department_class: '',
  company_id: '',
  start_time: '',
  end_time: '',
  task_description: '',
  result_description: '',
  compensation_type_id: '',
}

const dayTypeOptions = ['WORKDAY', 'HOLIDAY', 'WEEKEND']

const workDateField = {
  name: 'work_date',
  label: 'Work Date',
  type: 'date',
  className: 'overtime-create-popup__field--half',
}

const reqOvertimeTextFields = [
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
  {
    name: 'duration',
    label: 'Duration',
    type: 'text',
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

function normalizeUserProfile(responseData) {
  const user = responseData?.data || responseData?.user || responseData || {}

  return {
    departments: Array.isArray(user.departments) ? user.departments : [],
    companies: Array.isArray(user.companies) ? user.companies : [],
  }
}

function dedupeByValue(values) {
  const seen = new Set()
  const result = []

  values.forEach((value) => {
    if (!value || seen.has(value)) {
      return
    }

    seen.add(value)
    result.push(value)
  })

  return result
}

function getDepartmentOptions(departments) {
  return [...departments]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((department) => ({
      value: String(department.id),
      label: department.name || department.code || String(department.id),
      isPrimary: Number(department.is_primary) === 1,
    }))
}

function getDepartmentClassOptions(departments, departmentId) {
  const matchingDepartments = departmentId
    ? departments.filter((department) => String(department.id) === String(departmentId))
    : departments
  const classValues = dedupeByValue(matchingDepartments.map((department) => department.class))

  return classValues.map((classValue) => ({
    value: classValue,
    label: classValue,
  }))
}

function getCompanyOptions(companies) {
  return [...companies]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((company) => ({
      value: String(company.id),
      label: company.name || company.code || String(company.id),
      isPrimary: Number(company.is_primary) === 1,
    }))
}

function normalizeNationalHolidays(responseData) {
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

function isActiveNationalHoliday(nationalHoliday) {
  return Number(nationalHoliday?.is_active ?? 0) === 1
}

function getNationalHolidayMultiplier(nationalHoliday) {
  const multiplier = Number(nationalHoliday?.multiplier)

  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
}

function formatNumber(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return null
  }

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(numberValue)
}

function formatDateKey(year, month, day) {
  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function normalizeDateKey(dateValue) {
  const rawValue = String(dateValue ?? '').trim()

  if (!rawValue) {
    return ''
  }

  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
  }

  const dateTimeMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/)

  if (dateTimeMatch) {
    const parsedDate = new Date(rawValue)

    if (!Number.isNaN(parsedDate.getTime())) {
      return formatDateKey(
        parsedDate.getFullYear(),
        parsedDate.getMonth() + 1,
        parsedDate.getDate(),
      )
    }

    return `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]}`
  }

  const slashDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (slashDateMatch) {
    return formatDateKey(slashDateMatch[3], slashDateMatch[1], slashDateMatch[2])
  }

  return rawValue
}

function getTimeInMinutes(timeValue) {
  const [hours, minutes] = String(timeValue).split(':').map(Number)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function formatDuration(startTime, endTime) {
  const startMinutes = getTimeInMinutes(startTime)
  const endMinutes = getTimeInMinutes(endTime)

  if (startMinutes === null || endMinutes === null) {
    return ''
  }

  const durationMinutes =
    endMinutes >= startMinutes
      ? endMinutes - startMinutes
      : endMinutes + 24 * 60 - startMinutes
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours <= 0) {
    return `${minutes} menit`
  }

  if (minutes <= 0) {
    return `${hours} jam`
  }

  return `${hours} jam ${minutes} menit`
}

function getDurationInMinutes(startTime, endTime) {
  const startMinutes = getTimeInMinutes(startTime)
  const endMinutes = getTimeInMinutes(endTime)

  if (startMinutes === null || endMinutes === null) {
    return 0
  }

  return endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 24 * 60 - startMinutes
}

function formatCompensationOption(compensationType, multiplier) {
  const name = compensationType.name ?? compensationType.code
  const amount = Number(compensationType.amount)
  const leaveDays = Number(compensationType.leave_days)
  const details = []
  const multiplierLabel =
    Number.isFinite(multiplier) && multiplier > 1
      ? `${formatNumber(multiplier)}x`
      : null

  if (Number.isFinite(amount) && amount > 0) {
    details.push(`Rp${formatNumber(amount * multiplier)}`)
  }

  if (Number.isFinite(leaveDays) && leaveDays > 0) {
    details.push(`${formatNumber(leaveDays * multiplier)} hari`)
  }

  if (multiplierLabel) {
    details.unshift(`Dikali ${multiplierLabel}`)
  }

  return details.length ? `${name} (${details.join(' / ')})` : name
}

function formatCompensationAmount(compensationType, multiplier) {
  if (!compensationType) {
    return ''
  }

  const amount = Number(compensationType.amount)
  const leaveDays = Number(compensationType.leave_days)

  if (Number.isFinite(amount) && amount > 0) {
    return `Rp${formatNumber(amount * multiplier)}`
  }

  if (Number.isFinite(leaveDays) && leaveDays > 0) {
    return `${formatNumber(leaveDays * multiplier)} hari`
  }

  return ''
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
  const [nationalHolidays, setNationalHolidays] = useState([])
  const [userOrganization, setUserOrganization] = useState({ departments: [], companies: [] })
  const [isLoadingCompensationTypes, setIsLoadingCompensationTypes] = useState(false)
  const [isLoadingUserOrganization, setIsLoadingUserOrganization] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setNationalHolidays([])
    setUserOrganization({ departments: [], companies: [] })
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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true

    const loadNationalHolidays = async () => {
      try {
        const response = await api.nationalHolidays.list({
          is_active: 1,
          limit: 500,
        })

        if (!isMounted) {
          return
        }

        setNationalHolidays(normalizeNationalHolidays(response))
      } catch {
        if (isMounted) {
          setNationalHolidays([])
        }
      }
    }

    loadNationalHolidays()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true

    const loadUserOrganization = async () => {
      setIsLoadingUserOrganization(true)

      try {
        const response = await api.auth.me()

        if (!isMounted) {
          return
        }

        const profile = normalizeUserProfile(response)

        setUserOrganization(profile)

        const primaryDepartment =
          profile.departments.find((department) => Number(department.is_primary) === 1) ||
          profile.departments[0] ||
          null
        const primaryCompany =
          profile.companies.find((company) => Number(company.is_primary) === 1) ||
          profile.companies[0] ||
          null

        setFormValues((currentValues) => ({
          ...currentValues,
          department_id: currentValues.department_id || String(primaryDepartment?.id ?? ''),
          department_class: currentValues.department_class || primaryDepartment?.class || '',
          company_id: currentValues.company_id || String(primaryCompany?.id ?? ''),
        }))
      } catch {
        if (isMounted) {
          setUserOrganization({ departments: [], companies: [] })
        }
      } finally {
        if (isMounted) {
          setIsLoadingUserOrganization(false)
        }
      }
    }

    loadUserOrganization()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: value,
      }

      if (name === 'department_id') {
        const selectedDepartment = userOrganization.departments.find(
          (department) => String(department.id) === value,
        )
        nextValues.department_class = selectedDepartment?.class || ''
      }

      if (
        (name === 'start_time' || name === 'end_time') &&
        getDurationInMinutes(nextValues.start_time, nextValues.end_time) < 120
      ) {
        nextValues.compensation_type_id = ''
      }

      return nextValues
    })
  }

  const buildPayload = () => ({
    day_type: formValues.day_type,
    work_date: formValues.work_date,
    start_time: formValues.start_time,
    end_time: formValues.end_time,
    task_description: formValues.task_description.trim(),
    result_description: formValues.result_description.trim(),
    compensation_type_id:
      getDurationInMinutes(formValues.start_time, formValues.end_time) >= 120
        ? Number(formValues.compensation_type_id)
        : null,
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
      (isCompensationEnabled && !payload.compensation_type_id)
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

  const workDateKey = normalizeDateKey(formValues.work_date)
  const selectedNationalHoliday = nationalHolidays.find(
    (holiday) =>
      isActiveNationalHoliday(holiday) &&
      workDateKey === normalizeDateKey(holiday?.holiday_date),
  )
  const isSelectedNationalHoliday = Boolean(selectedNationalHoliday)
  const compensationMultiplier = isSelectedNationalHoliday
    ? getNationalHolidayMultiplier(selectedNationalHoliday)
    : 1
  const selectedCompensationType = compensationTypes.find(
    (compensationType) =>
      String(compensationType.id) === String(formValues.compensation_type_id),
  )
  const compensationAmountLabel = formatCompensationAmount(
    selectedCompensationType,
    compensationMultiplier,
  )
  const durationLabel = formatDuration(formValues.start_time, formValues.end_time)
  const isCompensationEnabled =
    getDurationInMinutes(formValues.start_time, formValues.end_time) >= 120
  const departmentOptions = getDepartmentOptions(userOrganization.departments)
  const departmentClassOptions = getDepartmentClassOptions(
    userOrganization.departments,
    formValues.department_id,
  )
  const companyOptions = getCompanyOptions(userOrganization.companies)

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

                  <div
                    className={`register-user-popup__field ${workDateField.className}`}
                  >
                    <label
                      className="register-user-popup__label"
                      htmlFor={`req-overtime-${workDateField.name}`}
                    >
                      {workDateField.label}
                    </label>
                    <input
                      id={`req-overtime-${workDateField.name}`}
                      name={workDateField.name}
                      type={workDateField.type}
                      className="register-user-popup__input"
                      value={formValues[workDateField.name]}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-department-id"
                    >
                      Department
                    </label>
                    <select
                      id="req-overtime-department-id"
                      name="department_id"
                      className="register-user-popup__select"
                      value={formValues.department_id}
                      onChange={handleInputChange}
                      disabled={
                        isSubmitting ||
                        isLoadingUserOrganization ||
                        departmentOptions.length <= 1
                      }
                    >
                      {departmentOptions.length === 0 ? (
                        <option value="">
                          {isLoadingUserOrganization ? 'Loading...' : '-'}
                        </option>
                      ) : (
                        departmentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-department-class"
                    >
                      Class
                    </label>
                    <select
                      id="req-overtime-department-class"
                      name="department_class"
                      className="register-user-popup__select"
                      value={formValues.department_class}
                      onChange={handleInputChange}
                      disabled={
                        isSubmitting ||
                        isLoadingUserOrganization ||
                        departmentClassOptions.length <= 1
                      }
                    >
                      {departmentClassOptions.length === 0 ? (
                        <option value="">
                          {isLoadingUserOrganization ? 'Loading...' : '-'}
                        </option>
                      ) : (
                        departmentClassOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--third">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-company-id"
                    >
                      Company
                    </label>
                    <select
                      id="req-overtime-company-id"
                      name="company_id"
                      className="register-user-popup__select"
                      value={formValues.company_id}
                      onChange={handleInputChange}
                      disabled={
                        isSubmitting ||
                        isLoadingUserOrganization ||
                        companyOptions.length <= 1
                      }
                    >
                      {companyOptions.length === 0 ? (
                        <option value="">
                          {isLoadingUserOrganization ? 'Loading...' : '-'}
                        </option>
                      ) : (
                        companyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
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
                      ) : field.name === 'duration' ? (
                        <input
                          id="req-overtime-duration"
                          name="duration"
                          type="text"
                          className="register-user-popup__input"
                          value={durationLabel}
                          placeholder="0 menit"
                          readOnly
                          disabled
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

                  <div className="register-user-popup__field overtime-create-popup__field--half">
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
                      disabled={
                        isSubmitting ||
                        isLoadingCompensationTypes ||
                        !isCompensationEnabled
                      }
                    >
                      <option value="">
                        {isLoadingCompensationTypes
                          ? 'Loading...'
                          : isCompensationEnabled
                            ? 'Select compensation'
                            : 'Durasi minimal 2 jam'}
                      </option>
                      {compensationTypes.map((compensationType) => (
                        <option key={compensationType.id} value={compensationType.id}>
                          {formatCompensationOption(
                            compensationType,
                            compensationMultiplier,
                          )}
                        </option>
                      ))}
                    </select>
                    {isSelectedNationalHoliday ? (
                      <p className="register-user-popup__hint">
                        {selectedNationalHoliday.name} multiplier{' '}
                        {formatNumber(compensationMultiplier)}x diterapkan pada
                        kompensasi.
                      </p>
                    ) : null}
                  </div>

                  <div className="register-user-popup__field overtime-create-popup__field--half">
                    <label
                      className="register-user-popup__label"
                      htmlFor="req-overtime-compensation-amount"
                    >
                      Compensation Amount
                    </label>
                    <input
                      id="req-overtime-compensation-amount"
                      name="compensation_amount"
                      type="text"
                      className="register-user-popup__input"
                      value={compensationAmountLabel}
                      placeholder="-"
                      readOnly
                      disabled
                    />
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
