// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {e, ebool, euint256, inco} from "@inco/lightning/src/Lib.sol";

contract AzimuthGame {
    uint256 public constant FIELD_SIZE = 64;

    uint256 public constant BEARING_N = 0;
    uint256 public constant BEARING_NE = 1;
    uint256 public constant BEARING_E = 2;
    uint256 public constant BEARING_SE = 3;
    uint256 public constant BEARING_S = 4;
    uint256 public constant BEARING_SW = 5;
    uint256 public constant BEARING_W = 6;
    uint256 public constant BEARING_NW = 7;
    uint256 public constant BEARING_AT_TARGET = 8;

    uint256 private constant TAN_67_5_NUMERATOR = 41;
    uint256 private constant TAN_67_5_DENOMINATOR = 17;

    uint256 public constant STARTER_CREDITS = 500;
    uint256 public constant PROBE_COST = 2;
    uint256 public constant SCAN_COST = 20;
    uint64 public constant REPLAY_WINDOW = 10 minutes;

    enum VaultStatus {
        None,
        Active,
        Found,
        Expired
    }

    struct Vault {
        bytes32 name;
        euint256 secretX;
        euint256 secretY;
        uint64 createdAt;
        uint64 expiresAt;
        uint64 lifetime;
        uint128 bounty;
        uint16 maxProbesPerHunter;
        uint8 maxScansPerHunter;
        uint32 round;
        uint64 settledAt;
        address finder;
        VaultStatus status;
    }

    struct VaultView {
        bytes32 name;
        uint64 createdAt;
        uint64 expiresAt;
        uint128 bounty;
        uint16 maxProbesPerHunter;
        uint8 maxScansPerHunter;
        uint32 round;
        uint64 settledAt;
        address finder;
        VaultStatus status;
        uint32 probes;
        uint32 scans;
        uint32 huntersJoined;
    }

    struct HunterState {
        euint256 bestDistance;
        ebool everHit;
        uint16 probes;
        uint8 scans;
        bool joined;
    }

    address public owner;
    uint256 public vaultCount;

    mapping(uint256 => Vault) private vaults;
    mapping(uint256 => mapping(uint32 => mapping(address => HunterState))) private hunters;
    mapping(uint256 => mapping(uint32 => uint32)) public probeTally;
    mapping(uint256 => mapping(uint32 => uint32)) public scanTally;
    mapping(uint256 => mapping(uint32 => uint32)) public hunterTally;

    mapping(address => uint256) public credits;
    mapping(address => bool) public claimedStarter;
    mapping(address => uint32) public vaultsFound;

    event VaultOpened(uint256 indexed vaultId, bytes32 name, uint128 bounty, uint64 expiresAt);
    event VaultRespawned(uint256 indexed vaultId, uint32 round, uint64 expiresAt);
    event HunterJoined(uint256 indexed vaultId, uint32 round, address indexed hunter);
    event Probed(
        uint256 indexed vaultId,
        uint32 round,
        address indexed hunter,
        uint8 x,
        uint8 y,
        bytes32 closerHandle,
        bytes32 hitHandle
    );
    event BearingPurchased(
        uint256 indexed vaultId, uint32 round, address indexed hunter, uint8 x, uint8 y, bytes32 bearingHandle
    );
    event VaultSettled(uint256 indexed vaultId, uint32 round, address indexed finder, uint128 bounty);
    event CreditsClaimed(address indexed hunter, uint256 amount);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error VaultNotActive();
    error VaultExpired();
    error VaultStillRunning();
    error UnknownVault();
    error OffField();
    error ProbeLimitReached();
    error ScanLimitReached();
    error InsufficientCredits();
    error AlreadyClaimed();
    error NoHitToSettle();
    error InvalidAttestation();
    error InvalidVaultConfig();
    error WithdrawFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() payable {
        owner = msg.sender;
    }

    receive() external payable {}

    function openVault(
        bytes32 name,
        uint128 bounty,
        uint64 lifetimeSeconds,
        uint16 maxProbesPerHunter,
        uint8 maxScansPerHunter
    ) external onlyOwner returns (uint256 vaultId) {
        if (name == bytes32(0) || lifetimeSeconds == 0 || maxProbesPerHunter == 0) {
            revert InvalidVaultConfig();
        }

        vaultId = ++vaultCount;
        uint64 expiresAt = uint64(block.timestamp) + lifetimeSeconds;

        Vault storage vault = vaults[vaultId];
        vault.name = name;
        vault.createdAt = uint64(block.timestamp);
        vault.expiresAt = expiresAt;
        vault.lifetime = lifetimeSeconds;
        vault.bounty = bounty;
        vault.maxProbesPerHunter = maxProbesPerHunter;
        vault.maxScansPerHunter = maxScansPerHunter;
        vault.status = VaultStatus.Active;
        _sealCoordinates(vault);

        emit VaultOpened(vaultId, name, bounty, expiresAt);
    }

    function respawn(uint256 vaultId) external {
        Vault storage vault = vaults[vaultId];
        if (vault.status == VaultStatus.None) revert UnknownVault();
        if (vault.status == VaultStatus.Active && block.timestamp < vault.expiresAt) revert VaultStillRunning();
        if (vault.status == VaultStatus.Found && block.timestamp < vault.settledAt + REPLAY_WINDOW) {
            revert VaultStillRunning();
        }

        vault.round += 1;
        vault.createdAt = uint64(block.timestamp);
        vault.expiresAt = uint64(block.timestamp) + vault.lifetime;
        vault.finder = address(0);
        vault.settledAt = 0;
        vault.status = VaultStatus.Active;
        _sealCoordinates(vault);

        emit VaultRespawned(vaultId, vault.round, vault.expiresAt);
    }

    function claimStarterCredits() external {
        if (claimedStarter[msg.sender]) revert AlreadyClaimed();
        claimedStarter[msg.sender] = true;
        credits[msg.sender] += STARTER_CREDITS;
        emit CreditsClaimed(msg.sender, STARTER_CREDITS);
    }

    function probe(uint256 vaultId, uint8 x, uint8 y) external returns (bytes32 closerHandle, bytes32 hitHandle) {
        Vault storage vault = _liveVault(vaultId);
        uint32 round = vault.round;
        HunterState storage hunter = _enrol(vaultId, round);

        if (hunter.probes >= vault.maxProbesPerHunter) revert ProbeLimitReached();
        if (x >= FIELD_SIZE || y >= FIELD_SIZE) revert OffField();
        _spend(PROBE_COST);

        hunter.probes += 1;
        probeTally[vaultId][round] += 1;

        {
            euint256 distance = _squaredDistance(vault, x, y);
            bool firstProbe = hunter.probes == 1;

            ebool closer = firstProbe ? e.asEbool(true) : e.lt(distance, hunter.bestDistance);
            euint256 best = firstProbe ? distance : e.select(closer, distance, hunter.bestDistance);
            e.allowThis(best);
            hunter.bestDistance = best;

            ebool hit = e.eq(distance, 0);
            ebool everHit = firstProbe ? hit : e.or(hunter.everHit, hit);
            e.allowThis(everHit);
            hunter.everHit = everHit;

            e.reveal(closer);
            e.reveal(everHit);

            closerHandle = ebool.unwrap(closer);
            hitHandle = ebool.unwrap(everHit);
        }

        emit Probed(vaultId, round, msg.sender, x, y, closerHandle, hitHandle);
    }

    function buyBearing(uint256 vaultId, uint8 x, uint8 y) external returns (bytes32 bearingHandle) {
        Vault storage vault = _liveVault(vaultId);
        uint32 round = vault.round;
        HunterState storage hunter = _enrol(vaultId, round);

        if (hunter.scans >= vault.maxScansPerHunter) revert ScanLimitReached();
        if (x >= FIELD_SIZE || y >= FIELD_SIZE) revert OffField();
        _spend(SCAN_COST);

        hunter.scans += 1;
        scanTally[vaultId][round] += 1;

        euint256 bearing = _bearingFrom(vault, x, y);
        e.allowThis(bearing);
        e.allow(bearing, msg.sender);

        bearingHandle = euint256.unwrap(bearing);
        emit BearingPurchased(vaultId, round, msg.sender, x, y, bearingHandle);
    }

    function settle(uint256 vaultId, bytes[] calldata signatures) external {
        Vault storage vault = _liveVault(vaultId);
        HunterState storage hunter = hunters[vaultId][vault.round][msg.sender];

        if (hunter.probes == 0) revert NoHitToSettle();
        if (!e.verifyDecryption(hunter.everHit, true, signatures)) revert InvalidAttestation();

        vault.status = VaultStatus.Found;
        vault.settledAt = uint64(block.timestamp);
        vault.finder = msg.sender;
        credits[msg.sender] += vault.bounty;
        vaultsFound[msg.sender] += 1;

        e.reveal(vault.secretX);
        e.reveal(vault.secretY);

        emit VaultSettled(vaultId, vault.round, msg.sender, vault.bounty);
    }

    function expireVault(uint256 vaultId) external {
        Vault storage vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (block.timestamp < vault.expiresAt) revert VaultStillRunning();
        vault.status = VaultStatus.Expired;
    }

    function vaultInfo(uint256 vaultId) public view returns (VaultView memory) {
        Vault storage vault = vaults[vaultId];
        uint32 round = vault.round;
        return VaultView({
            name: vault.name,
            createdAt: vault.createdAt,
            expiresAt: vault.expiresAt,
            bounty: vault.bounty,
            maxProbesPerHunter: vault.maxProbesPerHunter,
            maxScansPerHunter: vault.maxScansPerHunter,
            round: round,
            settledAt: vault.settledAt,
            finder: vault.finder,
            status: vault.status,
            probes: probeTally[vaultId][round],
            scans: scanTally[vaultId][round],
            huntersJoined: hunterTally[vaultId][round]
        });
    }

    function allVaults() external view returns (VaultView[] memory list) {
        list = new VaultView[](vaultCount);
        for (uint256 i = 0; i < vaultCount; i++) {
            list[i] = vaultInfo(i + 1);
        }
    }

    function revealedCoordinates(uint256 vaultId) external view returns (bytes32 x, bytes32 y) {
        Vault storage vault = vaults[vaultId];
        return (euint256.unwrap(vault.secretX), euint256.unwrap(vault.secretY));
    }

    function hunterState(uint256 vaultId, address hunter)
        external
        view
        returns (uint16 probes, uint8 scans, bool joined, bytes32 bestDistanceHandle, bytes32 everHitHandle)
    {
        HunterState storage state = hunters[vaultId][vaults[vaultId].round][hunter];
        return
            (state.probes, state.scans, state.joined, euint256.unwrap(state.bestDistance), ebool.unwrap(state.everHit));
    }

    function _sealCoordinates(Vault storage vault) private {
        euint256 secretX = e.randBounded(FIELD_SIZE);
        euint256 secretY = e.randBounded(FIELD_SIZE);
        e.allowThis(secretX);
        e.allowThis(secretY);
        vault.secretX = secretX;
        vault.secretY = secretY;
    }

    function _liveVault(uint256 vaultId) private view returns (Vault storage vault) {
        vault = vaults[vaultId];
        if (vault.status != VaultStatus.Active) revert VaultNotActive();
        if (block.timestamp >= vault.expiresAt) revert VaultExpired();
    }

    function _enrol(uint256 vaultId, uint32 round) private returns (HunterState storage hunter) {
        hunter = hunters[vaultId][round][msg.sender];
        if (!hunter.joined) {
            hunter.joined = true;
            hunterTally[vaultId][round] += 1;
            emit HunterJoined(vaultId, round, msg.sender);
        }
    }

    function _spend(uint256 amount) private {
        if (credits[msg.sender] < amount) revert InsufficientCredits();
        credits[msg.sender] -= amount;
    }

    function _squaredDistance(Vault storage vault, uint8 x, uint8 y) private returns (euint256) {
        euint256 dx = _absoluteDelta(vault.secretX, x);
        euint256 dy = _absoluteDelta(vault.secretY, y);
        return e.add(e.mul(dx, dx), e.mul(dy, dy));
    }

    function _absoluteDelta(euint256 secret, uint8 guess) private returns (euint256) {
        return e.sub(e.max(secret, uint256(guess)), e.min(secret, uint256(guess)));
    }

    function _bearingFrom(Vault storage vault, uint8 x, uint8 y) private returns (euint256) {
        ebool east = e.gt(vault.secretX, x);
        ebool north = e.lt(vault.secretY, y);

        euint256 dx = _absoluteDelta(vault.secretX, x);
        euint256 dy = _absoluteDelta(vault.secretY, y);

        ebool eastWestDominant = e.ge(e.mul(dx, TAN_67_5_DENOMINATOR), e.mul(dy, TAN_67_5_NUMERATOR));
        ebool northSouthDominant = e.ge(e.mul(dy, TAN_67_5_DENOMINATOR), e.mul(dx, TAN_67_5_NUMERATOR));

        euint256 diagonal = e.select(
            north,
            e.select(east, e.asEuint256(BEARING_NE), e.asEuint256(BEARING_NW)),
            e.select(east, e.asEuint256(BEARING_SE), e.asEuint256(BEARING_SW))
        );
        euint256 horizontal = e.select(east, e.asEuint256(BEARING_E), e.asEuint256(BEARING_W));
        euint256 vertical = e.select(north, e.asEuint256(BEARING_N), e.asEuint256(BEARING_S));

        ebool atTarget = e.eq(e.add(dx, dy), 0);
        euint256 compass = e.select(eastWestDominant, horizontal, e.select(northSouthDominant, vertical, diagonal));
        return e.select(atTarget, e.asEuint256(BEARING_AT_TARGET), compass);
    }

    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function withdrawFeeBalance(uint256 amount) external onlyOwner {
        (bool sent,) = owner.call{value: amount}("");
        if (!sent) revert WithdrawFailed();
    }

    function incoFee() external pure returns (uint256) {
        return inco.getFee();
    }
}
