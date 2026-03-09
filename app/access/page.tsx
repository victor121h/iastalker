'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cadastro');
  }, [router]);

  return null;
}
