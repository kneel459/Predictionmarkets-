export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  balance: number;
  createdAt: any;
}

export interface Market {
  id: string;
  question: string;
  description: string;
  category: string;
  outcomeA: string; // e.g., "Yes"
  outcomeB: string; // e.g., "No"
  outcomeAPrice: number; // 0-1
  outcomeBPrice: number; // 0-1
  volume: number;
  liquidity: number;
  expiresAt: any;
  status: 'open' | 'closed' | 'resolved';
  resolution?: 'A' | 'B';
}

export interface Bet {
  id: string;
  userId: string;
  marketId: string;
  outcome: 'A' | 'B';
  amount: number;
  shares: number;
  price: number;
  fee: number;
  createdAt: any;
}
