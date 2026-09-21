# Overtime FE Guide — Multi-Department & Multi-Company Employees

## Updated endpoint

```http
GET /api/overtime/requests/eligible-employees?limit=100
```

The endpoint still returns the existing primary organization fields, but each employee now also includes every department and company membership.

## Response example

```json
{
  "success": true,
  "message": "Eligible employees fetched successfully",
  "data": [
    {
      "id": "a340b7c7-4fe2-4760-a3ac-848ceef72306",
      "internal_id": 8040,
      "username": "chandra",
      "name": "Chandra",
      "email": null,
      "job_position": "Manager Sales GT",
      "employment_type_code": null,
      "job_level_name": "Manager",
      "job_level_value": 4,

      "department_id": 4,
      "department_name": "Gosave GT",
      "department_code": "GSG",
      "company_id": "comp-pnm-0001",
      "company_code": "PNM",
      "company_name": "PT Pilar Niaga Makmur",

      "departments": [
        {
          "id": 4,
          "name": "Gosave GT",
          "class": "Gosave GT",
          "code": "GSG",
          "company_id": "comp-pnm-0001",
          "parent_id": null,
          "is_active": 1,
          "is_primary": 1
        },
        {
          "id": 19,
          "name": "GOTO GT",
          "class": "GOTO GT",
          "code": "GTG",
          "company_id": "comp-pnm-0001",
          "parent_id": null,
          "is_active": 1,
          "is_primary": 0
        }
      ],

      "companies": [
        {
          "id": "comp-pnm-0001",
          "code": "PNM",
          "name": "PT Pilar Niaga Makmur",
          "is_active": 1,
          "is_primary": 1
        },
        {
          "id": "comp-pkp-0001",
          "code": "PKP",
          "name": "PT Pilar Kargo Perkasa",
          "is_active": 1,
          "is_primary": 0
        }
      ]
    }
  ]
}
```

## Backward compatibility

The following fields remain available and represent the primary organization:

```text
department_id
department_name
department_code
company_id
company_code
company_name
```

Existing FE code will continue to work without immediate changes.

## Fields for the updated UI

Use these arrays when the UI must show all organization memberships:

```text
departments[]
companies[]
```

Each array item has an `is_primary` value:

```text
1 = primary
0 = additional membership
```

## Suggested employee label

For a compact dropdown, keep the employee name and show all departments below it.

```js
function getEmployeeDepartmentLabel(employee) {
  const departments = employee.departments ?? []

  if (departments.length === 0) {
    return employee.department_name ?? '-'
  }

  return departments
    .map((department) => department.class || department.name)
    .filter(Boolean)
    .join(', ')
}
```

Example output:

```text
Chandra
Gosave GT, GOTO GT
```

## Suggested company label

```js
function getEmployeeCompanyLabel(employee) {
  const companies = employee.companies ?? []

  if (companies.length === 0) {
    return employee.company_name ?? '-'
  }

  return companies
    .map((company) => company.code || company.name)
    .filter(Boolean)
    .join(', ')
}
```

## Permission behavior

The backend now checks all memberships when deciding whether an employee is eligible:

- a department-scoped permission matches any entry in `departments[]`;
- a company-scoped permission matches any entry in `companies[]`;
- global permission remains unchanged.

The FE does not need to repeat this permission logic. Only render the employees returned by the endpoint.

## Important submission note

The request creation body remains unchanged:

```json
{
  "employee_id": "a340b7c7-4fe2-4760-a3ac-848ceef72306",
  "day_type": "WORKDAY",
  "work_date": "2026-08-05",
  "start_time": "18:00",
  "end_time": "20:00",
  "task_description": "Task description",
  "result_description": "Result description",
  "compensation_type_id": 1
}
```

No `department_id` or `company_id` is required in the submission body. The backend continues to use the employee's primary organization for request snapshots and approval routing.
