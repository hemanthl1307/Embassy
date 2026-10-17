import { useState } from "react";
import { COMPANY } from "./config";

export default function Logo({ size = 36 }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="logo-fallback" style={{ width: size, height: size }}>
        {COMPANY.name.slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={COMPANY.logo}
      alt="logo"
      height={size}
      style={{ maxWidth: size * 3, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}
