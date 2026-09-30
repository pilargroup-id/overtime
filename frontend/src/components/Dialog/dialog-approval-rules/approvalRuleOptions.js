export function addCurrentOption(options = [], currentValue, fallbackLabel = null) {
  const normalizedValue = String(currentValue ?? '').trim()

  if (!normalizedValue || options.some((option) => String(option.value) === normalizedValue)) {
    return options
  }

  return [
    ...options,
    {
      value: normalizedValue,
      label: fallbackLabel || normalizedValue,
    },
  ]
}

export function createDepartmentOptions(rows = []) {
  return rows
    .filter((department) => department?.id !== null && department?.id !== undefined)
    .map((department) => ({
      value: String(department.id),
      label: department.code
        ? `${department.name || department.id} (${department.code})`
        : String(department.name || department.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))
}

export function createJobLevelValueOptions(rows = []) {
  const grouped = new Map()

  rows.forEach((jobLevel) => {
    const value = Number(jobLevel?.value ?? jobLevel?.job_level_value)
    const name = String(jobLevel?.name ?? jobLevel?.job_level_name ?? '').trim()

    if (!Number.isFinite(value)) return

    const key = String(value)
    const current = grouped.get(key) || new Set()

    if (name) current.add(name)
    grouped.set(key, current)
  })

  return [...grouped.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([value, names]) => ({
      value,
      label: names.size ? `${value} - ${[...names].join(' / ')}` : value,
    }))
}

export function createJobLevelNameOptions(rows = []) {
  const optionMap = new Map()

  rows.forEach((jobLevel) => {
    const name = String(jobLevel?.name ?? jobLevel?.job_level_name ?? '').trim()
    const value = Number(jobLevel?.value ?? jobLevel?.job_level_value)

    if (!name || optionMap.has(name)) return

    optionMap.set(name, {
      value: name,
      label: Number.isFinite(value) ? `${name} (Level ${value})` : name,
    })
  })

  return [...optionMap.values()].sort((a, b) => a.label.localeCompare(b.label, 'id'))
}

export function createUserOptions(rows = []) {
  return rows
    .filter((user) => user?.id)
    .map((user) => {
      const details = [user.job_position, user.department_name].filter(Boolean).join(' - ')

      return {
        value: String(user.id),
        label: details ? `${user.name || user.username || user.id} (${details})` : String(user.name || user.username || user.id),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))
}
