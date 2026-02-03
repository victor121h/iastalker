'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { SiInstagram } from "react-icons/si";

export default function AnaliseInstagram() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Connecting to servers...",
    "Locating profile...",
    "Analyzing security...",
    "Testing passwords...",
    "Accessing data...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.push(`/processo-senha/${username}`);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [username, router]);

  useEffect(() => {
    const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1);
    setCurrentStep(stepIndex);
  }, [progress, steps.length]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-md w-full mx-4">
        <div 
          className="p-8 rounded-2xl text-center"
          style={{ 
            backgroundColor: '#121218',
            border: '1px solid rgba(138, 43, 226, 0.3)',
            boxShadow: '0 0 40px rgba(138, 43, 226, 0.1)'
          }}
        >
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
            }}
          >
            <SiInstagram className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-white font-bold text-xl mb-2">Analyzing @{username}</h2>
          <p className="text-gray-400 text-sm mb-6">Please wait while we analyze the profile</p>

          <div className="space-y-2 mb-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center justify-center gap-2">
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : index === currentStep ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <span className={`text-sm ${
                  index < currentStep 
                    ? "text-green-400" 
                    : index === currentStep
                      ? "text-white"
                      : "text-gray-600"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)'
              }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-2">{progress}% completed</p>
        </div>
      </div>
    </div>
  );
}
