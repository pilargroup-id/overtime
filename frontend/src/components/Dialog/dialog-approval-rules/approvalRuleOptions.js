export function normalizeResourceResponseRows(responseData) {
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

export function addCurrentOption(options = [], value, label) {
  const currentValue = String(value ?? '').trim()

  if (!currentValue || options.some((option) => String(option.value) === currentValue)) {
    return options
  }

  return [
    ...options,
    {
      value: currentValue,
      label: label || currentValue,
    },
  ]
}

function formatDepartmentOptionLabel(department) {
  const id = String(department.id ?? department.department_id ?? '').trim()
  const name = String(department.name ?? department.department_name ?? '').trim()
  const code = String(department.code ?? department.department_code ?? '').trim()

  if (name && code) {
    return `${name} (${code})`
  }

  return name || code || `Department ${id}`
}

export function createDepartmentOptions(departments = []) {
  return departments
    .map((department) => {
      const id = department.id ?? department.department_id

      if (id === null || id === undefined || String(id).trim() === '') {
        return null
      }

      return {
        value: String(id),
        label: formatDepartmentOptionLabel(department),
      }
    })
    .filter(Boolean)
    .sort((left, right) =>
      left.label.localeCompare(right.label, 'id-ID', { sensitivity: 'base' }),
    )
}

function formatJobLevelOptionLabel(jobLevel) {
  const name = String(jobLevel.name ?? jobLevel.job_level ?? jobLevel.job_level_name ?? '').trim()
  const value = jobLevel.value ?? jobLevel.job_level_value

  if (name && value !== null && value !== undefined && value !== '') {
    return `${name} (Level ${value})`
  }

  return name || `Level ${value}`
}

export function createJobLevelValueOptions(jobLevels = []) {
  const optionsByValue = new Map()

  jobLevels.forEach((jobLevel) => {
    const value = jobLevel.value ?? jobLevel.job_level_value

    if (value === null || value === undefined || String(value).trim() === '') {
      return
    }

    const optionValue = String(value)

    if (!optionsByValue.has(optionValue)) {
      optionsByValue.set(optionValue, {
        value: optionValue,
        label: formatJobLevelOptionLabel(jobLevel),
      })
    }
  })

  return [...optionsByValue.values()].sort(
    (left, right) => Number(left.value) - Number(right.value),
  )
}

function formatUserOptionLabel(user) {
  const name = String(user.name ?? '').trim()
  const position = String(user.job_position ?? user.job_level_name ?? '').trim()
  const department = String(user.department_name ?? '').trim()

  const details = [position, department].filter(Boolean).join(' • ')

  if (name && details) {
    return `${name} (${details})`
  }

  return name || details || `User ${user.id}`
}

export function createUserOptions(users = []) {
  return users
    .map((user) => {
      const id = user.id ?? user.user_id

      if (id === null || id === undefined || String(id).trim() === '') {
        return null
      }

      return {
        value: String(id),
        label: formatUserOptionLabel(user),
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label, 'id-ID', { sensitivity: 'base' }))
}

export function createJobLevelNameOptions(jobLevels = []) {
  const optionsByName = new Map()

  jobLevels.forEach((jobLevel) => {
    const name = String(jobLevel.name ?? jobLevel.job_level ?? jobLevel.job_level_name ?? '').trim()

    if (!name) {
      return
    }

    if (!optionsByName.has(name)) {
      optionsByName.set(name, {
        value: name,
        label: formatJobLevelOptionLabel(jobLevel),
      })
    }
  })

  return [...optionsByName.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'id-ID', { sensitivity: 'base' }),
  )
}
