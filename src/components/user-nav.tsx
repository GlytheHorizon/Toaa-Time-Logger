'use client';

import { useState } from 'react';
import { signOut, deleteUser } from 'firebase/auth';
import { useUser, useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserNav() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'No user is logged in.' });
      return;
    }
    
    setIsDeleting(true);
    const userId = auth.currentUser.uid;

    const deleteInBatches = async (docRefs: DocumentReference[]) => {
      const chunkSize = 400;
      for (let index = 0; index < docRefs.length; index += chunkSize) {
        const chunk = docRefs.slice(index, index + chunkSize);
        const batch = writeBatch(firestore);
        chunk.forEach((docRef) => batch.delete(docRef));
        await batch.commit();
      }
    };

    try {
        const docsToDelete: DocumentReference[] = [];

        // 0. If professor owns classes, delete related class conversations only.
        // Keep class documents/student records intact as requested.
        const ownedClassesSnapshot = await getDocs(
          query(collection(firestore, 'classes'), where('ownerId', '==', userId))
        );

        for (const classDoc of ownedClassesSnapshot.docs) {
          const classId = classDoc.id;

          const classMessagesSnapshot = await getDocs(
            query(collection(firestore, 'classMessages'), where('classId', '==', classId))
          );

          classMessagesSnapshot.forEach((messageDoc) => docsToDelete.push(messageDoc.ref));
        }

        if (docsToDelete.length > 0) {
          await deleteInBatches(docsToDelete);
        }

        const userDocsToDelete: DocumentReference[] = [];

        // 1. Delete all time entries
        const timeEntriesRef = collection(firestore, 'users', userId, 'timeEntries');
        const timeEntriesSnapshot = await getDocs(timeEntriesRef);
        timeEntriesSnapshot.forEach((item) => userDocsToDelete.push(item.ref));
        
        // 2. Delete the user profile
        const userProfileRef = collection(firestore, 'users', userId, 'userProfile');
        const userProfileSnapshot = await getDocs(userProfileRef);
        userProfileSnapshot.forEach((item) => userDocsToDelete.push(item.ref));

        if (userDocsToDelete.length > 0) {
          await deleteInBatches(userDocsToDelete);
        }

        // 3. Delete the user from Auth
        await deleteUser(auth.currentUser);

        toast({ title: 'Account Deleted', description: 'Your account and all data have been permanently deleted.' });
        router.replace('/login');
        window.location.href = '/login';

    } catch (error: any) {
        console.error("Error deleting account: ", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message || 'Could not delete account. You may need to sign in again to complete this action.',
        });
    } finally {
        setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }
  
  const userInitial = user.email?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || ''} alt={user.email || 'User'} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
        </DropdownMenuGroup>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Account</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className={buttonVariants({ variant: "destructive" })}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
