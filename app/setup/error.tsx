"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1>Algo salió mal</h1>

      <p>No pudimos cargar esta página.</p>

      <button onClick={() => reset()}>Intentar nuevamente</button>
    </main>
  );
}
