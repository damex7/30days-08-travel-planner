import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Destination from './pages/Destination.jsx'
import Trips from './pages/Trips.jsx'
import Trip from './pages/Trip.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="place/:id" element={<Destination />} />
        <Route path="trips" element={<Trips />} />
        <Route path="trips/:tripId" element={<Trip />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
