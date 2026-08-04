import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, ChevronUp, XClose } from '../../template/TemplateIcons.jsx'
import TabsUserCreateBulkRO from './tabs/TabsUserCreateBulkRO.jsx'
import Time24HourInput from './Time24HourInput.jsx'

const initialFormValues = {
  employee_ids: [],
  day_type: 'WORKDAY',
  work_date: '',
  start_time: '',
  end_time: '',
  task_description: '',
  result_description: '',
  apply_general_to_all: false,
  employee_descriptions: {},
  compensation_type_id: '',
}

const dayTypeOptions = ['WORKDAY', 'HOLIDAY', 'WEEKEND']

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

function getEmployeeLabel(employee) {
  const name = employee.name || employee.username || employee.email || employee.id
  const internalId = employee.internal_id ? ` (${employee.internal_id})` : ''

  return `${name}${internalId}`
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

function DialogCreateBulkReqOvertime({
  isOpen = false,
  eyebrow = 'Create Bulk Req Overtime',
  title = 'Create Bulk Req Overtime',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [eligibleEmployees, setEligibleEmployees] = useState([])
  const [compensationTypes, setCompensationTypes] = useState([])
  const [nationalHolidays, setNationalHolidays] = useState([])
  const [isLoadingEligibleEmployees, setIsLoadingEligibleEmployees] = useState(false)
  const [isLoadingCompensationTypes, setIsLoadingCompensationTypes] = useState(false)
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('general')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setEmployeeSearchQuery('')
    setNationalHolidays([])
    setIsEmployeeDropdownOpen(false)
    setIsSubmitting(false)
    setErrorMessage('')
    setActiveTab('general')
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

    loadEligibleEmployees()
    loadCompensationTypes()
    loadNationalHolidays()

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

      if (
        (name === 'start_time' || name === 'end_time') &&
        getDurationInMinutes(nextValues.start_time, nextValues.end_time) < 120
      ) {
        nextValues.compensation_type_id = ''
      }

      if (
        currentValues.apply_general_to_all &&
        (name === 'task_description' || name === 'result_description')
      ) {
        nextValues.employee_descriptions = Object.fromEntries(
          currentValues.employee_ids.map((employeeId) => [
            employeeId,
            {
              task_description:
                name === 'task_description'
                  ? value
                  : currentValues.employee_descriptions[employeeId]?.task_description ??
                    currentValues.task_description,
              result_description:
                name === 'result_description'
                  ? value
                  : currentValues.employee_descriptions[employeeId]?.result_description ??
                    currentValues.result_description,
            },
          ]),
        )
      }

      return nextValues
    })
  }

  const handleApplyGeneralToAllChange = (event) => {
    const isChecked = event.target.checked

    setFormValues((currentValues) => ({
      ...currentValues,
      apply_general_to_all: isChecked,
      employee_descriptions: isChecked
        ? Object.fromEntries(
            currentValues.employee_ids.map((employeeId) => [
              employeeId,
              {
                task_description: currentValues.task_description,
                result_description: currentValues.result_description,
              },
            ]),
          )
        : currentValues.employee_descriptions,
    }))
  }

  const handleEmployeeToggle = (employeeId) => {
    setFormValues((currentValues) => {
      const isSelected = currentValues.employee_ids.includes(employeeId)
      const nextEmployeeIds = isSelected
        ? currentValues.employee_ids.filter(
            (selectedEmployeeId) => selectedEmployeeId !== employeeId,
          )
        : [...currentValues.employee_ids, employeeId]
      const nextDescriptions = { ...currentValues.employee_descriptions }

      if (isSelected) {
        delete nextDescriptions[employeeId]
        if (activeTab === employeeId) {
          setActiveTab('general')
        }
      } else if (!nextDescriptions[employeeId]) {
        nextDescriptions[employeeId] = {
          task_description: currentValues.apply_general_to_all
            ? currentValues.task_description
            : '',
          result_description: currentValues.apply_general_to_all
            ? currentValues.result_description
            : '',
        }
      }

      return {
        ...currentValues,
        employee_ids: nextEmployeeIds,
        employee_descriptions: nextDescriptions,
      }
    })
  }

  const handleEmployeeRemove = (employeeId) => {
    setFormValues((currentValues) => {
      const nextDescriptions = { ...currentValues.employee_descriptions }
      delete nextDescriptions[employeeId]

      return {
        ...currentValues,
        employee_ids: currentValues.employee_ids.filter(
          (selectedEmployeeId) => selectedEmployeeId !== employeeId,
        ),
        employee_descriptions: nextDescriptions,
      }
    })

    if (activeTab === employeeId) {
      setActiveTab('general')
    }
  }

  const handleEmployeeDescriptionChange = (employeeId, event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      employee_descriptions: {
        ...currentValues.employee_descriptions,
        [employeeId]: {
          task_description:
            currentValues.employee_descriptions[employeeId]?.task_description ?? '',
          result_description:
            currentValues.employee_descriptions[employeeId]?.result_description ?? '',
          [name]: value,
        },
      },
    }))
  }

  const buildEmployeeItems = () =>
    formValues.employee_ids.map((employeeId) => {
      const descriptions = formValues.employee_descriptions[employeeId] ?? {}
      const taskDescription = formValues.apply_general_to_all
        ? formValues.task_description
        : descriptions.task_description
      const resultDescription = formValues.apply_general_to_all
        ? formValues.result_description
        : descriptions.result_description

      return {
        employee_id: employeeId,
        task_description: String(taskDescription ?? '').trim(),
        result_description: String(resultDescription ?? '').trim(),
      }
    })

  const buildPayload = () => {
    const items = buildEmployeeItems()
    const firstItem = items[0] ?? {}

    return {
      employee_ids: formValues.employee_ids,
      day_type: formValues.day_type,
      work_date: formValues.work_date,
      start_time: formValues.start_time,
      end_time: formValues.end_time,
      task_description: formValues.task_description.trim() || firstItem.task_description || '',
      result_description:
        formValues.result_description.trim() || firstItem.result_description || '',
      apply_general_to_all: formValues.apply_general_to_all,
      compensation_type_id:
        getDurationInMinutes(formValues.start_time, formValues.end_time) >= 120
          ? Number(formValues.compensation_type_id)
          : null,
      items,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()
    const hasIncompleteEmployeeDescriptions = payload.items.some(
      (item) => !item.task_description || !item.result_description,
    )

    if (
      !payload.employee_ids.length ||
      !payload.day_type ||
      !payload.work_date ||
      !payload.start_time ||
      !payload.end_time ||
      !payload.task_description ||
      !payload.result_description ||
      hasIncompleteEmployeeDescriptions ||
      (isCompensationEnabled && !payload.compensation_type_id)
    ) {
      setErrorMessage(
        'Pilih employee, lengkapi data utama, lalu isi Task Description dan Result Description sesuai mode All atau manual.',
      )
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

  const normalizedEmployeeSearchQuery = employeeSearchQuery.trim().toLowerCase()
  const filteredEmployees = eligibleEmployees.filter((employee) => {
    if (!normalizedEmployeeSearchQuery) {
      return true
    }

    return [
      employee?.name,
      employee?.username,
      employee?.email,
      employee?.internal_id,
      employee?.id,
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(normalizedEmployeeSearchQuery),
    )
  })
  const employeeDropdownLabel = isLoadingEligibleEmployees
    ? 'Loading eligible employees...'
    : selectedEmployees.length
      ? `${selectedEmployees.length} employee selected`
      : 'Select employees'
  const durationLabel = formatDuration(formValues.start_time, formValues.end_time)
  const isCompensationEnabled =
    getDurationInMinutes(formValues.start_time, formValues.end_time) >= 120
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
                    <div
                      className="overtime-create-popup__employee-dropdown"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setIsEmployeeDropdownOpen(false)
                        }
                      }}
                    >
                      <button
                        id="bulk-req-overtime-employee-dropdown"
                        type="button"
                        className="register-user-popup__select overtime-create-popup__employee-trigger"
                        onClick={() =>
                          setIsEmployeeDropdownOpen((currentValue) => !currentValue)
                        }
                        disabled={isSubmitting || isLoadingEligibleEmployees}
                        aria-expanded={isEmployeeDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span>{employeeDropdownLabel}</span>
                        {isEmployeeDropdownOpen ? (
                          <ChevronUp size={18} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={18} aria-hidden="true" />
                        )}
                      </button>

                      {isEmployeeDropdownOpen ? (
                        <div className="overtime-create-popup__employee-menu">
                          <input
                            type="text"
                            className="register-user-popup__input overtime-create-popup__employee-search"
                            value={employeeSearchQuery}
                            placeholder="Cari nama / username / email / internal id"
                            onChange={(event) => setEmployeeSearchQuery(event.target.value)}
                            autoFocus
                          />
                          <div
                            className="overtime-create-popup__employee-options"
                            role="listbox"
                            aria-label="Employee"
                          >
                            {filteredEmployees.length > 0 ? (
                              filteredEmployees.map((employee) => {
                                const employeeId = employee.id
                                const isSelected = formValues.employee_ids.includes(employeeId)

                                return (
                                  <div
                                    key={employeeId}
                                    className="overtime-create-popup__employee-option"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleEmployeeToggle(employeeId)}
                                    role="option"
                                    aria-selected={isSelected}
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        handleEmployeeToggle(employeeId)
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      disabled={isSubmitting}
                                      readOnly
                                      tabIndex={-1}
                                    />
                                    <span>{getEmployeeLabel(employee)}</span>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="overtime-create-popup__employee-empty">
                                Tidak ada employee yang sesuai.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <p className="register-user-popup__hint">
                      Pilih satu atau lebih employee untuk bulk request.
                    </p>
                  </div>

                  {selectedEmployees.length > 0 ? (
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TabsUserCreateBulkRO
                        selectedEmployees={selectedEmployees}
                        value={activeTab}
                        onChange={setActiveTab}
                        onRemove={handleEmployeeRemove}
                        getEmployeeLabel={getEmployeeLabel}
                        disabled={isSubmitting}
                      />
                    </div>
                  ) : null}

                  {activeTab === 'general' ? (
                    <>
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
                          <div className="overtime-create-popup__label-row">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${field.name}`}
                            >
                              {field.label}
                            </label>
                            {field.name === 'task_description' ? (
                              <label className="overtime-create-popup__apply-all">
                                <input
                                  type="checkbox"
                                  checked={formValues.apply_general_to_all}
                                  onChange={handleApplyGeneralToAllChange}
                                  disabled={isSubmitting}
                                />
                                <span>All</span>
                              </label>
                            ) : null}
                          </div>
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
                    </>
                  ) : null}

                  {activeTab !== 'general' ? (
                    <div
                      className="register-user-popup__field register-user-popup__field--full"
                    >
                      <div className="overtime-create-popup__user-panel">
                        {reqOvertimeTextareaFields.map((field) => {
                          const descriptions =
                            formValues.employee_descriptions[activeTab] ?? {}

                          return (
                            <div
                              key={`${activeTab}-${field.name}`}
                              className="register-user-popup__field register-user-popup__field--full"
                            >
                              <label
                                className="register-user-popup__label"
                                htmlFor={`req-overtime-${activeTab}-${field.name}`}
                              >
                                {field.label}
                              </label>
                              <textarea
                                id={`req-overtime-${activeTab}-${field.name}`}
                                name={field.name}
                                className="register-user-popup__input master-project-popup__textarea"
                                value={descriptions[field.name] ?? ''}
                                placeholder={field.placeholder}
                                onChange={(event) =>
                                  handleEmployeeDescriptionChange(activeTab, event)
                                }
                                disabled={isSubmitting || formValues.apply_general_to_all}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
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
