import { useState, useEffect } from "react";
import { api } from "./api";

export default function Blocks({ pick }) {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api("/blocks")
      .then((data) =>
        setList(
          data.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true }),
          ),
        ),
      )
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const add = async () => {
    try {
      setError("");
      await api("/blocks", { method: "POST", body: { name: newName } });
      setNewName("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = list.filter((b) =>
    b.name.includes(search.trim().toUpperCase()),
  );

  return (
    <div className="wrap">
      <h1>Working hour sheets</h1>
      <p className="sub">
        Select your block to open its weekly and monthly sheets.
      </p>
      <div className="row">
        <input
          className="in"
          placeholder="Search block, e.g. G1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="grid">
        {shown.map((b) => (
          <button key={b._id} className="tile" onClick={() => pick(b)}>
            {b.name}
            <small>Open sheets</small>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 28 }}>
        <input
          className="in"
          placeholder="New block name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={10}
        />
        <button className="btn" onClick={add}>
          + Add new block
        </button>
      </div>
    </div>
  );
}
