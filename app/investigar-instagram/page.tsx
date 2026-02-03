'use client';

import { ArrowLeft, Zap, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiInstagram } from "react-icons/si";

export default function InvestigarInstagram() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [credits, setCredits] = useState(200);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setCredits(parsed.credits || 200);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    
    sessionStorage.setItem("investigatingUsername", username.trim());
    
    router.push(`/analise-instagram/${username.trim()}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(138, 43, 226, 0.15)' }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="text-white p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <SiInstagram className="w-5 h-5 text-pink-500" />
          <span className="text-white font-bold text-sm">INSTAGRAM</span>
        </div>
        
        <button
          onClick={() => router.push("/comprar-creditos")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)', color: '#a855f7' }}
        >
          <Zap className="w-3 h-3" />
          {credits}
        </button>
      </header>

      <main className="pt-20 px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              backgroundColor: '#121218',
              border: '1px solid rgba(138, 43, 226, 0.2)'
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
                }}
              >
                <SiInstagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">
                  Investigate Instagram
                </h1>
                <p className="text-gray-400 text-sm">
                  Discover hidden followers, conversations, stalkers and much more.
                </p>
              </div>
            </div>

            <div 
              className="p-4 rounded-xl mb-6"
              style={{ 
                backgroundColor: 'rgba(138, 43, 226, 0.1)',
                border: '1px solid rgba(138, 43, 226, 0.2)'
              }}
            >
              <p className="text-gray-300 text-sm">
                <span className="text-purple-400 font-semibold">Tip:</span> enter exactly as it appears on Instagram. No need to add @, capital letters or spaces.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-white text-sm font-medium mb-3">
                Enter username (without @)
              </label>
              
              <div className="relative mb-4">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Ex: lucas_silva10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                  style={{ backgroundColor: '#1e1e28' }}
                />
              </div>

              <Button
                type="submit"
                disabled={!username.trim() || isLoading}
                className="w-full h-14 text-white font-bold text-base rounded-xl border-0 disabled:opacity-50"
                style={{ 
                  backgroundColor: username.trim() ? '#4a4a5a' : '#2a2a3a',
                }}
              >
                {isLoading ? "Starting..." : "Start investigation"}
              </Button>

              <p className="text-center text-gray-400 text-sm mt-4">
                🔓 Free investigation, no credits spent.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
