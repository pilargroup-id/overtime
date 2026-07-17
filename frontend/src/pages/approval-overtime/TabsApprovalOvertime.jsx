import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

const APPROVAL_STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Canceled', value: 'CANCELED' },
]

function TabsApprovalOvertime({ value, onChange }) {
  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 0.5,
        pr: { xs: 0, md: 38 },
      }}
    >
      <Tabs
        value={value}
        onChange={(_, nextValue) => onChange(nextValue)}
        aria-label="Filter status approval overtime"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            px: 2,
            textTransform: 'none',
            fontWeight: 600,
          },
        }}
      >
        {APPROVAL_STATUS_TABS.map((tab) => (
          <Tab key={tab.value || 'all'} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabsApprovalOvertime
