import {styled} from 'styled-components'
import {STATUS_LABEL, STATUS_TONE, type PublishStatus} from '../lib/publish'

/* An item's publishing status as a coloured dot and its name: Live (green),
   Staging and Changes in draft (yellow), Unpublished (grey). The same chip in
   the collection table and in the publishing control above each document. */

export type Tone = 'default' | 'muted' | 'positive' | 'caution' | 'critical'

export const Chip = styled.span<{$tone: Tone}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 16px;
  cursor: default;
  white-space: nowrap;
  color: ${({$tone}) =>
    $tone === 'positive'
      ? 'var(--card-badge-positive-fg-color)'
      : $tone === 'caution'
        ? 'var(--card-badge-caution-fg-color)'
        : $tone === 'critical'
          ? 'var(--card-badge-critical-fg-color)'
          : $tone === 'muted'
            ? 'var(--card-muted-fg-color)'
            : 'var(--card-fg-color)'};

  &::before {
    content: '';
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: ${({$tone}) => ($tone === 'muted' ? 0.6 : 1)};
  }
`

export function StatusChip({status, title}: {status: PublishStatus; title?: string}) {
  return (
    <Chip $tone={STATUS_TONE[status]} title={title}>
      {STATUS_LABEL[status]}
    </Chip>
  )
}
