import {Button} from '@sanity/ui'
import {styled} from 'styled-components'
import {failedText, type FailedDocument} from '../lib/publish'
import {hasFailed, isActive, isBusy, runMessage, type Run} from '../lib/run'

/* A publishing action's progress, under the publishing control and under a
   collection's Select bar: the action's stages in a row (lib/run.ts), each
   a dot and a name, dim until reached, white and pulsing while it runs,
   green once the route (or, for the rebuild, the site's build stamp) says
   it is done, red where it failed; then what is happening, or how it ended,
   in a line, and after a failure the way out: Try again, or Dismiss. Set
   like the status chips (Status.tsx): small, quiet, on the Studio's grid,
   with no percentage anywhere, since nothing here can measure one.

   The stages are the real ones: Checking (the route reads and checks every
   document), Staging (the staging dataset has them), Live site (the
   production dataset has them) and Site rebuild (the static live site has
   been built again from it, which takes about a minute). A stage is marked
   done only when it is. */
export function PublishProgress({
  run,
  names,
  rebuildSlow,
  onRetry,
  onDismiss,
}: {
  run: Run
  /** The names of the documents a bulk action took, by ID, for the ones it refused */
  names?: Record<string, string>
  /** The live site has been rebuilding for too long (the webhook may be off) */
  rebuildSlow?: boolean
  onRetry?: () => void
  onDismiss: () => void
}) {
  const failed = hasFailed(run)
  const busy = isBusy(run)
  const state = failed ? 'failed' : isActive(run) ? 'active' : 'done'
  return (
    <Strip role="status" aria-live="polite" data-tomrow-progress data-state={state}>
      <Steps aria-label="Stages">
        {run.steps.map((step, index) => (
          <StepItem key={step.key} data-state={step.state} aria-current={step.state === 'running' ? 'step' : undefined}>
            {index > 0 && <Rule aria-hidden />}
            <Dot aria-hidden />
            <span>{step.label}</span>
          </StepItem>
        ))}
      </Steps>
      <Message data-tone={failed ? 'critical' : state === 'done' ? 'positive' : undefined}>{runMessage(run, {rebuildSlow})}</Message>
      {run.failed && run.failed.length > 0 && !failed && <Refused items={run.failed} names={names} />}
      {!busy && (
        <Actions>
          {failed && onRetry && <Button text="Try again" mode="ghost" fontSize={1} padding={2} onClick={onRetry} />}
          <Button text="Dismiss" mode="bleed" fontSize={1} padding={2} onClick={onDismiss} />
        </Actions>
      )}
    </Strip>
  )
}

/** Of several documents, the ones the route refused, each with its reason */
function Refused({items, names}: {items: FailedDocument[]; names?: Record<string, string>}) {
  return (
    <RefusedList>
      {items.map((item) => (
        <li key={item.id}>
          <b>{names?.[item.id] ?? item.id}</b>: {failedText(item)}
        </li>
      ))}
    </RefusedList>
  )
}

/* One row of the grid, ruled off above, the stages first and the message
   after them; on a narrow pane the message wraps under the stages. The
   strip's own row keeps the 14px inset of everything around it. */
const Strip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 20px;
  row-gap: 6px;
  box-sizing: border-box;
  min-height: var(--tomrow-row-height);
  padding: 8px 14px;
  border-top: 1px solid var(--card-border-color);
  font-size: 12px;
  line-height: 16px;
  color: var(--card-muted-fg-color);
`

const Steps = styled.ol`
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
  white-space: nowrap;
`

/* A stage: its dot and name, dim until it is reached; the running one white,
   its dot pulsing; a done one green; a failed one red. The short rule before
   it joins it to the one before. */
const StepItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--card-muted-fg-color);
  opacity: 0.55;
  transition: opacity 150ms ease;

  &[data-state='running'] {
    opacity: 1;
    color: #ffffff;
  }

  &[data-state='done'] {
    opacity: 1;
    color: var(--card-badge-positive-fg-color);
  }

  &[data-state='failed'] {
    opacity: 1;
    color: var(--card-badge-critical-fg-color);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Rule = styled.span`
  display: block;
  width: 14px;
  height: 1px;
  margin: 0 8px 0 2px;
  background: currentColor;
  opacity: 0.4;
`

const Dot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;

  [data-state='running'] > & {
    animation: tomrow-pulse 1.2s ease-in-out infinite;
  }

  @keyframes tomrow-pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.3;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-state='running'] > & {
      animation: none;
    }
  }
`

const Message = styled.p`
  flex: 1 1 240px;
  min-width: 0;
  margin: 0;
  white-space: pre-line;
  color: var(--card-fg-color);

  &[data-tone='critical'] {
    color: var(--card-badge-critical-fg-color);
  }

  &[data-tone='positive'] {
    color: var(--card-muted-fg-color);
  }
`

const RefusedList = styled.ul`
  flex-basis: 100%;
  margin: 0;
  padding: 0 0 0 14px;
  color: var(--card-badge-caution-fg-color);

  & b {
    font-weight: 500;
  }
`

const Actions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`
