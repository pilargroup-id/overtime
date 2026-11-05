import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, ChevronUp, XClose } from '../../template/TemplateIcons.jsx'
import ToastAlert from '../ToastAlert.jsx'
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
  equalize: true,
  employee_descriptions: {},
  compensation_type_id: '',
  compensation_amount: '',
}

const EQUALIZABLE_FIELD_NAMES = [
  'day_type',
  'work_date',
  'start_time',
  'end_time',
  'compensation_type_id',
  'compensation_amount',
  'task_description',
  'result_description',
]

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
    required: true,
  },
  {
    name: 'end_time',
    label: 'End Time',
    type: 'time',
    className: 'overtime-create-popup__field--third',
    required: true,
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
    required: true,
  },
  {
    name: 'result_description',
    label: 'Result Description',
    placeholder: 'Result Description..',
    required: true,
  },
]

const VALIDATION_FIELD_ORDER = [
  'day_type',
  'work_date',
  'compensation_type_id',
  'compensation_amount',
  'start_time',
  'end_time',
  'task_description',
  'result_description',
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

function getEmployeeCompanies(employee) {
  if (Array.isArray(employee?.companies) && employee.companies.length) {
    return employee.companies
  }

  if (employee?.company_id) {
    return [
      {
        id: employee.company_id,
        code: employee.company_code,
        name: employee.company_name,
        is_primary: 1,
      },
    ]
  }

  return []
}

function getEmployeeDepartments(employee) {
  if (Array.isArray(employee?.departments) && employee.departments.length) {
    return employee.departments
  }

  if (employee?.department_id) {
    return [
      {
        id: employee.department_id,
        code: employee.department_code,
        name: employee.department_name,
        class: employee.department_class,
        company_id: employee.company_id,
        is_primary: 1,
      },
    ]
  }

  return []
}

function getPrimaryOrgItem(items) {
  return items.find((item) => Number(item?.is_primary) === 1) || items[0] || null
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
    .sort((first, second) => Number(second?.is_primary) - Number(first?.is_primary))
    .map((department) => ({
      value: String(department.id),
      label: department.name || department.code || String(department.id),
    }))
}

function getDepartmentClassOptions(departments, departmentId) {
  const matchingDepartments = departmentId
    ? departments.filter((department) => String(department.id) === String(departmentId))
    : departments

  return dedupeByValue(matchingDepartments.map((department) => department.class)).map(
    (classValue) => ({
      value: classValue,
      label: classValue,
    }),
  )
}

function getCompanyOptions(companies) {
  return [...companies]
    .sort((first, second) => Number(second?.is_primary) - Number(first?.is_primary))
    .map((company) => ({
      value: String(company.id),
      label: company.name || company.code || String(company.id),
    }))
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

function formatCompensationOption(compensationType) {
  const name = compensationType.name ?? compensationType.code
  const kind = getCompensationKind(compensationType)
  const fixedAmount = getFixedAmount(compensationType)

  if (fixedAmount) {
    return `${name} (Rp${formatNumber(fixedAmount)})`
  }

  return kind ? `${name} (${kind})` : name
}

function getCompensationKind(compensationType) {
  return String(compensationType?.compensation_kind || '').toUpperCase()
}

function getFixedAmount(compensationType) {
  const fixedAmount = Number(compensationType?.fixed_amount)

  return Number.isFinite(fixedAmount) && fixedAmount > 0 ? fixedAmount : null
}

const MEAL_ALLOWANCE_MIN_MINUTES = 120
const MEAL_ALLOWANCE_MAX_MINUTES = 180

function isMealAllowanceCode(code) {
  return String(code || '').toUpperCase() === 'MEAL_ALLOWANCE_ONLY'
}

function isInvalidMealAllowanceDuration(durationMinutes) {
  return (
    durationMinutes < MEAL_ALLOWANCE_MIN_MINUTES || durationMinutes > MEAL_ALLOWANCE_MAX_MINUTES
  )
}

function getLeaveCompensationPreviewLabel(totalMinutes, multiplier) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 240) {
    return 'Minimal 4 jam'
  }

  const baseDays = totalMinutes >= 480 ? 1 : 0.5
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
  const finalDays = baseDays * safeMultiplier

  return safeMultiplier > 1
    ? `${formatNumber(baseDays)} hari x ${formatNumber(safeMultiplier)} = ${formatNumber(finalDays)} hari`
    : `${formatNumber(baseDays)} hari`
}

function getOvertimeComputedFields(values, nationalHolidays, compensationTypes) {
  const durationMinutes = getDurationInMinutes(values.start_time, values.end_time)
  const durationLabel = formatDuration(values.start_time, values.end_time)
  const workDateKey = normalizeDateKey(values.work_date)
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
    (compensationType) => String(compensationType.id) === String(values.compensation_type_id),
  )
  const compensationKind = getCompensationKind(selectedCompensationType)
  const selectedFixedAmount = getFixedAmount(selectedCompensationType)
  const leaveCompensationPreviewLabel = getLeaveCompensationPreviewLabel(
    durationMinutes,
    compensationMultiplier,
  )

  return {
    durationMinutes,
    durationLabel,
    selectedNationalHoliday,
    isSelectedNationalHoliday,
    compensationMultiplier,
    selectedCompensationType,
    compensationKind,
    selectedFixedAmount,
    leaveCompensationPreviewLabel,
  }
}

