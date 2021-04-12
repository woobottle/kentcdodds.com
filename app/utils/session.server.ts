import type {Request, LoaderFunction} from '@remix-run/node'
import {createCookieSessionStorage, redirect} from '@remix-run/node'

type UserData = {
  uid: string
  firstName: string
  team: string
}

type SessionUser = {uid: string; email: string}

let secret = 'not-at-all-secret'
if (process.env.SESSION_SECRET) {
  secret = process.env.SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set SESSION_SECRET')
}

const rootStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [secret],
    sameSite: 'lax',
    path: '/',
  },
})

async function sendToken(email: string) {
  const response = await fetch(
    `https://app.egghead.io/api/v1/users/send_token`,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        client_id: process.env.EGGHEAD_CLIENT_ID,
        redirect_uri: `https://localhost:3000/me`,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Trouble sending token')
  }
}

async function createUserSession(idToken: string) {
  const {getSession, commitSession} = rootStorage
  const token = await getSessionToken(idToken)
  const session = await getSession()
  session.set('token', token)
  const cookie = await commitSession(session, {maxAge: 604_800})
  return redirect('/me', {
    headers: {'Set-Cookie': cookie},
  })
}

async function getSessionToken(idToken: string) {
  // const auth = getAdmin().auth()
  // const decodedToken = {auth_time: 'TODO'}
  // if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
  //   throw new Error('Recent sign in required')
  // }
  // const twoWeeks = 60 * 60 * 24 * 14 * 1000
  // return auth.createSessionCookie(idToken, {expiresIn: twoWeeks})
  // TODO: make this thing work
  return idToken
}

const db: Record<string, Omit<UserData, 'uid'>> = {}

async function getUser(request: Request) {
  const sessionUser = await getUserSession(request)
  if (!sessionUser) {
    return null
  }
  const userData = db[sessionUser.uid]
  if (!userData) {
    // this should never happen, log the user out
    console.error(`No user doc for this session: ${sessionUser.uid}`)
    return null
  }
  const user = {uid: sessionUser.uid, ...userData} as UserData
  return {sessionUser, user}
}

function requireUser(request: Request) {
  return async (
    loader: (data: {
      sessionUser: SessionUser
      user: UserData
    }) => ReturnType<LoaderFunction>,
  ) => {
    const userInfo = await getUser(request)
    if (!userInfo) {
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      const cookie = await rootStorage.destroySession(session)
      return redirect('/login', {headers: {'Set-Cookie': cookie}})
    }
    return loader(userInfo)
  }
}

async function getUserSession(request: Request) {
  const cookieSession = await rootStorage.getSession(
    request.headers.get('Cookie'),
  )
  const token = cookieSession.get('token') as string | undefined
  if (!token) return null
  try {
    const tokenUser = {uid: 'TODO', email: 'todo@example.com'}
    return tokenUser as SessionUser
  } catch {
    return null
  }
}

export {rootStorage, createUserSession, requireUser, getUser, sendToken}
