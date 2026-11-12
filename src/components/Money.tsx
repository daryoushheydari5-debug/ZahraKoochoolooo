import { useMemo, useState } from "react";
import { useStore, useRates } from "../state/hooks";
import { budgetLines, ADULTS, type CarPlan } from "../state/store";
import { convert, isStale, money } from "../lib/fx";
import { fmtDateTime, fmt } from "../lib/dates";
import { TRAVELLERS } from "../data/trip";
import { Ext } from "./common";
import type { BudgetItem, Currency, TravellerId } from "../types";

const CURS: Currency[] = ["AUD", "JPY", "CNY"];

export function Money() {
  const { state, dispatch } = useStore();
  const fx = useRates(state.manualRates);
  const r = fx.rates;
  const [amt, setAmt] = useState("1000");
  const [from, setFrom] = useState<Currency>("JPY");
  const [manual, setManual] = useState({ JPY: state.manualRates?.JPY ?? r?.JPY ?? 0, CNY: state.manualRates?.CNY ?? r?.CNY ?? 0 });
  const lines = useMemo(() => budgetLines(state), [state]);
  const toAud = (n: number, c: Currency) => (r ? convert(n, c, "AUD", r) : c === "AUD" ? n : NaN);
  const byCat = new Map<string, number>();
  const perPerson: Record<TravellerId, number> = { darius: 0, sister: 0, husband: 0, baby: 0 };
  let total = 0, shared = 0, individual = 0;
  for (const l of lines) {
    const a0 = toAud(l.amount, l.currency), a = Number.isFinite(a0) ? a0 : 0;
    total += a;
    byCat.set(l.category, (byCat.get(l.category) ?? 0) + a);
    if (l.sharedBy.length > 1) shared += a; else individual += a;
    for (const p of l.sharedBy) perPerson[p] += a / l.sharedBy.length;
  }
  const n = parseFloat(amt);
  const stale = r ? isStale(r) : false;

  return (
    <section aria-labelledby="money-h">
      <h2 id="money-h" className="h2">Money</h2>
      <Budgets planned={{ darius: perPerson.darius, couple: perPerson.sister + perPerson.husband }} haveRates={!!r} />
      <div className="fx">
        <h3>AUD / JPY / CNY converter</h3>
        <div className="fxrow">
          <input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label="Amount" />
          <select value={from} onChange={(e) => setFrom(e.target.value as Currency)} aria-label="From currency">{CURS.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="chips">{(from === "JPY" ? [500, 1000, 5000, 10000] : from === "CNY" ? [50, 100, 500] : [10, 50, 100]).map((q) => <button key={q} className="chip sm" onClick={() => setAmt(String(q))}>{q.toLocaleString()}</button>)}</div>
        {r ? (
          <div className="fxout">{CURS.filter((c) => c !== from).map((c) => <div key={c}><span>{c}</span><b>{Number.isFinite(n) ? money(convert(n, from, c, r), c) : "—"}</b></div>)}</div>
        ) : <p className="warn">{fx.status === "loading" ? "Getting today's rates…" : "No exchange rate available yet. Enter one below to use the converter."}</p>}
        {r && (
          <p className={"small " + (stale ? "warn" : "muted")}>
            1 AUD = ¥{r.JPY.toFixed(2)} = CN¥{r.CNY.toFixed(3)} · {r.manual ? "manual rate you entered (not live)" : <>source: <Ext href={r.sourceUrl}>{r.source}</Ext>, rate date {fmtDateTime(r.asOf)}{fx.fromCache ? ", saved copy" : ""}</>}
            {stale && !r.manual && " · ⚠️ This rate is more than 3 days old."}
          </p>
        )}
        {fx.status === "error" && <p className="warn small">Couldn't refresh rates ({fx.error}). {r ? "Showing the last saved rate." : ""} <button className="btn ghost sm" onClick={fx.reload}>Retry</button></p>}
        <details>
          <summary>Use my own rate</summary>
          <div className="form row">
            <label>1 AUD = JPY<input type="number" step="0.01" value={manual.JPY || ""} onChange={(e) => setManual({ ...manual, JPY: +e.target.value })} /></label>
            <label>1 AUD = CNY<input type="number" step="0.001" value={manual.CNY || ""} onChange={(e) => setManual({ ...manual, CNY: +e.target.value })} /></label>
            <button className="btn sm" disabled={!(manual.JPY > 0 && manual.CNY > 0)} onClick={() => dispatch({ type: "manualRates", rates: manual })}>Use</button>
            {state.manualRates && <button className="btn ghost sm" onClick={() => dispatch({ type: "manualRates", rates: null })}>Back to live rates</button>}
          </div>
        </details>
      </div>

      <h3 className="h3">Budget</h3>
      <div className="totals">
        <div><span>Total</span><b>{money(total, "AUD")}</b></div>
        <div><span>Shared</span><b>{money(shared, "AUD")}</b></div>
        <div><span>Individual</span><b>{money(individual, "AUD")}</b></div>
        {ADULTS.map((p) => <div key={p}><span>{TRAVELLERS.find((t) => t.id === p)!.name}</span><b>{money(perPerson[p], "AUD")}</b></div>)}
      </div>
      {!r && <p className="warn small">Totals need an exchange rate for yen and yuan items.</p>}
      <div className="cats">{[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => <span key={c} className="cat"><b>{c}</b> {money(v, "AUD")}</span>)}</div>

      <h4>Rental cars</h4>
      {state.cars.map((c) => <CarEditor key={c.id} c={c} />)}

      <h4>All costs</h4>
      <table className="btable">
        <thead><tr><th>Item</th><th>Amount</th><th>AUD</th><th>Split</th><th /></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>{l.label}<div className="small muted">{l.category}{l.estimate ? " · estimate" : " · confirmed"}</div></td>
              <td>{money(l.amount, l.currency)}</td>
              <td>{money(toAud(l.amount, l.currency), "AUD")}</td>
              <td className="small">{l.sharedBy.length > 1 ? `shared ÷${l.sharedBy.length}` : TRAVELLERS.find((t) => t.id === l.sharedBy[0])?.name}</td>
              <td>{!l.auto && <button className="x" onClick={() => dispatch({ type: "removeBudget", id: l.id })} aria-label={"Remove " + l.label}>×</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">Accommodation, car and ticket lines update automatically from your route and calendar. Ticket lines count adults only (the baby is free at the listed places).</p>
      <AddCost />
    </section>
  );
}

function CarEditor({ c }: { c: CarPlan }) {
  const { dispatch } = useStore();
  const num = (k: keyof CarPlan, label: string, step = 1) => (
    <label>{label}<input type="number" min={0} step={step} value={c[k] as number} onChange={(e) => dispatch({ type: "setCar", id: c.id, patch: { [k]: Math.max(0, +e.target.value) } as Partial<CarPlan> })} /></label>
  );
  return (
    <details className="car">
      <summary><b>{c.label}</b> · from {fmt(c.pickup, { dow: true })}, {c.days} days</summary>
      <div className="form grid3">
        <label>Pick-up<input type="date" value={c.pickup} onChange={(e) => dispatch({ type: "setCar", id: c.id, patch: { pickup: e.target.value } })} /></label>
        {num("days", "Days")}{num("dailyJpy", "¥ per day", 500)}{num("childSeatJpyPerDay", "Child seat ¥/day", 50)}
        {num("km", "Distance km", 10)}{num("lPer100", "L/100 km", 0.5)}{num("fuelJpyPerL", "Fuel ¥/L", 1)}
        {num("tollsJpy", "Tolls ¥ total", 100)}{num("parkingJpy", "Parking ¥ total", 100)}
      </div>
      <p className="small muted">All figures are editable estimates. Toll estimates per route are in Road trips.</p>
    </details>
  );
}

function AddCost() {
  const { dispatch } = useStore();
  const [f, setF] = useState<{ label: string; amount: string; currency: Currency; category: BudgetItem["category"]; split: "shared" | "individual"; person: TravellerId; estimate: boolean }>({ label: "", amount: "", currency: "JPY", category: "other", split: "shared", person: "darius", estimate: true });
  const amount = parseFloat(f.amount);
  const valid = f.label.trim() && Number.isFinite(amount) && amount > 0;
  return (
    <form className="form addcost" onSubmit={(e) => {
      e.preventDefault();
      if (!valid) return;
      dispatch({ type: "addBudget", item: { id: "b" + Date.now().toString(36), label: f.label.trim(), amount, currency: f.currency, category: f.category, split: f.split, person: f.split === "individual" ? f.person : undefined, sharedBy: f.split === "shared" ? ADULTS : undefined, estimate: f.estimate } });
      setF({ ...f, label: "", amount: "" });
    }}>
      <b>Add a cost</b>
      <label>What<input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Express Pass" /></label>
      <label>Amount<input type="number" min={0} step="any" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
      <label>Currency<select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>{CURS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Type<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as BudgetItem["category"] })}>{["accommodation", "rental car", "fuel", "tolls", "parking", "tickets", "transport", "food", "other"].map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Split<select value={f.split} onChange={(e) => setF({ ...f, split: e.target.value as "shared" | "individual" })}><option value="shared">Shared by 3 adults</option><option value="individual">One person</option></select></label>
      {f.split === "individual" && <label>Who<select value={f.person} onChange={(e) => setF({ ...f, person: e.target.value as TravellerId })}>{ADULTS.map((p) => <option key={p} value={p}>{TRAVELLERS.find((t) => t.id === p)!.name}</option>)}</select></label>}
      <label className="check"><input type="checkbox" checked={!f.estimate} onChange={(e) => setF({ ...f, estimate: !e.target.checked })} /> Confirmed price</label>
      <button className="btn primary" disabled={!valid}>Add</button>
    </form>
  );
}

/** The two spending pots: Darius on his own, and Zaynab & Ruhullah sharing one. */
function Budgets({ planned, haveRates }: { planned: { darius: number; couple: number }; haveRates: boolean }) {
  const { state, dispatch } = useStore();
  const b = state.budgets ?? { darius: 4000, couple: 5000 };
  const card = (key: "darius" | "couple", title: string) => {
    const used = Number.isFinite(planned[key]) ? planned[key] : 0;
    const left = b[key] - used;
    const pct = b[key] > 0 ? Math.min(100, (used / b[key]) * 100) : 0;
    return (
      <div className="budget">
        <h3>{title}</h3>
        <div className={"big " + (left < 0 ? "over" : "left")}>{money(Math.abs(left), "AUD")}</div>
        <div className="small">{left < 0 ? "over budget" : "left to spend"}</div>
        <div className="bar"><i className={left < 0 ? "over" : ""} style={{ width: pct + "%" }} /></div>
        <div className="small muted">{money(used, "AUD")} planned so far (hotels, car, tickets and costs below)</div>
        <label>Budget A$<input type="number" min={0} step={100} value={b[key]} onChange={(e) => dispatch({ type: "setBudgets", budgets: { ...b, [key]: Math.max(0, +e.target.value) } })} /></label>
      </div>
    );
  };
  return (
    <>
      <div className="budgets">
        {card("darius", "Darius")}
        {card("couple", "Zaynab & Ruhullah (shared)")}
      </div>
      {!haveRates && <p className="warn small">Yen and yuan costs aren't counted until an exchange rate loads (or you enter one below).</p>}
    </>
  );
}
