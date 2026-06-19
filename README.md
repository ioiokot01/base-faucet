# Token Faucet

[![CI](https://github.com/ioiokot01/base-faucet/actions/workflows/ci.yml/badge.svg)](https://github.com/ioiokot01/base-faucet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636.svg)
![Chain](https://img.shields.io/badge/Base-Sepolia-0052ff.svg)

An **ERC-20 token with a built-in faucet** for the [Base](https://base.org)
ecosystem. Anyone can `claim()` a fixed amount of tokens, but only once per
cooldown window. Total supply is capped, and tokens are minted on claim (no
pre-funding needed).

Project 5 in a learning series (after the Guestbook, TipJar, MiniNFT, and
Onchain To-Do). New concepts: the **ERC-20 standard**, **minting**, and a
**time-based cooldown** to stop spam/abuse.

## Stack

- [Hardhat 2](https://hardhat.org) — compile, test, deploy
- [OpenZeppelin Contracts 5](https://docs.openzeppelin.com/contracts/5.x/) — ERC20, Ownable
- Solidity `0.8.24`
- Target chain: Base Sepolia (testnet)

## Getting started

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Contract

`contracts/FaucetToken.sol`

| Function | Description |
| --- | --- |
| `claim()` | Mint `CLAIM_AMOUNT` tokens to the caller (once per cooldown) |
| `canClaim(address)` | Whether an address can claim right now |
| `timeUntilNextClaim(address)` | Seconds left before the next claim |
| `nextClaimAt(address)` | Timestamp the address may claim again |
| `remainingSupply()` | Tokens still mintable through the faucet |
| `lastClaim(address)` | Timestamp of an address's last claim |

Plus the standard ERC-20 interface (`transfer`, `approve`, `balanceOf`, …).
Config is set at deploy time: `CLAIM_AMOUNT`, `COOLDOWN`, `MAX_SUPPLY`.
Emits `Claimed` on each successful claim.

## Deploy

```bash
cp .env.example .env   # then fill in PRIVATE_KEY (testnet wallet only)
npm run deploy
```

## Roadmap

- [x] FaucetToken contract + tests
- [x] Deploy to Base Sepolia
- [x] Frontend (claim, balance, cooldown timer)

## Deployments

| Network | Address |
| --- | --- |
| Base Sepolia | [`0xadC9bC29445C2D8CbAa682631A63AbeEb8e0767b`](https://sepolia.basescan.org/address/0xadC9bC29445C2D8CbAa682631A63AbeEb8e0767b) |

## Security notes

- Built on OpenZeppelin's audited ERC20 + Ownable — no hand-rolled token logic.
- The cooldown is enforced on-chain per wallet to limit spam.
- Total supply is capped; the faucet can never mint beyond `MAX_SUPPLY`.
- Secrets (`.env`, private keys) are git-ignored and never committed.
- All development targets a **testnet** — no real funds.

## License

MIT
