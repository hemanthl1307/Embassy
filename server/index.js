require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const routes = require("./routes");
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("Set MONGO_URI and JWT_SECRET in server/.env");
  process.exit(1);
}
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
app.use("/api", rateLimit({ windowMs: 60000, max: 3000 }));
app.use("/api", routes);
const dist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(dist));
app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  if (res.headersSent) return res.end();
  res
    .status(err.status || 500)
    .json({
      error: err.status ? err.message : "Server error, please try again",
    });
});
process.on("unhandledRejection", (e) => console.error(e));
process.on("uncaughtException", (e) => console.error(e));
mongoose
  .connect(process.env.MONGO_URI, { maxPoolSize: 50 })
  .then(async () => {
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    app.listen(process.env.PORT || 5000, () =>
      console.log("Running on port " + (process.env.PORT || 5000)),
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
