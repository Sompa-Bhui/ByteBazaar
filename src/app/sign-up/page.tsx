"use client";

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto">
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      </div>
    </div>
  );
}
