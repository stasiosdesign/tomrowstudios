import {Box, Button, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {useState, type ReactNode} from 'react'

/* Asks before an action that takes something off the sites (Unpublish,
   Delete), in the publishing control and the collection tables. One line, two
   buttons. The action runs once: the buttons lock while it does. */
export function ConfirmDialog({
  id,
  title,
  action,
  tone,
  onCancel,
  onConfirm,
  children,
}: {
  id: string
  title: string
  action: string
  tone?: 'critical'
  onCancel: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  const [submitting, setSubmitting] = useState(false)
  const go = () => {
    if (submitting) return
    setSubmitting(true)
    onConfirm()
  }
  return (
    <Dialog
      id={id}
      header={title}
      width={0}
      onClose={onCancel}
      footer={
        <Box padding={3}>
          <Flex gap={2} justify="flex-end">
            <Button text="Cancel" mode="ghost" onClick={onCancel} disabled={submitting} />
            <Button text={action} tone={tone ?? 'default'} className={tone ? undefined : 'tomrow-cta'} onClick={go} disabled={submitting} autoFocus />
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>
        <Stack gap={3}>
          <Text size={1}>{children}</Text>
        </Stack>
      </Box>
    </Dialog>
  )
}
