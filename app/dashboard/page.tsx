'use client';

import { Menu, Plus, Zap, MessageSquare, Phone, Camera, Globe, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiInstagram, SiWhatsapp, SiFacebook } from "react-icons/si";
import { FaMapMarkerAlt } from "react-icons/fa";

function MatrixBackground() {
  const [chars, setChars] = useState<{ id: number; char: string; left: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    const characters = "AEKITSL.";
    const newChars = [];
    for (let i = 0; i < 80; i++) {
      newChars.push({
        id: i,
        char: characters[Math.floor(Math.random() * characters.length)],
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 6 + Math.random() * 10,
        size: 0.7 + Math.random() * 0.4,
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
            color: 'rgba(138, 43, 226, 0.08)',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.15)',
            fontSize: `${item.size}rem`,
          }}
        >
          {item.char}
        </span>
      ))}
    </div>
  );
}

interface ServiceCardProps {
  icon: JSX.Element;
  name: string;
  description: string;
  credits?: number;
  color: string;
  isFree?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
}

function ServiceCard({ icon, name, description, credits, color, isFree, isCompleted, onClick }: ServiceCardProps) {
  return (
    <div 
      className={`p-4 rounded-xl relative transition-all cursor-pointer hover:scale-[1.02]`}
      style={{ 
        backgroundColor: '#0f0f14',
        border: isCompleted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(138, 43, 226, 0.15)'
      }}
      onClick={onClick}
    >
      {isCompleted && (
        <div 
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
        >
          <Check className="w-3 h-3 text-green-400" />
        </div>
      )}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: color + '20' }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <h3 className="text-white font-semibold text-sm mb-1">{name}</h3>
      <p className="text-gray-500 text-xs mb-3 line-clamp-2">{description}</p>
      
      {isCompleted ? (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
        >
          <Check className="w-3 h-3" /> Completed
        </div>
      ) : isFree ? (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
        >
          Free 🔥
        </div>
      ) : (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(138, 43, 226, 0.15)', color: '#a855f7' }}
        >
          <Zap className="w-3 h-3" />
          {credits} credits
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [credits, setCredits] = useState(200);
  const [user, setUser] = useState<{ nome: string; credits: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contractedServices, setContractedServices] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setCredits(parsed.credits || 200);
    } else {
      router.push("/loginpainel");
    }
    
    const contracted = localStorage.getItem("contractedServices");
    if (contracted) {
      setContractedServices(JSON.parse(contracted));
    }
    
    const storedXp = localStorage.getItem("userXp");
    if (storedXp) {
      const xpValue = parseInt(storedXp);
      setXp(xpValue);
      setLevel(Math.floor(xpValue / 100) + 1);
    }
  }, [router]);

  const firstName = user?.nome?.split(' ')[0] || 'User';

  const services = [
    {
      icon: <SiInstagram className="w-5 h-5" />,
      name: "Instagram",
      description: "See liked photos, forwarded posts and direct conversations",
      credits: 0,
      color: "#E1306C",
      isFree: true,
    },
    {
      icon: <SiWhatsapp className="w-5 h-5" />,
      name: "WhatsApp",
      description: "Access full conversations, audio, videos and groups",
      credits: 40,
      color: "#25D366",
    },
    {
      icon: <SiFacebook className="w-5 h-5" />,
      name: "Facebook",
      description: "See all interactions and get full Messenger access",
      credits: 45,
      color: "#1877F2",
    },
    {
      icon: <FaMapMarkerAlt className="w-5 h-5" />,
      name: "Location",
      description: "Track in real time and see suspicious locations visited",
      credits: 60,
      color: "#EF4444",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      name: "SMS",
      description: "All sent and received text messages",
      credits: 30,
      color: "#F59E0B",
    },
    {
      icon: <Phone className="w-5 h-5" />,
      name: "Calls",
      description: "Complete call log with duration and times",
      credits: 25,
      color: "#22C55E",
    },
    {
      icon: <Camera className="w-5 h-5" />,
      name: "Camera",
      description: "Access photos and videos from gallery, including deleted files",
      credits: 55,
      color: "#F97316",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      name: "Other Networks",
      description: "Full search across all social networks (including adult sites)",
      credits: 70,
      color: "#EC4899",
    }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0a0a0f' }}>
      <MatrixBackground />
      
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(138, 43, 226, 0.15)' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(138, 43, 226, 0.1))',
              border: '1px solid rgba(138, 43, 226, 0.4)'
            }}
          >
            <SiInstagram className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">LOVESEARCH.AI</span>
        </div>
        
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white p-2"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div 
            className="fixed top-14 right-0 z-50 w-64 p-4 rounded-bl-xl"
            style={{ 
              backgroundColor: '#121218',
              border: '1px solid rgba(138, 43, 226, 0.2)',
              borderTop: 'none',
              borderRight: 'none'
            }}
          >
            <nav className="space-y-2">
              <button 
                onClick={() => setMenuOpen(false)}
                className="w-full text-left px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { setMenuOpen(false); router.push("/investigar-instagram"); }}
                className="w-full text-left px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                New Search
              </button>
              <button 
                onClick={() => { setMenuOpen(false); router.push("/comprar-creditos"); }}
                className="w-full text-left px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Buy Credits
              </button>
              <button 
                onClick={() => { 
                  localStorage.removeItem("painelToken");
                  localStorage.removeItem("painelUser");
                  localStorage.removeItem("hasSeenWelcome");
                  localStorage.removeItem("contractedServices");
                  router.push("/loginpainel");
                }}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Logout
              </button>
            </nav>
          </div>
        </>
      )}

      <main className="pt-16 px-4 md:px-8 pb-24 relative z-10 max-w-6xl mx-auto">
        <div 
          className="p-5 rounded-2xl mb-6 relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1a1028 0%, #0f0a18 100%)',
            border: '1px solid rgba(138, 43, 226, 0.2)'
          }}
        >
          <div className="absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-bold"
            style={{ backgroundColor: 'rgba(138, 43, 226, 0.3)', color: '#a855f7' }}
          >
            <Zap className="w-3 h-3 inline mr-1" />
            Nv.{level}
          </div>

          <p className="text-purple-400 text-sm mb-1 flex items-center gap-1">
            <Zap className="w-4 h-4" /> Welcome!
          </p>
          <h1 className="text-2xl font-bold text-white mb-1">
            Hello, {firstName}! 👋
          </h1>
          <p className="text-gray-400 text-sm mb-4">
            Choose a service and start your investigation
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Credits
                </span>
                <button 
                  onClick={() => router.push("/comprar-creditos")}
                  className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
              <p className="text-2xl font-bold text-white">{credits}</p>
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <p className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3" /> XP
              </p>
              <p className="text-lg font-bold text-white mb-1">{xp}/200</p>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${(xp % 200) / 2}%`,
                    background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {contractedServices.length > 0 && (
          <section className="mb-6">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Contracted Services
            </h2>
            <div className="space-y-2">
              {contractedServices.map((service, index) => {
                const serviceName = service.split(" - ")[0] || "Instagram";
                const serviceDetail = service.includes("@") ? service.split("@")[1] : "Target Device";
                return (
                  <div 
                    key={index}
                    className="p-4 rounded-xl flex items-center justify-between"
                    style={{ 
                      backgroundColor: '#0f0f14',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div>
                        <p className="text-white font-semibold text-sm">{serviceName}</p>
                        <p className="text-gray-500 text-xs">{serviceDetail}</p>
                      </div>
                    </div>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                    >
                      <Check className="w-3 h-3" /> Completed
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Available Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {services.map((service) => (
              <ServiceCard 
                key={service.name} 
                icon={service.icon}
                name={service.name}
                description={service.description}
                credits={service.credits}
                color={service.color}
                isFree={service.isFree}
                isCompleted={contractedServices.some(s => s.toLowerCase().includes(service.name.toLowerCase()))}
                onClick={service.name === "Instagram" ? () => router.push("/investigar-instagram") : undefined}
              />
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div 
            className="p-5 rounded-xl"
            style={{ 
              backgroundColor: '#0f0f14',
              border: '1px solid rgba(138, 43, 226, 0.15)'
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)' }}
            >
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Private Detective</h3>
            <p className="text-gray-500 text-sm mb-3">Complete personalized investigation with a real detective</p>
            <div 
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}
            >
              Personalized
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
