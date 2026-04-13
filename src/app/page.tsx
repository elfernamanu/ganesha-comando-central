'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      router.replace('/web');
    } else {
      router.replace('/pc');
    }
  }, [router]);

  return null;
}
