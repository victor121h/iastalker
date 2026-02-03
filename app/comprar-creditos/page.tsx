'use client';

import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiInstagram, SiGooglepay, SiApplepay } from "react-icons/si";
import { FaCcVisa, FaCcMastercard } from "react-icons/fa";

export default function ComprarCreditos() {
  const router = useRouter();
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserCredits(parsed.credits || 0);
    }
  }, []);

  const handleComprar = () => {
    window.open("https://go.centerpag.com/PPU38CQ71RI", "_blank");
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
          <SiInstagram className="w-5 h-5 text-purple-400" />
          <span className="text-white font-bold text-sm">BUY CREDITS</span>
        </div>
        
        <div 
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)', color: '#a855f7' }}
        >
          <Zap className="w-3 h-3" />
          {userCredits}
        </div>
      </header>

      <main className="pt-20 px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div 
            className="p-6 rounded-2xl mb-6 relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #1a1028 0%, #2d1f47 100%)',
              border: '2px solid rgba(138, 43, 226, 0.4)'
            }}
          >
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
            >
              MOST POPULAR
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
                }}
              >
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">200 Credits</h2>
                <p className="text-purple-400 text-sm">Single package</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <span className="text-gray-500 text-sm line-through">$97</span>
              <p className="text-3xl font-bold text-white">
                $ <span style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>37</span>
              </p>
              <p className="text-green-400 text-xs">62% discount</p>
            </div>

            <div className="p-4 rounded-xl mb-4" style={{ 
              background: 'linear-gradient(135deg, rgba(131, 58, 180, 0.25), rgba(253, 29, 29, 0.15))', 
              border: '2px solid rgba(131, 58, 180, 0.5)',
              boxShadow: '0 0 20px rgba(131, 58, 180, 0.3)'
            }}>
              <p className="text-base text-center font-semibold" style={{ color: '#e879f9' }}>
                ⚠️ <strong>Important:</strong> Use the same email registered in your account at the time of purchase, so credits are added automatically.
              </p>
            </div>

            <Button
              onClick={handleComprar}
              className="w-full h-14 text-white font-bold text-lg rounded-xl border-0"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
              }}
            >
              <Zap className="w-5 h-5 mr-2" />
              Buy Now
            </Button>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm mb-3">100% secure payment</p>
            <div className="flex items-center justify-center gap-4">
              <FaCcVisa className="w-8 h-8 text-gray-400" />
              <FaCcMastercard className="w-8 h-8 text-gray-400" />
              <SiGooglepay className="w-8 h-8 text-gray-400" />
              <SiApplepay className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
