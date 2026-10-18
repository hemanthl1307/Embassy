import { COMPANY } from "./config";

const MM_X = 25.4 / 96;
const MM_Y = 25.4 / 72;

const unit = (s) => ({
  w: (px) => (px * MM_X * s).toFixed(3) + "mm",
  h: (pt) => (pt * MM_Y * s).toFixed(3) + "mm",
  f: (pt) => (pt * s).toFixed(2) + "pt",
});

const sum = (list) => list.reduce((a, b) => a + b, 0);

function Field({ value, onChange, locked, type = "text", area }) {
  const props = {
    className: "f" + (value ? "" : " empty"),
    value: value || "",
    readOnly: locked,
    onChange: (e) => onChange(e.target.value),
  };
  return area ? <textarea {...props} /> : <input type={type} {...props} />;
}

function YesNo({ value, onChange, locked }) {
  return (
    <select
      className="f"
      value={value || ""}
      disabled={locked}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value=""></option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  );
}

const WEEKLY_KEYS = [
  "sr",
  "equip",
  "make",
  "asset",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
];

const WEEKLY_CHECKS = [
  "Equipment is cleaned",
  "Is there any visible damage",
  "Is there any damage in power cables",
  "Switches are working properly",
  "Wheels are in good condition",
  "Any damage Hose/Pipe/ Accessories",
  "Charging cables/cords is good to use",
  "Moving parts are guarded",
  "Any abnormal noise & vibration",
];

