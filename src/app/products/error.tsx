"use client";

export default function ProductsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container mx-auto py-16">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        <h2 className="text-2xl font-semibold">Products could not be loaded</h2>
        <p className="mt-3 text-sm opacity-90">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-full bg-red-900 px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    </div>
  );
}
