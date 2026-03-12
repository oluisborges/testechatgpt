import { supabase } from '../lib/supabase';

export const insertBillDb = async (payload) => {
  const { data, error } = await supabase.from('bills').insert(payload).select().single();
  return { data, error };
};

export const updateBillDb = async (id, updates) => {
  const { error } = await supabase.from('bills').update(updates).eq('id', id);
  return { error };
};

export const deleteBillDb = async (id) => {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  return { error };
};

/** Insert the expense transaction when marking a bill as paid, with column fallback. */
export const insertPayBillTx = async (payload) => {
  let { data, error } = await supabase.from('transactions').insert(payload).select().single();
  if (error) {
    const { notes, file_url, file_name, ...core } = payload;
    ({ data, error } = await supabase.from('transactions').insert(core).select().single());
  }
  return { data, error };
};

export const markBillPaidDb = async (id) => {
  const { error } = await supabase
    .from('bills')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
};
