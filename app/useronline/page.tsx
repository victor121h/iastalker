'use client';

import { useState, useEffect, useCallback } from 'react';

interface Visitor {
  id: number;
  visitorId: string;
  sessionId: string;
  displayName: string | null;
  currentPage: string;
  entryPage: string;
  pageHistory: string[];
  isOnline: boolean;
  device: string;
  browser: string;
  referrer: string;
  city: string | null;
  region: string | null;
  country: string | null;
  enteredAt: string;
  lastSeen: string;
  pageEnteredAt: string;
  createdAt: string;
}

interface PageGroup {
  page: string;
  online: number;
  visitors: Visitor[];
}

function getStatus(v: Visitor): 'online' | 'left_early' | 'left_late' {
  if (v.isOnline) return 'online';
  const earlyPages = ['/pitch', '/pitch1', '/', '/access', '/search'];
  const lastPage = v.currentPage;
  const advancedPages = v.pageHistory.filter(p => !earlyPages.includes(p));
  if (advancedPages.length === 0) return 'left_early';
  return 'left_late';
}

function statusColor(status: string) {
  if (status === 'online') return 'bg-green-500';
  if (status === 'left_early') return 'bg-red-500';
  return 'bg-yellow-500';
}

function statusLabel(status: string) {
  if (status === 'online') return 'Online';
  if (status === 'left_early') return 'Left (early)';
  return 'Left (advanced)';
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
  return `${Math.floor(diff / 86400)}d`;
}

