// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthGame} from "../AzimuthGame.sol";
import {AzimuthCallsigns} from "../AzimuthCallsigns.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {e, ebool, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthAdversarialTest is IncoTest {
    AzimuthGame internal game;
    AzimuthCallsigns internal callsigns;

    address internal hunterA;
    address internal hunterB;

    uint64 internal constant LIFETIME = 4 hours;
    bytes32 internal constant VAULT_NAME = bytes32("ZERO BEARING");

    function setUp() public override {
        super.setUp();
        game = new AzimuthGame();
        callsigns = new AzimuthCallsigns();
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

    function _probe(address hunter, uint256 vaultId, uint8 x, uint8 y) internal {
        vm.prank(hunter);
        game.probe(vaultId, x, y);
        processAllOperations();
    }

    function _settle(address hunter, uint256 vaultId) internal {
        (,,,, bytes32 everHitHandle) = game.hunterState(vaultId, hunter);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunter, HandleWithProof({handle: everHitHandle, proof: _emptyAllowanceProof()}));
        vm.prank(hunter);
        game.settle(vaultId, signatures);
        processAllOperations();
    }

    function testTwoHuntersHitTheSameCellOnlyTheFirstSettles() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);

        _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        _probe(hunterB, vaultId, uint8(sx), uint8(sy));

        _settle(hunterA, vaultId);

        AzimuthGame.VaultView memory info = game.vaultInfo(vaultId);
        assertEq(info.finder, hunterA, "first settler did not take the vault");
        assertEq(game.credits(hunterB), 500 - game.PROBE_COST(), "loser was paid anyway");

        (,,,, bytes32 everHitHandle) = game.hunterState(vaultId, hunterB);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(hunterB, HandleWithProof({handle: everHitHandle, proof: _emptyAllowanceProof()}));
        vm.prank(hunterB);
        vm.expectRevert(AzimuthGame.VaultNotActive.selector);
        game.settle(vaultId, signatures);
    }

    function testBearingIsNotReadableByAnotherWallet() public {
        uint256 vaultId = _openVault(20, 2);
        vm.prank(hunterA);
        bytes32 bearingHandle = game.buyBearing(vaultId, 20, 20);
        processAllOperations();

        assertTrue(e.isAllowed(hunterA, euint256.wrap(bearingHandle)), "buyer lost their own bearing");
        assertFalse(e.isAllowed(hunterB, euint256.wrap(bearingHandle)), "bearing leaked to a rival");
        assertFalse(e.isAllowed(address(this), euint256.wrap(bearingHandle)), "bearing leaked to the test");
    }

    function testBearingPurchaseStopsAtTheVaultLimit() public {
        uint256 vaultId = _openVault(20, 2);
        vm.prank(hunterA);
        game.buyBearing(vaultId, 10, 10);
        processAllOperations();
        vm.prank(hunterA);
        game.buyBearing(vaultId, 11, 11);
        processAllOperations();

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.ScanLimitReached.selector);
        game.buyBearing(vaultId, 12, 12);
    }

    function testProbeAfterExpiryIsRejectedEvenWithBudgetLeft() public {
        uint256 vaultId = _openVault(20, 2);
        _probe(hunterA, vaultId, 5, 5);

        vm.warp(block.timestamp + LIFETIME + 1);

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.VaultExpired.selector);
        game.probe(vaultId, 6, 6);

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.VaultExpired.selector);
        game.buyBearing(vaultId, 6, 6);
    }

    function testRespawnTwiceInARowIsRejected() public {
        uint256 vaultId = _openVault(20, 2);
        vm.warp(block.timestamp + LIFETIME + 1);

        game.respawn(vaultId);
        processAllOperations();

        vm.expectRevert(AzimuthGame.VaultStillRunning.selector);
        game.respawn(vaultId);
    }

    function testRespawnResetsEveryHunterBudget() public {
        uint256 vaultId = _openVault(2, 1);
        _probe(hunterA, vaultId, 1, 1);
        _probe(hunterA, vaultId, 2, 2);

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.ProbeLimitReached.selector);
        game.probe(vaultId, 3, 3);

        vm.warp(block.timestamp + LIFETIME + 1);
        game.respawn(vaultId);
        processAllOperations();

        _probe(hunterA, vaultId, 3, 3);
        (uint16 probes,,,,) = game.hunterState(vaultId, hunterA);
        assertEq(probes, 1, "budget did not reset with the new round");
    }

    function testStaleAttestationFromAnEarlierRoundCannotSettle() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));

        (,,,, bytes32 staleHandle) = game.hunterState(vaultId, hunterA);
        (, bytes[] memory staleSignatures) =
            getDecryptionAttestation(hunterA, HandleWithProof({handle: staleHandle, proof: _emptyAllowanceProof()}));

        vm.warp(block.timestamp + LIFETIME + 1);
        game.respawn(vaultId);
        processAllOperations();

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.NoHitToSettle.selector);
        game.settle(vaultId, staleSignatures);
    }

    function testSettlementRejectsAnotherHuntersAttestation() public {
        uint256 vaultId = _openVault(20, 2);
        (uint256 sx, uint256 sy) = _secret(vaultId);
        _probe(hunterA, vaultId, uint8(sx), uint8(sy));
        _probe(hunterB, vaultId, 0, 0);

        (,,,, bytes32 winnerHandle) = game.hunterState(vaultId, hunterA);
        (, bytes[] memory winnerSignatures) =
            getDecryptionAttestation(hunterA, HandleWithProof({handle: winnerHandle, proof: _emptyAllowanceProof()}));

        vm.prank(hunterB);
        vm.expectRevert(AzimuthGame.InvalidAttestation.selector);
        game.settle(vaultId, winnerSignatures);
    }

    function testCallsignRejectsMultiByteUnicode() public {
        vm.prank(hunterA);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        callsigns.setCallsign(bytes32(bytes("h\xc3\xa9llo")));

        vm.prank(hunterA);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        callsigns.setCallsign(bytes32(bytes(unicode"hunter★")));
    }

    function testCallsignRejectsLeadingAndTrailingSpace() public {
        vm.prank(hunterA);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        callsigns.setCallsign(bytes32(bytes(" hunter")));

        vm.prank(hunterA);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        callsigns.setCallsign(bytes32(bytes("hunter ")));
    }

    function testCallsignBoundariesAreExact() public {
        vm.prank(hunterA);
        vm.expectRevert(AzimuthCallsigns.TooShort.selector);
        callsigns.setCallsign(bytes32(bytes("ab")));

        vm.prank(hunterA);
        callsigns.setCallsign(bytes32(bytes("abc")));
        assertEq(callsigns.callsignOf(hunterA), bytes32(bytes("abc")), "three characters rejected");

        vm.prank(hunterB);
        callsigns.setCallsign(bytes32(bytes("abcdefghijklmnop")));
        assertEq(callsigns.callsignOf(hunterB), bytes32(bytes("abcdefghijklmnop")), "sixteen characters rejected");
    }

    function testStarterCreditsCannotBeFarmedAcrossVaults() public {
        _openVault(20, 2);
        _openVault(20, 2);

        vm.prank(hunterA);
        vm.expectRevert(AzimuthGame.AlreadyClaimed.selector);
        game.claimStarterCredits();

        assertEq(game.credits(hunterA), 500, "starter credits were paid more than once");
    }
}
