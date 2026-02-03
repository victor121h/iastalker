import { Clock, CheckCircle, Shield, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { SiInstagram } from "react-icons/si";

export default function ProcessandoRelatorio() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState(3600);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation(`/relatorio-instagram/${username}`);
          return 0;
        }
        return prev - 1;
      });

      setProgress(prev => {
        const newProgress = ((3600 - timeLeft) / 3600) * 100;
        return Math.min(newProgress, 99);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, username, setLocation]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSkipDemo = () => {
    setLocation(`/relatorio-instagram/${username}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 h-14"
        style={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(138, 43, 226, 0.15)' }}
      >
        <div className="flex items-center gap-2">
          <SiInstagram className="w-5 h-5" style={{ color: '#E1306C' }} />
          <span className="text-white font-semibold tracking-wide">INSTAGRAM</span>
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{ 
            backgroundColor: 'rgba(20, 20, 30, 0.9)',
            border: '1px solid rgba(138, 43, 226, 0.2)'
          }}
        >
          <div className="flex items-start gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
              }}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Email Confirmed!</h2>
              <p className="text-gray-400 text-sm">Finalizing complete analysis</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Instagram password discovered</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Email unlocked successfully</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">2FA authentication bypassed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-purple-400">Generating spy report...</span>
            </div>
          </div>

          <p className="text-gray-300 text-sm text-center mb-6">
            We are finalizing all analysis and profile spying. 
            Soon you will receive the complete report with all information.
          </p>
        </div>

        <div 
          className="rounded-xl p-5 mb-6 text-center border-2 border-red-500"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
          }}
        >
          <p className="text-red-500 text-lg font-black mb-2 uppercase tracking-wide">
            ⚠️ ATTENTION - READ CAREFULLY ⚠️
          </p>
          <p className="text-yellow-400 text-sm font-bold leading-relaxed">
            WARNING: Do not leave this page or you will lose all data and your credits. We do not send reports by email or phone to ensure confidential data security. At the end, you will be able to download the file. The responsibility is entirely yours.
          </p>
        </div>

        <div 
          className="rounded-2xl p-6 text-center"
          style={{ 
            backgroundColor: 'rgba(20, 20, 30, 0.9)',
            border: '1px solid rgba(138, 43, 226, 0.2)'
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Estimated Time</span>
          </div>

          <div 
            className="text-5xl font-bold mb-4"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="mb-4">
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)'
                }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-2">{progress.toFixed(0)}% completed</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <Shield className="w-4 h-4" />
            <span>Secure and encrypted processing</span>
          </div>
        </div>

      </main>
    </div>
  );
}
