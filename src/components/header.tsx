import { Clock } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import { NavLinks } from './nav-links';
import { AdminMailboxButton } from './admin-mailbox-button';
import { ClassMailboxButton } from './class-mailbox-button';
import StudentClassBadge from './student-class-badge';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-primary" />
          <a href="/dashboard" className="font-headline text-lg font-bold">Toaa's TimeLogger</a>
          <div className="ml-3">
            <StudentClassBadge />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <NavLinks />
          <ThemeToggle />
          <AdminMailboxButton />
          <ClassMailboxButton />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
