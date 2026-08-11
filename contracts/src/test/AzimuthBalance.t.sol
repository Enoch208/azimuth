// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthGame} from "../AzimuthGame.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {e, ebool, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthBalanceTest is IncoTest {
    AzimuthGame internal game;

    address internal hunterA;
    address internal hunterB;

    uint64 internal constant LIFETIME = 4 hours;
    bytes32 internal constant VAULT_NAME = bytes32("FIRST SIGNAL");

    function setUp() public override {
        super.setUp();
        game = new AzimuthGame();
        vm.deal(address(game), 10 ether);
        hunterA = _fundedHunter("hunterA");
        hunterB = _fundedHunter("hunterB");
    }

    function _fundedHunter(string memory label) internal returns (address hunter) {
        hunter = makeAddr(label);
        vm.prank(hunter);
        game.claimStarterCredits();
    }

    function _openVault() internal returns (uint256 vaultId) {
        vaultId = game.openVault(VAULT_NAME, 1000, LIFETIME, 20, 4);
        processAllOperations();
    }

    function _secret(uint256 vaultId) internal view returns (uint256 x, uint256 y) {
        (bytes32 xHandle, bytes32 yHandle) = game.revealedCoordinates(vaultId);
        x = getUint256Value(euint256.wrap(xHandle));
        y = getUint256Value(euint256.wrap(yHandle));
    }

    function _probe(address hunter, uint256 vaultId, uint8 x, uint8 y) internal returns (bytes32 closerHandle) {
        vm.prank(hunter);
        (closerHandle,) = game.probe(vaultId, x, y);
        processAllOperations();
    }

    function _squared(uint256 ax, uint256 ay, uint256 bx, uint256 by) internal pure returns (uint256) {
        uint256 dx = ax > bx ? ax - bx : bx - ax;
        uint256 dy = ay > by ? ay - by : by - ay;
        return dx * dx + dy * dy;
    }

    function testABearingCostsHalfOfWhatItUsedTo() public view {
        assertEq(game.SCAN_COST(), 10, "scan cost not repriced");
        assertEq(game.PROBE_COST(), 2, "probe cost changed unexpectedly");
    }

    function testABearingCarriesBothADirectionAndADistanceBand() public {
        uint256 vaultId = _openVault();
        (uint256 sx, uint256 sy) = _secret(vaultId);

        vm.prank(hunterA);
        bytes32 handle = game.buyBearing(vaultId, 0, 0);
        processAllOperations();

        uint256 combined = getUint256Value(euint256.wrap(handle));
        uint256 rings = game.BEARING_RINGS();
        uint256 octant = combined / rings;
        uint256 band = combined % rings;

        assertLe(octant, game.BEARING_AT_TARGET(), "octant outside the compass");
        assertLt(band, rings, "band outside the ring count");

        uint256 span = 2 * (game.FIELD_SIZE() - 1) * (game.FIELD_SIZE() - 1);
        uint256 squared = _squared(sx, sy, 0, 0);
        uint256 expected = 0;
        for (uint256 index = 1; index < rings; index++) {
            if (squared >= (span * index * index) / (rings * rings)) expected = index;
        }
        assertEq(band, expected, "distance band does not match the true distance");
    }

    function testTheBandNarrowsWithDistance() public {
        uint256 vaultId = _openVault();
        (uint256 sx, uint256 sy) = _secret(vaultId);

        vm.prank(hunterA);
        bytes32 near = game.buyBearing(vaultId, uint8(sx), uint8(sy));
        processAllOperations();

        assertEq(
            getUint256Value(euint256.wrap(near)) % game.BEARING_RINGS(),
            0,
            "standing on the vault should read the innermost band"
        );
    }

    function testTheProberReadsTheirOwnResultImmediately() public {
        uint256 vaultId = _openVault();
        bytes32 closerHandle = _probe(hunterA, vaultId, 5, 5);

        assertTrue(e.isAllowed(hunterA, euint256.wrap(closerHandle)), "prober cannot read their own probe");
    }

    function testARivalCannotReadAFreshProbeResult() public {
        uint256 vaultId = _openVault();
        bytes32 closerHandle = _probe(hunterA, vaultId, 5, 5);

        assertFalse(e.isAllowed(hunterB, euint256.wrap(closerHandle)), "fresh probe leaked to a rival immediately");
    }

    function testTheResultBecomesPublicAfterTheLag() public {
        address stranger = makeAddr("stranger");
        uint256 vaultId = _openVault();
        bytes32 first = _probe(hunterA, vaultId, 5, 5);

        assertFalse(
            e.isAllowed(stranger, euint256.wrap(first)),
            "an uninvolved wallet could read the probe before the lag elapsed"
        );

        uint16 lag = game.PUBLICATION_LAG();
        for (uint16 i = 0; i < lag; i++) {
            _probe(hunterA, vaultId, uint8(10 + i), uint8(10 + i));
        }

        assertTrue(e.isAllowed(stranger, euint256.wrap(first)), "the probe never became public after the lag elapsed");
    }

    function testAProbeStaysSealedOneShortOfTheLag() public {
        address stranger = makeAddr("stranger");
        uint256 vaultId = _openVault();
        bytes32 first = _probe(hunterA, vaultId, 5, 5);

        uint16 lag = game.PUBLICATION_LAG();
        for (uint16 i = 0; i + 1 < lag; i++) {
            _probe(hunterA, vaultId, uint8(10 + i), uint8(10 + i));
        }

        assertFalse(e.isAllowed(stranger, euint256.wrap(first)), "the probe published a step early");
    }

    function testTheLagCountsEveryHuntersProbesOnTheSameVault() public {
        uint256 vaultId = _openVault();
        _probe(hunterA, vaultId, 5, 5);

        uint256 queued = game.pendingPublicationCount(vaultId, 0);
        assertEq(queued, 1, "the first probe should be waiting to publish");

        uint16 lag = game.PUBLICATION_LAG();
        for (uint16 i = 0; i < lag; i++) {
            _probe(hunterB, vaultId, uint8(20 + i), uint8(20 + i));
        }

        assertEq(game.pendingPublicationCount(vaultId, 0), lag, "the queue should hold exactly the lag once it is full");
    }

    function testTheQueueResetsWithEachRound() public {
        uint256 vaultId = _openVault();
        _probe(hunterA, vaultId, 5, 5);
        assertEq(game.pendingPublicationCount(vaultId, 0), 1, "probe not queued");

        vm.warp(block.timestamp + LIFETIME + 1);
        game.respawn(vaultId);
        processAllOperations();

        assertEq(game.pendingPublicationCount(vaultId, 1), 0, "the new round inherited a stale queue");
    }

    function testSettlementStillWorksWithHeldBackResults() public {
        uint256 vaultId = _openVault();
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));

        (,,,, bytes32 everHitHandle) = game.hunterState(vaultId, hunterA);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunterA, HandleWithProof({handle: everHitHandle, proof: _emptyAllowanceProof()}));
        vm.prank(hunterA);
        game.settle(vaultId, signatures);
        processAllOperations();

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(uint8(info.status), uint8(AzimuthGame.VaultStatus.Found), "settlement broke under the lag");
    }

    function testAHitIsStillPublicImmediately() public {
        uint256 vaultId = _openVault();
        (uint256 sx, uint256 sy) = _secret(vaultId);

        vm.prank(hunterA);
        (, bytes32 hitHandle) = game.probe(vaultId, uint8(sx), uint8(sy));
        processAllOperations();

        assertTrue(getBoolValue(ebool.wrap(hitHandle)), "a hit should be public news the moment it happens");
    }
}