export function Weekly({ rows, meta, locked, block, setCell, setMeta }) {
  const u = unit(0.708);
  const cols = [78, 211, 114, 110, 103, 103, 103, 103, 103, 103, 103, 103, 103];
  const val = (key, fallback) =>
    meta[key] !== undefined ? meta[key] : fallback;

  return (
    <table
      className="paper"
      style={{ width: u.w(sum(cols)), fontSize: u.f(11) }}
    >
      <colgroup>
        {cols.map((c, i) => (
          <col key={i} style={{ width: u.w(c) }} />
        ))}
      </colgroup>
      <tbody>
        <tr style={{ height: u.h(21) }}>
          <td colSpan={2} rowSpan={4} className="logo">
            <img
              src={COMPANY.logo}
              alt=""
              style={{ width: u.w(270), height: u.h(78) }}
            />
          </td>
          <td colSpan={7} rowSpan={4} className="c">
            <div style={{ fontSize: u.f(14), fontWeight: 700 }}>
              EMBASSY REIT
            </div>
            <div>HK Machinery Weekly Inspection Checklist</div>
            <div>Embassy Manyata Business Park</div>
          </td>
          <td colSpan={4}>Document Number: IMSP30 F22 MP</td>
        </tr>
        <tr style={{ height: u.h(21) }}>
          <td colSpan={4}>Issued Date: 01/04/2026</td>
        </tr>
        <tr style={{ height: u.h(21) }}>
          <td colSpan={4}>Rev No: 0</td>
        </tr>
        <tr style={{ height: u.h(21) }}>
          <td colSpan={4}>Revised Date: NA</td>
        </tr>
        <tr style={{ height: u.h(20) }}>
          <td colSpan={13} className="nob"></td>
        </tr>
        <tr style={{ height: u.h(50) }}>
          <td colSpan={2} className="rel">
            <div className="fill col">
              <b>Date of inspection:</b>
              <Field
                type="date"
                value={val("inspDate", "")}
                locked={locked}
                onChange={(v) => setMeta("inspDate", v)}
              />
            </div>
          </td>
          <td colSpan={2} className="rel">
            <div className="fill col">
              <b>Block:</b>
              <Field
                value={val("block", block)}
                locked={locked}
                onChange={(v) => setMeta("block", v)}
              />
            </div>
          </td>
          {WEEKLY_CHECKS.map((t) => (
            <td
              key={t}
              className="c"
              style={{ fontSize: u.f(9), fontWeight: 700 }}
            >
              {t}
            </td>
          ))}
        </tr>
        <tr style={{ height: u.h(26), fontWeight: 700 }} className="c">
          <td className="c">Sr. No.</td>
          <td className="c">Equipment Description</td>
          <td className="c">Make/Model</td>
          <td className="c">Asset No.</td>
          {WEEKLY_CHECKS.map((t) => (
            <td
              key={t}
              className="c"
              style={{ fontSize: u.f(10), fontWeight: 400 }}
            >
              Yes/No
            </td>
          ))}
        </tr>
        {rows.map((row, i) => (
          <tr key={i} style={{ height: u.h(22) }}>
            {WEEKLY_KEYS.map((k, j) => (
              <td key={k} className="rel">
                {j >= 4 ? (
                  <YesNo
                    value={row[k]}
                    locked={locked}
                    onChange={(v) => setCell(i, k, v)}
                  />
                ) : (
                  <Field
                    value={row[k]}
                    locked={locked}
                    onChange={(v) => setCell(i, k, v)}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
        <tr style={{ height: u.h(66) }}>
          <td colSpan={13} className="rel">
            <div className="fill col">
              <b>Remarks/Comments:</b>
              <Field
                area
                value={val("remarks", "")}
                locked={locked}
                onChange={(v) => setMeta("remarks", v)}
              />
            </div>
          </td>
        </tr>
        <tr style={{ height: u.h(22) }}>
          <td colSpan={13} className="nob"></td>
        </tr>
        <tr style={{ height: u.h(22) }}>
          <td colSpan={6}>Checked by: HK Executive</td>
          <td colSpan={7}>Verified by: HK Manager</td>
        </tr>
        <tr style={{ height: u.h(22) }}>
          <td colSpan={6} className="rel">
            <div className="fill row">
              <span>Name:</span>
              <Field
                value={val("chkName", "")}
                locked={locked}
                onChange={(v) => setMeta("chkName", v)}
              />
            </div>
          </td>
          <td colSpan={7} className="rel">
            <div className="fill row">
              <span>Name:</span>
              <Field
                value={val("verName", "")}
                locked={locked}
                onChange={(v) => setMeta("verName", v)}
              />
            </div>
          </td>
        </tr>
        <tr style={{ height: u.h(22) }}>
          <td colSpan={6} className="rel">
            <div className="fill row">
              <span>Signature:</span>
              <Field
                value={val("chkSign", "")}
                locked={locked}
                onChange={(v) => setMeta("chkSign", v)}
              />
            </div>
          </td>
          <td colSpan={7} className="rel">
            <div className="fill row">
              <span>Signature:</span>
              <Field
                value={val("verSign", "")}
                locked={locked}
                onChange={(v) => setMeta("verSign", v)}
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const MONTHLY_KEYS = [
  "sl",
  "date",
  "machine",
  "brand",
  "start",
  "close",
  "hours",
  "cleaning",
  "emp",
  "signature",
  "supervisor",
  "executive",
  "remarks",
];

const MONTHLY_TYPES = { date: "date", start: "time", close: "time" };

const MONTHLY_HEADS = [
  "Sl #",
  "Date",
  "Machine Name",
  "Brand",
  "Working Start Time",
  "Work Close Time",
  "Total Working Hour",
  "Machine Cleaning After work",
  "Emp Name",
  "Signature",
  "Supervisor Signature",
  "Executive Signature",
  "Remarks",
];

export function Monthly({
  rows,
  meta,
  locked,
  block,
  monthLabel,
  setCell,
  setMeta,
}) {
  const u = unit(0.81);
  const cols = [49, 79, 224, 82, 84, 86, 92, 124, 92, 98, 88, 90, 91];
  const val = (key, fallback) =>
    meta[key] !== undefined ? meta[key] : fallback;

  return (
    <table
      className="paper"
      style={{ width: u.w(sum(cols)), fontSize: u.f(9) }}
    >
      <colgroup>
        {cols.map((c, i) => (
          <col key={i} style={{ width: u.w(c) }} />
        ))}
      </colgroup>
      <tbody>
        <tr style={{ height: u.h(26) }}>
          <td colSpan={3} className="rel">
            <div className="fill row" style={{ fontSize: u.f(10) }}>
              <span>Month :</span>
              <Field
                value={val("month", monthLabel)}
                locked={locked}
                onChange={(v) => setMeta("month", v)}
              />
            </div>
          </td>
          <td colSpan={7} className="c" style={{ fontSize: u.f(11) }}>
            TCFM Housekeeping Machines Monthly Working Hour Data
          </td>
          <td colSpan={3} className="rel">
            <div className="fill row" style={{ fontSize: u.f(10) }}>
              <b>Block Name :</b>
              <Field
                value={val("block", block)}
                locked={locked}
                onChange={(v) => setMeta("block", v)}
              />
            </div>
          </td>
        </tr>
        <tr style={{ height: u.h(34) }}>
          {MONTHLY_HEADS.map((t) => (
            <td key={t} className="c">
              {t}
            </td>
          ))}
        </tr>
        {rows.map((row, i) => (
          <tr key={i} style={{ height: u.h(25) }}>
            {MONTHLY_KEYS.map((k) => (
              <td key={k} className="rel">
                <Field
                  type={MONTHLY_TYPES[k] || "text"}
                  value={row[k]}
                  locked={locked || k === "hours"}
                  onChange={(v) => setCell(i, k, v)}
                />
              </td>
            ))}
          </tr>
        ))}
        <tr style={{ height: u.h(28) }}>
          <td colSpan={5} className="rel">
            <div className="fill row">
              <span>Property Manager Signature :</span>
              <Field
                value={val("pmSign", "")}
                locked={locked}
                onChange={(v) => setMeta("pmSign", v)}
              />
            </div>
          </td>
          <td colSpan={4}></td>
          <td colSpan={4} className="rel">
            <div className="fill row top">
              <span>Facility Manager Signature :</span>
              <Field
                value={val("fmSign", "")}
                locked={locked}
                onChange={(v) => setMeta("fmSign", v)}
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
