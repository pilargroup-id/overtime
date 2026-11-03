import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

function noop() {

}

function normalizeResponse(rows) {
    if (!Array.isArray(rows)) return []

    return rows.map((row) => {
        if (typeof row === 'string') {
            return { value: row, label: row }
        }
})}

function formatCompensation(row, compensationTypeMap) {
    const compensationNameFields = [
        'compensation_name',
        'compensation_type_name',
        'compensationType.name',
        'compensationType.code',
    ]
}

for (const field of compensationNameFields) {
    const value = getNestedValue(row, field)

    if (String(value ?? '').trim()) {
        return formatValue(value)
    }
}

const mappedName = compensationType.get(String(row?.compensation_type_id ?? ''))
return mappedName ? formatValue(mappedName) : String(row?.compensation_type_id ?? '').trim()

function getApprovalRuleOptions(rows, compensationTypeMap) {
    return [
        {
            label: 'Compensation Type',
            options: rows .map((row) => ({
                value: String(row?.compensation_type_id ?? ''),
                label: formatCompensation(row, compensationTypeMap),
            }))
        },
        {
            label: 'Department',
            options: rows .map((row) => ({
                value: String(row?.department_id ?? ''),
                label: String(row?.department_name ?? '').trim(),
            }))
        }
    ]
}

const [approvalRows, setApprovalRows] = useState([])
const [compensationTypeMap, setCompensationTypeMap] = useState(new Map())
const [approvalRuleOptions, setApprovalRuleOptions] = useState([])
const [approvalRuleValue, setApprovalRuleValue] = useState('')
const isHistoryMode = mode === 'history'

// useEffect(() => {
//     let isMounted = true

// const loadApprovals = async () => {
//     setIsLoading(true)
//     setErrorMessage('')

//     try {
//         const response = await.api.overtimeApprovals.list({
//             page: currentPage,
//             limit: pageSize,
//             search: searchQuery,
            
//         })
//     }
// }

