'use client';

import { ArrowLeft, Zap, Check, X, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { SiInstagram } from "react-icons/si";
import { CreditosInsuficientesModal } from "@/components/creditos-insuficientes-modal";

export default function ValidarEmail() {
  const router = useRouter();
  const params = useParams();
  const username = (params.username as string) || "usuario";
  const [userCredits, setUserCredits] = useState(40);
  const [userEmail, setUserEmail] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [progress, setProgress] = useState(1);
  const [showNotification, setShowNotification] = useState(false);
  const [showCreditosModal, setShowCreditosModal] = useState(false);
  const [creditosNecessarios, setCreditosNecessarios] = useState(0);
  const [acaoCreditos, setAcaoCreditos] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserCredits(parsed.credits || 40);
      setUserEmail(parsed.email || "usuario@gmail.com");
    }
  }, []);

  useEffect(() => {
    if (isUnlocking && progress < 100) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 5) {
            clearInterval(interval);
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isUnlocking, progress]);

  const maskEmail = (email: string) => {
    if (!email) return "***@gmail.com";
    const [name, domain] = email.split("@");
    if (name.length <= 3) {
      return name[0] + "*****@" + domain;
    }
    return name.slice(0, 3) + "*****@" + domain;
  };

  const maskedEmail = maskEmail(userEmail);

  const handleDesbloquear = () => {
    if (userCredits < 70) {
      setCreditosNecessarios(70);
      setAcaoCreditos("unlock the email");
      setShowCreditosModal(true);
      return;
    }

    const newCredits = userCredits - 70;
    setUserCredits(newCredits);

    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.credits = newCredits;
      localStorage.setItem("painelUser", JSON.stringify(parsed));
    }

    const currentXp = parseInt(localStorage.getItem("userXp") || "0");
    localStorage.setItem("userXp", String(currentXp + 30));

    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
    setIsUnlocking(true);
  };

  const handleAcelerar = () => {
    if (userCredits < 30) {
      setCreditosNecessarios(30);
      setAcaoCreditos("accelerate the unlock");
      setShowCreditosModal(true);
      return;
    }

    const newCredits = userCredits - 30;
    setUserCredits(newCredits);

    const storedUser = localStorage.getItem("painelUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.credits = newCredits;
      localStorage.setItem("painelUser", JSON.stringify(parsed));
    }

    router.push(`/processando-relatorio/${username}`);
  };

  const handleApagarInvestigacao = () => {
    const contracted = localStorage.getItem("contractedServices");
    if (contracted) {
      const services = JSON.parse(contracted);
      const updated = services.filter((s: string) => !s.includes(username));
      localStorage.setItem("contractedServices", JSON.stringify(updated));
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <CreditosInsuficientesModal
        isOpen={showCreditosModal}
        onClose={() => setShowCreditosModal(false)}
        creditosNecessarios={creditosNecessarios}
        acao={acaoCreditos}
      />

      {showNotification && (
        <div 
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg flex items-center gap-2"
          style={{ 
            backgroundColor: '#1a1a24',
            border: '1px solid rgba(138, 43, 226, 0.3)'
          }}
        >
          <div className="w-6 h-6 bg-green-500/20 rounded flex items-center justify-center">
            <span className="text-green-400 text-sm">💵</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Credits spent</p>
            <p className="text-gray-400 text-xs">-70 credits | +30 XP</p>
          </div>
        </div>
      )}

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
          {userCredits}
        </button>
      </header>

      <main className="pt-20 px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <div 
            className="p-5 rounded-2xl mb-4"
            style={{ 
              backgroundColor: '#121218',
              border: '1px solid rgba(138, 43, 226, 0.2)'
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
                }}
              >
                <SiInstagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white mb-2">
                  Process not completed, requires 2-factor authentication!
                </h1>
                <div className="space-y-1 text-sm">
                  <p className="text-green-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Instagram password discovered successfully
                  </p>
                  <p className="text-red-400 flex items-center gap-1">
                    <X className="w-4 h-4" /> Need email to login
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-2">
              Instagram is requesting a verification code that was sent to the email{" "}
              <span className="text-purple-400 font-semibold">{maskedEmail}</span>
            </p>
            <p className="text-purple-400 text-sm mb-4">
              You need to unlock this email to get the code
            </p>

            {!isUnlocking ? (
              <>
                <div 
                  className="p-4 rounded-xl mb-4"
                  style={{ 
                    backgroundColor: 'rgba(138, 43, 226, 0.1)',
                    border: '1px solid rgba(138, 43, 226, 0.2)'
                  }}
                >
                  <p className="text-gray-300 text-sm">
                    We will access the email <span className="text-purple-400 font-semibold">{maskedEmail}</span> to get the verification code Instagram sent and login with the password.
                  </p>
                  <p className="text-orange-400 text-sm mt-2">
                    Estimated time: up to 36 hours
                  </p>
                </div>

                <Button
                  onClick={handleDesbloquear}
                  className="w-full h-14 text-white font-bold text-base rounded-xl border-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
                  }}
                >
                  Unlock Email for 70 credits
                </Button>
              </>
            ) : (
              <>
                <div 
                  className="p-4 rounded-xl mb-4"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(138, 43, 226, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-white font-semibold text-sm">Unlocking Email</span>
                  </div>
                  
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #833ab4, #9c27b0)'
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{progress}% completed</span>
                    <span className="text-gray-400">36h remaining</span>
                  </div>
                </div>

                <Button
                  onClick={handleAcelerar}
                  className="w-full h-14 text-white font-bold text-base rounded-xl border-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
                  }}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Accelerate for 30 credits
                </Button>
              </>
            )}
          </div>

          <div 
            className="p-5 rounded-2xl mb-4"
            style={{ 
              backgroundColor: '#121218',
              border: '1px solid rgba(138, 43, 226, 0.2)'
            }}
          >
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <div className="w-5 h-5 bg-purple-500/20 rounded flex items-center justify-center">
                <span className="text-purple-400 text-xs">i</span>
              </div>
              Basic Information
            </h2>

            <div className="space-y-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <p className="text-gray-500 text-xs mb-1">Username</p>
                <p className="text-white font-semibold">@{username}</p>
              </div>

              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <p className="text-gray-500 text-xs mb-1">Account Status</p>
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Active
                </p>
              </div>

              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <p className="text-gray-500 text-xs mb-1">Privacy Level</p>
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                >
                  High • Encryption Enabled
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleApagarInvestigacao}
            variant="ghost"
            className="w-full h-14 font-bold text-base rounded-xl"
            style={{ color: '#ef4444' }}
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Investigation
          </Button>
        </div>
      </main>
    </div>
  );
}
