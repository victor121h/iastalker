import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function Erro2FA() {
  const [, setLocation] = useLocation();
  const params = useParams<{ username: string }>();
  const username = params.username || "user";
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleValidarEmail = () => {
    setLocation(`/validar-email/${username}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-md w-full mx-4">
        <div 
          className="p-8 rounded-2xl text-center"
          style={{ 
            backgroundColor: '#121218',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 40px rgba(239, 68, 68, 0.1)'
          }}
        >
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.4)'
            }}
          >
            <X className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-gray-400 text-sm tracking-widest mb-4">
            ERROR DETECTED
          </h2>

          <p className="text-red-500 font-bold text-lg mb-1">
            Error: 2-Factor Authentication
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Email verification required
          </p>

          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #ef4444, #dc2626)'
              }}
            />
          </div>

          <Button
            onClick={handleValidarEmail}
            className="w-full h-14 text-white font-bold text-base rounded-xl border-0"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
            }}
            data-testid="button-validar-email"
          >
            Validate email now
          </Button>
        </div>
      </div>
    </div>
  );
}
