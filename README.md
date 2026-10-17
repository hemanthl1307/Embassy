Setup
1. Install Node 18+ and MongoDB (or a free MongoDB Atlas cluster).
2. Copy server/.env.example to server/.env and fill MONGO_URI and JWT_SECRET (use a long random text).
3. npm run install-all
4. npm run build
5. npm start
Open http://localhost:5000

Company name, tagline and logo
- Edit client/src/config.js to change the company name and tagline.
- Replace client/public/logo.svg with your own logo (png or svg). If you use another file name, change it in config.js.
- Run npm run build again after any change.

Development: run "npm run dev-server" and "npm run dev-client" in two terminals, open http://localhost:5173

Many users: use MongoDB Atlas, run with pm2 (pm2 start server/index.js -i max), and use HTTPS (nginx or a host like Render).
