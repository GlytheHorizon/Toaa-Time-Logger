'use client';

import { Badge } from '@/components/ui/badge';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { UserProfile } from '@/lib/types';
import { collection } from 'firebase/firestore';

export default function StudentClassBadge() {
  const { user } = useUser();
  const firestore = useFirestore();

  const myProfileQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, 'users', user.uid, 'userProfile') : null),
    [firestore, user?.uid]
  );
  const { data: myProfileData } = useCollection<UserProfile>(myProfileQuery);
  const myProfile = myProfileData?.[0];

  if (!user || myProfile?.role !== 'student' || !myProfile.classId) return null;

  const className = myProfile.classDisplayName || 'Joined Class';

  return (
    <Badge variant="secondary" className="hidden md:inline-flex">
      {className} ({myProfile.classId})
    </Badge>
  );
}
