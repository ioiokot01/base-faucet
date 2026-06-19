const hre = require("hardhat");

async function main() {
  // ---- Faucet settings (tweak before deploying) ------------------------------
  const NAME = "Base Faucet Token";
  const SYMBOL = "BFT";
  const CLAIM_AMOUNT = hre.ethers.parseEther("100"); // 100 tokens per claim
  const COOLDOWN = 24 * 60 * 60; // 24 hours, in seconds
  const MAX_SUPPLY = hre.ethers.parseEther("1000000"); // 1,000,000 tokens
  // ---------------------------------------------------------------------------

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("FaucetToken");
  const token = await Factory.deploy(
    NAME,
    SYMBOL,
    CLAIM_AMOUNT,
    COOLDOWN,
    MAX_SUPPLY
  );
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("FaucetToken deployed to:", address);
  console.log("Explorer:", `https://sepolia.basescan.org/address/${address}`);
  console.log("\nUpdate frontend/app.js -> CONTRACT_ADDRESS with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
