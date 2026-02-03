'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiInstagram } from "react-icons/si";
import { Zap, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ nome: string; email: string; credits: number } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/loginpainel");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("painelToken");
    localStorage.removeItem("painelUser");
    router.push("/loginpainel");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(138, 43, 226, 0.15)' }}
      >
        <div className="flex items-center gap-2">
          <SiInstagram className="w-5 h-5 text-purple-400" />
          <span className="text-white font-bold text-sm">LOVESEARCH.AI</span>
        </div>
        
        <button
          onClick={() => router.push("/comprar-creditos")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)', color: '#a855f7' }}
        >
          <Zap className="w-3 h-3" />
          {user.credits || 0}
        </button>
      </header>

      <main className="pt-20 px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome, <span style={{ 
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>{user.nome?.split(' ')[0] || 'User'}</span>!
            </h1>
            <p className="text-gray-400">What would you like to investigate today?</p>
          </div>

          <div 
            className="p-6 rounded-2xl mb-6"
            style={{ 
              backgroundColor: '#121218',
              border: '1px solid rgba(138, 43, 226, 0.2)'
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
                }}
              >
                <SiInstagram className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Instagram</h2>
                <p className="text-gray-400 text-sm">Investigate any profile</p>
              </div>
            </div>

            <Button
              onClick={() => router.push("/investigar-instagram")}
              className="w-full h-14 text-white font-bold text-base rounded-xl border-0"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
              }}
            >
              <Search className="w-5 h-5 mr-2" />
              Start Investigation
            </Button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
