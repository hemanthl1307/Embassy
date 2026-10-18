const mongoose = require("mongoose");

const TEMPLATES = {
  monthly: {
    rows: 22,
    keys: [
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
    ],
    meta: ["month", "block", "pmSign", "fmSign"],
  },
  weekly: {
    rows: 19,
    keys: [
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
    ],
    meta: [
      "inspDate",
      "block",
      "remarks",
      "chkName",
      "chkSign",
      "verName",
      "verSign",
    ],
  },
};

const userSchema = new mongoose.Schema(
  {
    name: String,
    username: { type: String, unique: true },
    passwordHash: String,
  },
  { timestamps: true },
);

const blockSchema = new mongoose.Schema(
  { name: { type: String, unique: true } },
  { timestamps: true },
);
blockSchema.pre(
  ["deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"],
  () => {
    throw new Error("Blocks cannot be deleted");
  },
);

const sheetSchema = new mongoose.Schema(
  {
    block: { type: mongoose.Schema.Types.ObjectId, ref: "Block" },
    kind: { type: String, default: "monthly" },
    month: String,
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    locked: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    updatedBy: String,
  },
  { timestamps: true, minimize: false },
);
sheetSchema.index({ block: 1, kind: 1, month: 1 }, { unique: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Block: mongoose.model("Block", blockSchema),
  Sheet: mongoose.model("Sheet", sheetSchema),
  TEMPLATES,
};
