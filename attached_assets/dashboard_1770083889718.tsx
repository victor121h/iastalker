import { Menu, ChevronRight, Plus, Zap, MessageSquare, Phone, Camera, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SiInstagram, SiWhatsapp, SiFacebook, SiGooglepay, SiApplepay } from "react-icons/si";
import { FaMapMarkerAlt, FaCreditCard, FaCcVisa, FaCcMastercard } from "react-icons/fa";

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
  credits: number | string;
  color: string;
  isFree?: boolean;
  isUpdating?: boolean;
  onClick?: () => void;
}

function ServiceCard({ icon, name, description, credits, color, isFree, isUpdating, onClick }: ServiceCardProps) {
  return (
    <div 
      className={`p-4 rounded-xl relative transition-transform ${isUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
      style={{ 
        backgroundColor: '#1a1a24',
        border: '1px solid rgba(138, 43, 226, 0.15)'
      }}
      onClick={isUpdating ? undefined : onClick}
    >
      {isUpdating && (
        <div 
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
        >
          Updating
        </div>
      )}
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 relative"
        style={{ backgroundColor: color + '20' }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <h3 className="text-white font-semibold text-sm mb-1">{name}</h3>
      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{description}</p>
      {isUpdating ? (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
        >
          Available in 24h
        </div>
      ) : isFree ? (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
        >
          Free 🔥
        </div>
      ) : (
        <div 
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}
        >
          <Zap className="w-3 h-3" />
          {credits} credits
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [credits, setCredits] = useState(0);
  const [user, setUser] = useState<{ nome: string; credits: number } | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contractedServices, setContractedServices] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [level] = useState(1);
  const targetCredits = user?.credits || 200;

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      if (hasSeenWelcome) {
        setShowWelcome(false);
        setCredits(parsed.credits || 200);
      }
    }
    
    const contracted = localStorage.getItem("contractedServices");
    if (contracted) {
      setContractedServices(JSON.parse(contracted));
    }
    
    const storedXp = localStorage.getItem("userXp");
    if (storedXp) {
      setXp(parseInt(storedXp));
    }
  }, []);

  useEffect(() => {
    if (showWelcome && targetCredits > 0) {
      const duration = 2000;
      const steps = 60;
      const increment = targetCredits / steps;
      const intervalTime = duration / steps;
      
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetCredits) {
          setCredits(targetCredits);
          clearInterval(timer);
        } else {
          setCredits(Math.floor(current));
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [showWelcome, targetCredits]);

  const handleStart = () => {
    localStorage.setItem("hasSeenWelcome", "true");
    setShowWelcome(false);
    setCredits(targetCredits);
  };

  const firstName = user?.nome?.split(' ')[0] || 'User';

  const services = [
    {
      icon: <SiInstagram className="w-6 h-6" />,
      name: "Instagram",
      description: "See liked photos, forwarded posts and direct conversations",
      credits: 0,
      color: "#E1306C",
      isFree: true,
      isUpdating: false
    },
    {
      icon: <SiWhatsapp className="w-6 h-6" />,
      name: "WhatsApp",
      description: "Access full conversations, audio, videos and groups",
      credits: 40,
      color: "#25D366",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <SiFacebook className="w-6 h-6" />,
      name: "Facebook",
      description: "See all interactions and get full Messenger access",
      credits: 45,
      color: "#1877F2",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
      name: "Location",
      description: "Track in real time and see suspicious locations visited",
      credits: 60,
      color: "#EF4444",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      name: "SMS",
      description: "All sent and received text messages",
      credits: 30,
      color: "#3B82F6",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <Phone className="w-6 h-6" />,
      name: "Calls",
      description: "Complete call log with duration and times",
      credits: 25,
      color: "#22C55E",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <Camera className="w-6 h-6" />,
      name: "Camera",
      description: "Access photos and videos from gallery, including deleted files",
      credits: 55,
      color: "#F59E0B",
      isFree: false,
      isUpdating: true
    },
    {
      icon: <Globe className="w-6 h-6" />,
      name: "Other Networks",
      description: "Full search across all social networks (including adult sites)",
      credits: 70,
      color: "#A855F7",
      isFree: false,
      isUpdating: true
    }
  ];

  if (showWelcome) {
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
          <button className="text-white p-2" data-testid="button-menu">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="pt-20 px-4 pb-8 relative z-10">
          <div className="max-w-md mx-auto">
            <div 
              className="p-8 rounded-2xl text-center"
              style={{ 
                backgroundColor: '#121218',
                border: '1px solid rgba(138, 43, 226, 0.2)',
                boxShadow: '0 0 40px rgba(138, 43, 226, 0.1)'
              }}
            >
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(138, 43, 226, 0.05))',
                  border: '2px solid rgba(138, 43, 226, 0.4)'
                }}
              >
                <SiInstagram className="w-10 h-10 text-purple-400" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-6">
                Welcome to{" "}
                <span style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>LoveSearch.ai!</span>
                {" "}🎉
              </h1>

              <div 
                className="p-6 rounded-xl mb-6"
                style={{ 
                  backgroundColor: '#1a1a24',
                  border: '1px solid rgba(138, 43, 226, 0.15)'
                }}
              >
                <p className="text-gray-300 text-base mb-3">
                  Your journey has started<br />
                  with a balance of
                </p>
                <p 
                  className="text-5xl font-bold mb-1"
                  style={{ 
                    background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  data-testid="text-credits"
                >
                  {credits} credits
                </p>
              </div>

              <p className="text-gray-400 text-sm mb-6">
                You can now start exploring all<br />
                the platform features!
              </p>

              <Button
                onClick={handleStart}
                className="w-full h-14 text-white font-bold text-lg rounded-xl border-0"
                style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #9c27b0)',
                }}
                data-testid="button-iniciar"
              >
                Start
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
          data-testid="button-menu"
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
                onClick={() => { setMenuOpen(false); setLocation("/investigar-instagram"); }}
                className="w-full text-left px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                New Search
              </button>
              <button 
                onClick={() => { setMenuOpen(false); setLocation("/comprar-creditos"); }}
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
                  setLocation("/loginpainel");
                }}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Logout
              </button>
            </nav>
          </div>
        </>
      )}

      <main className="pt-16 px-4 pb-24 relative z-10">
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

          <p className="text-purple-400 text-sm mb-1">✨ Welcome!</p>
          <h1 className="text-2xl font-bold text-white mb-1">
            Hello, {firstName.toUpperCase()}! 👋
          </h1>
          <p className="text-gray-400 text-sm mb-4">
            Choose a service and start your investigation
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Credits
                </span>
                <button 
                  onClick={() => setLocation("/comprar-creditos")}
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
              <p className="text-lg font-bold text-white mb-1">{xp}/100</p>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${xp}%`,
                    background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)'
                  }}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => setLocation("/comprar-creditos")}
            className="w-full h-10 text-white font-semibold text-sm rounded-xl border-0"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
            }}
            data-testid="button-comprar-creditos"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buy more credits
          </Button>
        </div>

        {contractedServices.length > 0 && (
          <section className="mb-6">
            <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Contracted Services
            </h2>
            {contractedServices.map((service, index) => {
              const serviceName = service.split(" - ")[0] || "Instagram";
              const serviceUsername = service.split("@")[1] || "usuario";
              return (
                <div 
                  key={index}
                  className="p-4 rounded-xl mb-2 flex items-center justify-between"
                  style={{ 
                    backgroundColor: '#0f0f14',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-white font-semibold text-sm">{serviceName}</p>
                      <p className="text-gray-500 text-xs">@{serviceUsername}</p>
                    </div>
                  </div>
                  <span 
                    className="px-3 py-1 rounded text-xs font-semibold flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                  >
                    <Check className="w-3 h-3" /> Completed
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Available Services
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              <ServiceCard 
                key={service.name} 
                {...service} 
                onClick={service.name === "Instagram" ? () => setLocation("/investigar-instagram") : undefined}
              />
            ))}
          </div>
        </section>

        <footer 
          className="mt-12 pt-8 text-center"
          style={{ borderTop: '1px solid rgba(138, 43, 226, 0.1)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(138, 43, 226, 0.1))',
                border: '1px solid rgba(138, 43, 226, 0.4)'
              }}
            >
              <SiInstagram className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-white font-bold text-sm">LOVESEARCH.AI</span>
          </div>
          
          <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto">
            The largest spy software in Latin America. Discover the truth about anyone.
          </p>

          <div className="flex items-center justify-center gap-2 mb-3">
            <FaCreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs">SSL Certificate - 100% Secure Site</span>
          </div>

          <p className="text-gray-600 text-xs mb-3">Secure payments with technology</p>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <FaCcVisa className="w-8 h-8 text-gray-400" />
            <FaCcMastercard className="w-8 h-8 text-gray-400" />
            <SiGooglepay className="w-8 h-8 text-gray-400" />
            <SiApplepay className="w-8 h-8 text-gray-400" />
          </div>

          <div 
            className="pt-6 grid grid-cols-2 gap-8 text-left"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Services</h4>
              <ul className="space-y-2 text-gray-500 text-xs">
                <li>• Instagram Spy</li>
                <li>• WhatsApp Spy</li>
                <li>• Facebook Spy</li>
                <li>• GPS Location</li>
                <li>• Remote Camera</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Information</h4>
              <ul className="space-y-2 text-gray-500 text-xs">
                <li>• Help Center</li>
                <li>• Terms of Use</li>
                <li>• Privacy Policy and Cookies</li>
                <li>• GDPR</li>
              </ul>
            </div>
          </div>

          <p className="text-gray-600 text-xs mt-8">
            © 2025 LoveSearch.ai. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
