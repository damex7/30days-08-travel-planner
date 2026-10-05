import { useEffect } from 'react'

const APP = 'Passport'

/** Sets the tab title ("Accra · Passport"), so history and tabs are readable. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : `${APP} · Plan a trip from Lagos`
  }, [title])
}
