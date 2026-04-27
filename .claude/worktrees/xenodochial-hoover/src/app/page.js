'use client'
import AppShell from '../components/AppShell'
import TaskApp from '../components/TaskApp'

export default function Home() {
  return (
    <AppShell>
      <TaskApp projectId={null} />
    </AppShell>
  )
}
