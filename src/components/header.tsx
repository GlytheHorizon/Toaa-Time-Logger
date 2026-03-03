import { Clock } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import { NavLinks } from './nav-links';
import { AdminMailboxButton } from './admin-mailbox-button';
import { ClassMailboxButton } from './class-mailbox-button';
import StudentClassBadge from './student-class-badge';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="mr-2 flex min-w-0 items-center">
          <Clock className="mr-2 h-6 w-6 shrink-0 text-primary" />
          <a href="/dashboard" className="max-w-[9.5rem] truncate font-headline text-base font-bold sm:max-w-none sm:text-lg">Toaa's TimeLogger</a>
          <div className="ml-3">
            <StudentClassBadge />
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end space-x-4 md:flex">
          <NavLinks stacked={false} />
          <ThemeToggle />
          <AdminMailboxButton />
          <ClassMailboxButton />
          <UserNav />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <AdminMailboxButton />
          <ClassMailboxButton />
          <UserNav />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Access dashboard links and quick actions.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <NavLinks stacked={true} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
