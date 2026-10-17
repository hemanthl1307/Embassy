const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const {
  User,
  Block,
  Sheet,
  DEFAULT_COLUMNS,
  DEFAULT_TITLES,
} = require("./models");

const KINDS = ["monthly", "weekly"];
const TYPES = ["text", "date", "time"];

const h = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const bad = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};
const idOk = (id) => /^[a-f0-9]{24}$/.test(id);
const periodOk = (kind, p) =>
  kind === "monthly"
    ? /^\d{4}-(0[1-9]|1[0-2])$/.test(p)
    : /^\d{4}-\d{2}-\d{2}$/.test(p) && !isNaN(new Date(p));

const authLimit = rateLimit({
  windowMs: 15 * 60000,
  max: 100,
  skipSuccessfulRequests: true,
});
const sign = (u) =>
  jwt.sign({ id: u._id, name: u.name }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

const cleanColumns = (cols) => {
  if (!Array.isArray(cols) || cols.length < 1 || cols.length > 40)
    throw bad("Invalid columns");
  const seen = new Set();
  return cols.map((c) => {
    const key = String((c && c.key) || "");
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,29}$/.test(key) || seen.has(key))
      throw bad("Invalid column");
    seen.add(key);
    return {
      key,
      label: String(c.label || "").slice(0, 60),
      type: TYPES.includes(c.type) ? c.type : "text",
      width: Math.min(600, Math.max(60, Number(c.width) || 150)),
    };
  });
};

const cleanRows = (rows, cols) =>
  rows
    .slice(0, 500)
    .map((r) =>
      Object.fromEntries(
        cols.map((c) => [c.key, String((r && r[c.key]) || "").slice(0, 200)]),
      ),
    );

const blankRows = (cols) =>
  Array.from({ length: 8 }, () => cleanRows([{}], cols)[0]);

const view = (s) => ({
  rows: s.rows,
  columns: s.columns && s.columns.length ? s.columns : DEFAULT_COLUMNS,
  title: s.title || DEFAULT_TITLES[s.kind || "monthly"],
  locked: !!s.locked,
  version: s.version,
  updatedBy: s.updatedBy || "",
});

