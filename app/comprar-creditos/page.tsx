'use client';

import { ArrowLeft, Zap, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiInstagram, SiGooglepay, SiApplepay } from "react-icons/si";
import { FaCcVisa, FaCcMastercard } from "react-icons/fa";

function MatrixBackground() {
  const [chars, setChars] = useState<{ id: number; char: string; left: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    const characters = "AEKITSL.";
    const newChars = [];
    for (let i = 0; i < 60; i++) {
      newChars.push({
        id: i,
        char: characters[Math.floor(Math.random() * characters.length)],
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 6 + Math.random() * 10,
        size: 0.6 + Math.random() * 0.3,
      });
    }
    setChars(newChars);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {chars.map((item) => (
        <span
          key={item.id}
          className="matrix-char absolute font-mono font-bold"
          style={{
            left: `${item.left}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            color: 'rgba(138, 43, 226, 0.06)',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.1)',
            fontSize: `${item.size}rem`,
          }}
        >
          {item.char}
        </span>
      ))}
    </div>
  );
}

interface PlanCardProps {
  credits: number;
  price: number;
  originalPrice?: number;
  bonusCredits?: number;
  savings?: number;
  badge?: string;
  badgeColor?: string;
  isHighlighted?: boolean;
}

function PlanCard({ credits, price, originalPrice, bonusCredits, savings, badge, badgeColor, isHighlighted }: PlanCardProps) {
  const handleComprar = () => {
    window.open("https://go.centerpag.com/PPU38CQ71RI", "_blank");
  };

  return (
    <div 
      className={`p-5 rounded-2xl relative ${isHighlighted ? 'ring-2 ring-purple-500' : ''}`}
      style={{ 
        backgroundColor: '#121218',
        border: isHighlighted ? '2px solid rgba(138, 43, 226, 0.5)' : '1px solid rgba(138, 43, 226, 0.2)',
        boxShadow: isHighlighted ? '0 0 30px rgba(138, 43, 226, 0.15)' : 'none'
      }}
    >
      {badge && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: badgeColor || '#22c55e', color: 'white' }}
        >
          {badge}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
          }}
        >
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold text-white">
            {credits.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ml-1">credits</span>
          </p>
        </div>
        <div className="ml-auto text-right">
          {originalPrice && (
            <p className="text-gray-500 text-sm line-through">${originalPrice.toFixed(2)}</p>
          )}
          <p className="text-2xl font-bold text-white">
            <span className="text-sm font-normal">$</span>{price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-gray-300">Credits never expire</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-gray-300">Access to all services</span>
        </div>
        {bonusCredits && (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold">+{bonusCredits.toLocaleString()} bonus credits</span>
          </div>
        )}
        {savings && (
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Save ${savings.toFixed(2)}</span>
          </div>
        )}
      </div>

      <Button
        onClick={handleComprar}
        className="w-full h-12 text-white font-bold text-base rounded-xl border-0"
        style={{ 
          background: isHighlighted 
            ? 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
            : 'linear-gradient(135deg, #833ab4, #9c27b0)'
        }}
      >
        Buy Now <Sparkles className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

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

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0a0a0f' }}>
      <MatrixBackground />

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

      <main className="pt-20 px-4 pb-8 relative z-10">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{ 
                backgroundColor: 'rgba(138, 43, 226, 0.2)',
                border: '1px solid rgba(138, 43, 226, 0.3)'
              }}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-semibold">Recharge your credits</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Choose your package</h1>
            <p className="text-gray-400 text-sm">The more you buy, the more you save</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <PlanCard 
              credits={100}
              price={5.99}
            />
            <PlanCard 
              credits={600}
              price={15.99}
              originalPrice={41.99}
              bonusCredits={100}
              savings={26.00}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <PlanCard 
              credits={1500}
              price={29.99}
              originalPrice={107.99}
              bonusCredits={300}
              savings={78.00}
              badge="BEST SELLER"
              badgeColor="#f59e0b"
              isHighlighted={true}
            />
            <PlanCard 
              credits={5000}
              price={59.99}
              originalPrice={359.99}
              bonusCredits={1000}
              savings={300.00}
            />
          </div>

          <div className="mb-6">
            <PlanCard 
              credits={10000}
              price={99.99}
              originalPrice={899.99}
              bonusCredits={5000}
              savings={800.00}
              badge="BEST VALUE"
              badgeColor="#22c55e"
            />
          </div>

          <div 
            className="p-4 rounded-xl mb-6" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(131, 58, 180, 0.15), rgba(253, 29, 29, 0.1))', 
              border: '1px solid rgba(131, 58, 180, 0.3)'
            }}
          >
            <p className="text-sm text-center" style={{ color: '#e879f9' }}>
              <strong>Important:</strong> Use the same email registered in your account at the time of purchase, so credits are added automatically.
            </p>
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
