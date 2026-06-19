// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Deployed FaucetToken on Base Sepolia (chainId 84532).
// https://sepolia.basescan.org/address/0xadC9bC29445C2D8CbAa682631A63AbeEb8e0767b
const CONTRACT_ADDRESS = "0xadC9bC29445C2D8CbAa682631A63AbeEb8e0767b";

const ABI = [
  "function claim() external",
  "function canClaim(address user) view returns (bool)",
  "function timeUntilNextClaim(address user) view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function CLAIM_AMOUNT() view returns (uint256)",
  "function COOLDOWN() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "event Claimed(address indexed claimer, uint256 amount, uint256 nextClaimAt)",
];

// ---------------------------------------------------------------------------
// State + refs
// ---------------------------------------------------------------------------

let provider, signer, contract, account;
let symbol = "";
let countdownTimer = null;

const els = {
  connectBtn: document.getElementById("connectBtn"),
  account: document.getElementById("account"),
  balance: document.getElementById("balance"),
  symbol: document.getElementById("symbol"),
  claimAmount: document.getElementById("claimAmount"),
  cooldownText: document.getElementById("cooldownText"),
  claimBtn: document.getElementById("claimBtn"),
  timer: document.getElementById("timer"),
  status: document.getElementById("status"),
  totalSupply: document.getElementById("totalSupply"),
  remaining: document.getElementById("remaining"),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = "status" + (kind ? " " + kind : "");
}

function short(a) {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function fmt(wei) {
  // Show whole tokens with up to 2 decimals, trimmed.
  return parseFloat(ethers.formatEther(wei)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function humanizeDuration(seconds) {
  seconds = Number(seconds);
  if (seconds >= 86400 && seconds % 86400 === 0) {
    const days = seconds / 86400;
    return days === 1 ? "24 hours" : days + " days";
  }
  const h = Math.floor(seconds / 3600);
  if (h >= 1) return h + " hour(s)";
  const m = Math.floor(seconds / 60);
  if (m >= 1) return m + " min";
  return seconds + " sec";
}

function formatCountdown(seconds) {
  seconds = Number(seconds);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

async function connect() {
  if (!window.ethereum) {
    setStatus("No wallet found. Install MetaMask or Coinbase Wallet.", "error");
    return;
  }
  if (!CONTRACT_ADDRESS) {
    setStatus("Set CONTRACT_ADDRESS in app.js after deploying.", "error");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = (await signer.getAddress()).toLowerCase();

    els.account.textContent = "Connected: " + short(account);
    els.account.classList.remove("hidden");
    els.connectBtn.textContent = "Connected";

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    await loadConfig();
    await refresh();
    contract.on("Claimed", () => refresh());
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Failed to connect.", "error");
  }
}

// ---------------------------------------------------------------------------
// Read + render
// ---------------------------------------------------------------------------

async function loadConfig() {
  const [claimAmount, cooldown, sym] = await Promise.all([
    contract.CLAIM_AMOUNT(),
    contract.COOLDOWN(),
    contract.symbol(),
  ]);
  symbol = sym;
  els.symbol.textContent = sym;
  els.claimAmount.textContent = fmt(claimAmount) + " " + sym;
  els.cooldownText.textContent = humanizeDuration(cooldown);
}

async function refresh() {
  if (!contract) return;
  try {
    const [balance, total, remaining, canClaim, wait] = await Promise.all([
      contract.balanceOf(account),
      contract.totalSupply(),
      contract.remainingSupply(),
      contract.canClaim(account),
      contract.timeUntilNextClaim(account),
    ]);

    els.balance.innerHTML = fmt(balance) + " <span>" + symbol + "</span>";
    els.totalSupply.textContent = fmt(total) + " " + symbol;
    els.remaining.textContent = fmt(remaining) + " " + symbol;

    const soldOut = remaining === 0n;
    if (soldOut) {
      els.claimBtn.disabled = true;
      els.claimBtn.textContent = "Faucet empty";
      stopCountdown();
      els.timer.textContent = "";
      return;
    }

    if (canClaim) {
      stopCountdown();
      els.timer.textContent = "";
      els.claimBtn.disabled = false;
      els.claimBtn.textContent = "Claim 🚰";
    } else {
      els.claimBtn.disabled = true;
      els.claimBtn.textContent = "On cooldown";
      startCountdown(Number(wait));
    }
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Failed to load.", "error");
  }
}

// ---------------------------------------------------------------------------
// Cooldown countdown
// ---------------------------------------------------------------------------

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(seconds) {
  stopCountdown();
  let remaining = seconds;
  const tick = () => {
    if (remaining <= 0) {
      stopCountdown();
      refresh(); // cooldown elapsed — re-enable the button
      return;
    }
    els.timer.textContent = "Next claim in " + formatCountdown(remaining);
    remaining -= 1;
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function claim() {
  els.claimBtn.disabled = true;
  try {
    setStatus("Confirm the transaction in your wallet…");
    const tx = await contract.claim();
    setStatus("Claiming…");
    await tx.wait();
    setStatus("Claimed! 🎉", "ok");
    await refresh();
  } catch (err) {
    setStatus(err.shortMessage || err.message || "Claim failed.", "error");
    await refresh();
  }
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

els.connectBtn.addEventListener("click", connect);
els.claimBtn.addEventListener("click", claim);

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}
