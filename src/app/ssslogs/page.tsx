'use client';

import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/loading-spinner';

// Use dynamic import to split the admin dashboard code into a separate bundle.
// This means the code won't even be loaded by the browser unless the user is on this route.
const AdminDashboardClient = dynamic(() => import("@/components/admin-dashboard-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

export default function SssLogsPage() {
    return <AdminDashboardClient />;
}
