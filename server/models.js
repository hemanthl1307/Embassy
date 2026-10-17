const mongoose = require("mongoose");

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", type: "date", width: 140 },
  { key: "machine", label: "Machine Name", type: "text", width: 200 },
  { key: "brand", label: "Brand", type: "text", width: 120 },
  { key: "start", label: "Working Start Time", type: "time", width: 140 },
  { key: "close", label: "Work Close Time", type: "time", width: 140 },
  { key: "hours", label: "Total Working Hour", type: "text", width: 130 },
  {
    key: "cleaning",
    label: "Machine Cleaning After work",
    type: "text",
    width: 190,
  },
  { key: "emp", label: "Emp Name", type: "text", width: 150 },
  { key: "signature", label: "Signature", type: "text", width: 130 },
  {
    key: "supervisor",
    label: "Supervisor Signature",
    type: "text",
    width: 150,
  },
  { key: "executive", label: "Executive Signature", type: "text", width: 150 },
  { key: "remarks", label: "Remarks", type: "text", width: 200 },
];

const DEFAULT_TITLES = {
  monthly: "TCFM Housekeeping Machines Monthly Working Hour Data",
  weekly: "TCFM Housekeeping Machines Weekly Working Hour Data",
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
    title: String,
    columns: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    locked: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    updatedBy: String,
  },
  { timestamps: true },
);
sheetSchema.index({ block: 1, kind: 1, month: 1 }, { unique: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Block: mongoose.model("Block", blockSchema),
  Sheet: mongoose.model("Sheet", sheetSchema),
  DEFAULT_COLUMNS,
  DEFAULT_TITLES,
};
