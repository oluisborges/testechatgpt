import { supabase } from '../lib/supabase';

/** Insert a transaction, falling back without optional columns if migration is missing. */
export const insertTx = async (payload) => {
  let { data, error } = await supabase.from('transactions').insert(payload).select().single();
  if (error) {
    const { notes, is_recurring, recurrence_interval, file_url, file_name, ...core } = payload;
    ({ data, error } = await supabase.from('transactions').insert(core).select().single());
  }
  return { data, error };
};

/** Update a transaction, falling back without optional columns if migration is missing. */
export const updateTxDb = async (id, updates) => {
  let { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) {
    const { notes, is_recurring, recurrence_interval, ...fallback } = updates;
    ({ error } = await supabase.from('transactions').update(fallback).eq('id', id));
  }
  return { error };
};

export const deleteTxDb = async (id) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  return { error };
};
