import { Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";

interface PasswordStep {
  text: string;
  status: "completed" | "loading" | "pending";
}

export default function ProcessoSenha() {
  const [, setLocation] = useLocation();
  const params = useParams<{ username: string }>();
  const username = params.username || "user";
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const [steps, setSteps] = useState<PasswordStep[]>([
    { text: "Analyzing password...", status: "loading" },
    { text: "Testing new passwords...", status: "pending" },
    { text: "Decrypting...", status: "pending" },
    { text: "Validating...", status: "pending" },
    { text: "Accessing...", status: "pending" },
  ]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (progress >= 20 && currentStep === 0) {
      setCurrentStep(1);
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[0] = { ...newSteps[0], status: "completed" };
        newSteps[1] = { ...newSteps[1], status: "loading" };
        return newSteps;
      });
    } else if (progress >= 40 && currentStep === 1) {
      setCurrentStep(2);
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[1] = { ...newSteps[1], status: "completed" };
        newSteps[2] = { ...newSteps[2], status: "loading" };
        return newSteps;
      });
    } else if (progress >= 60 && currentStep === 2) {
      setCurrentStep(3);
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[2] = { ...newSteps[2], status: "completed" };
        newSteps[3] = { ...newSteps[3], status: "loading" };
        return newSteps;
      });
    } else if (progress >= 80 && currentStep === 3) {
      setCurrentStep(4);
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[3] = { ...newSteps[3], status: "completed" };
        newSteps[4] = { ...newSteps[4], status: "loading" };
        return newSteps;
      });
    } else if (progress >= 100 && currentStep === 4) {
      setCurrentStep(5);
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[4] = { ...newSteps[4], status: "completed" };
        return newSteps;
      });
      setShowSuccess(true);
      
      // Add to contracted services
      const contracted = localStorage.getItem("contractedServices");
      const services = contracted ? JSON.parse(contracted) : [];
      if (!services.includes(`Instagram - @${username}`)) {
        services.push(`Instagram - @${username}`);
        localStorage.setItem("contractedServices", JSON.stringify(services));
      }
      
      // Navigate to 2FA error page after a delay
      setTimeout(() => {
        setLocation(`/erro-2fa/${username}`);
      }, 3000);
    }
  }, [progress, currentStep, username, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-md w-full mx-4">
        <div 
          className="p-8 rounded-2xl text-center"
          style={{ 
            backgroundColor: '#121218',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.1)'
          }}
        >
          {!showSuccess ? (
            <>
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid rgba(16, 185, 129, 0.4)'
                }}
              >
                <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              </div>

              <h2 className="text-gray-400 text-sm tracking-widest mb-4">
                PROCESS IN PROGRESS
              </h2>

              <div className="space-y-2 mb-6">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center justify-center gap-2">
                    {step.status === "completed" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : step.status === "loading" ? (
                      <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                    <span className={`text-sm ${
                      step.status === "completed" 
                        ? "text-green-400" 
                        : step.status === "loading"
                          ? "text-white"
                          : "text-gray-600"
                    }`}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '2px solid rgba(16, 185, 129, 0.6)'
                }}
              >
                <Check className="w-10 h-10 text-green-500" />
              </div>

              <h2 className="text-gray-400 text-sm tracking-widest mb-2">
                PROCESS IN PROGRESS
              </h2>

              <p className="text-green-400 font-bold text-lg mb-1">
                Password Found!
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Access obtained successfully
              </p>
            </>
          )}

          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
