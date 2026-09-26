import {Box, Button, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {useCallback, useState, type ReactNode} from 'react'
import {useCurrentUser} from 'sanity'
import {PublishError, PUBLISHING_ROLES} from '../lib/publish'

/* Publishing, unpublishing and deleting are for the project roles that may
   write (lib/publish.ts, PUBLISHING_ROLES). The controls stay visible and
   clickable for everyone; for anyone else a click opens this dialog instead
   of running the action, and so does a refusal from the server route (the
   check that actually protects the sites). It says plainly what happened and
   who to ask, without technical detail. */

/** What was attempted, as the dialog says it: "publish", "unpublish", "delete" */
export type RestrictedAction = 'publish' | 'unpublish' | 'delete'

const WHAT: Record<RestrictedAction, string> = {
  publish: 'publish content',
  unpublish: 'unpublish content',
  delete: 'delete content',
}

/** A refusal from the route or from Sanity because of the user's role */
export const isPermissionError = (error: unknown): boolean =>
  error instanceof PublishError ? error.details?.reason === 'permission' : (error as {statusCode?: number})?.statusCode === 403

export function usePermissionGate(): {
  /** True, or opens the dialog and returns false */
  allow: (action: RestrictedAction) => boolean
  /** Opens the dialog after a refusal */
  deny: (action: RestrictedAction) => void
  dialog: ReactNode
} {
  const user = useCurrentUser()
  const permitted = !!user?.roles?.some((role) => PUBLISHING_ROLES.has(role.name))
  const [denied, setDenied] = useState<RestrictedAction | null>(null)
  const allow = useCallback(
    (action: RestrictedAction) => {
      if (permitted) return true
      setDenied(action)
      return false
    },
    [permitted],
  )
  const deny = useCallback((action: RestrictedAction) => setDenied(action), [])
  const dialog = denied && <PermissionDialog action={denied} onClose={() => setDenied(null)} />
  return {allow, deny, dialog}
}

function PermissionDialog({action, onClose}: {action: RestrictedAction; onClose: () => void}) {
  return (
    <Dialog
      id="tomrow-permission-denied"
      header="You don’t have permission"
      width={0}
      onClose={onClose}
      footer={
        <Box padding={3}>
          <Flex justify="flex-end">
            <Button text="OK" className="tomrow-cta" onClick={onClose} autoFocus />
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>
        <Stack gap={4}>
          <Text size={1}>Your role in this Sanity project doesn’t allow you to {WHAT[action]}, so nothing was changed.</Text>
          <Text size={1} muted>
            If you need access, contact a project administrator.
          </Text>
        </Stack>
      </Box>
    </Dialog>
  )
}
