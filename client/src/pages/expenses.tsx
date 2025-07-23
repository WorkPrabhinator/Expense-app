import { supabase } from '../supabaseClient';

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*');
  if (error) throw error;
  return data;
}