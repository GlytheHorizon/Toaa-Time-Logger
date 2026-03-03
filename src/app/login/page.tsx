'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useUser, useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Clock, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '@/components/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { INTERNSHIP_START_DATE, TOTAL_REQUIRED_HOURS, isAdminEmail } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const educationRoles = ['student', 'professor'] as const;

const formSchema = z.object({
  mode: z.enum(['signIn', 'signUp']).default('signIn'),
  displayName: z.string().max(80, { message: 'Display name must be 80 characters or less.' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/\d/, { message: 'Password must contain at least one number.' }),
  confirmPassword: z.string().optional(),
  accountTrack: z.enum(['personal', 'education']).optional(),
  educationRole: z.enum(educationRoles).optional(),
  classId: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.mode !== 'signUp') {
    return;
  }

  if (!values.accountTrack) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please choose a registration type.',
      path: ['accountTrack'],
    });
  }

  if (!values.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please confirm your password.',
      path: ['confirmPassword'],
    });
  } else if (values.password !== values.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    });
  }

  if (values.accountTrack === 'education' && !values.educationRole) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please choose Student or Professor.',
      path: ['educationRole'],
    });
  }

  if (values.accountTrack === 'education' && values.educationRole === 'student' && !values.classId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Class ID is required for student accounts.',
      path: ['classId'],
    });
  }
});

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'signIn',
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountTrack: undefined,
      educationRole: undefined,
      classId: '',
    },
  });

  const accountTrack = form.watch('accountTrack');
  const educationRole = form.watch('educationRole');
  const hasSelectedRegistrationType = Boolean(accountTrack);

  useEffect(() => {
    form.setValue('mode', isSignUp ? 'signUp' : 'signIn');
    if (!isSignUp) {
      form.setValue('confirmPassword', '');
      form.setValue('accountTrack', undefined);
      form.setValue('educationRole', undefined);
      form.setValue('classId', '');
      form.clearErrors(['confirmPassword', 'accountTrack', 'educationRole', 'classId']);
    }
  }, [isSignUp, form]);

  useEffect(() => {
    const routeByRole = async () => {
      if (isUserLoading || !user) return;

      if (isAdminEmail(user.email)) {
        router.push('/ssslogs');
        return;
      }

      try {
        const profileRef = collection(firestore, 'users', user.uid, 'userProfile');
        const profileSnapshot = await getDocs(profileRef);
        const profile = profileSnapshot.docs[0]?.data() as { role?: string } | undefined;

        if (profile?.role === 'professor') {
          router.push('/professor');
          return;
        }
      } catch {
      }

      router.push('/dashboard');
    };

    routeByRole();
  }, [user, isUserLoading, router, firestore]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    if (isSignUp) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        const firebaseUser = userCredential.user;
        const trimmedDisplayName = values.displayName?.trim() || null;

        if (trimmedDisplayName) {
          await updateProfile(firebaseUser, {
            displayName: trimmedDisplayName,
          });
        }

        const role = values.accountTrack === 'personal' ? 'personal' : values.educationRole;
        let classId: string | null = null;
        let classDisplayName: string | null = null;

        if (!role) throw new Error('Please complete account type details.');

        if (role === 'student') {
          classId = values.classId?.trim().toUpperCase() || null;
          if (!classId) {
            throw new Error('Class ID is required for student accounts.');
          }

          const classRef = doc(firestore, 'classes', classId);
          const classSnapshot = await getDoc(classRef);
          if (!classSnapshot.exists()) {
            throw new Error('Class ID not found. Ask your professor for the correct class code.');
          }
          classDisplayName = (classSnapshot.data() as { displayName?: string }).displayName || null;
        }

        const userProfileRef = doc(firestore, 'users', firebaseUser.uid, 'userProfile', firebaseUser.uid);
        await setDoc(userProfileRef, {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: trimmedDisplayName,
          role,
          classId,
          classDisplayName,
          totalRequiredHours: TOTAL_REQUIRED_HOURS,
          internshipStartDate: INTERNSHIP_START_DATE.toISOString(),
          dashboardSubtitle: "Here's your internship progress at a glance.",
        });

        if (role === 'professor') {
          router.push('/professor');
        } else {
          router.push('/dashboard');
        }
      } catch (error: any) {
        if (error?.code === 'auth/email-already-in-use') {
          toast({
            variant: 'destructive',
            title: 'Email already in use',
            description: 'This email already has an account. Please sign in instead.',
          });
          setIsSignUp(false);
          setIsSubmitting(false);
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } else {
      try {
        await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: 'Invalid email or password.',
        });
      }
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email')?.trim();

    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Enter your email first, then tap Forgot password.',
      });
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for password reset instructions.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Unable to send reset email',
        description: 'Please make sure the email is valid and try again.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-stretch justify-start bg-background px-3 py-6 sm:items-center sm:justify-center sm:p-4">
      <Card className="w-full max-w-sm opacity-0 animate-fade-in-up sm:max-w-md max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
        <CardHeader className="text-center px-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline sm:text-3xl">
            Toaa's TimeLogger
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Create an account to get started.'
              : 'Sign in to track your internship hours.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4">
              {isSignUp && (
                <>
                  <div className="text-center text-xs text-muted-foreground px-2">
                    Select registration type
                  </div>

                  <FormField
                    control={form.control}
                    name="accountTrack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose registration type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">Personal Account</SelectItem>
                            <SelectItem value="education">Education Account</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {hasSelectedRegistrationType && (
                    <>
                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., John Doe" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john.doe@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {accountTrack === 'education' && (
                    <FormField
                      control={form.control}
                      name="educationRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="student">Student Account</SelectItem>
                              <SelectItem value="professor">Professor Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {accountTrack === 'education' && educationRole === 'student' && (
                    <FormField
                      control={form.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class ID</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., CLS-AB12CD" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {!isSignUp && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-right whitespace-normal"
                      onClick={handleForgotPassword}
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? 'Sending reset email...' : 'Forgot password?'}
                    </Button>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm leading-relaxed">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
