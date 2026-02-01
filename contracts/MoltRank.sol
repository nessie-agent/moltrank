// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MoltRank
 * @notice Agent reputation staking for Moltbook ecosystem
 * @dev Stake MOLT tokens to build reputation, get slashed for bad behavior
 */
contract MoltRank is Ownable, ReentrancyGuard {
    
    IERC20 public immutable moltToken;
    
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 slashCount;
        uint256 totalSlashed;
    }
    
    mapping(address => StakeInfo) public stakes;
    
    uint256 public totalStaked;
    uint256 public slashPool;
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    uint256 public constant UNSTAKE_FEE_BPS = 100; // 1%
    
    // Pending unstake requests
    mapping(address => uint256) public unstakeRequestTime;
    mapping(address => uint256) public unstakeRequestAmount;
    
    // Authorized slashers (can be DAO, multisig, or automated)
    mapping(address => bool) public slashers;
    
    // Events
    event Staked(address indexed agent, uint256 amount, uint256 totalStake);
    event UnstakeRequested(address indexed agent, uint256 amount, uint256 availableAt);
    event Unstaked(address indexed agent, uint256 amount, uint256 fee);
    event Slashed(address indexed agent, uint256 amount, string reason);
    event SlasherUpdated(address indexed slasher, bool authorized);
    
    constructor(address _moltToken) Ownable(msg.sender) {
        moltToken = IERC20(_moltToken);
    }
    
    // ============ Staking Functions ============
    
    /**
     * @notice Stake MOLT tokens to increase reputation
     * @param amount Amount of MOLT to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(moltToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        StakeInfo storage info = stakes[msg.sender];
        
        // If first stake, set staked timestamp
        if (info.amount == 0) {
            info.stakedAt = block.timestamp;
        }
        
        info.amount += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, info.amount);
    }
    
    /**
     * @notice Request to unstake tokens (starts cooldown)
     * @param amount Amount to unstake
     */
    function requestUnstake(uint256 amount) external {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount >= amount, "Insufficient stake");
        require(unstakeRequestAmount[msg.sender] == 0, "Pending request exists");
        
        unstakeRequestTime[msg.sender] = block.timestamp;
        unstakeRequestAmount[msg.sender] = amount;
        
        emit UnstakeRequested(msg.sender, amount, block.timestamp + UNSTAKE_COOLDOWN);
    }
    
    /**
     * @notice Complete unstake after cooldown
     */
    function unstake() external nonReentrant {
        uint256 amount = unstakeRequestAmount[msg.sender];
        require(amount > 0, "No pending request");
        require(block.timestamp >= unstakeRequestTime[msg.sender] + UNSTAKE_COOLDOWN, "Cooldown not complete");
        
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount >= amount, "Insufficient stake");
        
        // Calculate fee
        uint256 fee = (amount * UNSTAKE_FEE_BPS) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Update state
        info.amount -= amount;
        totalStaked -= amount;
        slashPool += fee;
        
        // Clear request
        unstakeRequestAmount[msg.sender] = 0;
        unstakeRequestTime[msg.sender] = 0;
        
        // Transfer tokens
        require(moltToken.transfer(msg.sender, amountAfterFee), "Transfer failed");
        
        emit Unstaked(msg.sender, amountAfterFee, fee);
    }
    
    /**
     * @notice Cancel pending unstake request
     */
    function cancelUnstake() external {
        require(unstakeRequestAmount[msg.sender] > 0, "No pending request");
        unstakeRequestAmount[msg.sender] = 0;
        unstakeRequestTime[msg.sender] = 0;
    }
    
    // ============ Reputation Functions ============
    
    /**
     * @notice Get agent's reputation score
     * @param agent Address to check
     * @return score Reputation score (scaled by 1e18)
     */
    function getReputation(address agent) external view returns (uint256 score) {
        StakeInfo storage info = stakes[agent];
        if (info.amount == 0) return 0;
        
        // Base score: sqrt(staked amount)
        // Using Babylonian method for integer sqrt
        uint256 sqrtStake = sqrt(info.amount);
        
        // Age bonus: up to 2x after 1 year
        uint256 stakeDays = (block.timestamp - info.stakedAt) / 1 days;
        uint256 ageMultiplier = 1e18 + (stakeDays * 1e18 / 365);
        if (ageMultiplier > 2e18) ageMultiplier = 2e18; // Cap at 2x
        
        // Slash penalty: -10% per slash
        uint256 slashPenalty = info.slashCount * 1e17; // 0.1 per slash
        if (slashPenalty > 1e18) slashPenalty = 1e18; // Cap at 100%
        
        score = (sqrtStake * ageMultiplier * (1e18 - slashPenalty)) / 1e36;
    }
    
    /**
     * @notice Get agent's reputation tier
     * @param agent Address to check
     * @return tier 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
     */
    function getTier(address agent) external view returns (uint8 tier) {
        uint256 staked = stakes[agent].amount;
        if (staked >= 100000e18) return 4; // Diamond: 100k+
        if (staked >= 10000e18) return 3;  // Gold: 10k+
        if (staked >= 1000e18) return 2;   // Silver: 1k+
        if (staked >= 100e18) return 1;    // Bronze: 100+
        return 0;
    }
    
    // ============ Slashing Functions ============
    
    /**
     * @notice Slash an agent's stake for bad behavior
     * @param agent Address to slash
     * @param bps Basis points to slash (100 = 1%, 10000 = 100%)
     * @param reason Reason for slashing
     */
    function slash(address agent, uint256 bps, string calldata reason) external {
        require(slashers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(bps <= 10000, "Invalid bps");
        
        StakeInfo storage info = stakes[agent];
        require(info.amount > 0, "No stake to slash");
        
        uint256 slashAmount = (info.amount * bps) / 10000;
        info.amount -= slashAmount;
        info.slashCount += 1;
        info.totalSlashed += slashAmount;
        
        totalStaked -= slashAmount;
        slashPool += slashAmount;
        
        emit Slashed(agent, slashAmount, reason);
    }
    
    // ============ Admin Functions ============
    
    function setSlasher(address slasher, bool authorized) external onlyOwner {
        slashers[slasher] = authorized;
        emit SlasherUpdated(slasher, authorized);
    }
    
    function withdrawSlashPool(address to, uint256 amount) external onlyOwner {
        require(amount <= slashPool, "Insufficient pool");
        slashPool -= amount;
        require(moltToken.transfer(to, amount), "Transfer failed");
    }
    
    // ============ View Functions ============
    
    function getStakeInfo(address agent) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 slashCount,
        uint256 totalSlashed,
        uint256 pendingUnstake,
        uint256 unstakeAvailableAt
    ) {
        StakeInfo storage info = stakes[agent];
        return (
            info.amount,
            info.stakedAt,
            info.slashCount,
            info.totalSlashed,
            unstakeRequestAmount[agent],
            unstakeRequestTime[agent] + UNSTAKE_COOLDOWN
        );
    }
    
    // ============ Internal Functions ============
    
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
