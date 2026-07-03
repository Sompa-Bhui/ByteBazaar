"use client";

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
