import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

const REPORT_STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

function TabsReportOvertime({ value, onChange }) {
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
        aria-label="Filter status report overtime"
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
        {REPORT_STATUS_TABS.map((tab) => (
          <Tab key={tab.value || 'all'} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabsReportOvertime
