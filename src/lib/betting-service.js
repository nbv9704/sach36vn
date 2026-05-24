import { supabase } from './supabase';

function mapBet(row) {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    status: row.status,
    selections: Array.isArray(row.selections)
      ? row.selections.map((selection) => ({ ...selection, status: selection.status || 'Pending' }))
      : [],
    stake: Number(row.stake),
    totalOdds: Number(row.total_odds),
    payout: Number(row.payout),
    settledPayout: Number(row.settled_payout || 0),
    settledAt: row.settled_at,
  };
}

export async function getWalletBalance() {
  const { data, error } = await supabase.rpc('get_wallet');

  if (error) {
    throw new Error(error.message || 'Failed to load wallet');
  }

  return Number(data || 0);
}

export async function isCurrentUserAdmin() {
  const { data, error } = await supabase.rpc('current_user_is_admin');

  if (error) {
    throw new Error(error.message || 'Failed to load admin status');
  }

  return Boolean(data);
}

export async function getBetHistory() {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load bet history');
  }

  return (data || []).map(mapBet);
}

export async function placeBet({ selections, stake, totalOdds, payout }) {
  const { data, error } = await supabase.rpc('place_bet', {
    p_selections: selections,
    p_stake: stake,
    p_total_odds: totalOdds,
    p_payout: payout,
  });

  if (error) {
    throw new Error(error.message || 'Failed to place bet');
  }

  return mapBet(data);
}

export async function cashOutBet(betId) {
  const { data, error } = await supabase.rpc('cash_out_bet', {
    p_bet_id: betId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to cash out bet');
  }

  return mapBet(data);
}

export async function getAdminBets(status = 'Open') {
  const { data, error } = await supabase.rpc('list_admin_bets', {
    p_status: status === 'All' ? null : status,
  });

  if (error) {
    throw new Error(error.message || 'Failed to load admin bets');
  }

  return (data || []).map(mapBet);
}

export async function settleBet({ betId, status }) {
  const { data, error } = await supabase.rpc('settle_bet', {
    p_bet_id: betId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message || 'Failed to settle bet');
  }

  return mapBet(data);
}

export async function settleBetLeg({ betId, selectionId, status }) {
  const { data, error } = await supabase.rpc('settle_bet_leg', {
    p_bet_id: betId,
    p_selection_id: selectionId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message || 'Failed to settle selection');
  }

  return mapBet(data);
}
