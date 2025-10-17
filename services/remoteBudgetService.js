import { supabase } from '../lib/supabase';

// Remote helpers for budgets and financial goals

export function remoteEnabled() {
  try {
    return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  } catch (_) {
    return false;
  }
}

export async function getBudget(userId, month, year) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function upsertBudget(userId, month, year, { overallMonthly = 0, categories = {} }) {
  const row = {
    user_id: userId,
    month,
    year,
    overall_monthly: Number(overallMonthly) || 0,
    categories
  };
  const { data, error } = await supabase
    .from('budgets')
    .upsert(row, { onConflict: 'user_id,month,year' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Financial goals
export async function listGoals(userId) {
  const { data, error } = await supabase
    .from('financial_goal')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addGoal(userId, { title, targetAmount, targetDate }) {
  const row = {
    user_id: userId,
    title,
    target_amount: Number(targetAmount) || 0,
    saved_amount: 0,
    target_date: targetDate || null
  };
  const { data, error } = await supabase
    .from('financial_goal')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeGoal(userId, id) {
  const { error } = await supabase
    .from('financial_goal')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw error;
}



