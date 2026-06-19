const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("FaucetToken", function () {
  const NAME = "Base Faucet Token";
  const SYMBOL = "BFT";
  const CLAIM_AMOUNT = ethers.parseEther("100"); // 100 tokens per claim
  const COOLDOWN = 24 * 60 * 60; // 24 hours
  const MAX_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 tokens

  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FaucetToken");
    const token = await Factory.deploy(
      NAME,
      SYMBOL,
      CLAIM_AMOUNT,
      COOLDOWN,
      MAX_SUPPLY
    );
    await token.waitForDeployment();
    return { token, owner, alice, bob };
  }

  describe("Deployment", function () {
    it("sets ERC20 metadata and faucet config", async function () {
      const { token } = await deploy();
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.decimals()).to.equal(18);
      expect(await token.CLAIM_AMOUNT()).to.equal(CLAIM_AMOUNT);
      expect(await token.COOLDOWN()).to.equal(COOLDOWN);
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
      expect(await token.totalSupply()).to.equal(0n);
      expect(await token.remainingSupply()).to.equal(MAX_SUPPLY);
    });

    it("rejects a zero claim amount", async function () {
      const Factory = await ethers.getContractFactory("FaucetToken");
      await expect(
        Factory.deploy(NAME, SYMBOL, 0, COOLDOWN, MAX_SUPPLY)
      ).to.be.revertedWith("Claim amount must be > 0");
    });

    it("rejects a max supply smaller than one claim", async function () {
      const Factory = await ethers.getContractFactory("FaucetToken");
      await expect(
        Factory.deploy(NAME, SYMBOL, CLAIM_AMOUNT, COOLDOWN, CLAIM_AMOUNT - 1n)
      ).to.be.revertedWith("Max supply too small");
    });
  });

  describe("Claiming", function () {
    it("mints CLAIM_AMOUNT and emits Claimed", async function () {
      const { token, alice } = await deploy();
      await expect(token.connect(alice).claim())
        .to.emit(token, "Claimed")
        .withArgs(alice.address, CLAIM_AMOUNT, anyValue);

      expect(await token.balanceOf(alice.address)).to.equal(CLAIM_AMOUNT);
      expect(await token.totalSupply()).to.equal(CLAIM_AMOUNT);
    });

    it("lets a brand-new wallet claim immediately", async function () {
      const { token, alice } = await deploy();
      expect(await token.canClaim(alice.address)).to.equal(true);
    });

    it("blocks a second claim during cooldown", async function () {
      const { token, alice } = await deploy();
      await token.connect(alice).claim();
      expect(await token.canClaim(alice.address)).to.equal(false);
      await expect(token.connect(alice).claim()).to.be.revertedWith(
        "Cooldown active"
      );
    });

    it("allows another claim after the cooldown passes", async function () {
      const { token, alice } = await deploy();
      await token.connect(alice).claim();
      await time.increase(COOLDOWN);
      expect(await token.canClaim(alice.address)).to.equal(true);
      await token.connect(alice).claim();
      expect(await token.balanceOf(alice.address)).to.equal(CLAIM_AMOUNT * 2n);
    });

    it("tracks cooldowns per wallet independently", async function () {
      const { token, alice, bob } = await deploy();
      await token.connect(alice).claim();
      // Bob is unaffected by Alice's claim.
      expect(await token.canClaim(bob.address)).to.equal(true);
      await token.connect(bob).claim();
      expect(await token.balanceOf(bob.address)).to.equal(CLAIM_AMOUNT);
    });

    it("reports time remaining until next claim", async function () {
      const { token, alice } = await deploy();
      await token.connect(alice).claim();
      const remaining = await token.timeUntilNextClaim(alice.address);
      // Should be close to the full cooldown (allow a couple seconds of drift).
      expect(remaining).to.be.greaterThan(BigInt(COOLDOWN - 5));
      expect(remaining).to.be.lessThanOrEqual(BigInt(COOLDOWN));

      await time.increase(COOLDOWN);
      expect(await token.timeUntilNextClaim(alice.address)).to.equal(0n);
    });
  });

  describe("Supply cap", function () {
    it("stops minting once max supply is reached", async function () {
      // Tiny cap: exactly two claims fit.
      const Factory = await ethers.getContractFactory("FaucetToken");
      const [, alice] = await ethers.getSigners();
      const token = await Factory.deploy(
        NAME,
        SYMBOL,
        CLAIM_AMOUNT,
        0, // no cooldown so we can claim back-to-back
        CLAIM_AMOUNT * 2n
      );
      await token.waitForDeployment();

      await token.connect(alice).claim();
      await token.connect(alice).claim();
      expect(await token.remainingSupply()).to.equal(0n);
      await expect(token.connect(alice).claim()).to.be.revertedWith(
        "Faucet empty (max supply reached)"
      );
    });
  });

  describe("ERC20 transfers", function () {
    it("supports normal transfers after claiming", async function () {
      const { token, alice, bob } = await deploy();
      await token.connect(alice).claim();
      await token.connect(alice).transfer(bob.address, ethers.parseEther("40"));
      expect(await token.balanceOf(bob.address)).to.equal(
        ethers.parseEther("40")
      );
      expect(await token.balanceOf(alice.address)).to.equal(
        ethers.parseEther("60")
      );
    });
  });
});
