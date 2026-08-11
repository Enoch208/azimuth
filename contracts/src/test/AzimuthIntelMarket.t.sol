// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthGame} from "../AzimuthGame.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {e, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthIntelMarketTest is IncoTest {
    AzimuthGame internal game;

    address internal seller;
    address internal buyer;
    address internal bystander;

    uint64 internal constant LIFETIME = 4 hours;
    bytes32 internal constant VAULT_NAME = bytes32("DEAD RECKONING");

    function setUp() public override {
        super.setUp();
        game = new AzimuthGame();
        vm.deal(address(game), 10 ether);
        seller = _fundedHunter("seller");
        buyer = _fundedHunter("buyer");
        bystander = _fundedHunter("bystander");
    }

    function _fundedHunter(string memory label) internal returns (address hunter) {
        hunter = makeAddr(label);
        vm.prank(hunter);
        game.claimStarterCredits();
    }

    function _openVault() internal returns (uint256 vaultId) {
        vaultId = game.openVault(VAULT_NAME, 1000, LIFETIME, 20, 2);
        processAllOperations();
    }

    function _sellerBuysBearing(uint256 vaultId) internal returns (bytes32 handle) {
        vm.prank(seller);
        handle = game.buyBearing(vaultId, 30, 30);
        processAllOperations();
    }

    function _list(uint256 vaultId, uint128 price) internal returns (uint256 listingId) {
        vm.prank(seller);
        listingId = game.listIntel(vaultId, 0, price);
    }

    function testLicensingGrantsTheBuyerDecryptionOfTheSameCiphertext() public {
        uint256 vaultId = _openVault();
        bytes32 handle = _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        assertFalse(e.isAllowed(buyer, euint256.wrap(handle)), "buyer could read it before paying");

        vm.prank(buyer);
        game.licenseIntel(listingId);
        processAllOperations();

        assertTrue(e.isAllowed(buyer, euint256.wrap(handle)), "buyer cannot read what they paid for");
        assertTrue(e.isAllowed(seller, euint256.wrap(handle)), "seller lost their own copy");
        assertFalse(e.isAllowed(bystander, euint256.wrap(handle)), "intel leaked to someone who did not pay");
    }

    function testLicensingMovesCreditsFromBuyerToSeller() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        uint256 sellerBefore = game.credits(seller);
        uint256 buyerBefore = game.credits(buyer);

        vm.prank(buyer);
        game.licenseIntel(listingId);

        assertEq(game.credits(seller) - sellerBefore, 40, "seller was not paid");
        assertEq(buyerBefore - game.credits(buyer), 40, "buyer was not charged");
    }

    function testTheSoldBearingIsTheSameValueBothWalletsRead() public {
        uint256 vaultId = _openVault();
        bytes32 handle = _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(buyer);
        game.licenseIntel(listingId);
        processAllOperations();

        uint256 value = getUint256Value(euint256.wrap(handle));
        assertLe(value / game.BEARING_RINGS(), game.BEARING_AT_TARGET(), "bearing outside the compass range");
        assertLt(value % game.BEARING_RINGS(), game.BEARING_RINGS(), "distance band outside the ring count");
    }

    function testSellerCannotLicenseToThemselves() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(seller);
        vm.expectRevert(AzimuthGame.CannotLicenseOwnIntel.selector);
        game.licenseIntel(listingId);
    }

    function testTheSameBuyerCannotPayTwice() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(buyer);
        game.licenseIntel(listingId);

        vm.prank(buyer);
        vm.expectRevert(AzimuthGame.AlreadyLicensed.selector);
        game.licenseIntel(listingId);
    }

    function testOneListingCanServeManyBuyers() public {
        uint256 vaultId = _openVault();
        bytes32 handle = _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(buyer);
        game.licenseIntel(listingId);
        vm.prank(bystander);
        game.licenseIntel(listingId);
        processAllOperations();

        assertTrue(e.isAllowed(buyer, euint256.wrap(handle)), "first buyer lost access");
        assertTrue(e.isAllowed(bystander, euint256.wrap(handle)), "second buyer lost access");
        assertEq(game.credits(seller), 500 - game.SCAN_COST() + 80, "seller was not paid twice");
    }

    function testDelistedIntelCannotBeBought() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(seller);
        game.delistIntel(listingId);

        vm.prank(buyer);
        vm.expectRevert(AzimuthGame.ListingClosed.selector);
        game.licenseIntel(listingId);
    }

    function testOnlyTheSellerCanDelist() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.prank(buyer);
        vm.expectRevert(AzimuthGame.ListingClosed.selector);
        game.delistIntel(listingId);
    }

    function testListingRequiresABearingTheSellerActuallyHolds() public {
        uint256 vaultId = _openVault();

        vm.prank(seller);
        vm.expectRevert(AzimuthGame.NoSuchBearing.selector);
        game.listIntel(vaultId, 0, 40);
    }

    function testFreeIntelIsRejected() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);

        vm.prank(seller);
        vm.expectRevert(AzimuthGame.InvalidPrice.selector);
        game.listIntel(vaultId, 0, 0);
    }

    function testIntelFromAnEarlierRoundCannotBeSoldIntoTheNewOne() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        vm.warp(block.timestamp + LIFETIME + 1);
        game.respawn(vaultId);
        processAllOperations();

        vm.prank(buyer);
        vm.expectRevert(AzimuthGame.ListingClosed.selector);
        game.licenseIntel(listingId);
    }

    function testABuyerWithoutCreditsCannotLicense() public {
        uint256 vaultId = _openVault();
        _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 501);

        vm.prank(buyer);
        vm.expectRevert(AzimuthGame.InsufficientCredits.selector);
        game.licenseIntel(listingId);
    }

    function testListingIsPublicButItsContentsAreNot() public {
        uint256 vaultId = _openVault();
        bytes32 handle = _sellerBuysBearing(vaultId);
        uint256 listingId = _list(vaultId, 40);

        (uint256 listedVault,, address listedSeller, uint8 x, uint8 y, uint128 price, bytes32 listedHandle, bool open) =
            game.intelListing(listingId);

        assertEq(listedVault, vaultId, "wrong vault on the listing");
        assertEq(listedSeller, seller, "wrong seller on the listing");
        assertEq(x, 30, "origin x not public");
        assertEq(y, 30, "origin y not public");
        assertEq(price, 40, "price not public");
        assertEq(listedHandle, handle, "listing points at a different ciphertext");
        assertTrue(open, "listing not open");
        assertFalse(e.isAllowed(bystander, euint256.wrap(listedHandle)), "handle readable just from the listing");
    }

    function testBearingsHeldCountTracksPurchases() public {
        uint256 vaultId = _openVault();
        assertEq(game.bearingsHeldBy(vaultId, 0, seller), 0, "seller started with intel");

        _sellerBuysBearing(vaultId);
        assertEq(game.bearingsHeldBy(vaultId, 0, seller), 1, "purchase not recorded");
    }
}
