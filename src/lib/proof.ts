import { buildMainnetSet } from "./seed-data";

/** Blob ids of the 12 mainnet writes (README table). Public on purpose: they prove the writes. */
const BLOBS = [
  "ybIaw2ZXRsEHcJzWvBna-j3K7fsfcGoJL7uo0IBcf0Y", "OxQbNb0UJ3v82LocWUumD7R9TYxt7L5x0dXQpV9-acI", "HvvyYDikARil0S5U81hnYKAFvMzs1ntCRNnqiq9Wnyw",
  "a42nGp1RgdLv5bSYX0rs_Uk0IZ48d0vgoVDH0kqczSA", "CDidQc6C3sjZXXlur2UYScztwEYUxlZRNKo1YPsmG_E", "orq4vy9PmWXemMcyKiVKpEWWvStfOQ9dEVObGbjVpBw",
  "MbJSvApnqBAena960rT0uOUk5EysaEunKcW0dNAS4Yw", "jDJMFl5P_v-ss4-D31qrW_kGt2xxpRbtDHdL1Kfcv94", "ktRPVNYOr4HcuoUWPSAF6uErNa-YKHvajyWTcBXyZCw",
  "qZCafu7p7nMGTvpmeBBeHcBt6AxgiDL0Oz6WynDse7I", "I9PI0ts-e3CVv2XV2FIGX2-DlpKefRkYSs5ZlWr_RYk", "WokGBWkO1fQuz17MkscRPUOHbPLMhqifca1-IABhlas",
];

/** Metadata only. The typed reasons and recipients are never included. */
export const PROOF_ROWS = buildMainnetSet("demo", 0).map((d, i) => ({ id: d.id, action: d.action, kind: d.kind, amount: d.amount, blobId: BLOBS[i] }));
