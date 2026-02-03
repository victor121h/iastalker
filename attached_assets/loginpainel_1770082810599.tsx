import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

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

export default function LoginPainel() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    
    if (!formData.senha) {
      newErrors.senha = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/painel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          senha: formData.senha,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("painelToken", data.token);
        localStorage.setItem("painelUser", JSON.stringify(data.user));
        setLocation("/dashboard");
      } else {
        setErrors({ submit: data.message || "Incorrect email or password" });
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
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ 
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(138, 43, 226, 0.1))',
              border: '1px solid rgba(138, 43, 226, 0.4)'
            }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="url(#gradient)" strokeWidth="2">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#833ab4" />
                  <stop offset="50%" stopColor="#fd1d1d" />
                  <stop offset="100%" stopColor="#fcb045" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">LOVESEARCH.AI</h2>
        </div>
        
        <div 
          className="p-8 rounded-2xl"
          style={{ 
            backgroundColor: '#121218',
            border: '1px solid rgba(138, 43, 226, 0.2)',
            boxShadow: '0 0 40px rgba(138, 43, 226, 0.1)'
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              Sign in to <span style={{ 
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>LoveSearch.ai</span>
            </h1>
            <p className="text-gray-400 mt-2">
              Sign in with your account to continue
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  data-testid="input-email"
                />
              </div>
              {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  className="pl-12 pr-12 h-14 text-base rounded-xl border-0 text-white placeholder:text-gray-500"
                  style={{ backgroundColor: '#1e1e28' }}
                  data-testid="input-senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  data-testid="button-toggle-password"
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
              className="w-full h-14 text-white font-bold text-lg rounded-xl border-0"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #9c27b0)',
              }}
              data-testid="button-entrar"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <p className="text-center text-gray-400 mt-6">
            Don't have an account?{" "}
            <button
              onClick={() => setLocation("/cadastropainel")}
              className="font-semibold hover:underline"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              data-testid="link-criar-conta"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
