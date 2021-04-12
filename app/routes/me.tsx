import type {LoaderFunction, ActionFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {useRouteData} from '@remix-run/react'
import * as React from 'react'
import {Outlet} from 'react-router'
import {requireUser, rootStorage} from '../utils/session.server'

export const loader: LoaderFunction = ({request}) => {
  return requireUser(request)(async ({sessionUser, user}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const message = session.get('message')
    const cookie = await rootStorage.commitSession(session)

    return json({sessionUser, user, message}, {headers: {'Set-Cookie': cookie}})
  })
}

export const action: ActionFunction = async ({request}) => {
  return requireUser(request)(async ({user}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const params = new URLSearchParams(await request.text())
    const actionId = params.get('actionId')
    if (actionId === 'logout') {
      const cookie = await rootStorage.destroySession(session)

      return redirect('/', {headers: {'Set-Cookie': cookie}})
    }
    if (actionId === 'change details') {
      const newFirstName = params.get('firstName')!
      if (user.firstName !== newFirstName) {
        // TODO: update first name in DB
        // await userDoc.ref.set({firstName: newFirstName}, {merge: true})
      }
    }

    return redirect('/me')
  })
}

function YouScreen() {
  const data = useRouteData()
  return (
    <div>
      <h1>User: {data.sessionUser.email}</h1>
      <div>Team: {data.user.team}</div>
      <div>
        <form method="post" action="/me">
          <button name="actionId" value="logout" type="submit">
            Logout
          </button>
        </form>
      </div>
      <details>
        <summary>Change account details</summary>

        <form method="post" action="/me">
          <div>
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              defaultValue={data.user.firstName}
            />
          </div>
          <button type="submit" name="actionId" value="change details">
            Submit
          </button>
        </form>
      </details>
      <Outlet />
    </div>
  )
}

export default YouScreen
