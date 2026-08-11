// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthGame} from "../AzimuthGame.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {e, ebool, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthGameTest is IncoTest {
    AzimuthGame internal game;

    address internal hunterA;
    address internal hunterB;

    uint64 internal constant LIFETIME = 4 hours;
    bytes32 internal constant VAULT_NAME = bytes32("THE ABYSS");

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

    function _openVault(uint16 maxProbes, uint8 maxScans) internal returns (uint256 vaultId) {
        vaultId = game.openVault(VAULT_NAME, 1000, LIFETIME, maxProbes, maxScans);
        processAllOperations();
    }

    function _secret(uint256 vaultId) internal view returns (uint256 x, uint256 y) {
        (bytes32 xHandle, bytes32 yHandle) = game.revealedCoordinates(vaultId);
        x = getUint256Value(euint256.wrap(xHandle));
        y = getUint256Value(euint256.wrap(yHandle));
    }

    function _probe(address hunter, uint256 vaultId, uint8 x, uint8 y) internal returns (bool closer, bool everHit) {
        vm.prank(hunter);
        (bytes32 closerHandle, bytes32 hitHandle) = game.probe(vaultId, x, y);
        processAllOperations();
        closer = getBoolValue(ebool.wrap(closerHandle));
        everHit = getBoolValue(ebool.wrap(hitHandle));
    }

    function _settle(address hunter, uint256 vaultId) internal {
        (,,,, bytes32 everHitHandle) = game.hunterState(vaultId, hunter);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunter, HandleWithProof({handle: everHitHandle, proof: _emptyAllowanceProof()}));
        vm.prank(hunter);
        game.settle(vaultId, signatures);
        processAllOperations();
    }

    function _squared(uint256 ax, uint256 ay, uint256 bx, uint256 by) internal pure returns (uint256) {
        uint256 dx = ax > bx ? ax - bx : bx - ax;
        uint256 dy = ay > by ? ay - by : by - ay;
        return dx * dx + dy * dy;
    }

    function testVaultSecretIsBoundedToField() public {
        for (uint256 round = 0; round < 6; round++) {
            uint256 vaultId = _openVault(20, 2);
            (uint256 x, uint256 y) = _secret(vaultId);
            assertLt(x, game.FIELD_SIZE(), "x out of field");
            assertLt(y, game.FIELD_SIZE(), "y out of field");
        }
    }

    function testCoordinatesAreNotReadableByOutsiders() public {
        uint256 vaultId = _openVault(20, 2);
        (bytes32 xHandle, bytes32 yHandle) = game.revealedCoordinates(vaultId);

        assertFalse(e.isAllowed(hunterA, euint256.wrap(xHandle)), "x leaked to hunter");
        assertFalse(e.isAllowed(hunterA, euint256.wrap(yHandle)), "y leaked to hunter");
        assertTrue(e.isAllowed(address(game), euint256.wrap(xHandle)), "contract lost access to x");
        assertTrue(e.isAllowed(address(game), euint256.wrap(yHandle)), "contract lost access to y");
    }

    function testOpenVaultRejectsInvalidConfig() public {
        vm.expectRevert(AzimuthGame.InvalidVaultConfig.selector);
        game.openVault(bytes32(0), 1000, LIFETIME, 20, 2);

        vm.expectRevert(AzimuthGame.InvalidVaultConfig.selector);
        game.openVault(VAULT_NAME, 1000, 0, 20, 2);

        vm.expectRevert(AzimuthGame.InvalidVaultConfig.selector);
        game.openVault(VAULT_NAME, 1000, LIFETIME, 0, 2);
    }

    function testOnlyOwnerOpensVaults() public {
        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.NotOwner.selector);
        game.openVault(VAULT_NAME, 1000, LIFETIME, 20, 2);
    }

    function testAllVaultsExposesNamesForTheBrowser() public {
        game.openVault(bytes32("FIRST SIGNAL"), 500, LIFETIME, 24, 3);
        game.openVault(bytes32("ZERO BEARING"), 8000, LIFETIME, 14, 1);
        processAllOperations();

        AzimuthGame.VaultView[] memory list = game.allVaults();
        assertEq(list.length, 2, "vault list length");
        assertEq(list[0].name, bytes32("FIRST SIGNAL"), "first name");
        assertEq(list[1].name, bytes32("ZERO BEARING"), "second name");
        assertEq(list[1].bounty, 8000, "bounty carried through");
    }

    function testFirstProbeIsAlwaysWarmer() public {
        uint256 vaultId = _openVault(20, 2);
        (bool closer, bool everHit) = _probe(hunterA, vaultId, 10, 10);
        assertTrue(closer, "first probe must read warmer");
        (uint256 sx, uint256 sy) = _secret(vaultId);
        assertEq(everHit, sx == 10 && sy == 10, "hit flag disagrees with the secret");
    }

    function testWarmerAndColderTrackRealDistance() public {
        uint256 vaultId = _openVault(40, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);

        uint8[6] memory xs = [uint8(4), 20, 44, 12, 60, 33];
        uint8[6] memory ys = [uint8(9), 55, 21, 38, 2, 47];

        uint256 best = type(uint256).max;
        for (uint256 i = 0; i < xs.length; i++) {
            uint256 distance = _squared(sx, sy, xs[i], ys[i]);
            bool expected = i == 0 || distance < best;
            (bool closer,) = _probe(hunterA, vaultId, xs[i], ys[i]);
            assertEq(closer, expected, "warmer/colder disagrees with squared distance");
            if (distance < best) best = distance;
        }
    }

    function testBestDistanceEqualsMinimumSquaredDistance() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);

        uint8[4] memory xs = [uint8(5), 40, 22, 61];
        uint8[4] memory ys = [uint8(50), 12, 33, 7];

        uint256 expected = type(uint256).max;
        for (uint256 i = 0; i < xs.length; i++) {
            _probe(hunterA, vaultId, xs[i], ys[i]);
            uint256 distance = _squared(sx, sy, xs[i], ys[i]);
            if (distance < expected) expected = distance;
        }

        (,,, bytes32 bestHandle,) = game.hunterState(vaultId, hunterA);
        assertEq(
            getUint256Value(euint256.wrap(bestHandle)),
            expected,
            "encrypted squared distance disagrees with plain arithmetic"
        );
    }

    function testProbeEmitsAnEventCarryingBothHandles() public {
        uint256 vaultId = _openVault(20, 2);

        vm.prank(hunterA);
        (bytes32 closerHandle, bytes32 hitHandle) = game.probe(vaultId, 8, 9);

        assertTrue(closerHandle != bytes32(0), "closer handle missing");
        assertTrue(hitHandle != bytes32(0), "hit handle missing");
        assertTrue(closerHandle != hitHandle, "handles must be distinct");
    }

    function testExactHitIsDetectedAndSticky() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);

        (, bool beforeHit) = _probe(hunterA, vaultId, uint8((sx + 7) % 64), uint8((sy + 11) % 64));
        assertFalse(beforeHit, "hit before probing the secret");

        (, bool onHit) = _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        assertTrue(onHit, "exact cell not detected");

        (, bool afterHit) = _probe(hunterA, vaultId, uint8((sx + 3) % 64), uint8((sy + 5) % 64));
        assertTrue(afterHit, "hit flag must stay sticky");
    }

    function testSettlementPaysBountyAndRevealsCoordinates() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));

        uint256 before = game.credits(hunterA);
        _settle(hunterA, vaultId);

        assertEq(game.credits(hunterA) - before, 1000, "bounty not paid");
        assertEq(game.vaultsFound(hunterA), 1, "leaderboard counter not incremented");

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(uint8(info.status), uint8(AzimuthGame.VaultStatus.Found), "vault not marked found");
        assertEq(info.finder, hunterA, "wrong finder recorded");

        (uint256 revealedX, uint256 revealedY) = _secret(vaultId);
        assertEq(revealedX, sx, "revealed x mismatch");
        assertEq(revealedY, sy, "revealed y mismatch");
    }

    function testSettlementRejectsNonHit() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8((sx + 9) % 64), uint8((sy + 13) % 64));

        (,,,, bytes32 everHitHandle) = game.hunterState(vaultId, hunterA);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunterA, HandleWithProof({handle: everHitHandle, proof: _emptyAllowanceProof()}));

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.InvalidAttestation.selector);
        game.settle(vaultId, signatures);
        assertEq(game.vaultsFound(hunterA), 0, "counter moved on a failed settle");
    }

    function testSettlementRejectsForgedSignatures() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));

        bytes[] memory forged = new bytes[](1);
        forged[0] = abi.encodePacked(bytes32(uint256(1)), bytes32(uint256(2)), uint8(27));

        vm.prank(hunterA);
        vm.expectRevert();
        game.settle(vaultId, forged);
    }

    function testRivalCannotSettleWithTheFindersAttestation() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        _probe(hunterB, vaultId, uint8((sx + 5) % 64), uint8((sy + 6) % 64));

        (,,,, bytes32 findersHandle) = game.hunterState(vaultId, hunterA);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunterA, HandleWithProof({handle: findersHandle, proof: _emptyAllowanceProof()}));

        vm.prank(hunterB);
        vm.expectRevert(AzimuthGame.InvalidAttestation.selector);
        game.settle(vaultId, signatures);
    }

    function testSettledVaultRejectsFurtherPlay() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        _settle(hunterA, vaultId);

        vm.prank(hunterB);
        vm.expectRevert(AzimuthGame.VaultNotActive.selector);
        game.probe(vaultId, 1, 1);
    }

    function testBearingMatchesCompassFromFirstPrinciples() public {
        uint8 covered = 0;

        for (uint256 attempt = 0; attempt < 8 && covered != 0xFF; attempt++) {
            uint256 vaultId = _openVault(20, 255);
            (uint256 sx, uint256 sy) = _secret(vaultId);
            address hunter = _fundedHunter(string(abi.encodePacked("compass", attempt)));
            int256 k = 6;

            if (_tryBearing(hunter, vaultId, sx, sy, 0, k, game.BEARING_N())) covered |= 0x01;
            if (_tryBearing(hunter, vaultId, sx, sy, -k, k, game.BEARING_NE())) covered |= 0x02;
            if (_tryBearing(hunter, vaultId, sx, sy, -k, 0, game.BEARING_E())) covered |= 0x04;
            if (_tryBearing(hunter, vaultId, sx, sy, -k, -k, game.BEARING_SE())) covered |= 0x08;
            if (_tryBearing(hunter, vaultId, sx, sy, 0, -k, game.BEARING_S())) covered |= 0x10;
            if (_tryBearing(hunter, vaultId, sx, sy, k, -k, game.BEARING_SW())) covered |= 0x20;
            if (_tryBearing(hunter, vaultId, sx, sy, k, 0, game.BEARING_W())) covered |= 0x40;
            if (_tryBearing(hunter, vaultId, sx, sy, k, k, game.BEARING_NW())) covered |= 0x80;
        }

        assertEq(covered, 0xFF, "not every compass direction was exercised");
    }

    function _tryBearing(
        address hunter,
        uint256 vaultId,
        uint256 sx,
        uint256 sy,
        int256 offsetX,
        int256 offsetY,
        uint256 expected
    ) internal returns (bool ran) {
        int256 gx = int256(sx) + offsetX;
        int256 gy = int256(sy) + offsetY;
        if (gx < 0 || gx > 63 || gy < 0 || gy > 63) return false;

        vm.prank(hunter);
        bytes32 handle = game.buyBearing(vaultId, uint8(uint256(gx)), uint8(uint256(gy)));
        processAllOperations();

        assertEq(getUint256Value(euint256.wrap(handle)) / game.BEARING_RINGS(), expected, "compass direction wrong");
        return true;
    }

    function testBearingIsReadableOnlyByItsBuyer() public {
        uint256 vaultId = _openVault(20, 2);

        vm.prank(hunterA);
        bytes32 handle = game.buyBearing(vaultId, 12, 40);
        processAllOperations();

        assertTrue(e.isAllowed(hunterA, euint256.wrap(handle)), "buyer cannot read its own bearing");
        assertFalse(e.isAllowed(hunterB, euint256.wrap(handle)), "rival can read a private bearing");
        assertTrue(e.isAllowed(address(game), euint256.wrap(handle)), "contract lost access to bearing");
    }

    function testProbeCapIsEnforced() public {
        uint256 vaultId = _openVault(3, 2);
        for (uint8 i = 0; i < 3; i++) {
            vm.prank(hunterA);
            game.probe(vaultId, i, i);
            processAllOperations();
        }
        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.ProbeLimitReached.selector);
        game.probe(vaultId, 9, 9);
    }

    function testScanCapIsEnforced() public {
        uint256 vaultId = _openVault(20, 1);
        vm.prank(hunterA);
        game.buyBearing(vaultId, 5, 5);
        processAllOperations();

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.ScanLimitReached.selector);
        game.buyBearing(vaultId, 6, 6);
    }

    function testExpiredVaultRejectsPlay() public {
        uint256 vaultId = _openVault(20, 2);
        vm.warp(block.timestamp + LIFETIME + 1);

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.VaultExpired.selector);
        game.probe(vaultId, 4, 4);
    }

    function testRespawnKeepsTheBoardPopulated() public {
        uint256 vaultId = _openVault(3, 2);
        (uint256 firstX, uint256 firstY) = _secret(vaultId);

        vm.prank(hunterA);
        game.probe(vaultId, 1, 1);
        processAllOperations();

        vm.warp(block.timestamp + LIFETIME + 1);
        vm.prank(hunterB);
        game.respawn(vaultId);
        processAllOperations();

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(uint8(info.status), uint8(AzimuthGame.VaultStatus.Active), "vault not reopened");
        assertEq(info.round, 1, "round not advanced");
        assertEq(info.probes, 0, "probe tally not reset for the new round");
        assertEq(info.name, VAULT_NAME, "name lost on respawn");

        (uint16 probes,,,,) = game.hunterState(vaultId, hunterA);
        assertEq(probes, 0, "hunter budget not reset for the new round");

        (uint256 secondX, uint256 secondY) = _secret(vaultId);
        assertLt(secondX, 64, "respawned x out of field");
        assertLt(secondY, 64, "respawned y out of field");
        assertTrue(firstX != secondX || firstY != secondY, "respawn reused the same coordinates");
    }

    function testRespawnRejectedWhileVaultIsRunning() public {
        uint256 vaultId = _openVault(20, 2);
        vm.expectRevert(AzimuthGame.VaultStillRunning.selector);
        game.respawn(vaultId);
    }

    function testRespawnRejectsUnknownVault() public {
        vm.expectRevert(AzimuthGame.UnknownVault.selector);
        game.respawn(999);
    }

    function testFoundVaultIsHeldOpenForReplayThenRespawns() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        _settle(hunterA, vaultId);

        vm.expectRevert(AzimuthGame.VaultStillRunning.selector);
        game.respawn(vaultId);

        vm.warp(block.timestamp + game.REPLAY_WINDOW() + 1);
        game.respawn(vaultId);
        processAllOperations();

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(uint8(info.status), uint8(AzimuthGame.VaultStatus.Active), "found vault not recycled");
        assertEq(info.finder, address(0), "finder not cleared");
    }

    function testBearingOnTheExactTargetIsExplicit() public {
        uint256 vaultId = _openVault(20, 3);
        (uint256 sx, uint256 sy) = _secret(vaultId);

        vm.prank(hunterA);
        bytes32 handle = game.buyBearing(vaultId, uint8(sx), uint8(sy));
        processAllOperations();

        assertEq(
            getUint256Value(euint256.wrap(handle)) / game.BEARING_RINGS(),
            game.BEARING_AT_TARGET(),
            "a scan taken on the target must not read as a compass direction"
        );
        assertEq(
            getUint256Value(euint256.wrap(handle)) % game.BEARING_RINGS(),
            0,
            "a scan taken on the target must sit in the innermost band"
        );
    }

    function testOwnershipCanMoveOffTheFaucetKey() public {
        address operator = makeAddr("operator");
        game.transferOwnership(operator);
        assertEq(game.owner(), operator, "ownership not moved");

        vm.expectRevert(AzimuthGame.NotOwner.selector);
        game.openVault(VAULT_NAME, 100, LIFETIME, 10, 1);

        vm.prank(operator);
        game.openVault(VAULT_NAME, 100, LIFETIME, 10, 1);
        processAllOperations();
    }

    function testOwnershipCannotBeBurned() public {
        vm.expectRevert(AzimuthGame.ZeroAddress.selector);
        game.transferOwnership(address(0));
    }

    function testOffFieldProbeReverts() public {
        uint256 vaultId = _openVault(20, 2);
        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.OffField.selector);
        game.probe(vaultId, 64, 0);
    }

    function testCreditsAreSpentAndStarterIsOneShot() public {
        uint256 vaultId = _openVault(20, 2);
        uint256 start = game.credits(hunterA);

        vm.prank(hunterA);
        game.probe(vaultId, 3, 3);
        processAllOperations();
        assertEq(game.credits(hunterA), start - game.PROBE_COST(), "probe cost not charged");

        vm.prank(hunterA);
        game.buyBearing(vaultId, 4, 4);
        processAllOperations();
        assertEq(game.credits(hunterA), start - game.PROBE_COST() - game.SCAN_COST(), "bearing cost not charged");

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.AlreadyClaimed.selector);
        game.claimStarterCredits();
    }

    function testHunterWithoutCreditsCannotProbe() public {
        uint256 vaultId = _openVault(1000, 2);
        address broke = makeAddr("broke");
        vm.prank(broke);
        vm.expectRevert(AzimuthGame.InsufficientCredits.selector);
        game.probe(vaultId, 2, 2);
    }

    function testHunterTallyCountsEachHunterOnce() public {
        uint256 vaultId = _openVault(20, 2);
        _probe(hunterA, vaultId, 1, 1);
        _probe(hunterA, vaultId, 2, 2);
        _probe(hunterB, vaultId, 3, 3);

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(info.huntersJoined, 2, "hunter tally wrong");
        assertEq(info.probes, 3, "probe tally wrong");
    }

    function testContractKeepsAccessToPersistentHandles() public {
        uint256 vaultId = _openVault(20, 2);
        _probe(hunterA, vaultId, 10, 10);
        _probe(hunterA, vaultId, 11, 11);
        _probe(hunterA, vaultId, 12, 12);

        (,,, bytes32 bestHandle, bytes32 everHitHandle) = game.hunterState(vaultId, hunterA);
        assertTrue(
            e.isAllowed(address(game), euint256.wrap(bestHandle)), "contract lost access to the running best distance"
        );
        assertTrue(
            e.isAllowed(address(game), euint256.wrap(everHitHandle)),
            "contract lost access to the sticky hit accumulator"
        );
    }
}
