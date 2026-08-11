// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthDaily} from "../AzimuthDaily.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {e, ebool, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthDailyTest is IncoTest {
    AzimuthDaily internal game;

    address internal ada;
    address internal ben;

    function setUp() public override {
        super.setUp();
        game = new AzimuthDaily();
        vm.deal(address(game), 10 ether);
        ada = makeAddr("ada");
        ben = makeAddr("ben");
        vm.warp(1_800_000_000);
    }

    function _treasure(uint256 day) internal view returns (uint256 x, uint256 y) {
        (bytes32 xHandle, bytes32 yHandle) = game.treasureHandles(day);
        x = getUint256Value(euint256.wrap(xHandle));
        y = getUint256Value(euint256.wrap(yHandle));
    }

    function _dig(address who, uint8 x, uint8 y) internal returns (uint256 temperature) {
        vm.prank(who);
        bytes32 handle = game.dig(x, y);
        processAllOperations();
        temperature = getUint256Value(euint256.wrap(handle));
    }

    function _chebyshev(uint256 ax, uint256 ay, uint256 bx, uint256 by) internal pure returns (uint256) {
        uint256 dx = ax > bx ? ax - bx : bx - ax;
        uint256 dy = ay > by ? ay - by : by - ay;
        return dx > dy ? dx : dy;
    }

    function testTheTreasureLandsOnTheMap() public {
        for (uint256 i = 0; i < 6; i++) {
            vm.warp(block.timestamp + 1 days);
            uint256 day = game.openHunt();
            processAllOperations();
            (uint256 x, uint256 y) = _treasure(day);
            assertLt(x, game.FIELD(), "treasure x off the map");
            assertLt(y, game.FIELD(), "treasure y off the map");
        }
    }

    function testNobodyCanReadTheTreasureWhileTheDayRuns() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (bytes32 xHandle, bytes32 yHandle) = game.treasureHandles(day);

        assertFalse(e.isAllowed(ada, euint256.wrap(xHandle)), "treasure x readable by a hunter");
        assertFalse(e.isAllowed(ada, euint256.wrap(yHandle)), "treasure y readable by a hunter");
        assertTrue(e.isAllowed(address(game), euint256.wrap(xHandle)), "contract lost its own treasure");
    }

    // The whole game rests on this ladder matching the simulation that chose it.
    function testTheTemperatureLadderMatchesTheDistance() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 tx_, uint256 ty) = _treasure(day);

        uint8[6] memory xs = [uint8(0), 2, 4, 6, 8, 10];
        for (uint256 i = 0; i < xs.length; i++) {
            uint256 reported = _dig(ada, xs[i], uint8(i));
            uint256 distance = _chebyshev(tx_, ty, xs[i], i);
            uint256 expected = (distance + 1) / 2;
            assertEq(reported, expected, "temperature does not match the Chebyshev band");
            assertLe(reported, game.TEMPERATURE_FREEZING(), "temperature above the ladder");
        }
    }

    function testStandingOnTheTreasureReadsFound() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);

        assertEq(_dig(ada, uint8(x), uint8(y)), game.TEMPERATURE_FOUND(), "the treasure did not read as found");
    }

    function testANeighbourReadsBurningAndTheFarCornerFreezing() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);

        uint8 nx = x == 0 ? 1 : uint8(x - 1);
        assertEq(_dig(ada, nx, uint8(y)), game.TEMPERATURE_BURNING(), "one step away should be burning");

        uint8 fx = x < 5 ? 10 : 0;
        uint8 fy = y < 5 ? 10 : 0;
        uint256 far = _dig(ben, fx, fy);
        uint256 expected = (_chebyshev(x, y, fx, fy) + 1) / 2;
        assertEq(far, expected, "the far corner did not band correctly");
    }

    function testMyTemperatureIsSealedToMe() public {
        game.openHunt();
        processAllOperations();
        vm.prank(ada);
        bytes32 handle = game.dig(3, 3);
        processAllOperations();

        assertTrue(e.isAllowed(ada, euint256.wrap(handle)), "the digger cannot read their own result");
        assertFalse(e.isAllowed(ben, euint256.wrap(handle)), "a rival could read someone else's temperature");
    }

    function testSixDigsAndNoMore() public {
        game.openHunt();
        processAllOperations();
        for (uint8 i = 0; i < game.DIGS(); i++) {
            _dig(ada, i, 0);
        }
        vm.prank(ada);
        vm.expectRevert(AzimuthDaily.NoDigsLeft.selector);
        game.dig(7, 7);
    }

    function testTheSameTileCannotBeDugTwice() public {
        game.openHunt();
        processAllOperations();
        _dig(ada, 4, 4);
        vm.prank(ada);
        vm.expectRevert(AzimuthDaily.AlreadyDug.selector);
        game.dig(4, 4);
    }

    function testDiggingOffTheMapIsRejected() public {
        game.openHunt();
        processAllOperations();
        vm.prank(ada);
        vm.expectRevert(AzimuthDaily.OffMap.selector);
        game.dig(11, 0);
    }

    function testEveryoneHuntsTheSameTreasureOnTheSameDay() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);

        assertEq(_dig(ada, uint8(x), uint8(y)), game.TEMPERATURE_FOUND(), "ada did not find it");
        assertEq(_dig(ben, uint8(x), uint8(y)), game.TEMPERATURE_FOUND(), "ben found a different treasure");
    }

    function testTheTreasureChangesWithTheDay() public {
        uint256 first = game.openHunt();
        processAllOperations();
        (uint256 x1, uint256 y1) = _treasure(first);

        vm.warp(block.timestamp + 1 days);
        uint256 second = game.openHunt();
        processAllOperations();
        (uint256 x2, uint256 y2) = _treasure(second);

        assertTrue(second > first, "the day did not advance");
        assertTrue(x1 != x2 || y1 != y2, "two days in a row shared a treasure");
    }

    function testClaimingRecordsTheScore() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);

        _dig(ada, uint8((x + 5) % 11), uint8((y + 5) % 11));
        _dig(ada, uint8(x), uint8(y));

        (,,,, bytes32 foundHandle) = game.playerState(day, ada);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(ada, HandleWithProof({handle: foundHandle, proof: _emptyAllowanceProof()}));
        vm.warp(block.timestamp + 1 days);
        vm.prank(ada);
        game.claimTreasure(day, signatures);

        (,, bool finished, uint8 foundOn,) = game.playerState(day, ada);
        assertTrue(finished, "claim did not finish the hunt");
        assertEq(foundOn, 2, "score should be the dig count that found it");

        (,, uint32 finders,,) = game.huntInfo(day);
        assertEq(finders, 1, "finder not counted");
    }

    function testAHunterWhoNeverFoundItCannotClaim() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);

        _dig(ada, uint8((x + 5) % 11), uint8((y + 5) % 11));

        (,,,, bytes32 foundHandle) = game.playerState(day, ada);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(ada, HandleWithProof({handle: foundHandle, proof: _emptyAllowanceProof()}));
        vm.warp(block.timestamp + 1 days);
        vm.prank(ada);
        vm.expectRevert(AzimuthDaily.NotYourTreasure.selector);
        game.claimTreasure(day, signatures);
    }

    // Dig coordinates are plaintext. If the chain also said who had finished,
    // the treasure would be that hunter's last dug tile and the day would be
    // spoiled for everyone still playing.
    function testNothingPublicMarksAFinderWhileTheDayRuns() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);
        _dig(ada, uint8(x), uint8(y));

        (,, bool finished, uint8 foundOn,) = game.playerState(day, ada);
        assertFalse(finished, "a finder was visible mid-hunt");
        assertEq(foundOn, 0, "a winning dig count was visible mid-hunt");

        (,, uint32 finders,,) = game.huntInfo(day);
        assertEq(finders, 0, "the finder count gave the day away");
    }

    function testTheTreasureCannotBeClaimedBeforeMidnight() public {
        uint256 day = game.openHunt();
        processAllOperations();
        (uint256 x, uint256 y) = _treasure(day);
        _dig(ada, uint8(x), uint8(y));

        (,,,, bytes32 foundHandle) = game.playerState(day, ada);
        (, bytes[] memory signatures) =
            getDecryptionAttestation(ada, HandleWithProof({handle: foundHandle, proof: _emptyAllowanceProof()}));
        vm.prank(ada);
        vm.expectRevert(AzimuthDaily.ClaimAfterMidnight.selector);
        game.claimTreasure(day, signatures);
    }

    function testTheDayCannotBeRevealedWhileItRuns() public {
        uint256 day = game.openHunt();
        processAllOperations();
        vm.expectRevert(AzimuthDaily.DayStillRunning.selector);
        game.revealDay(day);
    }

    function testYesterdayBecomesPublic() public {
        uint256 day = game.openHunt();
        processAllOperations();
        _dig(ada, 5, 5);

        vm.warp(block.timestamp + 1 days);
        game.revealDay(day);
        processAllOperations();

        (bytes32 xHandle,) = game.treasureHandles(day);
        assertTrue(e.isAllowed(ben, euint256.wrap(xHandle)), "yesterday's treasure never became public");
    }

    function testATrailStaysSealedUntilTheDayIsRevealed() public {
        uint256 day = game.openHunt();
        processAllOperations();
        vm.prank(ada);
        bytes32 handle = game.dig(2, 7);
        processAllOperations();

        vm.warp(block.timestamp + 1 days);
        assertFalse(e.isAllowed(ben, euint256.wrap(handle)), "a trail leaked before the day was revealed");

        game.revealDay(day);
        processAllOperations();
        game.revealTrail(day, ada);
        processAllOperations();

        assertTrue(e.isAllowed(ben, euint256.wrap(handle)), "the recap cannot read the trail");
    }

    function testTheTrailRecordsWhereAndWhen() public {
        uint256 day = game.openHunt();
        processAllOperations();
        _dig(ada, 1, 2);
        _dig(ada, 9, 4);

        (uint8[] memory xs, uint8[] memory ys, bytes32[] memory temps) = game.playerTrail(day, ada);
        assertEq(xs.length, 2, "trail length wrong");
        assertEq(xs[0], 1, "first dig x wrong");
        assertEq(ys[1], 4, "second dig y wrong");
        assertEq(temps.length, 2, "temperature count wrong");
    }
}
