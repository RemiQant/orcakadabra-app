import { Routes, Route } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import KYCPage from '@/pages/KYCPage'
import KYCResultPage from '@/pages/KYCResultPage'
import NPWPPage from '@/pages/NPWPPage'
import ThankYouPage from '@/pages/ThankYouPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/kyc" element={<KYCPage />} />
      <Route path="/kyc/result" element={<KYCResultPage />} />
      <Route path="/kyc/npwp" element={<NPWPPage />} />
      <Route path="/kyc/thankyou" element={<ThankYouPage />} />
      <Route path="/dashboard" element={<AdminDashboardPage />} />
    </Routes>
  )
}