function timeSince(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isRecent(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  return (now.getTime() - then.getTime()) < 24 * 60 * 60 * 1000;
}

export default function UserOnlinePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [storedPassword, setStoredPassword] = useState('');

  const fetchVisitors = useCallback(async () => {
    if (!storedPassword) return;
    try {
      const res = await fetch(`/api/tracking?password=${encodeURIComponent(storedPassword)}`);
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
        setLastUpdate(new Date());
      }
    } catch {}
  }, [storedPassword]);

  useEffect(() => {
    if (!authenticated) return;
    fetchVisitors();
    const interval = setInterval(fetchVisitors, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchVisitors]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking?password=${encodeURIComponent(password)}`);
      if (res.ok) {
        setStoredPassword(password);
        setAuthenticated(true);
        const data = await res.json();
        setVisitors(data.visitors || []);
        setLastUpdate(new Date());
      }
    } catch {}
    setLoading(false);
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
          <h1 className="text-white text-xl font-bold mb-4 text-center">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white mb-4 focus:outline-none focus:border-purple-500"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  const onlineCount = visitors.filter(v => v.isOnline).length;
  const activeVisitors = visitors.filter(v => isRecent(v.createdAt));
  const historyVisitors = visitors.filter(v => !isRecent(v.createdAt));

  const allPages = new Set<string>();
  visitors.forEach(v => {
    v.pageHistory.forEach(p => allPages.add(p));
  });

  const pageGroups: PageGroup[] = Array.from(allPages).map(page => {
    const pageVisitors = activeVisitors.filter(v =>
      v.pageHistory.includes(page)
    );
    const onlineOnPage = pageVisitors.filter(v => v.isOnline && v.currentPage === page).length;
    return { page, online: onlineOnPage, visitors: pageVisitors };
  }).filter(g => g.visitors.length > 0).sort((a, b) => b.online - a.online || b.visitors.length - a.visitors.length);

  const funnelPages = ['/pitch', '/pitch1', '/up1', '/up2', '/up3', '/up4', '/up5', '/cadastro', '/dashboard', '/buy'];
  const funnelData = funnelPages.map(page => ({
    page,
    count: activeVisitors.filter(v => v.pageHistory.includes(page)).length,
    online: activeVisitors.filter(v => v.isOnline && v.currentPage === page).length,
  })).filter(d => d.count > 0);

  const togglePage = (page: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Visitor Monitor</h1>
            {lastUpdate && (
              <p className="text-gray-500 text-xs mt-1">Updated: {lastUpdate.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-2">
              <span className="text-green-400 font-bold text-lg">{onlineCount}</span>
              <span className="text-green-400/70 text-sm ml-2">online</span>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
              <span className="text-gray-300 font-bold text-lg">{activeVisitors.length}</span>
              <span className="text-gray-500 text-sm ml-2">24h</span>
            </div>
          </div>
        </div>

        {funnelData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">FUNNEL FLOW</h2>
            <div className="flex items-end gap-1 overflow-x-auto pb-2">
              {funnelData.map((d, i) => {
                const maxCount = Math.max(...funnelData.map(f => f.count));
                const height = Math.max(20, (d.count / maxCount) * 100);
                return (
                  <div key={d.page} className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xs text-gray-400 mb-1">{d.count}</span>
                    <div
                      className="w-10 rounded-t bg-gradient-to-t from-purple-600 to-purple-400 relative"
                      style={{ height: `${height}px` }}
                    >
                      {d.online > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-bold">
                          {d.online}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[60px]">{d.page}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-8">
          {pageGroups.map(group => (
            <div key={group.page} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => togglePage(group.page)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">📄</span>
                  <span className="font-mono text-sm">{group.page}</span>
                </div>
                <div className="flex items-center gap-3">
                  {group.online > 0 && (
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-lg">
                      {group.online} online
                    </span>
                  )}
                  <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-lg">
                    {group.visitors.length} total
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedPages.has(group.page) ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>

              {expandedPages.has(group.page) && (
                <div className="border-t border-gray-800">
                  <div className="max-h-[70vh] overflow-y-auto">
                    {group.visitors
                      .sort((a, b) => {
                        const sa = getStatus(a);
                        const sb = getStatus(b);
                        const order = { online: 0, left_late: 1, left_early: 2 };
                        return order[sa] - order[sb];
                      })
                      .map(visitor => {
                        const status = getStatus(visitor);
                        const name = visitor.displayName || visitor.visitorId;
                        const isAutoId = !visitor.displayName;

                        return (
                          <div
                            key={visitor.sessionId}
                            className="px-4 py-3 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/30"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColor(status)}`} />
                                <span
                                  className={`font-medium text-sm ${isAutoId ? 'text-yellow-400' : 'text-white'}`}
                                  title={visitor.displayName ? `(previous: ${visitor.visitorId})` : undefined}
                                >
                                  {name}
                                </span>
                                <span className="text-gray-600 text-xs">{statusLabel(status)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{visitor.device === 'mobile' ? '📱' : '💻'}</span>
                                <span>{visitor.browser}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <span>Entry: <span className="text-gray-400">{visitor.entryPage}</span></span>
                              <span>•</span>
                              <span>Current: <span className="text-gray-400">{visitor.currentPage}</span></span>
                              {visitor.isOnline && (
                                <>
                                  <span>•</span>
                                  <span>On page: <span className="text-gray-400">{timeAgo(visitor.pageEnteredAt)}</span></span>
                                </>
                              )}
                              <span>•</span>
                              <span>Total: <span className="text-gray-400">{timeAgo(visitor.enteredAt)}</span></span>
                            </div>

                            <div className="flex items-center gap-1 text-xs">
                              {visitor.pageHistory.map((p, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className={`${p === visitor.currentPage && visitor.isOnline ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                                    {p}
                                  </span>
                                  {i < visitor.pageHistory.length - 1 && <span className="text-gray-700">→</span>}
                                </span>
                              ))}
                            </div>

                            {visitor.referrer && visitor.referrer !== 'direct' && (
                              <div className="text-[10px] text-gray-600 mt-1 truncate">
                                From: {visitor.referrer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-4 py-2">
                    <button
                      onClick={() => togglePage(group.page)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Close ▲
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {historyVisitors.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              📜 HISTORY (older than 24h)
              <span className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded">{historyVisitors.length}</span>
            </h2>
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden">
              <div className="max-h-[40vh] overflow-y-auto">
                {historyVisitors.map(visitor => {
                  const status = getStatus(visitor);
                  const name = visitor.displayName || visitor.visitorId;
                  const isAutoId = !visitor.displayName;

                  return (
                    <div
                      key={visitor.sessionId}
                      className="px-4 py-2 border-b border-gray-800/30 last:border-b-0 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColor(status)}`} />
                        <span
                          className={`text-sm ${isAutoId ? 'text-yellow-400/60' : 'text-gray-400'}`}
                          title={visitor.displayName ? `(previous: ${visitor.visitorId})` : undefined}
                        >
                          {name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{visitor.pageHistory.join(' → ')}</span>
                        <span>{timeSince(visitor.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
