export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SpottiSähkö.fi
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sähkön pörssihinta reaaliajassa
          </p>
          
          {/* Hero price display placeholder */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 max-w-md mx-auto">
            <div className="text-sm text-gray-500 mb-2">Nykyinen hinta</div>
            <div className="text-4xl font-bold text-price-medium mb-2">
              8.45 c/kWh
            </div>
            <div className="text-sm text-gray-500">
              Päivitetty: {new Date().toLocaleTimeString('fi-FI')}
            </div>
          </div>

          <div className="text-gray-600">
            <p>🚧 Sovellus rakenteilla...</p>
            <p className="mt-2">Tulossa pian: reaaliaikainen hintatrendi, tilastot ja ennusteet!</p>
          </div>
        </div>
      </div>
    </main>
  )
}