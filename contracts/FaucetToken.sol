// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FaucetToken
/// @notice An ERC-20 test token with a built-in faucet: anyone can `claim()` a
///         fixed amount of tokens, but only once per cooldown window. Total
///         supply is capped. Great for handing out test tokens fairly.
/// @dev    Built on OpenZeppelin's audited ERC20 + Ownable. Tokens are minted on
///         claim (up to MAX_SUPPLY), so no pre-funding is required.
contract FaucetToken is ERC20, Ownable {
    /// @notice Amount minted per successful claim (in token wei, 18 decimals).
    uint256 public immutable CLAIM_AMOUNT;
    /// @notice Minimum seconds a wallet must wait between claims.
    uint256 public immutable COOLDOWN;
    /// @notice Hard cap on total supply.
    uint256 public immutable MAX_SUPPLY;

    /// @notice Timestamp of each address's last claim (0 = never claimed).
    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed claimer, uint256 amount, uint256 nextClaimAt);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 claimAmount_,
        uint256 cooldown_,
        uint256 maxSupply_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(claimAmount_ > 0, "Claim amount must be > 0");
        require(maxSupply_ >= claimAmount_, "Max supply too small");
        CLAIM_AMOUNT = claimAmount_;
        COOLDOWN = cooldown_;
        MAX_SUPPLY = maxSupply_;
    }

    /// @notice Claim CLAIM_AMOUNT tokens. Reverts if still in cooldown or capped.
    function claim() external {
        require(canClaim(msg.sender), "Cooldown active");
        require(
            totalSupply() + CLAIM_AMOUNT <= MAX_SUPPLY,
            "Faucet empty (max supply reached)"
        );

        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, CLAIM_AMOUNT, block.timestamp + COOLDOWN);
    }

    /// @notice Whether `user` can claim right now.
    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaim[user] + COOLDOWN;
    }

    /// @notice The earliest timestamp `user` may claim again.
    function nextClaimAt(address user) external view returns (uint256) {
        uint256 last = lastClaim[user];
        // Never claimed -> can claim immediately.
        return last == 0 ? 0 : last + COOLDOWN;
    }

    /// @notice Seconds remaining until `user` can claim again (0 if claimable).
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 ready = lastClaim[user] + COOLDOWN;
        if (block.timestamp >= ready) return 0;
        return ready - block.timestamp;
    }

    /// @notice Tokens still mintable through the faucet.
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
