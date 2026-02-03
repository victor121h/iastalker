'use client';

import { useRouter } from 'next/navigation';
import { Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreditosInsuficientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditosNecessarios: number;
  acao: string;
}

export function CreditosInsuficientesModal({ 
  isOpen, 
  onClose, 
  creditosNecessarios, 
  acao 
}: CreditosInsuficientesModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <Zap className="w-8 h-8 text-red-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            Insufficient Credits
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            You need <span className="text-purple-400 font-semibold">{creditosNecessarios} credits</span> to {acao}.
          </p>
          
          <Button
            onClick={() => router.push('/comprar-creditos')}
            className="w-full h-12 text-white font-bold rounded-xl border-0"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #9c27b0)'
            }}
          >
            <Zap className="w-5 h-5 mr-2" />
            Buy Credits
          </Button>
        </div>
      </div>
    </div>
  );
}
