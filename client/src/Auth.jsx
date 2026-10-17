import { useState } from "react";
import { api } from "./api";
import Logo from "./Logo";
import { COMPANY } from "./config";

export default function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/" + mode, { method: "POST", body: form });
      localStorage.setItem("t", data.token);
      localStorage.setItem("n", data.name);
      onDone(data.name);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-side">
        <Logo size={90} />
        <h1>{COMPANY.name}</h1>
        <p>{COMPANY.tagline}</p>
      </div>
      <div className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Login to open your block sheets."
              : "Sign up once, then just login next time."}
          </p>
          {mode === "signup" && (
            <label>
              Full name
              <input className="in" value={form.name} onChange={set("name")} />
            </label>
          )}
          <label>
            Username
            <input
              className="in"
              value={form.username}
              onChange={set("username")}
              autoCapitalize="none"
            />
          </label>
          <label>
            Password
            <input
              className="in"
              type="password"
              value={form.password}
              onChange={set("password")}
            />
          </label>
          {error && <div className="err">{error}</div>}
          <button className="btn pri" disabled={busy}>
            {mode === "login" ? "Login" : "Create account"}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login"
              ? "New here? Sign up"
              : "Already have an account? Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
