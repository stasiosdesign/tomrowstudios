import {DesktopIcon} from '@sanity/icons/Desktop'
import {ExpandIcon} from '@sanity/icons/Expand'
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
     website gets that bar's height; it hands the Edit switch and the view
     to the store below, and sizes the preview frame in Laptop view.
   - PreviewControls sits in each document's header row (sanity.config.ts,
     document.unstable_languageFilter, Sanity's slot for header controls) and
     draws them, in the Visual editor only.

   Three views: Phone (Sanity's own narrow preview), Laptop (a 16:9 frame,
   fitted and centred in the canvas) and Fill (the whole canvas, the default).
   Switching only resizes the frame: the page is not reloaded, and drafts and
   visual editing carry on. Share preview and the address bar are gone with
   the bar. */

export type PreviewMode = 'phone' | 'laptop' | 'fill'

type Controls = {
  overlaysEnabled: boolean
  /** The preview has loaded and its edit layer is connected */
  overlaysReady: boolean
  toggleOverlay: () => void
  viewport: 'desktop' | 'mobile'
  setViewport: (viewport: 'desktop' | 'mobile') => void
}

// Laptop view is this Studio's own: Sanity knows desktop and mobile only
let laptop = false
const laptopListeners = new Set<() => void>()
const laptopStore = {
  get: () => laptop,
  set(next: boolean) {
    laptop = next
    laptopListeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    laptopListeners.add(listener)
    return () => {
      laptopListeners.delete(listener)
    }
  },
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

  // Laptop view: the frame at 16:9, as large as the canvas allows, centred
  // (the frame's box already centres it), refitted as the canvas resizes
  const inLaptop = useSyncExternalStore(laptopStore.subscribe, laptopStore.get) && viewport === 'desktop'
  const {iframeRef} = props
  useEffect(() => {
    const box = iframeRef.current?.parentElement
    if (!box || !inLaptop) return undefined
    const fit = () => {
      const {width, height} = box.getBoundingClientRect()
      const frameWidth = Math.max(0, Math.min(width - LAPTOP_MARGIN * 2, ((height - LAPTOP_MARGIN * 2) * 16) / 9))
      box.style.setProperty('--tomrow-frame-width', `${Math.floor(frameWidth)}px`)
      box.style.setProperty('--tomrow-frame-height', `${Math.floor((frameWidth * 9) / 16)}px`)
    }
    fit()
    box.setAttribute('data-tomrow-laptop', '')
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => {
      observer.disconnect()
      box.removeAttribute('data-tomrow-laptop')
    }
  }, [inLaptop, iframeRef])

  // A marker only: studio.css folds the empty bar away
  return <span data-tomrow-preview-header hidden />
}

export function PreviewControls() {
  const inVisualEditor = useInVisualEditor()
  const controls = useSyncExternalStore(store.subscribe, store.get)
  const laptopOn = useSyncExternalStore(laptopStore.subscribe, laptopStore.get)
  if (!inVisualEditor || !controls) return null
  const mode: PreviewMode = controls.viewport === 'mobile' ? 'phone' : laptopOn ? 'laptop' : 'fill'
  const choose = (next: PreviewMode) => {
    laptopStore.set(next === 'laptop')
    controls.setViewport(next === 'phone' ? 'mobile' : 'desktop')
  }
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
      <Flex role="group" aria-label="Preview size" gap={1}>
        {VIEWS.map((view) => (
          <Tooltip key={view.mode} content={<Text size={1}>{view.label}</Text>} placement="bottom" portal>
            <Button
              icon={view.icon}
              mode="bleed"
              selected={mode === view.mode}
              aria-label={view.label}
              aria-pressed={mode === view.mode}
              onClick={() => choose(view.mode)}
            />
          </Tooltip>
        ))}
      </Flex>
    </Flex>
  )
}

const VIEWS: {mode: PreviewMode; label: string; icon: typeof DesktopIcon}[] = [
  {mode: 'phone', label: 'Phone view', icon: MobileDeviceIcon},
  {mode: 'laptop', label: 'Laptop view (16:9)', icon: DesktopIcon},
  {mode: 'fill', label: 'Fill the canvas', icon: ExpandIcon},
]

/** The room kept around the laptop frame, so its edge shows */
const LAPTOP_MARGIN = 24
