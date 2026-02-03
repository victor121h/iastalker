'use client';

import { User, Mail, Lock, Eye, EyeOff, Sparkles, PartyPopper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function MatrixBackground() {
  const [chars, setChars] = useState<{ id: number; char: string; left: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    const characters = "AEKITSL.";
    const newChars = [];
    for (let i = 0; i < 120; i++) {
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
      <style jsx>{`
        @keyframes matrix-fall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .matrix-char {
          animation: matrix-fall linear infinite;
        }
      `}</style>
      {chars.map((item) => (
        <span
          key={item.id}
          className="matrix-char absolute font-mono font-bold"
          style={{
            left: `${item.left}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            color: 'rgba(138, 43, 226, 0.15)',
            textShadow: '0 0 8px rgba(138, 43, 226, 0.3)',
            fontSize: `${item.size}rem`,
          }}
        >
          {item.char}
        </span>
      ))}
    </div>
  );
}

interface ExistingUserModalProps {
  onClose: () => void;
  onGoToLogin: () => void;
}

function ExistingUserModal({ onClose, onGoToLogin }: ExistingUserModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative z-10 w-full max-w-sm p-6 rounded-2xl"
        style={{ 
          backgroundColor: '#1a1a22',
          border: '1px solid rgba(138, 43, 226, 0.3)',
          boxShadow: '0 0 60px rgba(138, 43, 226, 0.2)'
        }}
      >
        <div className="text-left">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xl font-bold text-white">
              You're already a LoveSearch.ai user!
            </h3>
            <PartyPopper className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-gray-400 text-sm mb-6">
            This email is already registered. Let's redirect you to the login page.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={onGoToLogin}
              className="px-6 h-11 text-white font-semibold rounded-full border-0"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #9c27b0)',
              }}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CadastroPainel() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExistingUserModal, setShowExistingUserModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    confirmarEmail: "",
    senha: "",
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const token = localStorage.getItem("painelToken");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = "Name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    
    if (formData.email !== formData.confirmarEmail) {
      newErrors.confirmarEmail = "Emails do not match";
    }
    
    if (!formData.senha) {
      newErrors.senha = "Password is required";
    } else if (formData.senha.length < 6) {
      newErrors.senha = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/painel/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        sessionStorage.setItem("registrationSuccess", "true");
        router.push("/loginpainel");
      } else if (data.existingUser) {
        setShowExistingUserModal(true);
      } else {
        setErrors({ submit: data.message || "Error creating account" });
      }
    } catch (error) {
      setErrors({ submit: "Connection error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: '#0a0a0f' }}>
      <MatrixBackground />
      
      {showExistingUserModal && (
        <ExistingUserModal 
          onClose={() => setShowExistingUserModal(false)}
          onGoToLogin={() => router.push("/loginpainel")}
        />
      )}
      
      <div 
        className="w-full max-w-md p-8 rounded-2xl relative z-10"
        style={{ 
          backgroundColor: '#121218',
          border: '1px solid rgba(138, 43, 226, 0.2)',
          boxShadow: '0 0 40px rgba(138, 43, 226, 0.1)'
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Create your <span style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Account</span>
          </h1>
          <p className="text-gray-400 mt-2 text-base">
            Fill in your details to get started
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Your full name"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="pl-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                style={{ backgroundColor: '#1e1e28' }}
              />
            </div>
            {errors.nome && <p className="text-sm text-red-400">{errors.nome}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="pl-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                style={{ backgroundColor: '#1e1e28' }}
              />
            </div>
            {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Confirm Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="confirmyour@email.com"
                value={formData.confirmarEmail}
                onChange={(e) => setFormData({...formData, confirmarEmail: e.target.value})}
                className="pl-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                style={{ backgroundColor: '#1e1e28' }}
              />
            </div>
            {errors.confirmarEmail && <p className="text-sm text-red-400">{errors.confirmarEmail}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={formData.senha}
                onChange={(e) => setFormData({...formData, senha: e.target.value})}
                className="pl-12 pr-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                style={{ backgroundColor: '#1e1e28' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.senha && <p className="text-sm text-red-400">{errors.senha}</p>}
          </div>
          
          {errors.submit && (
            <p className="text-sm text-red-400 text-center">{errors.submit}</p>
          )}
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 text-white font-bold text-lg rounded-xl border-0 mt-2"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
        </form>
        
        <p className="text-center text-gray-400 mt-6 text-base">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/loginpainel")}
            className="font-semibold hover:underline"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
