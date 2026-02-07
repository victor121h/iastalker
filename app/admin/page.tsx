'use client';

import { useState, useEffect } from 'react';

interface WebhookLog {
  id: number;
  sale_code: string;
  plan_code: string;
  plan_name: string;
  sale_status: number;
  customer_email: string;
  customer_name: string;
  credits_added: number;
  created_at: string;
}

interface UserCredit {
  id: number;
  email: string;
  name: string;
  total_credits: number;
  used_credits: number;
  created_at: string;
  updated_at: string;
}

interface AdminData {
  stats: {
    total_webhooks: number;
    total_users: number;
    total_credits_distributed: number;
  };
  recent_webhooks: WebhookLog[];
  user_credits: UserCredit[];
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'None', color: 'gray' },
  1: { label: 'Pending', color: 'yellow' },
  2: { label: 'Approved', color: 'green' },
  3: { label: 'In Process', color: 'blue' },
  4: { label: 'In Mediation', color: 'orange' },
  5: { label: 'Rejected', color: 'red' },
  6: { label: 'Cancelled', color: 'red' },
  7: { label: 'Refunded', color: 'purple' },
  8: { label: 'Authorized', color: 'blue' },
  9: { label: 'Chargeback', color: 'red' },
  10: { label: 'Completed', color: 'green' },
  11: { label: 'Checkout Error', color: 'red' },
  12: { label: 'Pre-checkout', color: 'gray' },
  13: { label: 'Expired', color: 'gray' },
  16: { label: 'In Review', color: 'yellow' },
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'webhooks' | 'credits'>('webhooks');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin');
      if (!res.ok) {
        throw new Error('Failed to load data');
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: number) => {
    const s = STATUS_MAP[status] || { label: `Unknown (${status})`, color: 'gray' };
    const colors: Record<string, string> = {
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[s.color]}`}>
        {s.label}
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-bold">Admin Panel</h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#121218] border border-gray-800 rounded-2xl p-6">
                <p className="text-gray-400 text-sm mb-1">Total Webhooks</p>
                <p className="text-white text-3xl font-bold">{data.stats.total_webhooks}</p>
              </div>
              <div className="bg-[#121218] border border-gray-800 rounded-2xl p-6">
                <p className="text-gray-400 text-sm mb-1">Users with Credits</p>
                <p className="text-white text-3xl font-bold">{data.stats.total_users}</p>
              </div>
              <div className="bg-[#121218] border border-gray-800 rounded-2xl p-6">
                <p className="text-gray-400 text-sm mb-1">Total Credits Distributed</p>
                <p className="text-white text-3xl font-bold">{data.stats.total_credits_distributed.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-[#121218] border border-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-gray-400 text-sm mb-2">Webhook URL (add this to PerfectPay):</p>
              <div className="flex items-center gap-2">
                <code className="bg-[#1a1a22] text-green-400 px-4 py-2 rounded-xl text-sm flex-1 overflow-x-auto">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/perfectpay` : '/api/webhook/perfectpay'}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/perfectpay`)}
                  className="px-3 py-2 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-600 transition-all flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('webhooks')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'webhooks' ? 'bg-purple-600 text-white' : 'bg-[#1a1a22] text-gray-400 hover:text-white'
                }`}
              >
                Webhook Logs ({data.recent_webhooks.length})
              </button>
              <button
                onClick={() => setActiveTab('credits')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'credits' ? 'bg-purple-600 text-white' : 'bg-[#1a1a22] text-gray-400 hover:text-white'
                }`}
              >
                User Credits ({data.user_credits.length})
              </button>
            </div>

            {activeTab === 'webhooks' && (
              <div className="bg-[#121218] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Date</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Sale Code</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Plan</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Customer</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Email</th>
                        <th className="text-right text-gray-400 px-4 py-3 font-medium">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_webhooks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-gray-500 py-8">
                            No webhooks received yet. Configure the URL above in PerfectPay.
                          </td>
                        </tr>
                      ) : (
                        data.recent_webhooks.map((log) => (
                          <tr key={log.id} className="border-b border-gray-800/50 hover:bg-[#1a1a22]">
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-xs">{log.sale_code}</td>
                            <td className="px-4 py-3">
                              <div className="text-white text-xs">{log.plan_code}</div>
                              <div className="text-gray-500 text-xs">{log.plan_name}</div>
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(log.sale_status)}</td>
                            <td className="px-4 py-3 text-gray-300">{log.customer_name}</td>
                            <td className="px-4 py-3 text-gray-300 text-xs">{log.customer_email}</td>
                            <td className="px-4 py-3 text-right">
                              {log.credits_added > 0 ? (
                                <span className="text-green-400 font-bold">+{log.credits_added}</span>
                              ) : (
                                <span className="text-gray-600">0</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'credits' && (
              <div className="bg-[#121218] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Name</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Email</th>
                        <th className="text-right text-gray-400 px-4 py-3 font-medium">Total Credits</th>
                        <th className="text-right text-gray-400 px-4 py-3 font-medium">Used</th>
                        <th className="text-right text-gray-400 px-4 py-3 font-medium">Available</th>
                        <th className="text-left text-gray-400 px-4 py-3 font-medium">Last Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.user_credits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-500 py-8">
                            No users with credits yet.
                          </td>
                        </tr>
                      ) : (
                        data.user_credits.map((user) => (
                          <tr key={user.id} className="border-b border-gray-800/50 hover:bg-[#1a1a22]">
                            <td className="px-4 py-3 text-white font-medium">{user.name || '-'}</td>
                            <td className="px-4 py-3 text-gray-300 text-xs">{user.email}</td>
                            <td className="px-4 py-3 text-right text-purple-400 font-bold">{user.total_credits.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-400">{user.used_credits}</td>
                            <td className="px-4 py-3 text-right text-green-400 font-bold">{(user.total_credits - user.used_credits).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                              {new Date(user.updated_at).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
