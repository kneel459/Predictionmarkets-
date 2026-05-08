import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Market, UserProfile, Bet } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  TrendingUp, 
  MessageSquare, 
  ChevronRight, 
  Search, 
  BarChart2, 
  Clock,
  LogIn,
  LogOut,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { getMarketInsight } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            balance: 1000, // Initial virtual balance
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', u.uid), newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userDoc.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
    });

    const q = query(collection(db, 'markets'), orderBy('status', 'asc'));
    const unsubscribeMarkets = onSnapshot(q, (snapshot) => {
      const marketData: Market[] = [];
      snapshot.forEach((doc) => {
        marketData.push({ id: doc.id, ...doc.data() } as Market);
      });
      setMarkets(marketData);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMarkets();
    };
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => auth.signOut();

  const handleBet = async (marketId: string, outcome: 'A' | 'B', amount: number) => {
    const FEE_PERCENT = 0.01; // 1% fee
    const fee = amount * FEE_PERCENT;
    const totalCost = amount + fee;

    if (!profile || profile.balance < totalCost) {
      alert('Insufficient balance including fees');
      return;
    }

    try {
      const market = markets.find(m => m.id === marketId);
      if (!market) return;

      const price = outcome === 'A' ? market.outcomeAPrice : market.outcomeBPrice;
      const shares = amount / price;

      // Add bet
      const betRef = doc(collection(db, 'bets'));
      await setDoc(betRef, {
        userId: profile.uid,
        marketId,
        outcome,
        amount,
        shares,
        price,
        fee,
        createdAt: serverTimestamp()
      });

      // Update user balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(-totalCost)
      });

      // Update market volume (simplification: not updating prices here)
      await updateDoc(doc(db, 'markets', marketId), {
        volume: increment(amount)
      });

      alert('Bet placed successfully!');
    } catch (err) {
      console.error(err);
      alert('Error placing bet');
    }
  };

  const seedMarkets = async () => {
    const sampleMarkets = [
      {
        question: "Will LUNC reach $0.001 by June 2026?",
        description: "Prediction based on community burn and market sentiment.",
        category: "Crypto",
        outcomeA: "Yes",
        outcomeB: "No",
        outcomeAPrice: 0.15,
        outcomeBPrice: 0.85,
        volume: 12500,
        liquidity: 50000,
        status: "open",
        expiresAt: new Date("2026-06-01")
      },
      {
        question: "Will Terraform Labs secure a new partnership this quarter?",
        description: "Official announcement before June 30th.",
        category: "Terra",
        outcomeA: "Yes",
        outcomeB: "No",
        outcomeAPrice: 0.65,
        outcomeBPrice: 0.35,
        volume: 8200,
        liquidity: 20000,
        status: "open",
        expiresAt: new Date("2026-06-30")
      }
    ];

    for (const m of sampleMarkets) {
      await setDoc(doc(collection(db, 'markets')), m);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <nav className="h-[70px] bg-gb-ink text-white border-b-4 border-gb-primary flex items-center justify-between px-10 shrink-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl tracking-wider">
          LUNA<span className="text-gb-primary">PREDICT</span>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm font-semibold uppercase tracking-wide opacity-80">
          <a href="#" className="hover:text-gb-primary transition-colors">Markets</a>
          <a href="#" className="hover:text-gb-primary transition-colors">Activity</a>
          <a href="#" className="hover:text-gb-primary transition-colors">Leaderboard</a>
          <a href="#" className="hover:text-gb-primary transition-colors">Learn</a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="bg-white/10 border border-white/20 rounded px-4 py-1.5 font-mono text-xs">
                ${profile?.balance.toFixed(2)}
              </div>
              <button 
                onClick={logout} 
                className="opacity-60 hover:opacity-100 transition-opacity p-1"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <img src={user.photoURL || ''} className="w-8 h-8 rounded border border-gb-primary shadow-sm" alt="Profile" />
            </div>
          ) : (
            <button 
              onClick={login}
              className="bg-white/10 border border-white/20 px-4 py-2 rounded text-xs font-bold uppercase tracking-widest hover:bg-gb-primary hover:text-gb-ink transition-all active:scale-95"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[260px] border-r border-gb-border bg-white p-8 hidden md:flex flex-col shrink-0">
          <h3 className="text-[11px] font-bold text-gb-muted uppercase tracking-[2px] mb-5">Categories</h3>
          <ul className="space-y-1">
            <li className="flex justify-between items-center py-3 font-semibold border-b border-gray-100 text-gb-primary border-b-2 border-gb-primary">
              Price Action <span className="text-xs opacity-50">12</span>
            </li>
            <li className="flex justify-between items-center py-3 font-semibold border-b border-gray-100 opacity-60 hover:opacity-100 cursor-pointer">
              Governance <span className="text-xs opacity-50">4</span>
            </li>
            <li className="flex justify-between items-center py-3 font-semibold border-b border-gray-100 opacity-60 hover:opacity-100 cursor-pointer">
              Ecosystem <span className="text-xs opacity-50">8</span>
            </li>
            <li className="flex justify-between items-center py-3 font-semibold border-b border-gray-100 opacity-60 hover:opacity-100 cursor-pointer">
              Burns <span className="text-xs opacity-50">2</span>
            </li>
          </ul>

          <div className="mt-12">
            <h3 className="text-[11px] font-bold text-gb-muted uppercase tracking-[2px] mb-5">Portfolio</h3>
            <div className="text-2xl font-bold tracking-tight">${profile?.balance.toFixed(2) || '0.00'}</div>
            <div className="text-xs font-bold text-gb-yes mt-1">+4.2% today</div>
          </div>

          {profile?.email === "palotespedro534@gmail.com" && (
            <div className="mt-12 pt-8 border-t border-gb-border">
              <h3 className="text-[11px] font-bold text-gb-muted uppercase tracking-[2px] mb-4">Admin Controls</h3>
              <button 
                onClick={async () => {
                  try {
                    await setDoc(doc(collection(db, 'markets')), {
                      question: "Will the price of LUNC be above $0.000048 on May 15th?",
                      description: "Based on Binance daily close for LUNC/USDT.",
                      category: "Price Action",
                      outcomeA: "Yes",
                      outcomeB: "No",
                      outcomeAPrice: 0.65,
                      outcomeBPrice: 0.30,
                      volume: 0,
                      liquidity: 100,
                      status: "open",
                      expiresAt: new Date("2026-05-15")
                    });
                    alert("Market created successfully!");
                  } catch (err) {
                    console.error(err);
                    alert("Error creating market");
                  }
                }}
                className="w-full text-left py-2 px-3 bg-gb-ink text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-gb-primary hover:text-gb-ink transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3 h-3" />
                Create LUNC May Market
              </button>
            </div>
          )}
        </aside>

        {/* Dashboard */}
        <main className="flex-grow overflow-y-auto bg-gb-bg p-10 space-y-8">
          {/* Trending/Hero Market */}
          {markets.length > 0 && (
            <section className="bg-white border border-gb-border p-8 shadow-[0_4px_0_var(--color-gb-border)] grid md:grid-cols-[1fr_300px] gap-10">
              <div className="space-y-4">
                <span className="inline-block bg-gb-primary text-gb-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Trending</span>
                <h1 className="text-3xl font-black leading-tight tracking-tight">{markets[0].question}</h1>
                <p className="text-gb-muted text-sm leading-relaxed max-w-xl">{markets[0].description}</p>
                <div className="flex items-center gap-4 text-xs font-bold text-gb-muted pt-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gb-yes" /> Live</span>
                  <span>• ${markets[0].volume.toLocaleString()} Volume</span>
                  <span>• {new Date(markets[0].expiresAt.toDate ? markets[0].expiresAt.toDate() : markets[0].expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setSelectedMarket(markets[0])}
                    className="bg-[#E8F5E9] text-gb-yes border border-gb-yes py-3 rounded font-bold uppercase text-xs hover:brightness-95 transition-all outline-none"
                  >
                    Yes {(markets[0].outcomeAPrice * 100).toFixed(0)}¢
                  </button>
                  <button 
                    onClick={() => setSelectedMarket(markets[0])}
                    className="bg-[#FFEBEE] text-gb-no border border-gb-no py-3 rounded font-bold uppercase text-xs hover:brightness-95 transition-all outline-none"
                  >
                    No {(markets[0].outcomeBPrice * 100).toFixed(0)}¢
                  </button>
                </div>
                <p className="text-[11px] text-center text-gb-muted">Order Book: 104,200 Shares Available</p>
              </div>
            </section>
          )}

          <div className="flex items-center justify-between pb-2 border-b border-gb-border">
            <h3 className="text-[11px] font-black text-gb-muted uppercase tracking-[2px]">Market Grid</h3>
            {user && markets.length === 0 && (
              <button onClick={seedMarkets} className="text-[10px] font-bold text-gb-ink underline uppercase tracking-wider">Seed Markets</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {markets.slice(1).map((market) => (
                <MarketCard 
                  key={market.id} 
                  market={market} 
                  onBet={(_outcome: any) => setSelectedMarket(market)} 
                />
              ))}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Betting Modal */}
      {selectedMarket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMarket(null)}
            className="absolute inset-0 bg-gb-ink/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white border border-gb-border w-full max-w-md shadow-2xl rounded"
          >
            <BettingPanel 
              market={selectedMarket} 
              onClose={() => setSelectedMarket(null)} 
              onBet={handleBet}
              userBalance={profile?.balance || 0}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}

function MarketCard({ market, onBet }: any) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchInsight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingInsight(true);
    const res = await getMarketInsight(market.question);
    setInsight(res);
    setLoadingInsight(false);
  };

  return (
    <motion.div 
      layout
      className="bg-white border border-gb-border p-5 flex flex-col justify-between h-[240px] shadow-[0_4px_0_var(--color-gb-border)] hover:shadow-none hover:translate-y-1 transition-all group cursor-pointer"
      onClick={() => onBet('A')}
    >
      <div>
        <span className="text-[10px] bg-gray-100 px-2 py-1 font-bold uppercase tracking-wider mb-4 inline-block">{market.category}</span>
        <h4 className="text-base font-bold leading-snug group-hover:text-gb-no transition-colors line-clamp-3">{market.question}</h4>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-dotted border-gb-border">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gb-muted">Chance</span>
          <span className="text-xl font-black">{(market.outcomeAPrice * 100).toFixed(0)}%</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!insight ? (
            <button 
              disabled={loadingInsight}
              onClick={fetchInsight}
              className="p-2 border border-gb-border hover:bg-gb-bg transition-colors rounded text-gb-muted"
              title="AI Insight"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          ) : (
            <div className="max-w-[120px]">
               <span className="text-[9px] italic line-clamp-2 leading-tight text-gb-muted">{insight}</span>
            </div>
          )}
          <div className="flex gap-1 h-10 w-24">
            <button className="flex-1 bg-[#E8F5E9] text-gb-yes border border-gb-yes font-black text-xs rounded">Y</button>
            <button className="flex-1 bg-[#FFEBEE] text-gb-no border border-gb-no font-black text-xs rounded">N</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BettingPanel({ market, onClose, onBet, userBalance }: { 
  market: Market, 
  onClose: () => void, 
  onBet: (mid: string, outcome: 'A' | 'B', amt: number) => void,
  userBalance: number
}) {
  const [outcome, setOutcome] = useState<'A' | 'B'>('A');
  const [amount, setAmount] = useState('10');
  const price = outcome === 'A' ? market.outcomeAPrice : market.outcomeBPrice;
  const shares = Number(amount) / price;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gb-border">
        <h4 className="font-bold text-gb-muted uppercase text-[10px] tracking-widest">Trade Execution</h4>
        <button onClick={onClose} className="text-gb-muted hover:text-gb-ink">&times;</button>
      </div>

      <h3 className="text-xl font-bold tracking-tight">{market.question}</h3>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => setOutcome('A')}
          className={cn(
            "py-3 rounded font-bold uppercase text-xs border transition-all",
            outcome === 'A' ? "bg-[#E8F5E9] border-gb-yes text-gb-yes" : "bg-gb-bg border-gb-border text-gb-muted"
          )}
        >
          {market.outcomeA}
        </button>
        <button 
          onClick={() => setOutcome('B')}
          className={cn(
            "py-3 rounded font-bold uppercase text-xs border transition-all",
            outcome === 'B' ? "bg-[#FFEBEE] border-gb-no text-gb-no" : "bg-gb-bg border-gb-border text-gb-muted"
          )}
        >
          {market.outcomeB}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-gb-muted uppercase tracking-wider">
          <span>Investment (USDC)</span>
          <span>Avail: ${userBalance.toFixed(2)}</span>
        </div>
        <div className="relative">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gb-bg border-2 border-gb-border rounded p-4 font-mono text-2xl focus:border-gb-primary outline-none transition-colors"
          />
        </div>
      </div>

      <div className="bg-gb-ink text-white p-5 rounded space-y-3 font-mono text-sm border-l-4 border-gb-primary">
        <div className="flex justify-between items-center opacity-60">
          <span>Current Price</span>
          <span>{price.toFixed(2)}¢</span>
        </div>
        <div className="flex justify-between items-center opacity-60">
          <span>Estimated Shares</span>
          <span className="text-gb-primary">{shares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center opacity-60 pt-2 border-t border-white/5">
          <span>Transaction Fee (1%)</span>
          <span className="text-gb-no">${(Number(amount) * 0.01).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center opacity-60">
          <span>Total Cost</span>
          <span className="">${(Number(amount) * 1.01).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-lg pt-2 border-t border-white/10">
          <span className="font-sans font-bold">Payout</span>
          <span className="text-gb-yes font-bold">${shares.toFixed(2)}</span>
        </div>
      </div>

      <button 
        onClick={() => {
          onBet(market.id, outcome, Number(amount));
          onClose();
        }}
        className={cn(
          "w-full py-4 rounded font-bold text-sm uppercase tracking-widest shadow-md active:scale-95 transition-all text-white",
          outcome === 'A' ? "bg-gb-yes" : "bg-gb-no"
        )}
      >
        Confirm Order
      </button>
    </div>
  );
}

