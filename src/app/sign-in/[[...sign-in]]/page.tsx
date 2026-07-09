'use client';

import { SignIn } from '@clerk/nextjs';

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export default function SignInPage() {
  return (
    <div className="container py-20">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" {...(appUrl ? { forceRedirectUrl: appUrl } : {})} />
        </div>
      </div>
    </div>
  );
}
