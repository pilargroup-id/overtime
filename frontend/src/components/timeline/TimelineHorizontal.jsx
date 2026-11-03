import { DataTableStatus } from '../table/DataTable.jsx'

export default function TimelineHorizontal({ steps = [] }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return <p className="timeline-horizontal__empty">Belum ada progress approval.</p>
  }

  return (
    <div className="timeline-horizontal" role="list" aria-label="Approval progress timeline">
      {steps.map((step, index) => {
        const stepKey = step.key ?? `${step.title}-${index}`

        return (
          <div className="timeline-horizontal__step" role="listitem" key={stepKey}>
            <div className="timeline-horizontal__track">
              <span
                className={`timeline-horizontal__connector${
                  index === 0 ? ' timeline-horizontal__connector--hidden' : ''
                }`}
                aria-hidden="true"
              />
              <span
                className={`timeline-horizontal__dot timeline-horizontal__dot--${
                  step.variant ?? 'app'
                }`}
              />
              <span
                className={`timeline-horizontal__connector${
                  index === steps.length - 1 ? ' timeline-horizontal__connector--hidden' : ''
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="timeline-horizontal__content">
              <p className="timeline-horizontal__title">{step.title}</p>
              {step.description ? (
                <p className="timeline-horizontal__description">{step.description}</p>
              ) : null}
              {step.status ? (
                <DataTableStatus inline variant={step.variant}>
                  {step.status}
                </DataTableStatus>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
