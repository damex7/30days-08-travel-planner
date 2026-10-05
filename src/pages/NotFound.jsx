import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="pass mx-auto max-w-lg p-8 text-center">
      <p className="stamp text-danger">Gate closed</p>
      <h1 className="mt-4 text-4xl">This page doesn't exist</h1>
      <p className="mt-2 text-ink-soft">The link may be old or mistyped.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-zobo px-5 font-bold text-on-zobo hover:bg-zobo-hover"
      >
        Search for a city
      </Link>
    </div>
  )
}
