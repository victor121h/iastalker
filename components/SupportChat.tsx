'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Message {
  id: number;
  sender: 'agent' | 'user';
  text: string;
  isStatus?: boolean;
  statusColor?: string;
}

interface ButtonOption {
  label: string;
  action: string;
  data?: string;
}

interface Interaction {
  interaction_type: string;
  tool_name: string | null;
  created_at: string;
}

const TOOLS = ['Instagram', 'WhatsApp', 'Private Investigator', 'Location', 'SMS', 'Calls', 'Camera'];

export default function SupportChat() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [buttons, setButtons] = useState<ButtonOption[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingBar, setLoadingBar] = useState<{ progress: number; steps: string[]; currentStep: number; visible: boolean }>({
    progress: 0,
    steps: [],
    currentStep: 0,
    visible: false,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    setUserEmail(localStorage.getItem('user_email') || localStorage.getItem('userEmail'));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, loadingBar.visible]);

  useEffect(() => {
    if (isOpen && userEmail) {
      fetch(`/api/support?email=${encodeURIComponent(userEmail)}`)
        .then(r => r.json())
        .then(data => {
          if (data.interactions) setInteractions(data.interactions);
        })
        .catch(() => {});
    }
  }, [isOpen, userEmail]);

  const recordInteraction = async (type: string, tool?: string) => {
    if (!userEmail) return;
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, interactionType: type, toolName: tool }),
      });
      const res = await fetch(`/api/support?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.interactions) setInteractions(data.interactions);
    } catch {}
  };

  const addAgentMessage = (text: string, delay = 1500, statusOpts?: { isStatus: boolean; statusColor: string }): Promise<void> => {
    return new Promise(resolve => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          sender: 'agent',
          text,
          ...statusOpts,
        }]);
        resolve();
      }, delay);
    });
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender: 'user', text }]);
  };

  const showButtons = (opts: ButtonOption[]) => {
    setButtons(opts);
  };

  const clearButtons = () => {
    setButtons([]);
  };

  const getDaysRemaining = (interactionType: string, toolName?: string) => {
    const matching = interactions.filter(i => {
      if (i.interaction_type !== interactionType) return false;
      if (toolName && i.tool_name !== toolName) return false;
      return true;
    });
    if (matching.length === 0) return null;
    const latest = new Date(matching[0].created_at);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, 8 - daysPassed);
    return remaining;
  };

  const runLoadingBar = (steps: string[], durationMs = 8000): Promise<void> => {
    return new Promise(resolve => {
      setLoadingBar({ progress: 0, steps, currentStep: 0, visible: true });
      const stepDuration = durationMs / steps.length;
      let currentStep = 0;
      let progress = 0;

      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);

      loadingIntervalRef.current = setInterval(() => {
        progress += 2;
        const newStep = Math.min(Math.floor(progress / (100 / steps.length)), steps.length - 1);
        if (newStep !== currentStep) {
          currentStep = newStep;
        }
        setLoadingBar({ progress: Math.min(progress, 100), steps, currentStep, visible: true });
        if (progress >= 100) {
          if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
          setTimeout(() => {
            setLoadingBar(prev => ({ ...prev, visible: false }));
            resolve();
          }, 500);
        }
      }, durationMs / 50);
    });
  };

  const startChat = async () => {
    setMessages([]);
    clearButtons();
    await addAgentMessage("Hello, AI Tracker Digital Support, how can I help you?");
    showMainOptions();
  };

  const showMainOptions = () => {
    showButtons([
      { label: 'I want to buy more credits', action: 'buy_credits' },
      { label: 'The tool is not working', action: 'tool_not_working' },
      { label: 'Request a refund', action: 'refund' },
    ]);
  };

  const handleBuyCredits = async () => {
    clearButtons();
    addUserMessage('I want to buy more credits');
    await addAgentMessage("Great, click the button below and recharge your credits.");
    showButtons([{ label: 'Buy Credits', action: 'go_buy' }]);
  };

  const handleToolNotWorking = async () => {
    clearButtons();
    addUserMessage('The tool is not working');
    await addAgentMessage("I understand, that's unfortunate, but I'll help you. Which tool is not working?");
    showButtons(TOOLS.map(t => ({ label: t, action: 'check_tool', data: t })));
  };

  const handleCheckTool = async (toolName: string) => {
    clearButtons();
    addUserMessage(toolName);

    if (toolName === 'Instagram') {
      const days = getDaysRemaining('tool_maintenance', 'Instagram');
      if (days !== null && days > 0) {
        await addAgentMessage(`We are already aware of this issue. Don't worry, within ${days} days our tools will be working again.`);
        await askAnythingElse();
        return;
      }
      if (days !== null && days <= 0) {
        await addAgentMessage("Great news! The tools are now working again. Please try using the tool.");
        await askAnythingElse();
        return;
      }
      await addAgentMessage("We are aware of this issue and maintenance is already underway. It will be back up and running soon.");
      await addAgentMessage("In the meantime, we recommend you try our Camera Spy tool.");
      await recordInteraction('tool_maintenance', 'Instagram');
      showButtons([{ label: 'Open Camera Spy', action: 'go_camera' }]);
      return;
    }

    if (toolName === 'Location') {
      await addAgentMessage("I'll check it for you right now, one moment...", 1000);
      await runLoadingBar(['Checking tool...', 'Checking GPS API...', 'Checking Connection...'], 6000);
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        sender: 'agent',
        text: 'No errors found',
        isStatus: true,
        statusColor: 'green',
      }]);
      await addAgentMessage("We found no errors in our Location tool. If possible, record a video explaining the issue and send it to customer@aitracker.com.");
      await askAnythingElse();
      return;
    }

    const existingDays = getDaysRemaining('tool_maintenance', toolName);
    if (existingDays !== null && existingDays > 0) {
      await addAgentMessage(`We are already aware of this issue. Don't worry, within ${existingDays} days our tools will be working again.`);
      await askAnythingElse();
      return;
    }
    if (existingDays !== null && existingDays <= 0) {
      await addAgentMessage("Great news! The tools are now working again. Please try using the tool.");
      await askAnythingElse();
      return;
    }

    await addAgentMessage("I'll check it for you right now, one moment...", 1000);
    await runLoadingBar([
      'Checking tool...',
      'Checking Webhook...',
      'Checking API...',
      'Checking user credits...',
      'Checking Connection...',
    ], 30000);

    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender: 'agent',
      text: 'Problem found!',
      isStatus: true,
      statusColor: 'red',
    }]);

    await addAgentMessage(`We found a critical error in our ${toolName} tool. Our team has already been notified and is working to fix it as soon as possible.`);
    await addAgentMessage("The estimated resolution time is up to 8 days.");
    await addAgentMessage("Unfortunately it's a critical problem, but don't worry. As soon as the tools are back, we will provide you with 10,000 CREDITS completely free of charge.");

    await recordInteraction('tool_maintenance', toolName);

    await askAnythingElse();
  };

  const handleRefund = async () => {
    clearButtons();
    addUserMessage('Request a refund');

    const refundDays = getDaysRemaining('refund');
    if (refundDays !== null && refundDays > 0) {
      await addAgentMessage(`You have already requested your refund and it is already being processed. Your amount will be refunded within ${refundDays} days.`);
      await askAnythingElse();
      return;
    }
    if (refundDays !== null && refundDays <= 0) {
      await addAgentMessage("Your refund has already been processed and the amount has been returned.");
      await askAnythingElse();
      return;
    }

    await addAgentMessage("I understand, can you tell us the reason for the refund?");
    showButtons([
      { label: 'The tools are not working', action: 'refund_tools_broken' },
      { label: "I'm unsatisfied with the product", action: 'refund_unsatisfied' },
    ]);
  };

  const handleRefundToolsBroken = async () => {
    clearButtons();
    addUserMessage('The tools are not working');
    await handleToolNotWorking2();
  };

  const handleToolNotWorking2 = async () => {
    await addAgentMessage("I understand, that's unfortunate, but I'll help you. Which tool is not working?");
    showButtons(TOOLS.map(t => ({ label: t, action: 'check_tool', data: t })));
  };

  const handleRefundUnsatisfied = async () => {
    clearButtons();
    addUserMessage("I'm unsatisfied with the product");
    await addAgentMessage("I understand, no problem. I will process your refund for you. This may take some time.");

    await runLoadingBar([
      'Accessing user registration...',
      'Communicating with acquirer...',
      'Requesting platform refund...',
    ], 60000);

    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender: 'agent',
      text: 'Success',
      isStatus: true,
      statusColor: 'green',
    }]);

    await recordInteraction('refund');

    await addAgentMessage("We have successfully completed your refund request.");
    await addAgentMessage("Your amount will be fully refunded to the same payment method chosen within a maximum of 8 days.");
    await addAgentMessage("Our servers are very busy, so we ask for a little patience. Within 8 days, your amount will be refunded.");

    await askAnythingElse();
  };

  const askAnythingElse = async () => {
    await addAgentMessage("Is there anything else I can help you with?");
    showButtons([
      { label: 'Yes', action: 'restart' },
      { label: 'No, thank you', action: 'close_chat' },
    ]);
  };

  const handleRestart = async () => {
    clearButtons();
    addUserMessage('Yes');
    await addAgentMessage("Alright, choose one of the options.");
    showMainOptions();
  };

  const handleButtonClick = async (option: ButtonOption) => {
    clearButtons();
    switch (option.action) {
      case 'buy_credits':
        await handleBuyCredits();
        break;
      case 'go_buy':
        router.push('/buy');
        break;
      case 'tool_not_working':
        await handleToolNotWorking();
        break;
      case 'check_tool':
        await handleCheckTool(option.data!);
        break;
      case 'refund':
        await handleRefund();
        break;
      case 'refund_tools_broken':
        await handleRefundToolsBroken();
        break;
      case 'refund_unsatisfied':
        await handleRefundUnsatisfied();
        break;
      case 'restart':
        await handleRestart();
        break;
      case 'close_chat':
        addUserMessage('No, thank you');
        setTimeout(() => setIsOpen(false), 1000);
        break;
      case 'go_camera':
        router.push('/camera');
        break;
    }
  };

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      startChat();
    }
  };

  if (!mounted) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 z-[9999] hover:scale-110 active:scale-95 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-100px)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col z-[9999] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-900/80 to-indigo-900/80 p-4 flex items-center gap-3 border-b border-gray-700">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center">
                  <Image src="/support-agent.png" alt="Support" width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">AI Tracker Support</p>
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'agent' && !msg.isStatus && (
                    <div className="w-7 h-7 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image src="/support-agent.png" alt="" width={28} height={28} className="object-cover" unoptimized />
                    </div>
                  )}
                  {msg.isStatus ? (
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                      msg.statusColor === 'green' ? 'bg-green-500/20 text-green-400' :
                      msg.statusColor === 'red' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {msg.statusColor === 'green' ? '✓ ' : '⚠ '}{msg.text}
                    </div>
                  ) : (
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender === 'user'
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-200 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-white overflow-hidden flex-shrink-0">
                    <Image src="/support-agent.png" alt="" width={28} height={28} className="object-cover" unoptimized />
                  </div>
                  <div className="bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              {loadingBar.visible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-800 rounded-xl p-3 space-y-2"
                >
                  <p className="text-purple-400 text-xs font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    {loadingBar.steps[loadingBar.currentStep]}
                  </p>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
                      style={{ width: `${loadingBar.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs text-right">{Math.round(loadingBar.progress)}%</p>
                </motion.div>
              )}

              {buttons.length > 0 && !isTyping && !loadingBar.visible && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-1"
                >
                  {buttons.map((btn, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleButtonClick(btn)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        btn.action === 'go_buy' || btn.action === 'go_camera'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                          : 'bg-gray-800 border border-gray-600 text-gray-200 hover:border-purple-500 hover:bg-gray-750'
                      }`}
                    >
                      {btn.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
