'use client'
import dynamic from 'next/dynamic'
import AppShell from '../../components/AppShell'

// Lazy-load OkrDashboard — heavy component with many queries
const OkrDashboard = dynamic(() => import('../../components/OkrDashboard'), {
  ssr: false,
  loading: () => (
    <div className="p-8 animate-pulse space-y-4">
      <div className="h-8 w-48 bg-[#D1CBC5] rounded" />
      <div className="h-24 bg-[#F5F3EF] rounded-xl" />
      <div className="h-24 bg-[#F5F3EF] rounded-xl" />
      <div className="h-24 bg-[#F5F3EF] rounded-xl" />
    </div>
  ),
})

export default function OkrsPage() {
  return (
    <AppShell>
      <OkrDashboard />
    </AppShell>
  )
}
