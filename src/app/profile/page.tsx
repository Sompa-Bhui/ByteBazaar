'use client';

import Link from 'next/link';
import { SignedIn, UserProfile } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  return (
    <div className="container py-10">
      <SignedIn>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <section className="lg:w-[340px]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Profile & Security</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Manage your ByteBazaar account</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Review your identity details and use Clerk&apos;s secure account tools for password or recovery updates.
                </p>

                <div className="mt-8 space-y-4">
                  <InfoCard label="Name" value={isLoaded ? user?.fullName || user?.firstName || 'Your account' : 'Loading...'} />
                  <InfoCard label="Email" value={isLoaded ? user?.primaryEmailAddress?.emailAddress || 'No primary email on file' : 'Loading...'} />
                  <InfoCard
                    label="Sign-in method"
                    value={
                      isLoaded
                        ? user?.externalAccounts?.length
                          ? 'Social login connected'
                          : 'Email and password'
                        : 'Loading...'
                    }
                  />
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <p className="font-medium text-slate-950 dark:text-white">Password help</p>
                  <p className="mt-2 leading-6">
                    If your account uses email and password, Clerk will show password change controls below. Social logins such as Google may not have a password to change.
                  </p>
                  <Link
                    href="#security"
                    className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-white/20"
                  >
                    Go to security actions
                  </Link>
                </div>
              </section>

              <section className="min-w-0 flex-1">
                <div id="security" className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <UserProfile
                    path="/profile"
                    routing="path"
                    appearance={{
                      elements: {
                        card: 'shadow-none border-0 bg-transparent',
                      },
                    }}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
