const hre = require("hardhat");

// Deployed FaucetToken on Base Sepolia.
const ADDRESS = "0xadC9bC29445C2D8CbAa682631A63AbeEb8e0767b";

async function main() {
  const token = await hre.ethers.getContractAt("FaucetToken", ADDRESS);

  console.log("FaucetToken:", ADDRESS);
  console.log("Name:", await token.name());
  console.log("Symbol:", await token.symbol());
  console.log(
    "Claim amount:",
    hre.ethers.formatEther(await token.CLAIM_AMOUNT())
  );
  console.log("Cooldown:", (await token.COOLDOWN()).toString(), "seconds");
  console.log(
    "Total supply:",
    hre.ethers.formatEther(await token.totalSupply())
  );
  console.log(
    "Remaining:",
    hre.ethers.formatEther(await token.remainingSupply())
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
