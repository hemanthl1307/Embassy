import { useState } from "react";
import Auth from "./Auth";
import Blocks from "./Blocks";
import Sheet from "./Sheet";
import Logo from "./Logo";
import { COMPANY } from "./config";

export default function App() {
  const [user, setUser] = useState(
    localStorage.getItem("t") ? localStorage.getItem("n") : null,
  );
  const [block, setBlock] = useState(null);

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setBlock(null);
  };

  if (!user) return <Auth onDone={setUser} />;

  return (
      <div className="app">
      <header className="top noprint">
        <div className="brand" onClick={() => setBlock(null)}>
          <Logo size={44} />
          <b>{COMPANY.name}</b>
        </div>
        <span>
          {user}{" "}
          <button className="link" onClick={logout}>
            Logout
          </button>
        </span>
      </header>
      {block ? (
        <Sheet key={block._id} block={block} back={() => setBlock(null)} />
      ) : (
        <Blocks pick={setBlock} />
      )}
      <footer className="footer noprint">
    <p>Built with <span className="heart">♥</span> by Hemanth L</p>
    <p>© {new Date().getFullYear()} All rights reserved.</p>
    </footer>
    </div>
  );
}
