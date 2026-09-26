import {DesktopIcon} from '@sanity/icons/Desktop'
import {MobileDeviceIcon} from '@sanity/icons/MobileDevice'
import {Button, Card, Flex, Switch, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {useCallback, useEffect, useSyncExternalStore} from 'react'
import {usePresentationParams, type PreviewHeaderProps} from 'sanity/presentation'

/** Whether this document is open in the Visual editor (else it is in Content) */
export const useInVisualEditor = (): boolean => !!usePresentationParams(false)

/* The Visual editor's own controls, moved from the bar above the preview into
   the side panel's header row, beside Open in Content and Show more:

   - PreviewHeaderBridge takes the preview bar's place (sanity.config.ts,
     presentationTool components.unstable_header). It shows nothing, so the
     website gets that bar's height; it hands the Edit switch and the phone
     view to the store below.
   - PreviewControls sits in each document's header row (sanity.config.ts,
     document.unstable_languageFilter, Sanity's slot for header controls) and
     draws them, in the Visual editor only.

   Share preview and the address bar are gone with the bar. */

type Controls = {
  overlaysEnabled: boolean
  /** The preview has loaded and its edit layer is connected */
  overlaysReady: boolean
  toggleOverlay: () => void
  viewport: 'desktop' | 'mobile'
  setViewport: (viewport: 'desktop' | 'mobile') => void
}

let current: Controls | null = null
const listeners = new Set<() => void>()
const store = {
  get: () => current,
  set(next: Controls | null) {
    current = next
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

type Snapshot = {context: {visualEditingOverlaysEnabled?: boolean}; matches: (state: string) => boolean}

export function PreviewHeaderBridge(props: PreviewHeaderProps) {
  const {presentationRef, toggleOverlay, viewport, setViewport, overlaysConnection} = props
  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = presentationRef.subscribe(onChange)
      return () => subscription.unsubscribe()
    },
    [presentationRef],
  )
  const snapshot = () => presentationRef.getSnapshot() as unknown as Snapshot
  const overlaysEnabled = useSyncExternalStore(subscribe, () => !!snapshot().context.visualEditingOverlaysEnabled)
  const loaded = useSyncExternalStore(subscribe, () => snapshot().matches('loaded'))
  const overlaysReady = loaded && overlaysConnection === 'connected'

  useEffect(() => {
    store.set({overlaysEnabled, overlaysReady, toggleOverlay, viewport, setViewport})
  }, [overlaysEnabled, overlaysReady, toggleOverlay, viewport, setViewport])
  useEffect(() => () => store.set(null), [])

  // A marker only: studio.css folds the empty bar away
  return <span data-tomrow-preview-header hidden />
}

export function PreviewControls() {
  const inVisualEditor = useInVisualEditor()
  const controls = useSyncExternalStore(store.subscribe, store.get)
  if (!inVisualEditor || !controls) return null
  const mobile = controls.viewport === 'mobile'
  return (
    <Flex align="center" gap={1} data-tomrow-preview-controls>
      <Tooltip content={<Text size={1}>{controls.overlaysEnabled ? 'Turn off edit mode' : 'Click the page to edit it'}</Text>} placement="bottom" portal>
        <Card as="label" padding={2} radius={2} style={{cursor: controls.overlaysReady ? 'pointer' : 'default'}}>
          <Flex align="center" gap={2}>
            <Switch checked={controls.overlaysEnabled} indeterminate={!controls.overlaysReady} disabled={!controls.overlaysReady} onChange={controls.toggleOverlay} />
            <Text size={1} muted={!controls.overlaysEnabled}>
              Edit
            </Text>
          </Flex>
        </Card>
      </Tooltip>
      <Tooltip content={<Text size={1}>{mobile ? 'Desktop view' : 'Phone view'}</Text>} placement="bottom" portal>
        <Button
          icon={mobile ? DesktopIcon : MobileDeviceIcon}
          mode="bleed"
          aria-label={mobile ? 'Show the page at desktop width' : 'Show the page at phone width'}
          aria-pressed={mobile}
          onClick={() => controls.setViewport(mobile ? 'desktop' : 'mobile')}
        />
      </Tooltip>
    </Flex>
  )
}
