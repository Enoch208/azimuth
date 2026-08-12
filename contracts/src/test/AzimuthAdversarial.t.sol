// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthCallsigns} from "../AzimuthCallsigns.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";

// The vault-game half of this suite retired with AzimuthGame.sol; see the
// pre-daily-pivot tag. What is left is the callsign hostility that still
// applies to a contract the daily hunt ships.
contract AzimuthAdversarialTest is IncoTest {
    AzimuthCallsigns internal callsigns;

    address internal hunterA;
    address internal hunterB;

    function setUp() public override {
        super.setUp();
        callsigns = new AzimuthCallsigns();
        hunterA = makeAddr("hunterA");
        hunterB = makeAddr("hunterB");
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
        assertEq(
            callsigns.callsignOf(hunterB),
            bytes32(bytes("abcdefghijklmnop")),
            "sixteen characters rejected"
        );
    }
}
