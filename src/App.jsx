import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AboutPage from './pages/AboutPage'
import BookPage from './pages/BookPage'
import ContactPage from './pages/ContactPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AboutPage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/reviews" element={<Navigate to="/" replace />} />
          <Route path="/portfolio" element={<Navigate to="/" replace />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
