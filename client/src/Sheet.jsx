import { useState, useEffect } from "react";
import { api } from "./api";
import { Weekly, Monthly } from "./Paper";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const mondayOf = (dateText) => {
  const d = new Date(dateText + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const currentPeriod = (kind) => {
  const now = new Date();
  if (kind === "monthly")
    return (
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")
    );
  return mondayOf(now.toISOString().slice(0, 10));
};

const nextPeriod = (kind, p) => {
  if (kind === "monthly") {
    let year = Number(p.slice(0, 4));
    let month = Number(p.slice(5, 7)) + 1;
    if (month > 12) {
      month = 1;
      year++;
    }
    return year + "-" + String(month).padStart(2, "0");
  }
  const d = new Date(p + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
};

const labelOf = (kind, p) => {
  if (kind === "monthly")
    return monthNames[Number(p.slice(5, 7)) - 1] + " " + p.slice(0, 4);
  const date = new Date(p + "T00:00:00Z");
  return (
    "Week of " +
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  );
};

const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const calcHours = (start, close) => {
  if (!start || !close) return "";
  let minutes = toMinutes(close) - toMinutes(start);
  if (minutes < 0) minutes += 1440;
  return (minutes / 60).toFixed(2);
};

export default function Sheet({ block, back }) {
  const id = block._id;
  const [kind, setKind] = useState("monthly");
  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState("");
  const [data, setData] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [agree, setAgree] = useState(false);

  const base = `/blocks/${id}/sheets/${kind}`;
  const locked = data && data.locked;

  const load = async (p) => {
    try {
      setError("");
      const d = await api(`${base}/${p}`);
      setData(d);
      setPeriod(p);
      setDirty(false);
      setMsg("");
      setPeriods((list) => (list.includes(p) ? list : [...list, p].sort()));
    } catch (e) {
      setError(e.message);
    }
  };

  const open = (p) => {
    if (
      dirty &&
      !window.confirm("You have unsaved changes. Leave without saving?")
    )
      return;
    load(p);
  };

  const switchKind = (k) => {
    if (k === kind) return;
    if (
      dirty &&
      !window.confirm("You have unsaved changes. Leave without saving?")
    )
      return;
    setData(null);
    setPeriod("");
    setPeriods([]);
    setKind(k);
  };

  useEffect(() => {
    api(base)
      .then((list) => {
        const months = list.map((s) => s.month);
        setPeriods(months);
        load(months.length ? months[months.length - 1] : currentPeriod(kind));
      })
      .catch((e) => setError(e.message));
  }, [kind]);

  useEffect(() => {
    if (!period) return;
    const timer = setInterval(async () => {
      try {
        const list = (await api(base)).map((s) => s.month);
        setPeriods(list);
        if (!list.includes(period)) {
          setData(null);
          setPeriod("");
          setError("This sheet was deleted by another user.");
          return;
        }
        if (!dirty) {
          const d = await api(`${base}/${period}`);
          if (d.version !== data.version) setData(d);
        }
      } catch (e) {}
    }, 15000);
    return () => clearInterval(timer);
  }, [kind, period, dirty, data]);

  const touch = () => {
    setDirty(true);
    setMsg("");
  };

  const setCell = (i, key, value) => {
    setData((d) => {
      const rows = d.rows.map((r, j) => (j === i ? { ...r, [key]: value } : r));
      if (kind === "monthly" && (key === "start" || key === "close")) {
        rows[i].hours = calcHours(rows[i].start, rows[i].close);
      }
      return { ...d, rows };
    });
    touch();
  };

  const setMeta = (key, value) => {
    setData((d) => ({ ...d, meta: { ...d.meta, [key]: value } }));
    touch();
  };

  const save = async () => {
    try {
      setError("");
      const body = { rows: data.rows, meta: data.meta, version: data.version };
      const result = await api(`${base}/${period}`, { method: "PUT", body });
      setData({ ...data, version: result.version });
      setDirty(false);
      setMsg("Saved");
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleLock = async () => {
    try {
      setError("");
      await api(`${base}/${period}/lock`, {
        method: "POST",
        body: { locked: !locked },
      });
      await load(period);
    } catch (e) {
      setError(e.message);
    }
  };

  const download = async () => {
    try {
      const blob = await api(`${base}/${period}/export`, { blob: true });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Block-${block.name}-${kind}-${period}.xlsx`;
      link.click();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeSheet = async () => {
    try {
      await api(`${base}/${period}`, { method: "DELETE" });
      const rest = periods.filter((p) => p !== period);
      setPeriods(rest);
      setShowDelete(false);
      setAgree(false);
      setDirty(false);
      if (rest.length) load(rest[rest.length - 1]);
      else {
        setData(null);
        setPeriod("");
      }
    } catch (e) {
      setError(e.message);
      setShowDelete(false);
    }
  };

  const next = periods.length
    ? nextPeriod(kind, periods[periods.length - 1])
    : currentPeriod(kind);

  return (
    <div className="wrap">
      <div className="row noprint">
        <button
          className="link"
          onClick={() => {
            if (
              !dirty ||
              window.confirm("You have unsaved changes. Leave without saving?")
            )
              back();
          }}
        >
          All blocks
        </button>
      </div>

      <div className="row spread noprint">
        <h1>
          Block {block.name}
          {period && <span className="light"> · {labelOf(kind, period)}</span>}
        </h1>
        {data && (
          <div className="row">
            {msg && <span className="ok">{msg}</span>}
            {dirty && <span className="err">Unsaved changes</span>}
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn" onClick={download} disabled={dirty}>
              Download Excel
            </button>
            <button className="btn" onClick={toggleLock} disabled={dirty}>
              {locked ? "Unlock sheet" : "Lock sheet"}
            </button>
            <button
              className="btn danger"
              onClick={() => setShowDelete(true)}
              disabled={locked}
            >
              Delete sheet
            </button>
            <button className="btn pri" onClick={save} disabled={!dirty}>
              Save
            </button>
          </div>
        )}
      </div>

      <div className="tabs noprint">
        <button
          className={"tab" + (kind === "monthly" ? " on" : "")}
          onClick={() => switchKind("monthly")}
        >
          Monthly sheets
        </button>
        <button
          className={"tab" + (kind === "weekly" ? " on" : "")}
          onClick={() => switchKind("weekly")}
        >
          Weekly sheets
        </button>
      </div>

      <div className="row noprint">
        {periods.map((p) => (
          <button
            key={p}
            className={"pill" + (p === period ? " on" : "")}
            onClick={() => open(p)}
          >
            {labelOf(kind, p)}
          </button>
        ))}
        {!periods.includes(next) && (
          <button className="pill dashed" onClick={() => open(next)}>
            + Start {labelOf(kind, next)}
          </button>
        )}
        <input
          className="in small"
          type={kind === "monthly" ? "month" : "date"}
          aria-label="Open another period"
          onChange={(e) =>
            e.target.value &&
            open(kind === "monthly" ? e.target.value : mondayOf(e.target.value))
          }
        />
      </div>

      {error && (
        <div className="err noprint" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {locked && (
        <div className="notice noprint">
          This sheet is locked. Unlock it to make any changes.
        </div>
      )}

      {data ? (
        <div>
          <div className="print-page">
            <div className="paper-scroll">
              <div className="paper-zoom">
                {kind === "weekly" ? (
                  <Weekly
                    rows={data.rows}
                    meta={data.meta}
                    locked={locked}
                    block={block.name}
                    setCell={setCell}
                    setMeta={setMeta}
                  />
                ) : (
                  <Monthly
                    rows={data.rows}
                    meta={data.meta}
                    locked={locked}
                    block={block.name}
                    monthLabel={labelOf(kind, period)}
                    setCell={setCell}
                    setMeta={setMeta}
                  />
                )}
              </div>
            </div>
          </div>
          {data.updatedBy && (
            <div className="muted noprint" style={{ marginTop: 14 }}>
              Last saved by {data.updatedBy}
            </div>
          )}
        </div>
      ) : (
        <p className="sub noprint">
          No sheet open. Use the Start button above.
        </p>
      )}

      {showDelete && (
        <div className="modal noprint">
          <div className="box">
            <h2>Delete {labelOf(kind, period)} sheet?</h2>
            <p>
              All data in this sheet of Block {block.name} will be erased
              permanently. The block itself stays.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I understand and want to delete this sheet
            </label>
            <div className="row">
              <button
                className="btn"
                onClick={() => {
                  setShowDelete(false);
                  setAgree(false);
                }}
              >
                Cancel
              </button>
              <button
                className="btn solid-danger"
                disabled={!agree}
                onClick={removeSheet}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
