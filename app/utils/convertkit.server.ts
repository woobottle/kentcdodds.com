import {getRequiredServerEnvVar} from './misc'

const CONVERT_KIT_API_SECRET = getRequiredServerEnvVar('CONVERT_KIT_API_SECRET')
const CONVERT_KIT_API_KEY = getRequiredServerEnvVar('CONVERT_KIT_API_KEY')

type ConvertKitSubscriber = {
  id: number
  first_name: string
  email_address: string
  state: 'active' | 'inactive'
  created_at: string
  fields: Record<string, string | null>
}

type ConvertKitSequenceSubscriptions = {
  total_subscriptions: number
  page: number
  total_pages: number
  subscriptions: [{subscriber: ConvertKitSubscriber}]
}

async function getConvertKitSubscriber(email: string) {
  const url = new URL('https://api.convertkit.com/v3/subscribers')
  url.searchParams.set('api_secret', CONVERT_KIT_API_SECRET)
  url.searchParams.set('email_address', email)

  const resp = await fetch(url.toString())
  const json = await resp.json()
  const {subscribers: [subscriber = {state: 'inactive'}] = []} = json as {
    subscribers?: Array<ConvertKitSubscriber>
  }

  return subscriber.state === 'active' ? subscriber : null
}

async function getConvertKitNewsletterSequence() {
  const newsletterSequenceId = '372244'
  let page = 1
  let totalPages = 2
  const allSubscribers: Array<ConvertKitSubscriber> = []
  while (page < totalPages) {
    // eslint-disable-next-line no-await-in-loop
    const result = await getConvertKitSequencePage(newsletterSequenceId, page)
    allSubscribers.push(...result.subscriptions.map(s => s.subscriber))
    totalPages = result.total_pages
    page = result.page + 1
    console.log({
      totalPages,
      page,
      totalSubscriptions: result.total_subscriptions,
      subsSoFar: allSubscribers.length,
    })
  }
  return allSubscribers
}

async function getConvertKitSequencePage(sequenceId: string, page: number) {
  const url = new URL(
    `https://api.convertkit.com/v3/sequences/${sequenceId}/subscriptions`,
  )
  url.searchParams.set('api_secret', CONVERT_KIT_API_SECRET)
  url.searchParams.set('subscriber_state', 'active')
  url.searchParams.set('page', page.toString())
  const resp = await fetch(url.toString())
  const json = await resp.json()
  return json as ConvertKitSequenceSubscriptions
}

async function tagKCDSiteSubscriber({
  email,
  firstName,
  id,
}: {
  email: string
  firstName: string
  id: string
}) {
  const subscriber = email ? await getConvertKitSubscriber(email) : null
  const kcdTagId = '2466369'
  const kcdSiteForm = '2393887'
  const subscriberData = {
    api_key: CONVERT_KIT_API_KEY,
    api_secret: CONVERT_KIT_API_SECRET,
    first_name: firstName,
    email,
    fields: {kcd_site_id: id},
  }
  // the main difference in subscribing to a tag and subscribing to a
  // form is that in the form's case, the user will get a double opt-in
  // email before they're a confirmed subscriber. So we only add the
  // tag to existing subscribers who have already confirmed.
  const subscribeUrl = subscriber
    ? `https://api.convertkit.com/v3/tags/${kcdTagId}/subscribe`
    : `https://api.convertkit.com/v3/forms/${kcdSiteForm}/subscribe`
  const updatedRes = await fetch(subscribeUrl, {
    method: 'post',
    body: JSON.stringify(subscriberData),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const updatedJson = (await updatedRes.json()) as {
    subscription: {subscriber: ConvertKitSubscriber}
  }
  return updatedJson.subscription.subscriber
}

export {tagKCDSiteSubscriber, getConvertKitSubscriber}

async function go() {
  const subs = await getConvertKitNewsletterSequence()
  console.dir(subs, {depth: 6})
}

void go()
