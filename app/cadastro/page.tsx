'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/useTranslation';
import { getCheckoutUrl } from '@/lib/checkoutLinks';

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<'none' | 'no_purchase' | 'has_account'>('none');

  const getUtmParams = () => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'src', 'sck', 'xcod', 'lang'];
    const params = new URLSearchParams();
    utmKeys.forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const appendUtmToPath = (basePath: string) => {
    const utmParams = getUtmParams();
    if (utmParams) {
      return `${basePath}?${utmParams}`;
    }
    return basePath;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorType('');

    if (password !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }
    if (password.length < 4) {
      setError(t('auth.password_min'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_email', email.toLowerCase().trim());
        setTimeout(() => {
          router.push(appendUtmToPath('/dashboard'));
        }, 1000);
      } else if (data.error === 'no_purchase') {
        setError(data.message);
        setErrorType('no_purchase');
        setIsLoading(false);
      } else if (data.error === 'already_registered') {
        setError(data.message);
        setErrorType('already_registered');
        setIsLoading(false);
      } else {
        setError(data.message || 'An error occurred.');
        setIsLoading(false);
      }
    } catch {
      setError(t('auth.connection_error'));
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorType('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user_email', loginEmail.toLowerCase().trim());
        const storedName = localStorage.getItem('user_name');
        if (!storedName) localStorage.setItem('user_name', 'User');
        setTimeout(() => {
          router.push(appendUtmToPath('/dashboard'));
        }, 1000);
      } else if (data.error === 'no_purchase') {
        setError(data.message);
        setErrorType('no_purchase_login');
        setIsLoading(false);
      } else if (data.error === 'not_registered') {
        setError(data.message);
        setErrorType('not_registered');
        setIsLoading(false);
      } else if (data.error === 'invalid_password') {
        setError(data.message);
        setErrorType('');
        setIsLoading(false);
      } else {
        setError(data.message || 'An error occurred.');
        setIsLoading(false);
      }
    } catch {
      setError(t('auth.connection_error'));
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotResult('none');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_email', email: forgotEmail }),
      });
      const data = await res.json();

      await new Promise(r => setTimeout(r, 2000));

      if (data.error === 'no_purchase') {
        setForgotResult('no_purchase');
      } else if (data.exists) {
        setForgotResult('has_account');
      }
    } catch {
      setForgotResult('no_purchase');
    }
    setForgotLoading(false);
  };

  const switchToRegister = () => {
    setActiveTab('register');
    setError('');
    setErrorType('');
  };

  const inputClasses = "w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors";

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#262626]">
            <button
              onClick={() => { setActiveTab('register'); setError(''); setErrorType(''); setShowForgotPassword(false); }}
              className={`flex-1 py-3.5 text-sm font-bold transition-all ${
                activeTab === 'register'
                  ? 'text-white border-b-2 border-purple-500 bg-[#1a1a1a]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t('auth.register')}
            </button>
            <button
              onClick={() => { setActiveTab('login'); setError(''); setErrorType(''); setShowForgotPassword(false); }}
              className={`flex-1 py-3.5 text-sm font-bold transition-all ${
                activeTab === 'login'
                  ? 'text-white border-b-2 border-purple-500 bg-[#1a1a1a]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t('auth.login')}
            </button>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h1 className="text-white text-2xl font-bold mb-2">
                {activeTab === 'register' ? t('auth.create_account_title') : t('auth.welcome_back')}
              </h1>
              <p className="text-gray-400 text-sm">
                {activeTab === 'register' ? t('auth.register_subtitle') : t('auth.login_subtitle')}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'register' && !showForgotPassword && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                  autoComplete="off"
                >
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.full_name')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.enter_name')}
                      className={inputClasses}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.enter_purchase_email')}
                      className={inputClasses}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.password')}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.create_password')}
                      className={inputClasses}
                      required
                      autoComplete="new-password"
                      data-lpignore="true"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.confirm_password')}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirm_password_placeholder')}
                      className={inputClasses}
                      required
                      autoComplete="new-password"
                      data-lpignore="true"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center"
                    >
                      <p className="text-red-400 text-sm">{error}</p>
                      {errorType === 'no_purchase' && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => router.push(appendUtmToPath('/pitch'))}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-bold"
                        >
                          {t('auth.buy_now')}
                        </motion.button>
                      )}
                      {errorType === 'already_registered' && (
                        <p className="text-red-400 text-sm mt-1">
                          {t('auth.already_registered')}{' '}
                          <button
                            type="button"
                            onClick={() => { setActiveTab('login'); setError(''); setErrorType(''); }}
                            className="underline text-purple-400 hover:text-purple-300 font-bold"
                          >
                            {t('auth.logging_in_link')}
                          </button>
                          {' '}{t('auth.instead')}
                        </p>
                      )}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                      isLoading
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>{t('auth.creating_account')}</span>
                      </div>
                    ) : (
                      t('auth.create_account_btn')
                    )}
                  </motion.button>
                </motion.form>
              )}

              {activeTab === 'login' && !showForgotPassword && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                  autoComplete="off"
                >
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.email')}</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={t('auth.enter_email')}
                      className={inputClasses}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('auth.password')}</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t('auth.enter_password')}
                      className={inputClasses}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center"
                    >
                      <p className="text-red-400 text-sm">{error}</p>
                      {errorType === 'no_purchase_login' && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => router.push(appendUtmToPath('/pitch'))}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-bold"
                        >
                          {t('auth.buy_now')}
                        </motion.button>
                      )}
                      {errorType === 'not_registered' && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={switchToRegister}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white text-sm font-bold"
                        >
                          {t('auth.click_register')}
                        </motion.button>
                      )}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                      isLoading
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>{t('auth.logging_in')}</span>
                      </div>
                    ) : (
                      t('auth.login_btn')
                    )}
                  </motion.button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setError(''); setErrorType(''); setForgotResult('none'); }}
                      className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
                    >
                      {t('auth.forgot_password')}
                    </button>
                  </div>
                </motion.form>
              )}

              {showForgotPassword && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {forgotResult === 'none' && (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <p className="text-gray-300 text-sm text-center mb-2">{t('auth.enter_purchase_email')}</p>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder={t('auth.enter_email')}
                        className={inputClasses}
                        required
                        autoComplete="off"
                        data-lpignore="true"
                      />
                      <motion.button
                        type="submit"
                        disabled={forgotLoading}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                          forgotLoading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600'
                        }`}
                      >
                        {forgotLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span>{t('auth.checking_user')}</span>
                          </div>
                        ) : (
                          t('auth.verify')
                        )}
                      </motion.button>
                    </form>
                  )}

                  {forgotResult === 'no_purchase' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-400 text-sm">{t('auth.no_purchase_found')}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => router.push(appendUtmToPath('/pitch'))}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold"
                      >
                        {t('auth.buy_now')}
                      </motion.button>
                    </motion.div>
                  )}

                  {forgotResult === 'has_account' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-yellow-300 text-sm">{t('auth.security_message')}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => window.open(getCheckoutUrl('https://go.centerpag.com/PPU38CQ8ABP', lang), '_blank')}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold"
                      >
                        {t('auth.buy_new_access')}
                      </motion.button>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setForgotResult('none'); }}
                    className="w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    {t('auth.back_to_login')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-gray-500 text-xs mt-6">
              {t('auth.terms')}
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950" />}>
      <CadastroContent />
    </Suspense>
  );
}
