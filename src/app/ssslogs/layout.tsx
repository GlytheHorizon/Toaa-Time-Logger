import Header from '@/components/header';

interface SssLogsLayoutProps {
  children: React.ReactNode;
}

export default function SssLogsLayout({ children }: SssLogsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
