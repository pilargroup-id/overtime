import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

import { XClose } from '../../../template/TemplateIcons.jsx'

function TabsUserCreateBulkRO({
  selectedEmployees = [],
  value,
  onChange,
  onRemove,
  getEmployeeLabel,
  disabled = false,
}) {
  return (
    <Box className="overtime-create-popup__tabs">
      <Tabs
        value={value}
        onChange={(_, nextValue) => onChange(nextValue)}
        aria-label="Create bulk request overtime tabs"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 42,
          '& .MuiTabs-indicator': {
            display: 'none',
          },
          '& .MuiTab-root': {
            minHeight: 42,
            px: 1.5,
            color: '#5a6b88',
            fontSize: '0.9rem',
            fontWeight: 700,
            textTransform: 'none',
            borderBottom: '2px solid transparent',
          },
          '& .MuiTab-root.Mui-selected': {
            color: 'var(--secondary-teal)',
            borderBottomColor: 'var(--secondary-teal)',
          },
        }}
      >
        <Tab label="General" value="general" />
        {selectedEmployees.map((employee) => {
          const employeeLabel = getEmployeeLabel(employee)

          return (
            <Tab
              key={employee.id}
              value={employee.id}
              label={
                <span className="overtime-create-popup__tab-label">
                  <span className="overtime-create-popup__tab-text">
                    {employeeLabel}
                  </span>
                  <button
                    type="button"
                    className="overtime-create-popup__tab-close"
                    aria-label={`Batalkan ${employeeLabel}`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemove(employee.id)
                    }}
                    disabled={disabled}
                  >
                    <XClose size={13} />
                  </button>
                </span>
              }
            />
          )
        })}
      </Tabs>
    </Box>
  )
}

export default TabsUserCreateBulkRO
