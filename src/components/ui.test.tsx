import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { useReducer, type ReactNode } from "react";
import { StoreCtx } from "../state/hooks";
import { reducer, type AppState } from "../state/store";
import { starterState as defaultState } from "../test-fixtures";
import { FujiPlanner } from "./FujiPlanner";
import { Money } from "./Money";
import { RoutePanel } from "./RoutePanel";
import { resetRatesRequest } from "../lib/fx";

vi.mock("./common", async (orig) => {
  const m: any = await orig();
  return { ...m, MapView: () => <div data-testid="map" /> }; // Leaflet needs a real browser
});

// jsdom has no <dialog>.showModal
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});

let latest: AppState;
function Harness({ children, init }: { children: ReactNode; init?: AppState }) {
  const [state, dispatch] = useReducer(reducer, init ?? defaultState());
  latest = state;
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

function hourly(dates: string[], cloudFor: (d: string) => number) {
  const time: string[] = [], o: Record<string, number[]> = { cloud_cover: [], cloud_cover_low: [], visibility: [], precipitation_probability: [], precipitation: [], wind_gusts_10m: [], snowfall: [], temperature_2m: [] };
  for (const d of dates) for (let h = 0; h < 24; h++) {
    time.push(`${d}T${String(h).padStart(2, "0")}:00`);
    const c = cloudFor(d);
    o.cloud_cover.push(c); o.cloud_cover_low.push(c / 2); o.visibility.push(30000); o.precipitation_probability.push(5); o.precipitation.push(0); o.wind_gusts_10m.push(15); o.snowfall.push(0); o.temperature_2m.push(3);
  }
  return { latitude: 35.5, longitude: 138.76, hourly: { time, ...o } };
}

afterEach(() => { vi.unstubAllGlobals(); resetRatesRequest(); });

describe("Mt Fuji planner", () => {
  it("shows 'Forecast not available yet' when the dates are beyond the horizon", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => hourly(["2026-11-11"], () => 10) })));
    render(<Harness><FujiPlanner today="2026-11-11" /></Harness>);
    expect(await screen.findAllByText(/Forecast not available yet/)).not.toHaveLength(0);
    expect(screen.queryByText(/Best day/)).toBeNull();
  });

  it("shows an error state, not a made-up forecast, when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    render(<Harness><FujiPlanner today="2027-01-01" /></Harness>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Forecast not available/);
    expect(screen.queryByText(/Score \d+/)).toBeNull();
  });

  it("recommends the clearest day and only moves Mt Fuji after confirmation", async () => {
    const dates = ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08", "2027-01-09"];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => hourly(dates, (d) => (d === "2027-01-05" ? 0 : d === "2027-01-03" ? 10 : 90)) })));
    render(<Harness><FujiPlanner today="2026-12-29" /></Harness>);
    await screen.findByText("Best day");
    const best = screen.getByText("Best day").closest(".best") as HTMLElement;
    expect(best).toHaveTextContent("Tue 5 Jan");
    const fujiBefore = latest.schedule.find((i) => i.activityId === "fuji-view")!.date;
    fireEvent.click(within(best).getByRole("button", { name: /Move Mt Fuji/ }));
    // dialog open, nothing changed yet
    expect(latest.schedule.find((i) => i.activityId === "fuji-view")!.date).toBe(fujiBefore);
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent(/back to Saved for later: Taiko/);
    fireEvent.click(within(dlg).getByRole("button", { name: "Move Mt Fuji" }));
    expect(latest.schedule.find((i) => i.activityId === "fuji-view")!.date).toBe("2027-01-05");
    expect(latest.saved).toContain("taiko");
    expect(screen.getByText("Forecast retrieved", { exact: false })).toBeTruthy();
    expect(screen.getAllByText(/Open-Meteo/).length).toBeGreaterThan(0);
  });

  it("refuses to move onto a booked activity", async () => {
    const dates = ["2027-01-05", "2027-01-06", "2027-01-07"];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => hourly(dates, (d) => (d === "2027-01-06" ? 0 : 90)) })));
    let init = defaultState();
    const tdl = init.schedule.find((i) => i.activityId === "tdl")!;
    init = reducer(init, { type: "setItem", uid: tdl.uid, patch: { booked: true } });
    init = { ...init, fujiWindow: { from: "2027-01-05", to: "2027-01-07" } };
    render(<Harness init={init}><FujiPlanner today="2027-01-04" /></Harness>);
    const best = (await screen.findByText("Best day")).closest(".best") as HTMLElement;
    fireEvent.click(within(best).getByRole("button", { name: /Move Mt Fuji/ }));
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent(/Tokyo Disneyland is booked/);
    expect(within(dlg).getByRole("button", { name: "Move Mt Fuji" })).toBeDisabled();
  });
});

describe("Money", () => {
  it("shows live rates with source and converts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ date: new Date().toISOString().slice(0, 10), rates: { JPY: 100, CNY: 5 } }) })));
    render(<Harness><Money /></Harness>);
    await waitFor(() => expect(screen.getByText(/Frankfurter/)).toBeTruthy());
    expect(document.querySelector(".fxout")).toHaveTextContent("A$10.00"); // 1000 JPY
    expect(screen.queryByText(/more than 3 days old/)).toBeNull();
  });
  it("warns when no rate can be loaded and offers manual entry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<Harness><Money /></Harness>);
    expect(await screen.findByText(/No exchange rate available yet/)).toBeTruthy();
    expect(screen.getByText(/Use my own rate/)).toBeTruthy();
  });
});

describe("Route", () => {
  it("validates edited dates", async () => {
    render(<Harness><RoutePanel /></Harness>);
    const fukArrive = screen.getAllByLabelText("Arrive")[1] as HTMLInputElement;
    fireEvent.change(fukArrive, { target: { value: "2026-12-22" } });
    expect(await screen.findByText(/overlap/)).toBeTruthy();
    expect(latest.legs.find((l) => l.id === "leg-fuk")!.arrive).toBe("2026-12-22");
  });
});
