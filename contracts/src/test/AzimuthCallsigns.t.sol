// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthCallsigns} from "../AzimuthCallsigns.sol";
import {Test} from "forge-std/Test.sol";

contract AzimuthCallsignsTest is Test {
    AzimuthCallsigns internal registry;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        registry = new AzimuthCallsigns();
    }

    function testSetsAndReadsBack() public {
        vm.prank(alice);
        registry.setCallsign(bytes32("david0x"));
        assertEq(registry.callsignOf(alice), bytes32("david0x"));
        assertEq(registry.holderOf(bytes32("david0x")), alice);
    }

    function testRejectsDuplicates() public {
        vm.prank(alice);
        registry.setCallsign(bytes32("david0x"));

        vm.prank(bob);
        vm.expectRevert(AzimuthCallsigns.AlreadyTaken.selector);
        registry.setCallsign(bytes32("david0x"));
    }

    function testRenameFreesThePreviousName() public {
        vm.startPrank(alice);
        registry.setCallsign(bytes32("david0x"));
        registry.setCallsign(bytes32("nightjar"));
        vm.stopPrank();

        assertEq(registry.holderOf(bytes32("david0x")), address(0), "old name not released");
        assertEq(registry.callsignOf(alice), bytes32("nightjar"));

        vm.prank(bob);
        registry.setCallsign(bytes32("david0x"));
        assertEq(registry.holderOf(bytes32("david0x")), bob, "released name not reusable");
    }

    function testOwnerCanRewriteTheirOwnName() public {
        vm.startPrank(alice);
        registry.setCallsign(bytes32("david0x"));
        registry.setCallsign(bytes32("david0x"));
        vm.stopPrank();
        assertEq(registry.callsignOf(alice), bytes32("david0x"));
    }

    function testRejectsTooShort() public {
        vm.prank(alice);
        vm.expectRevert(AzimuthCallsigns.TooShort.selector);
        registry.setCallsign(bytes32("ab"));
    }

    function testRejectsTooLong() public {
        vm.prank(alice);
        vm.expectRevert(AzimuthCallsigns.TooLong.selector);
        registry.setCallsign(bytes32("abcdefghijklmnopq"));
    }

    function testRejectsUppercaseAndSpaces() public {
        vm.startPrank(alice);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        registry.setCallsign(bytes32("David0x"));

        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        registry.setCallsign(bytes32("dead reckoning"));
        vm.stopPrank();
    }

    function testRejectsEmbeddedNullPadding() public {
        bytes32 sneaky = bytes32(abi.encodePacked(bytes3("abc"), bytes1(0x00), bytes4("defg")));
        vm.prank(alice);
        vm.expectRevert(AzimuthCallsigns.InvalidCharacter.selector);
        registry.setCallsign(sneaky);
    }

    function testAllowsDigitsDashesUnderscores() public {
        vm.prank(alice);
        registry.setCallsign(bytes32("zero_bearing-7"));
        assertEq(registry.callsignOf(alice), bytes32("zero_bearing-7"));
    }

    function testBatchLookup() public {
        vm.prank(alice);
        registry.setCallsign(bytes32("david0x"));

        address[] memory hunters = new address[](2);
        hunters[0] = alice;
        hunters[1] = bob;
        bytes32[] memory names = registry.callsignsOf(hunters);

        assertEq(names[0], bytes32("david0x"));
        assertEq(names[1], bytes32(0), "unset hunter should be empty");
    }
}
