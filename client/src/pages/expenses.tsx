import { supabase } from '../supabase';

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*');
  if (error) throw error;
  return data;
}