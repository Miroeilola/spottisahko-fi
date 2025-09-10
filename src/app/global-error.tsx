'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">Virhe</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Jotain meni pieleen</h2>
            <p className="text-gray-600 mb-8">Sovelluksessa tapahtui odottamaton virhe.</p>
            <button
              onClick={() => reset()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}