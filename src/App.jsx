import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { MatchBettingService, CATEGORY_FILTERS } from './lib/matchbetting-service';
import { supabase } from './lib/supabase';
import { cashOutBet, getAdminBets, getBetHistory, getWalletBalance, isCurrentUserAdmin, placeBet, settleBetLeg } from './lib/betting-service';
import { FloatingBetslip } from './components/betting/FloatingBetslip';
import { TopNavbar } from './components/layout/TopNavbar';
import { CategoryPage, FavoritesPage, HomePage, LivePage, MatchDetailPage } from './pages/match-pages';
import { MyBetsPage } from './pages/my-bets-page';
import { BalancePage } from './pages/balance-page';
import { AdminResultsPage } from './pages/admin-results-page';
import {
  findLatestSelectionOdd,
  getSelectionId,
  getTotalOdds,
  loadFavoriteMatchIds,
} from './lib/match-utils';

const service = new MatchBettingService();

function AppRoutes({ matchesByCategory, loading, error, refreshAll, onSelectOdd, selections, searchQuery, favoriteMatchIds, onToggleFavorite, quickBetFeedbackId, balance, bets, onCashOut, cashingOutBetId, cashOutError, isAdmin, adminBets, adminBetsLoading, adminError, settlingLegId, onRefreshAdminBets, onSettleBetGroup }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage matchesByCategory={matchesByCategory} loading={loading} error={error} onRetry={refreshAll} onSelectOdd={onSelectOdd} selections={selections} searchQuery={searchQuery} favoriteMatchIds={favoriteMatchIds} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />} />
      <Route path="/live" element={<LivePage matchesByCategory={matchesByCategory} loading={loading} error={error} onRetry={refreshAll} onSelectOdd={onSelectOdd} selections={selections} searchQuery={searchQuery} favoriteMatchIds={favoriteMatchIds} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />} />
      <Route path="/favorites" element={<FavoritesPage matchesByCategory={matchesByCategory} loading={loading} error={error} onRetry={refreshAll} onSelectOdd={onSelectOdd} selections={selections} searchQuery={searchQuery} favoriteMatchIds={favoriteMatchIds} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />} />
      <Route path="/category/:id" element={<CategoryPage matchesByCategory={matchesByCategory} loading={loading} error={error} onRetry={refreshAll} onSelectOdd={onSelectOdd} selections={selections} searchQuery={searchQuery} favoriteMatchIds={favoriteMatchIds} onToggleFavorite={onToggleFavorite} quickBetFeedbackId={quickBetFeedbackId} />} />
      <Route path="/match/:id" element={<MatchDetailPage matchesByCategory={matchesByCategory} onSelectOdd={onSelectOdd} selections={selections} quickBetFeedbackId={quickBetFeedbackId} />} />
      <Route path="/balance" element={<BalancePage balance={balance} bets={bets} />} />
      <Route path="/my-bets" element={<MyBetsPage bets={bets} onCashOut={onCashOut} cashingOutBetId={cashingOutBetId} cashOutError={cashOutError} />} />
      <Route path="/admin/results" element={<AdminResultsPage isAdmin={isAdmin} adminBets={adminBets} adminBetsLoading={adminBetsLoading} adminError={adminError} settlingLegId={settlingLegId} onRefreshAdminBets={onRefreshAdminBets} onSettleBetGroup={onSettleBetGroup} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [matchesByCategory, setMatchesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [selections, setSelections] = useState([]);
  const [favoriteMatchIds, setFavoriteMatchIds] = useState(loadFavoriteMatchIds);
  const [bets, setBets] = useState([]);
  const [quickBet, setQuickBet] = useState(false);
  const [quickBetStake, setQuickBetStake] = useState('5');
  const [quickBetFeedbackId, setQuickBetFeedbackId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [placeBetError, setPlaceBetError] = useState('');
  const [placingBet, setPlacingBet] = useState(false);
  const [cashOutError, setCashOutError] = useState('');
  const [cashingOutBetId, setCashingOutBetId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBets, setAdminBets] = useState([]);
  const [adminBetsLoading, setAdminBetsLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [settlingLegId, setSettlingLegId] = useState('');

  const loadAccountData = useCallback(async (currentUser) => {
    if (!currentUser) {
      setBalance(0);
      setBets([]);
      setIsAdmin(false);
      setAdminBets([]);
      return;
    }

    const [walletBalance, betHistory, adminStatus] = await Promise.all([
      getWalletBalance(),
      getBetHistory(),
      isCurrentUserAdmin(),
    ]);

    setBalance(walletBalance);
    setBets(betHistory);
    setIsAdmin(adminStatus);
  }, []);

  const refreshAdminBets = useCallback(async () => {
    if (!isAdmin) return;

    setAdminBetsLoading(true);
    setAdminError('');

    try {
      setAdminBets(await getAdminBets('Open'));
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to load admin bets');
    } finally {
      setAdminBetsLoading(false);
    }
  }, [isAdmin]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(
        Object.keys(CATEGORY_FILTERS).map(async (category) => {
          const [live, prematch] = await Promise.all([
            service.getMatches({ category, type: 'live' }),
            service.getMatches({ category, type: 'prematch' }),
          ]);
          return [category, { live, prematch }];
        }),
      );
      const nextMatchesByCategory = Object.fromEntries(entries);
      setMatchesByCategory(nextMatchesByCategory);
      setSelections((currentSelections) => currentSelections.map((selection) => {
        const latestOdd = findLatestSelectionOdd(nextMatchesByCategory, selection);

        if (!latestOdd || latestOdd.odds === selection.odds) {
          return selection;
        }

        return {
          ...selection,
          odds: latestOdd.odds,
        };
      }));
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(refreshAll);
  }, [refreshAll]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshAll();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [refreshAll]);

  useEffect(() => {
    window.localStorage.setItem('sach36vn.favoriteMatchIds', JSON.stringify(favoriteMatchIds));
  }, [favoriteMatchIds]);

  useEffect(() => {
    Promise.resolve().then(refreshAdminBets);
  }, [refreshAdminBets]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      loadAccountData(data.user).catch((err) => setPlaceBetError(err instanceof Error ? err.message : 'Failed to load account'));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      loadAccountData(currentUser).catch((err) => setPlaceBetError(err instanceof Error ? err.message : 'Failed to load account'));
    });

    return () => listener.subscription.unsubscribe();
  }, [loadAccountData]);

  const handleSelectOdd = useCallback((match, odd) => {
    if (odd.blocked) return;

    const selection = {
      id: getSelectionId(match, odd),
      matchId: match.id,
      matchTitle: match.title,
      sport: match.sport,
      tournament: match.tournament,
      marketId: odd.marketId,
      marketName: odd.marketName,
      outcomeId: odd.outcomeId,
      outcomeName: odd.outcomeName,
      odds: odd.odds,
    };

    if (quickBet) {
      const stake = Number(quickBetStake);
      const oddsValue = Number(selection.odds);
      if (user && Number.isFinite(stake) && stake > 0 && balance >= stake && Number.isFinite(oddsValue)) {
        setQuickBetFeedbackId(selection.id);
        setPlacingBet(true);
        setPlaceBetError('');
        placeBet({ selections: [selection], stake, totalOdds: oddsValue, payout: stake * oddsValue })
          .then((bet) => {
            setBets((currentBets) => [bet, ...currentBets]);
            setBalance((currentBalance) => Number((currentBalance - stake).toFixed(2)));
          })
          .catch((err) => setPlaceBetError(err instanceof Error ? err.message : 'Failed to place quick bet'))
          .finally(() => {
            setPlacingBet(false);
            window.setTimeout(() => setQuickBetFeedbackId((currentId) => (currentId === selection.id ? '' : currentId)), 900);
          });
      } else if (!user) {
        setPlaceBetError('Login with Discord to use Quick Bet.');
      } else {
        setPlaceBetError('Quick Bet stake is invalid or exceeds wallet balance.');
      }
      return;
    }

    setSelections((currentSelections) => {
      const exists = currentSelections.some((item) => item.id === selection.id);
      if (exists) {
        return currentSelections.filter((item) => item.id !== selection.id);
      }
      return [...currentSelections, selection];
    });
  }, [balance, quickBet, quickBetStake, user]);

  const handleToggleFavorite = useCallback((matchId) => {
    setFavoriteMatchIds((currentIds) => (
      currentIds.includes(matchId)
        ? currentIds.filter((id) => id !== matchId)
        : [...currentIds, matchId]
    ));
  }, []);

  const handlePlaceBet = useCallback(async (stake) => {
    if (!user) {
      setPlaceBetError('Login with Discord to place bets.');
      return;
    }

    if (!selections.length || stake <= 0 || stake > balance) return;

    const totalOdds = getTotalOdds(selections);
    setPlacingBet(true);
    setPlaceBetError('');

    try {
      const bet = await placeBet({ selections, stake, totalOdds, payout: stake * totalOdds });
      setBets((currentBets) => [bet, ...currentBets]);
      setBalance((currentBalance) => Number((currentBalance - stake).toFixed(2)));
      setSelections([]);
    } catch (err) {
      setPlaceBetError(err instanceof Error ? err.message : 'Failed to place bet');
      await loadAccountData(user).catch(() => undefined);
    } finally {
      setPlacingBet(false);
    }
  }, [balance, loadAccountData, selections, user]);

  const handleCashOut = useCallback(async (bet) => {
    if (!user || bet.status !== 'Open') return;

    setCashingOutBetId(bet.id);
    setCashOutError('');

    try {
      const updatedBet = await cashOutBet(bet.id);
      setBets((currentBets) => currentBets.map((currentBet) => (currentBet.id === updatedBet.id ? updatedBet : currentBet)));
      setBalance((currentBalance) => Number((currentBalance + updatedBet.settledPayout).toFixed(2)));
    } catch (err) {
      setCashOutError(err instanceof Error ? err.message : 'Failed to cash out bet');
      await loadAccountData(user).catch(() => undefined);
    } finally {
      setCashingOutBetId('');
    }
  }, [loadAccountData, user]);

  const handleSettleBetGroup = useCallback(async (rows, status) => {
    if (!isAdmin) return;

    const groupId = rows[0]?.selection?.id;
    if (!groupId) return;

    setSettlingLegId(groupId);
    setAdminError('');

    try {
      const updatedBets = [];

      for (const row of rows) {
        updatedBets.push(await settleBetLeg({ betId: row.bet.id, selectionId: row.selection.id, status }));
      }

      setAdminBets((currentBets) => currentBets.reduce((nextBets, bet) => {
        const updatedBet = updatedBets.find((item) => item.id === bet.id);
        if (!updatedBet) return [...nextBets, bet];
        return updatedBet.status === 'Open' ? [...nextBets, updatedBet] : nextBets;
      }, []));
      setBets((currentBets) => currentBets.map((bet) => updatedBets.find((item) => item.id === bet.id) || bet));
      if (user) {
        await loadAccountData(user);
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to settle selection');
      await refreshAdminBets();
    } finally {
      setSettlingLegId('');
    }
  }, [isAdmin, loadAccountData, refreshAdminBets, user]);

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const appRoutes = useMemo(() => (
    <AppRoutes
      matchesByCategory={matchesByCategory}
      loading={loading}
      error={error}
      refreshAll={refreshAll}
      onSelectOdd={handleSelectOdd}
      selections={selections}
      searchQuery={searchQuery}
      favoriteMatchIds={favoriteMatchIds}
      onToggleFavorite={handleToggleFavorite}
      quickBetFeedbackId={quickBetFeedbackId}
      balance={balance}
      bets={bets}
      onCashOut={handleCashOut}
      cashingOutBetId={cashingOutBetId}
      cashOutError={cashOutError}
      isAdmin={isAdmin}
      adminBets={adminBets}
      adminBetsLoading={adminBetsLoading}
      adminError={adminError}
      settlingLegId={settlingLegId}
      onRefreshAdminBets={refreshAdminBets}
      onSettleBetGroup={handleSettleBetGroup}
    />
  ), [adminBets, adminBetsLoading, adminError, balance, bets, cashOutError, cashingOutBetId, error, favoriteMatchIds, handleCashOut, handleSelectOdd, handleSettleBetGroup, handleToggleFavorite, isAdmin, loading, matchesByCategory, quickBetFeedbackId, refreshAdminBets, refreshAll, searchQuery, selections, settlingLegId]);

  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] bg-[#16181f] text-white">
        <TopNavbar user={user} balance={balance} isAdmin={isAdmin} onLogin={login} onLogout={logout} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="mx-auto max-w-[1440px] px-3 pb-24 pt-20 sm:px-5">
          {appRoutes}
        </main>
        <FloatingBetslip
          selections={selections}
          quickBet={quickBet}
          quickBetStake={quickBetStake}
          onQuickBetChange={setQuickBet}
          onQuickBetStakeChange={setQuickBetStake}
          onRemoveSelection={(id) => setSelections((currentSelections) => currentSelections.filter((selection) => selection.id !== id))}
          onClear={() => setSelections([])}
          onPlaceBet={handlePlaceBet}
          balance={balance}
          user={user}
          placeBetError={placeBetError}
          placingBet={placingBet}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
