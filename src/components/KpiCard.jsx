export default function KpiCard({ title, value, helper, healthy }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold">{value}</h3>
      <p className={`mt-1 text-xs ${healthy ? 'text-emerald-500' : 'text-rose-500'}`}>{helper}</p>
    </div>
  );
}