router.post(
  "/auth/signup",
  authLimit,
  h(async (req, res) => {
    const name = String(req.body.name || "")
      .trim()
      .slice(0, 60);
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    if (
      !name ||
      !/^[a-z0-9._-]{3,30}$/.test(username) ||
      password.length < 6 ||
      password.length > 100
    ) {
      throw bad(
        "Enter your name, a username (3-30 letters or numbers) and a password (minimum 6)",
      );
    }
    if (await User.findOne({ username }))
      throw bad("Username already taken", 409);
    const user = await User.create({
      name,
      username,
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.json({ token: sign(user), name: user.name });
  }),
);

router.post(
  "/auth/login",
  authLimit,
  h(async (req, res) => {
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();
    const user = await User.findOne({ username });
    const ok =
      user &&
      (await bcrypt.compare(
        String(req.body.password || ""),
        user.passwordHash,
      ));
    if (!ok) throw bad("Wrong username or password", 401);
    res.json({ token: sign(user), name: user.name });
  }),
);

router.use((req, res, next) => {
  try {
    req.user = jwt.verify(
      (req.headers.authorization || "").slice(7),
      process.env.JWT_SECRET,
    );
    next();
  } catch (e) {
    next(bad("Please login again", 401));
  }
});

router.get(
  "/blocks",
  h(async (req, res) => res.json(await Block.find().lean())),
);

router.post(
  "/blocks",
  h(async (req, res) => {
    const name = String(req.body.name || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9-]{1,10}$/.test(name))
      throw bad("Block name can have 1-10 letters or numbers");
    if (await Block.findOne({ name })) throw bad("Block already exists", 409);
    res.json(await Block.create({ name }));
  }),
);

const check = h(async (req, res, next) => {
  const { id, kind, period } = req.params;
  if (
    !idOk(id) ||
    (kind && !KINDS.includes(kind)) ||
    (period && !periodOk(kind, period))
  ) {
    throw bad("Invalid request");
  }
  if (!(await Block.exists({ _id: id }))) throw bad("Block not found", 404);
  next();
});

const base = "/blocks/:id/sheets/:kind";

router.get(
  base,
  check,
  h(async (req, res) => {
    const { id, kind } = req.params;
    const kindFilter =
      kind === "monthly"
        ? { $or: [{ kind: "monthly" }, { kind: { $exists: false } }] }
        : { kind };
    res.json(
      await Sheet.find({ block: id, ...kindFilter })
        .select("month")
        .sort({ month: 1 })
        .lean(),
    );
  }),
);

router.get(
  base + "/:period",
  check,
  h(async (req, res) => {
    const { id, kind, period } = req.params;
    let sheet = await Sheet.findOne({ block: id, month: period }).lean();
    if (!sheet) {
      try {
        sheet = await Sheet.findOneAndUpdate(
          { block: id, kind, month: period },
          {
            $setOnInsert: {
              title: DEFAULT_TITLES[kind],
              columns: DEFAULT_COLUMNS,
              rows: blankRows(DEFAULT_COLUMNS),
              version: 0,
            },
          },
          { upsert: true, new: true, lean: true },
        );
      } catch (e) {
        if (e.code !== 11000) throw e;
        sheet = await Sheet.findOne({ block: id, month: period }).lean();
      }
    }
    res.json(view(sheet));
  }),
);

router.put(
  base + "/:period",
  check,
  h(async (req, res) => {
    const { id, period } = req.params;
    if (!Array.isArray(req.body.rows)) throw bad("Invalid rows");
    const columns = cleanColumns(req.body.columns);
    const rows = cleanRows(req.body.rows, columns);
    const title = String(req.body.title || "").slice(0, 150);
    const sheet = await Sheet.findOneAndUpdate(
      {
        block: id,
        month: period,
        locked: { $ne: true },
        version: Number(req.body.version),
      },
      {
        $set: { rows, columns, title, updatedBy: req.user.name },
        $inc: { version: 1 },
      },
      { new: true, lean: true },
    );
    if (!sheet) {
      const current = await Sheet.findOne({ block: id, month: period })
        .select("locked")
        .lean();
      if (current && current.locked)
        throw bad("This sheet is locked. Unlock it to make changes.", 423);
      throw bad(
        "Someone else saved this sheet before you. Reload the page to see the latest data.",
        409,
      );
    }
    res.json({ version: sheet.version });
  }),
);

router.post(
  base + "/:period/lock",
  check,
  h(async (req, res) => {
    const { id, period } = req.params;
    const sheet = await Sheet.findOneAndUpdate(
      { block: id, month: period },
      {
        $set: { locked: Boolean(req.body.locked), updatedBy: req.user.name },
        $inc: { version: 1 },
      },
      { new: true, lean: true },
    );
    if (!sheet) throw bad("Sheet not found", 404);
    res.json({ locked: sheet.locked, version: sheet.version });
  }),
);

router.delete(
  base + "/:period",
  check,
  h(async (req, res) => {
    const { id, period } = req.params;
    const result = await Sheet.deleteOne({
      block: id,
      month: period,
      locked: { $ne: true },
    });
    if (
      !result.deletedCount &&
      (await Sheet.exists({ block: id, month: period }))
    ) {
      throw bad("This sheet is locked. Unlock it before deleting.", 423);
    }
    res.json({ ok: true });
  }),
);

router.get(
  base + "/:period/export",
  check,
  h(async (req, res) => {
    const { id, kind, period } = req.params;
    const [block, found] = await Promise.all([
      Block.findById(id).lean(),
      Sheet.findOne({ block: id, month: period }).lean(),
    ]);
    if (!found) throw bad("Sheet not found", 404);
    const sheet = view(found);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet");
    ws.addRow([sheet.title]);
    ws.addRow([
      (kind === "monthly" ? "Month : " : "Week starting : ") + period,
      "",
      "Block Name : " + block.name,
    ]);
    ws.addRow(["Sl #", ...sheet.columns.map((c) => c.label)]).font = {
      bold: true,
    };
    sheet.rows.forEach((r, i) =>
      ws.addRow([i + 1, ...sheet.columns.map((c) => r[c.key] || "")]),
    );
    ws.addRow([]);
    ws.addRow([
      "Property Manager Signature :",
      "",
      "Facility Manager Signature :",
    ]);
    ws.getColumn(1).width = 8;
    sheet.columns.forEach((c, i) => {
      ws.getColumn(i + 2).width = Math.max(12, Math.round(c.width / 7));
    });
    ws.getRow(1).font = { bold: true, size: 14 };
    const thin = { style: "thin" };
    ws.eachRow((row, n) => {
      if (n >= 3 && n <= 3 + sheet.rows.length) {
        row.eachCell((cell) => {
          cell.border = { top: thin, left: thin, bottom: thin, right: thin };
        });
      }
    });
    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Block-${block.name}-${kind}-${period}.xlsx"`,
    );
    await wb.xlsx.write(res);
    res.end();
  }),
);

module.exports = router;
