// Every number below comes from docs/spike-results.md or the test suite. Examples are labelled as demo data.
export const TESTS = "77";

export const NAV = [
  { href: "#how", label: "How it works", id: "how" },
  { href: "#proof", label: "Proof", id: "proof" },
  { href: "#stack", label: "Stack", id: "stack" },
  { href: "#words", label: "In your words", id: "words" },
  { href: "#keeps", label: "Memory", id: "keeps" },
  { href: "#faq", label: "FAQ", id: "faq" },
  { href: "/docs", label: "Docs" },
  { href: "#log", label: "Build log", id: "log" },
];

export const BUILT_ON = ["Walrus Memory", "Tatum", "Sui", "Seal", "Walrus Memory", "Tatum", "Sui", "Seal"];

export const SCOPE = ["Transfers", "New recipients", "Large amounts", "Late-night sends"];

export const LADDER = [
  { n: "01", title: "Normal: no relevant memory", icon: "normal" },
  { n: "02", title: "Reminder: one similar denial", icon: "reminder" },
  { n: "03", title: "Reflection: asks you to reconsider", icon: "reflection" },
  { n: "04", title: "Hold: confirm it is intentional", icon: "hold" },
  { n: "05", title: "Counterfactual: the verdict without memory", icon: "counter" },
  { n: "06", title: "Regret replay: your original reason", icon: "replay" },
];

export const PROOF = [
  {
    tag: "Tatum gRPC",
    name: "Live chain facts",
    stats: [
      ["4 / 4", "Live calls passed"],
      ["Native", "gRPC transport"],
      ["3 rps", "Free plan, paced"],
      ["Testnet", "Current network"],
    ],
  },
  {
    tag: "Walrus Memory",
    name: "Decisions remembered",
    stats: [
      ["25.7s", "Write, background"],
      ["2.6s", "Recall"],
      ["$0", "From owner wallet"],
      ["Mainnet", "Relayer used"],
    ],
  },
  {
    tag: "Engine",
    name: "Explainable verdicts",
    stats: [
      [TESTS, "Tests passing"],
      ["4", "Friction levels"],
      ["4", "Fixed weights"],
      ["0", "ML claims"],
    ],
  },
  {
    tag: "Fail closed",
    name: "Never a silent allow",
    stats: [
      ["2", "Retries on 429"],
      ["Reflect", "If data is missing"],
      ["Off", "Public execute"],
      ["1", "Write per decision"],
    ],
  },
  {
    tag: "Status",
    name: "Hackathon run",
    stats: [
      ["10+", "Mainnet memories due"],
      ["10 Nov", "Submission"],
      ["Live", "Check page"],
      ["Track 3", "Consumer finance"],
    ],
  },
];

export const STACK = [
  { name: "Walrus Memory", href: "https://docs.wal.app/walrus-memory", text: "Stores each decision with your typed reason. Recall brings them back, and the blob id is the receipt for a send that never happened." },
  { name: "Tatum", href: "https://docs.tatum.io/reference/rpc-sui", text: "Supplies current chain facts over gRPC: balance, recipient history, a dry-run, and execution only after you approve." },
  { name: "Sui", href: "https://docs.sui.io", text: "The chain the firewall watches. Transaction history gives the recipient novelty and your usual transfer size." },
  { name: "Seal", href: "https://seal-docs.wal.app/", text: "Encrypts memories by default through the relayer. The relayer decrypts server-side, so we do not call this zero-trust." },
];

// Demo data only: these illustrate the product and are not real users or endorsements.
export const WORDS = [
  { who: "0x8a…21f", sub: "Denied 7 SUI, new recipient", quote: "Too large for someone I have never paid. If this is real they can send a small test first." },
  { who: "0x41…c07", sub: "Denied 12 SUI, 02:14", quote: "Random address from Discord, felt scammy. I do not make decisions like this at 2am." },
  { who: "0xd3…9ea", sub: "Denied 5 SUI, first interaction", quote: "I was rushed into this. Nobody who means well needs an answer in five minutes." },
  { who: "0x7c…b18", sub: "Overrode warning, 1 SUI", quote: "I know this one. It is my own second wallet, so stop asking me about it." },
  { who: "0x2f…e64", sub: "Denied 20 SUI, unusual size", quote: "Ten times what I normally send. Make me look at this twice." },
];

export const KEEPS = [
  { name: "Hard memory", sub: "Never send to this", tile: "star", why: "A permanent rule for one address. It always holds until you delete it." },
  { name: "Soft memory", sub: "Careful at this size", tile: "spheres", why: "A preference about amounts. It raises friction on similar sends without blocking." },
  { name: "Context memory", sub: "Why you said no", tile: "ball", why: "The late hour, the new recipient, your own words. Quoted back when it matches." },
  { name: "Counter-evidence", sub: "Approvals count too", tile: "star2", why: "Approvals and overrides offset denials, so it never hardens into a blacklist." },
];

export const FAQ = [
  ["What does Said-No do?", "Before a Sui send, it reads live chain facts through Tatum and recalls your past decisions from Walrus Memory. If you rejected something similar, it raises the friction and quotes your own reason."],
  ["Does it decide what is dangerous?", "No. It does not claim a transaction is objectively unsafe. It asks whether you still agree with a decision you already made, and you stay in control."],
  ["Is this machine learning?", "No. It is explainable similarity-weighted memory: fixed, printed weights for recipient, amount, time of day and interaction pattern, compared against your stored decisions."],
  ["Why Walrus Memory and not a database?", "A database could hold the rows. Walrus Memory gives an owner-controlled space with encrypted blobs that another agent can read through a key you grant on chain. We concede delegates can also write, and the relayer decrypts server-side."],
  ["What does Tatum do here?", "It is the source of current chain facts over gRPC: balance, recipient history, simulating the send, and executing only after you approve."],
  ["What happens if Tatum or Memory is down?", "It fails closed. A missing input raises the verdict to at least Reflection, never a silent allow."],
  ["A denied send has no transaction. What is the proof?", "The memory itself. A denied send never touches the chain, so the receipt is the Walrus blob id, with your typed reason and the timestamp."],
];

export const LOG = [
  { title: "Tatum speaks native gRPC, not grpc-web", tag: "Spike", date: "October 30, 2026", icon: "star" },
  { title: "The Memory staging relayer is gone, so writes go to mainnet", tag: "Spike", date: "October 30, 2026", icon: "ball" },
  { title: "A first send has no baseline: fixing an amount ratio of ten million", tag: "Engine", date: "October 30, 2026", icon: "spheres" },
];