function validateItemFields(item) {
  const errors = {}

  if (!item.day_type) errors.day_type = true
  if (!item.work_date) errors.work_date = true
  if (!item.start_time) errors.start_time = true
  if (!item.end_time) errors.end_time = true
  if (!item.compensation_type_id) errors.compensation_type_id = true
  if (!item.task_description) errors.task_description = true
  if (!item.result_description) errors.result_description = true

  const durationMinutes = getDurationInMinutes(item.start_time, item.end_time)

  if (
    item.compensation_kind === 'MONEY' &&
    !item.compensation_fixed_amount &&
    !(Number(item.compensation_amount) > 0)
  ) {
    errors.compensation_amount = true
  }

  if (item.compensation_kind === 'LEAVE' && durationMinutes < 240) {
    errors.start_time = true
    errors.end_time = true
  }

  if (isMealAllowanceCode(item.compensation_code) && isInvalidMealAllowanceDuration(durationMinutes)) {
    errors.start_time = true
    errors.end_time = true
  }

  return errors
}

function getFirstInvalidFieldName(errors) {
  return VALIDATION_FIELD_ORDER.find((name) => errors[name]) || null
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
  const [employeeDirectory, setEmployeeDirectory] = useState({})
  const [compensationTypes, setCompensationTypes] = useState([])
  const [nationalHolidays, setNationalHolidays] = useState([])
  const [isLoadingEligibleEmployees, setIsLoadingEligibleEmployees] = useState(false)
  const [isLoadingCompensationTypes, setIsLoadingCompensationTypes] = useState(false)
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorSeverity, setErrorSeverity] = useState('error')
  const [activeTab, setActiveTab] = useState('general')
  const [generalFieldErrors, setGeneralFieldErrors] = useState({})
  const [employeeFieldErrors, setEmployeeFieldErrors] = useState({})
  const [pendingFocus, setPendingFocus] = useState(null)
  const fieldRefs = useRef({})

  const setFieldRef = (key) => (node) => {
    // eslint-disable-next-line react-hooks/refs -- callback ref map populated on commit, not during render
    fieldRefs.current[key] = node
  }

  const focusEmployeeDropdown = () => {
    setPendingFocus({ key: 'employee-dropdown' })
  }

  const focusGeneralField = (errors) => {
    const fieldName = getFirstInvalidFieldName(errors)
    setPendingFocus(fieldName ? { key: `general:${fieldName}` } : null)
  }

  const focusEmployeeField = (errors) => {
    const fieldName = getFirstInvalidFieldName(errors)
    setPendingFocus(fieldName ? { key: `employee:${fieldName}` } : null)
  }

  useEffect(() => {
    if (!pendingFocus) {
      return
    }

    const node = fieldRefs.current[pendingFocus.key]

    if (node) {
      node.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      node.focus?.({ preventScroll: true })
    }
  }, [pendingFocus, activeTab])

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setEmployeeSearchQuery('')
    setNationalHolidays([])
    setIsEmployeeDropdownOpen(false)
    setIsSubmitting(false)
    setErrorMessage('')
    setErrorSeverity('error')
    setActiveTab('general')
    setGeneralFieldErrors({})
    setEmployeeFieldErrors({})
    setPendingFocus(null)
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const mergeEmployeesIntoDirectory = useCallback((employees) => {
    if (!employees.length) {
      return
    }

    setEmployeeDirectory((currentDirectory) => {
      const nextDirectory = { ...currentDirectory }

      employees.forEach((employee) => {
        if (employee?.id) {
          nextDirectory[employee.id] = employee
        }
      })

      return nextDirectory
    })
  }, [])

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
        const response = await api.overtimeRequests.compensationOptions()

        if (!isMounted) {
          return
        }

        setCompensationTypes(normalizeCompensationTypes(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setCompensationTypes([])
        setErrorSeverity('error')
        setErrorMessage(error?.message || 'Gagal memuat compensation types.')
      } finally {
        if (isMounted) {
          setIsLoadingCompensationTypes(false)
        }
      }
    }

    const loadNationalHolidays = async () => {
      try {
        const response = await api.overtimeRequests.nationalHolidayOptions()

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

    loadCompensationTypes()
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
    const trimmedSearchQuery = employeeSearchQuery.trim()

    const timeoutId = window.setTimeout(
      async () => {
        setIsLoadingEligibleEmployees(true)
        setErrorMessage('')

        try {
          const response = await api.overtimeRequests.eligibleEmployees({
            search: trimmedSearchQuery || undefined,
            limit: 100,
          })

          if (!isMounted) {
            return
          }

          const employees = normalizeEligibleEmployees(response)
          setEligibleEmployees(employees)
          mergeEmployeesIntoDirectory(employees)
        } catch (error) {
          if (!isMounted) {
            return
          }

          setEligibleEmployees([])
          setErrorSeverity('error')
          setErrorMessage(error?.message || 'Gagal memuat eligible employees.')
        } finally {
          if (isMounted) {
            setIsLoadingEligibleEmployees(false)
          }
        }
      },
      trimmedSearchQuery ? 300 : 0,
    )

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, employeeSearchQuery, mergeEmployeesIntoDirectory])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: value,
      }

      if (name === 'compensation_type_id') {
        nextValues.compensation_amount = ''
      }

      if (name === 'start_time' || name === 'end_time') {
        const hasCompleteTimeRange = Boolean(nextValues.start_time) && Boolean(nextValues.end_time)
        const nextDurationMinutes = getDurationInMinutes(
          nextValues.start_time,
          nextValues.end_time,
        )
        const selectedCompensationType = compensationTypes.find(
          (compensationType) =>
            String(compensationType.id) === String(nextValues.compensation_type_id),
        )
        const selectedKind = getCompensationKind(selectedCompensationType)
        const isMealAllowance = isMealAllowanceCode(selectedCompensationType?.code)

        if (hasCompleteTimeRange && selectedKind === 'LEAVE' && nextDurationMinutes < 240) {
          nextValues.compensation_type_id = ''
          nextValues.compensation_amount = ''
        }

        if (
          hasCompleteTimeRange &&
          isMealAllowance &&
          isInvalidMealAllowanceDuration(nextDurationMinutes)
        ) {
          nextValues.compensation_type_id = ''
          nextValues.compensation_amount = ''
        }
      }

      if (currentValues.equalize && EQUALIZABLE_FIELD_NAMES.includes(name)) {
        nextValues.employee_descriptions = Object.fromEntries(
          currentValues.employee_ids.map((employeeId) => [
            employeeId,
            {
              ...currentValues.employee_descriptions[employeeId],
              day_type: nextValues.day_type,
              work_date: nextValues.work_date,
              start_time: nextValues.start_time,
              end_time: nextValues.end_time,
              compensation_type_id: nextValues.compensation_type_id,
              compensation_amount: nextValues.compensation_amount,
              task_description: nextValues.task_description,
              result_description: nextValues.result_description,
            },
          ]),
        )
      }

      return nextValues
    })

    setGeneralFieldErrors((currentErrors) => {
      if (!Object.keys(currentErrors).length) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[name]

      if (name === 'compensation_type_id') {
        delete nextErrors.compensation_amount
      }

      if (name === 'start_time' || name === 'end_time') {
        delete nextErrors.start_time
        delete nextErrors.end_time
      }

      return nextErrors
    })
  }

  const handleEqualizeChange = (event) => {
    const isChecked = event.target.checked

    setFormValues((currentValues) => ({
      ...currentValues,
      equalize: isChecked,
      employee_descriptions: isChecked
        ? Object.fromEntries(
            currentValues.employee_ids.map((employeeId) => [
              employeeId,
              {
                ...currentValues.employee_descriptions[employeeId],
                day_type: currentValues.day_type,
                work_date: currentValues.work_date,
                start_time: currentValues.start_time,
                end_time: currentValues.end_time,
                compensation_type_id: currentValues.compensation_type_id,
                compensation_amount: currentValues.compensation_amount,
                task_description: currentValues.task_description,
                result_description: currentValues.result_description,
              },
            ]),
          )
        : currentValues.employee_descriptions,
    }))

    if (isChecked) {
      setActiveTab('general')
    } else if (activeTab === 'general' && formValues.employee_ids.length > 0) {
      setActiveTab(formValues.employee_ids[0])
    }

    setGeneralFieldErrors({})
    setEmployeeFieldErrors({})
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
          setActiveTab(
            !currentValues.equalize && nextEmployeeIds.length > 0
              ? nextEmployeeIds[0]
              : 'general',
          )
        }
      } else {
        if (!nextDescriptions[employeeId]) {
          const employee = employeeDirectory[employeeId]
          const primaryDepartment = getPrimaryOrgItem(getEmployeeDepartments(employee))
          const primaryCompany = getPrimaryOrgItem(getEmployeeCompanies(employee))

          nextDescriptions[employeeId] = {
            day_type: currentValues.day_type,
            work_date: currentValues.work_date,
            start_time: currentValues.start_time,
            end_time: currentValues.end_time,
            compensation_type_id: currentValues.compensation_type_id,
            compensation_amount: currentValues.compensation_amount,
            task_description: currentValues.equalize ? currentValues.task_description : '',
            result_description: currentValues.equalize ? currentValues.result_description : '',
            department_id: primaryDepartment ? String(primaryDepartment.id) : '',
            department_class: primaryDepartment?.class || '',
            company_id: primaryCompany ? String(primaryCompany.id) : '',
          }
        }

        if (!currentValues.equalize && activeTab === 'general') {
          setActiveTab(employeeId)
        }
      }

      return {
        ...currentValues,
        employee_ids: nextEmployeeIds,
        employee_descriptions: nextDescriptions,
      }
    })

    setEmployeeFieldErrors((currentErrors) => {
      if (!currentErrors[employeeId]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[employeeId]
      return nextErrors
    })
  }

  const handleEmployeeRemove = (employeeId) => {
    const remainingEmployeeIds = formValues.employee_ids.filter(
      (selectedEmployeeId) => selectedEmployeeId !== employeeId,
    )

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

    setEmployeeFieldErrors((currentErrors) => {
      if (!currentErrors[employeeId]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[employeeId]
      return nextErrors
    })

    if (activeTab === employeeId) {
      setActiveTab(
        !formValues.equalize && remainingEmployeeIds.length > 0
          ? remainingEmployeeIds[0]
          : 'general',
      )
    }
  }

  const handleEmployeeDescriptionChange = (employeeId, event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      const nextDescription = {
        ...currentValues.employee_descriptions[employeeId],
        [name]: value,
      }

      if (name === 'department_id') {
        const employee = employeeDirectory[employeeId]
        const matchedDepartment = getEmployeeDepartments(employee).find(
          (department) => String(department.id) === value,
        )
        nextDescription.department_class = matchedDepartment?.class || ''
      }

      if (name === 'compensation_type_id') {
        nextDescription.compensation_amount = ''
      }

      if (name === 'start_time' || name === 'end_time') {
        const hasCompleteTimeRange =
          Boolean(nextDescription.start_time) && Boolean(nextDescription.end_time)
        const nextDurationMinutes = getDurationInMinutes(
          nextDescription.start_time,
          nextDescription.end_time,
        )
        const selectedCompensationType = compensationTypes.find(
          (compensationType) =>
            String(compensationType.id) === String(nextDescription.compensation_type_id),
        )
        const selectedKind = getCompensationKind(selectedCompensationType)
        const isMealAllowance = isMealAllowanceCode(selectedCompensationType?.code)

        if (hasCompleteTimeRange && selectedKind === 'LEAVE' && nextDurationMinutes < 240) {
          nextDescription.compensation_type_id = ''
          nextDescription.compensation_amount = ''
        }

        if (
          hasCompleteTimeRange &&
          isMealAllowance &&
          isInvalidMealAllowanceDuration(nextDurationMinutes)
        ) {
          nextDescription.compensation_type_id = ''
          nextDescription.compensation_amount = ''
        }
      }

      return {
        ...currentValues,
        employee_descriptions: {
          ...currentValues.employee_descriptions,
          [employeeId]: nextDescription,
        },
      }
    })

    setEmployeeFieldErrors((currentErrors) => {
      const employeeErrors = currentErrors[employeeId]

      if (!employeeErrors || !Object.keys(employeeErrors).length) {
        return currentErrors
      }

      const nextEmployeeErrors = { ...employeeErrors }
      delete nextEmployeeErrors[name]

      if (name === 'compensation_type_id') {
        delete nextEmployeeErrors.compensation_amount
      }

      if (name === 'start_time' || name === 'end_time') {
        delete nextEmployeeErrors.start_time
        delete nextEmployeeErrors.end_time
      }

      return {
        ...currentErrors,
        [employeeId]: nextEmployeeErrors,
      }
    })
  }

  const buildEmployeeItems = () =>
    formValues.employee_ids.map((employeeId) => {
      const description = formValues.employee_descriptions[employeeId] ?? {}
      const useGeneral = formValues.equalize

      const dayType = useGeneral ? formValues.day_type : description.day_type || formValues.day_type
      const workDate = useGeneral
        ? formValues.work_date
        : description.work_date || formValues.work_date
      const startTime = useGeneral
        ? formValues.start_time
        : description.start_time || formValues.start_time
      const endTime = useGeneral ? formValues.end_time : description.end_time || formValues.end_time
      const compensationTypeId = useGeneral
        ? formValues.compensation_type_id
        : description.compensation_type_id || formValues.compensation_type_id
      const compensationAmount = useGeneral
        ? formValues.compensation_amount
        : description.compensation_amount || formValues.compensation_amount
      const taskDescription = useGeneral ? formValues.task_description : description.task_description
      const resultDescription = useGeneral
        ? formValues.result_description
        : description.result_description

      const selectedCompensationType = compensationTypes.find(
        (compensationType) => String(compensationType.id) === String(compensationTypeId),
      )
      const compensationKind = getCompensationKind(selectedCompensationType)
      const fixedAmount = getFixedAmount(selectedCompensationType)

      const item = {
        employee_id: employeeId,
        day_type: dayType,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        compensation_type_id: compensationTypeId ? Number(compensationTypeId) : null,
        compensation_kind: compensationKind,
        compensation_fixed_amount: fixedAmount,
        compensation_code: selectedCompensationType?.code,
        task_description: String(taskDescription ?? '').trim(),
        result_description: String(resultDescription ?? '').trim(),
      }

      if (compensationKind === 'MONEY' && !fixedAmount) {
        item.compensation_amount = compensationAmount ? Number(compensationAmount) : null
      }

      return item
    })

  const buildPayload = () => {
    const items = buildEmployeeItems()
    const firstItem = items[0] ?? {}
    const wireItems = items.map((item) => {
      const wireItem = { ...item }
      delete wireItem.compensation_kind
      delete wireItem.compensation_fixed_amount
      delete wireItem.compensation_code
      return wireItem
    })

    const selectedGeneralCompensationType = compensationTypes.find(
      (compensationType) =>
        String(compensationType.id) === String(formValues.compensation_type_id),
    )
    const generalCompensationKind = getCompensationKind(selectedGeneralCompensationType)
    const generalFixedAmount = getFixedAmount(selectedGeneralCompensationType)

    const payload = {
      employee_ids: formValues.employee_ids,
      day_type: formValues.day_type,
      work_date: formValues.work_date,
      start_time: formValues.start_time,
      end_time: formValues.end_time,
      task_description: formValues.task_description.trim() || firstItem.task_description || '',
      result_description:
        formValues.result_description.trim() || firstItem.result_description || '',
      equalize: formValues.equalize,
      compensation_type_id: formValues.compensation_type_id
        ? Number(formValues.compensation_type_id)
        : null,
      items: wireItems,
    }

    if (generalCompensationKind === 'MONEY' && !generalFixedAmount) {
      payload.compensation_amount = formValues.compensation_amount
        ? Number(formValues.compensation_amount)
        : null
    }

    return {
      ...payload,
      generalCompensationKind,
      generalFixedAmount,
      generalCompensationCode: selectedGeneralCompensationType?.code,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const items = buildEmployeeItems()
    const { generalCompensationKind, generalFixedAmount, generalCompensationCode, ...payload } =
      buildPayload()
    const isEqualized = formValues.equalize

    if (!payload.employee_ids.length) {
      setGeneralFieldErrors({})
      setEmployeeFieldErrors({})
      setErrorSeverity('error')
      setErrorMessage('Pilih minimal satu employee terlebih dahulu.')
      setIsEmployeeDropdownOpen(true)
      focusEmployeeDropdown()
      return
    }

    if (isEqualized) {
      const generalItem = {
        day_type: payload.day_type,
        work_date: payload.work_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        compensation_type_id: payload.compensation_type_id,
        compensation_kind: generalCompensationKind,
        compensation_fixed_amount: generalFixedAmount,
        compensation_code: generalCompensationCode,
        compensation_amount: payload.compensation_amount,
        task_description: payload.task_description,
        result_description: payload.result_description,
      }
      const errors = validateItemFields(generalItem)

      if (Object.keys(errors).length > 0) {
        setGeneralFieldErrors(errors)
        setEmployeeFieldErrors({})
        setActiveTab('general')
        setErrorSeverity('error')
        setErrorMessage('Lengkapi field yang ditandai pada form General sebelum submit.')
        focusGeneralField(errors)
        return
      }

      setGeneralFieldErrors({})
    } else {
      const nextEmployeeFieldErrors = {}
      let firstInvalidEmployeeId = null

      formValues.employee_ids.forEach((employeeId, index) => {
        const errors = validateItemFields(items[index])

        if (Object.keys(errors).length > 0) {
          nextEmployeeFieldErrors[employeeId] = errors

          if (!firstInvalidEmployeeId) {
            firstInvalidEmployeeId = employeeId
          }
        }
      })

      setEmployeeFieldErrors(nextEmployeeFieldErrors)
      setGeneralFieldErrors({})

      if (firstInvalidEmployeeId) {
        const employee = employeeDirectory[firstInvalidEmployeeId]
        const employeeLabel = employee ? getEmployeeLabel(employee) : firstInvalidEmployeeId

        setActiveTab(firstInvalidEmployeeId)
        setErrorSeverity('error')
        setErrorMessage(`Lengkapi field yang ditandai untuk ${employeeLabel}.`)
        focusEmployeeField(nextEmployeeFieldErrors[firstInvalidEmployeeId])
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdBulkOvertime = await api.overtimeRequests.bulkCreate(payload)
      const result = createdBulkOvertime?.data ?? createdBulkOvertime
      const failedItems = Array.isArray(result?.failed_items) ? result.failed_items : []

      onCreated?.(createdBulkOvertime)

      if (failedItems.length > 0) {
        const failedMessage = failedItems
          .map((item) => {
            const employee = employeeDirectory[item.employee_id]
            const employeeLabel = employee ? getEmployeeLabel(employee) : item.employee_id

            return `${employeeLabel}: ${item.message}`
          })
          .join('\n')

        setErrorSeverity('warning')
        setErrorMessage(
          `${result.success_count} dari ${result.total} request berhasil dibuat. Gagal untuk ${failedItems.length} employee:\n${failedMessage}`,
        )
        return
      }

      handleClose()
    } catch (error) {
      const failedItems = error?.data?.errors?.failed_items
      const failedMessage = Array.isArray(failedItems)
        ? failedItems.map((item) => item.message).filter(Boolean).join(', ')
        : ''

      setErrorSeverity('error')
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

  const selectedEmployees = formValues.employee_ids
    .map((employeeId) => employeeDirectory[employeeId])
    .filter(Boolean)

  const employeeDropdownLabel = isLoadingEligibleEmployees
    ? 'Loading eligible employees...'
    : selectedEmployees.length
      ? `${selectedEmployees.length} employee selected`
      : 'Select employees'
  const {
    durationLabel,
    selectedNationalHoliday,
    isSelectedNationalHoliday,
    compensationMultiplier,
    selectedCompensationType,
    compensationKind,
    selectedFixedAmount,
    leaveCompensationPreviewLabel,
  } = getOvertimeComputedFields(formValues, nationalHolidays, compensationTypes)

  const activeEmployee = employeeDirectory[activeTab]
  const activeEmployeeDescription = formValues.employee_descriptions[activeTab] ?? {}
  const activeEmployeeFieldErrors = employeeFieldErrors[activeTab] ?? {}
  const activeEmployeeComputed = getOvertimeComputedFields(
    activeEmployeeDescription,
    nationalHolidays,
    compensationTypes,
  )
  const activeEmployeeDepartmentOptions = activeEmployee
    ? getDepartmentOptions(getEmployeeDepartments(activeEmployee))
    : []
  const activeEmployeeDepartmentClassOptions = activeEmployee
    ? getDepartmentClassOptions(
        getEmployeeDepartments(activeEmployee),
        activeEmployeeDescription.department_id,
      )
    : []
  const activeEmployeeCompanyOptions = activeEmployee
    ? getCompanyOptions(getEmployeeCompanies(activeEmployee))
    : []

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
                        ref={setFieldRef('employee-dropdown')}
                        className={[
                          'register-user-popup__select',
                          'overtime-create-popup__employee-trigger',
                          !selectedEmployees.length && pendingFocus?.key === 'employee-dropdown'
                            ? 'register-user-popup__select--error'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
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
                            {isLoadingEligibleEmployees ? (
                              <p className="overtime-create-popup__employee-empty">
                                Mencari employee...
                              </p>
                            ) : eligibleEmployees.length > 0 ? (
                              eligibleEmployees.map((employee) => {
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
                    <div className="register-user-popup__field register-user-popup__field--full overtime-create-popup__equalize-row">
                      <label className="overtime-create-popup__apply-all">
                        <input
                          type="checkbox"
                          checked={formValues.equalize}
                          onChange={handleEqualizeChange}
                          disabled={isSubmitting}
                        />
                        <span>Equalize (samakan semua employee dengan General)</span>
                      </label>
                    </div>
                  ) : null}

                  {selectedEmployees.length > 0 ? (
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TabsUserCreateBulkRO
                        selectedEmployees={selectedEmployees}
                        value={activeTab}
                        onChange={setActiveTab}
                        onRemove={handleEmployeeRemove}
                        getEmployeeLabel={getEmployeeLabel}
                        disabled={isSubmitting}
                        employeeTabsDisabled={formValues.equalize}
                        generalTabDisabled={!formValues.equalize}
                        hasGeneralError={Object.keys(generalFieldErrors).length > 0}
                        errorEmployeeIds={Object.keys(employeeFieldErrors)}
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
                          <span className="register-user-popup__required">*</span>
                        </label>
                        <select
                          id="req-overtime-day-type"
                          name="day_type"
                          ref={setFieldRef('general:day_type')}
                          className={[
                            'register-user-popup__select',
                            generalFieldErrors.day_type ? 'register-user-popup__select--error' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
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
                          <span className="register-user-popup__required">*</span>
                        </label>
                        <input
                          id={`req-overtime-${workDateField.name}`}
                          name={workDateField.name}
                          type={workDateField.type}
                          ref={setFieldRef(`general:${workDateField.name}`)}
                          className={[
                            'register-user-popup__input',
                            generalFieldErrors[workDateField.name]
                              ? 'register-user-popup__input--error'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          value={formValues[workDateField.name]}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="register-user-popup__field overtime-create-popup__field--half">
                        <label
                          className="register-user-popup__label"
                          htmlFor="req-overtime-compensation-type"
                        >
                          Compensation
                          <span className="register-user-popup__required">*</span>
                        </label>
                        <select
                          id="req-overtime-compensation-type"
                          name="compensation_type_id"
                          ref={setFieldRef('general:compensation_type_id')}
                          className={[
                            'register-user-popup__select',
                            generalFieldErrors.compensation_type_id
                              ? 'register-user-popup__select--error'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          value={formValues.compensation_type_id}
                          onChange={handleInputChange}
                          disabled={isSubmitting || isLoadingCompensationTypes}
                        >
                          <option value="">
                            {isLoadingCompensationTypes ? 'Loading...' : 'Select compensation'}
                          </option>
                          {compensationTypes.map((compensationType) => (
                            <option key={compensationType.id} value={compensationType.id}>
                              {formatCompensationOption(compensationType)}
                            </option>
                          ))}
                        </select>
                        {isSelectedNationalHoliday && compensationKind === 'LEAVE' ? (
                          <p className="register-user-popup__hint">
                            {selectedNationalHoliday.name} multiplier{' '}
                            {formatNumber(compensationMultiplier)}x diterapkan pada
                            kompensasi.
                          </p>
                        ) : null}
                        {isSelectedNationalHoliday && compensationKind === 'MONEY' ? (
                          <p className="register-user-popup__hint">
                            {selectedNationalHoliday.name} — nominal Uang tidak dikali
                            multiplier hari libur nasional.
                          </p>
                        ) : null}
                        {isMealAllowanceCode(selectedCompensationType?.code) ? (
                          <p className="register-user-popup__hint">
                            Kompensasi Uang Makan membutuhkan durasi overtime minimal 2
                            jam dan maksimal 3 jam.
                          </p>
                        ) : null}
                      </div>

                      <div className="register-user-popup__field overtime-create-popup__field--half">
                        <label
                          className="register-user-popup__label"
                          htmlFor="req-overtime-compensation-amount"
                        >
                          Compensation Amount
                          {compensationKind === 'MONEY' && !selectedFixedAmount ? (
                            <span className="register-user-popup__required">*</span>
                          ) : null}
                        </label>
                        {compensationKind === 'MONEY' && !selectedFixedAmount ? (
                          <input
                            id="req-overtime-compensation-amount"
                            name="compensation_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            ref={setFieldRef('general:compensation_amount')}
                            className={[
                              'register-user-popup__input',
                              generalFieldErrors.compensation_amount
                                ? 'register-user-popup__input--error'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            value={formValues.compensation_amount}
                            placeholder="Masukkan nominal"
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                          />
                        ) : (
                          <input
                            id="req-overtime-compensation-amount"
                            name="compensation_amount"
                            type="text"
                            className="register-user-popup__input"
                            value={
                              compensationKind === 'LEAVE'
                                ? leaveCompensationPreviewLabel
                                : compensationKind === 'MONEY' && selectedFixedAmount
                                  ? `Rp${formatNumber(selectedFixedAmount)}`
                                  : ''
                            }
                            placeholder="-"
                            readOnly
                            disabled
                          />
                        )}
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
                            {field.required ? (
                              <span className="register-user-popup__required">*</span>
                            ) : null}
                          </label>
                          {field.type === 'time' ? (
                            <Time24HourInput
                              id={`req-overtime-${field.name}`}
                              name={field.name}
                              ref={setFieldRef(`general:${field.name}`)}
                              hasError={Boolean(generalFieldErrors[field.name])}
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
                            {field.required ? (
                              <span className="register-user-popup__required">*</span>
                            ) : null}
                          </label>
                          <textarea
                            id={`req-overtime-${field.name}`}
                            name={field.name}
                            ref={setFieldRef(`general:${field.name}`)}
                            className={[
                              'register-user-popup__input',
                              'master-project-popup__textarea',
                              generalFieldErrors[field.name]
                                ? 'register-user-popup__input--error'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
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
                        <div className="register-user-popup__grid overtime-create-popup__employee-schedule-fields">
                          <div className="register-user-popup__field overtime-create-popup__field--half">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-day_type`}
                            >
                              Day Type
                              <span className="register-user-popup__required">*</span>
                            </label>
                            <select
                              id={`req-overtime-${activeTab}-day_type`}
                              name="day_type"
                              ref={setFieldRef('employee:day_type')}
                              className={[
                                'register-user-popup__select',
                                activeEmployeeFieldErrors.day_type
                                  ? 'register-user-popup__select--error'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              value={activeEmployeeDescription.day_type ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting}
                            >
                              {dayTypeOptions.map((dayType) => (
                                <option key={dayType} value={dayType}>
                                  {dayType}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="register-user-popup__field overtime-create-popup__field--half">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-work_date`}
                            >
                              Work Date
                              <span className="register-user-popup__required">*</span>
                            </label>
                            <input
                              id={`req-overtime-${activeTab}-work_date`}
                              name="work_date"
                              type="date"
                              ref={setFieldRef('employee:work_date')}
                              className={[
                                'register-user-popup__input',
                                activeEmployeeFieldErrors.work_date
                                  ? 'register-user-popup__input--error'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              value={activeEmployeeDescription.work_date ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="register-user-popup__field overtime-create-popup__field--half">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-compensation_type_id`}
                            >
                              Compensation
                              <span className="register-user-popup__required">*</span>
                            </label>
                            <select
                              id={`req-overtime-${activeTab}-compensation_type_id`}
                              name="compensation_type_id"
                              ref={setFieldRef('employee:compensation_type_id')}
                              className={[
                                'register-user-popup__select',
                                activeEmployeeFieldErrors.compensation_type_id
                                  ? 'register-user-popup__select--error'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              value={activeEmployeeDescription.compensation_type_id ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting || isLoadingCompensationTypes}
                            >
                              <option value="">
                                {isLoadingCompensationTypes ? 'Loading...' : 'Select compensation'}
                              </option>
                              {compensationTypes.map((compensationType) => (
                                <option key={compensationType.id} value={compensationType.id}>
                                  {formatCompensationOption(compensationType)}
                                </option>
                              ))}
                            </select>
                            {activeEmployeeComputed.isSelectedNationalHoliday &&
                            activeEmployeeComputed.compensationKind === 'LEAVE' ? (
                              <p className="register-user-popup__hint">
                                {activeEmployeeComputed.selectedNationalHoliday.name} multiplier{' '}
                                {formatNumber(activeEmployeeComputed.compensationMultiplier)}x
                                diterapkan pada kompensasi.
                              </p>
                            ) : null}
                            {activeEmployeeComputed.isSelectedNationalHoliday &&
                            activeEmployeeComputed.compensationKind === 'MONEY' ? (
                              <p className="register-user-popup__hint">
                                {activeEmployeeComputed.selectedNationalHoliday.name} — nominal
                                Uang tidak dikali multiplier hari libur nasional.
                              </p>
                            ) : null}
                            {isMealAllowanceCode(
                              activeEmployeeComputed.selectedCompensationType?.code,
                            ) ? (
                              <p className="register-user-popup__hint">
                                Kompensasi Uang Makan membutuhkan durasi overtime minimal 2
                                jam dan maksimal 3 jam.
                              </p>
                            ) : null}
                          </div>

                          <div className="register-user-popup__field overtime-create-popup__field--half">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-compensation-amount`}
                            >
                              Compensation Amount
                              {activeEmployeeComputed.compensationKind === 'MONEY' &&
                              !activeEmployeeComputed.selectedFixedAmount ? (
                                <span className="register-user-popup__required">*</span>
                              ) : null}
                            </label>
                            {activeEmployeeComputed.compensationKind === 'MONEY' &&
                            !activeEmployeeComputed.selectedFixedAmount ? (
                              <input
                                id={`req-overtime-${activeTab}-compensation-amount`}
                                name="compensation_amount"
                                type="number"
                                min="0"
                                step="0.01"
                                ref={setFieldRef('employee:compensation_amount')}
                                className={[
                                  'register-user-popup__input',
                                  activeEmployeeFieldErrors.compensation_amount
                                    ? 'register-user-popup__input--error'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                value={activeEmployeeDescription.compensation_amount ?? ''}
                                placeholder="Masukkan nominal"
                                onChange={(event) =>
                                  handleEmployeeDescriptionChange(activeTab, event)
                                }
                                disabled={isSubmitting}
                              />
                            ) : (
                              <input
                                id={`req-overtime-${activeTab}-compensation-amount`}
                                type="text"
                                className="register-user-popup__input"
                                value={
                                  activeEmployeeComputed.compensationKind === 'LEAVE'
                                    ? activeEmployeeComputed.leaveCompensationPreviewLabel
                                    : activeEmployeeComputed.compensationKind === 'MONEY' &&
                                        activeEmployeeComputed.selectedFixedAmount
                                      ? `Rp${formatNumber(activeEmployeeComputed.selectedFixedAmount)}`
                                      : ''
                                }
                                placeholder="-"
                                readOnly
                                disabled
                              />
                            )}
                          </div>

                          {reqOvertimeTextFields.map((field) => (
                            <div
                              key={`${activeTab}-${field.name}`}
                              className={`register-user-popup__field ${field.className}`}
                            >
                              <label
                                className="register-user-popup__label"
                                htmlFor={`req-overtime-${activeTab}-${field.name}`}
                              >
                                {field.label}
                                {field.required ? (
                                  <span className="register-user-popup__required">*</span>
                                ) : null}
                              </label>
                              {field.type === 'time' ? (
                                <Time24HourInput
                                  id={`req-overtime-${activeTab}-${field.name}`}
                                  name={field.name}
                                  ref={setFieldRef(`employee:${field.name}`)}
                                  hasError={Boolean(activeEmployeeFieldErrors[field.name])}
                                  value={activeEmployeeDescription[field.name] ?? ''}
                                  onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                                  disabled={isSubmitting}
                                />
                              ) : field.name === 'duration' ? (
                                <input
                                  id={`req-overtime-${activeTab}-duration`}
                                  name="duration"
                                  type="text"
                                  className="register-user-popup__input"
                                  value={activeEmployeeComputed.durationLabel}
                                  placeholder="0 menit"
                                  readOnly
                                  disabled
                                />
                              ) : (
                                <input
                                  id={`req-overtime-${activeTab}-${field.name}`}
                                  name={field.name}
                                  type={field.type}
                                  className="register-user-popup__input"
                                  value={activeEmployeeDescription[field.name] ?? ''}
                                  onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                                  disabled={isSubmitting}
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="overtime-create-popup__employee-org-fields">
                          <div className="register-user-popup__field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-department-id`}
                            >
                              Department
                            </label>
                            <select
                              id={`req-overtime-${activeTab}-department-id`}
                              name="department_id"
                              className="register-user-popup__select"
                              value={formValues.employee_descriptions[activeTab]?.department_id ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting || activeEmployeeDepartmentOptions.length <= 1}
                            >
                              {activeEmployeeDepartmentOptions.length === 0 ? (
                                <option value="">-</option>
                              ) : (
                                activeEmployeeDepartmentOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div className="register-user-popup__field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-department-class`}
                            >
                              Class
                            </label>
                            <select
                              id={`req-overtime-${activeTab}-department-class`}
                              name="department_class"
                              className="register-user-popup__select"
                              value={formValues.employee_descriptions[activeTab]?.department_class ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting || activeEmployeeDepartmentClassOptions.length <= 1}
                            >
                              {activeEmployeeDepartmentClassOptions.length === 0 ? (
                                <option value="">-</option>
                              ) : (
                                activeEmployeeDepartmentClassOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div className="register-user-popup__field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`req-overtime-${activeTab}-company-id`}
                            >
                              Company
                            </label>
                            <select
                              id={`req-overtime-${activeTab}-company-id`}
                              name="company_id"
                              className="register-user-popup__select"
                              value={formValues.employee_descriptions[activeTab]?.company_id ?? ''}
                              onChange={(event) => handleEmployeeDescriptionChange(activeTab, event)}
                              disabled={isSubmitting || activeEmployeeCompanyOptions.length <= 1}
                            >
                              {activeEmployeeCompanyOptions.length === 0 ? (
                                <option value="">-</option>
                              ) : (
                                activeEmployeeCompanyOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>

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
                                {field.required ? (
                                  <span className="register-user-popup__required">*</span>
                                ) : null}
                              </label>
                              <textarea
                                id={`req-overtime-${activeTab}-${field.name}`}
                                name={field.name}
                                ref={setFieldRef(`employee:${field.name}`)}
                                className={[
                                  'register-user-popup__input',
                                  'master-project-popup__textarea',
                                  activeEmployeeFieldErrors[field.name]
                                    ? 'register-user-popup__input--error'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                value={descriptions[field.name] ?? ''}
                                placeholder={field.placeholder}
                                onChange={(event) =>
                                  handleEmployeeDescriptionChange(activeTab, event)
                                }
                                disabled={isSubmitting || formValues.equalize}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
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

  return createPortal(
    <>
      {dialogNode}
      <ToastAlert
        open={Boolean(errorMessage)}
        onClose={() => setErrorMessage('')}
        message={errorMessage}
        severity={errorSeverity}
      />
    </>,
    document.body,
  )
}

export default DialogCreateBulkReqOvertime
