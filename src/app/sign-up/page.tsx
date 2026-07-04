export default function SignUpPage() {
  return (
    <div className="container py-20">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Account creation is configured through Clerk. The live sign-up widget will appear once the publishable key is set.
        </p>
        <a href="/" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Return home
        </a>
      </div>
    </div>
  );
}
