import {RocketIcon} from '@sanity/icons/Rocket'
import {Box, Button, Card, Container, Flex, Heading, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'
import {type Tool, useClient, useCurrentUser} from 'sanity'

// The Go live tool: the second of the two steps a change takes. Publish (the
// document's own button, relabelled "Publish to staging" in sanity.config.ts)
// puts it on the staging site, which reads Sanity on every visit. The live site
// is built ahead of time, so it changes only when it is rebuilt, and this is
// the button that rebuilds it. It writes the liveSite document; the Sanity
// webhook "Publish to live site" fires on that and calls the Vercel deploy hook
// for `main`. The live site then shows everything published, about a minute
// later, as a Webflow site's Publish to live domain does.

// The documents the site renders; the webhook ignores all of them now
const SITE_TYPES = ['homePage', 'project', 'client']
const TYPE_NAMES: Record<string, string> = {homePage: 'Home page', project: 'Project', client: 'Client'}
// The live site's address (.env.production / .env.development beside sanity.config.ts)
const LIVE_SITE_URL = process.env.SANITY_STUDIO_SITE_URL

// The last go-live, what has been published since, and what is still only a draft
const STATUS_QUERY = `{
  "live": *[_id == "liveSite"][0]{publishedAt, publishedBy},
  "waiting": *[
    _type in $types && !(_id in path("drafts.**")) && !(_id in path("versions.**")) &&
    dateTime(_updatedAt) > dateTime(coalesce(*[_id == "liveSite"][0].publishedAt, "1970-01-01T00:00:00Z"))
  ] | order(_updatedAt desc) {_id, _type, _updatedAt, "title": coalesce(title, name)},
  "drafts": count(*[_type in $types && _id in path("drafts.**")])
}`

interface Status {
  live: {publishedAt?: string; publishedBy?: string} | null
  waiting: {_id: string; _type: string; _updatedAt: string; title?: string}[]
  drafts: number
}

const when = (date: string) => new Date(date).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})

function GoLive() {
  const client = useClient({apiVersion: '2025-02-19'})
  const user = useCurrentUser()
  const [status, setStatus] = useState<Status | null>(null)
  const [state, setState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle')
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    client.fetch<Status>(STATUS_QUERY, {types: SITE_TYPES}).then(setStatus, (err: Error) => setError(err.message))
  }, [client])

  // Kept current while the page is open: another tab publishing, or going live
  useEffect(() => {
    refresh()
    const subscription = client
      .listen(`*[_type in $types || _id == "liveSite"]`, {types: SITE_TYPES}, {includeResult: false, visibility: 'query'})
      .subscribe(() => refresh())
    return () => subscription.unsubscribe()
  }, [client, refresh])

  const goLive = useCallback(async () => {
    setState('publishing')
    try {
      await client.createOrReplace({
        _id: 'liveSite',
        _type: 'liveSite',
        publishedAt: new Date().toISOString(),
        publishedBy: user?.name,
      })
      setState('published')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }, [client, user])

  const waiting = status?.waiting ?? []

  return (
    <Container width={1} padding={5} paddingTop={6}>
      <Stack gap={5}>
        <Stack gap={4}>
          <Heading size={3}>Go live</Heading>
          <Text muted>
            <strong>Publish to staging</strong> on a page puts your change on the staging site only. This
            puts everything published on staging onto the live site
            {LIVE_SITE_URL ? (
              <>
                , <a href={LIVE_SITE_URL} target="_blank" rel="noreferrer">{LIVE_SITE_URL.replace(/^https?:\/\//, '')}</a>
              </>
            ) : null}
            .
          </Text>
        </Stack>

        <Card padding={4} radius={3} border>
          <Text size={1}>
            {status?.live?.publishedAt
              ? `Live site last updated ${when(status.live.publishedAt)}${status.live.publishedBy ? ` by ${status.live.publishedBy}` : ''}.`
              : 'Not published to the live site from here yet.'}
          </Text>
        </Card>

        <Stack gap={3}>
          <Text size={1} weight="medium">
            {status ? `Published to staging, not yet live (${waiting.length})` : 'Checking staging…'}
          </Text>
          {status && waiting.length === 0 && (
            <Text size={1} muted>
              Nothing new: the live site shows everything published.
            </Text>
          )}
          {waiting.map((doc) => (
            <Card key={doc._id} padding={3} radius={2} tone="transparent" border>
              <Flex gap={3} align="center">
                <Box flex={1}>
                  <Text size={1}>
                    {TYPE_NAMES[doc._type] ?? doc._type}
                    {doc.title ? `: ${doc.title}` : ''}
                  </Text>
                </Box>
                <Text size={1} muted>
                  {when(doc._updatedAt)}
                </Text>
              </Flex>
            </Card>
          ))}
          <Text size={1} muted>
            Deletions go live too. Unpublished drafts don&rsquo;t
            {status?.drafts ? ` (${status.drafts} waiting to be published to staging)` : ''}.
          </Text>
        </Stack>

        <Flex gap={3} align="center" wrap="wrap">
          <Button
            icon={RocketIcon}
            text={state === 'publishing' ? 'Publishing…' : 'Publish to live site'}
            tone="critical"
            padding={4}
            disabled={state === 'publishing'}
            onClick={goLive}
          />
          {state === 'published' && (
            <Text size={1}>The live site is updating; it takes about a minute.</Text>
          )}
        </Flex>
        {state === 'error' && (
          <Card padding={4} radius={3} tone="critical" border>
            <Text size={1}>Couldn&rsquo;t publish to the live site: {error}</Text>
          </Card>
        )}
      </Stack>
    </Container>
  )
}

export const goLiveTool: Tool = {
  name: 'go-live',
  title: 'Go live',
  icon: RocketIcon,
  component: GoLive,
}
