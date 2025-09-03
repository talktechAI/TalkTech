'use client';

import { useRouter } from 'next/navigation';

export default function AdminClient({ initial }: { initial?: unknown }) {
  const router = useRouter();

  function handleClick() {
    // client-only interactivity (navigation, fetch to your API routes, etc.)
    // never expose secrets here
    router.refresh();
  }

  return (
    <div className="p-4">
      {/* render initial, no secrets */}
      <button onClick={handleClick} className="btn">Do Admin Thing</button>
    </div>
  );
}
