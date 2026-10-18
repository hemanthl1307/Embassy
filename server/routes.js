const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const path = require("path");
const { User, Block, Sheet, TEMPLATES } = require("./models");

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

const TEMPLATE_FILE = path.join(
  __dirname,
  "templates",
  "Embassy_Checklists.xlsx",
);
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

const cleanRow = (row, kind) =>
  Object.fromEntries(
    TEMPLATES[kind].keys.map((k) => [
      k,
      String((row && row[k]) || "").slice(0, 200),
    ]),
  );

const blankRows = (kind) =>
  Array.from({ length: TEMPLATES[kind].rows }, () => cleanRow({}, kind));

const cleanMeta = (meta, kind) =>
  Object.fromEntries(
    TEMPLATES[kind].meta
      .filter((k) => meta && meta[k] !== undefined)
      .map((k) => [k, String(meta[k]).slice(0, k === "remarks" ? 1000 : 200)]),
  );

const view = (s) => {
  const kind = s.kind || "monthly";
  return {
    rows: Array.from({ length: TEMPLATES[kind].rows }, (_, i) =>
      cleanRow(s.rows[i], kind),
    ),
    meta: s.meta || {},
    locked: !!s.locked,
    version: s.version,
    updatedBy: s.updatedBy || "",
  };
};

const dateText = (v) => (v ? v.split("-").reverse().join("/") : "");
const periodLabel = (kind, p) =>
  kind === "monthly"
    ? monthNames[Number(p.slice(5, 7)) - 1] + " " + p.slice(0, 4)
    : "Week of " + dateText(p);

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
          { $setOnInsert: { rows: blankRows(kind), meta: {}, version: 0 } },
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
    const { id, kind, period } = req.params;
    if (!Array.isArray(req.body.rows)) throw bad("Invalid rows");
    const rows = req.body.rows
      .slice(0, TEMPLATES[kind].rows)
      .map((r) => cleanRow(r, kind));
    const meta = cleanMeta(req.body.meta, kind);
    const sheet = await Sheet.findOneAndUpdate(
      {
        block: id,
        month: period,
        locked: { $ne: true },
        version: Number(req.body.version),
      },
      { $set: { rows, meta, updatedBy: req.user.name }, $inc: { version: 1 } },
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
    const m = sheet.meta;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(TEMPLATE_FILE);
    wb.removeWorksheet(kind === "weekly" ? "Monthly" : "Weekly");
    const ws = wb.getWorksheet(kind === "weekly" ? "Weekly" : "Monthly");

    const firstRow = kind === "weekly" ? 8 : 3;
    sheet.rows.forEach((row, i) => {
      TEMPLATES[kind].keys.forEach((key, j) => {
        ws.getCell(firstRow + i, j + 1).value = row[key] || null;
      });
    });

    const put = (address, text) => {
      ws.getCell(address).value = text;
    };
    if (kind === "weekly") {
      put("A6", "Date of inspection: " + dateText(m.inspDate));
      put("C6", "Block: " + (m.block !== undefined ? m.block : block.name));
      put("A27", "Remarks/Comments:\n" + (m.remarks || ""));
      put("A30", "Name: " + (m.chkName || ""));
      put("A31", "Signature: " + (m.chkSign || ""));
      put("G30", "Name: " + (m.verName || ""));
      put("G31", "Signature: " + (m.verSign || ""));
    } else {
      put(
        "A1",
        "Month : " +
          (m.month !== undefined ? m.month : periodLabel(kind, period)),
      );
      put(
        "K1",
        "Block Name : " + (m.block !== undefined ? m.block : block.name),
      );
      put("A25", "Property Manager Signature : " + (m.pmSign || ""));
      put("J25", "Facility Manager Signature : " + (m.fmSign || ""));
    }

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
