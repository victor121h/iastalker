'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function Erro2FA() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    router.push(`/validar-email/${username}`);
  }, [username, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <p className="text-white">Redirecting...</p>
    </div>
  );
}
