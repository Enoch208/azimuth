// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {AzimuthGame} from "../src/AzimuthGame.sol";
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract Deploy is Script {
    struct Seed {
        bytes32 name;
        uint128 bounty;
        uint64 lifetime;
        uint16 maxProbes;
        uint8 maxScans;
    }

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 feeFloat = vm.envOr("FEE_FLOAT_WEI", uint256(0.02 ether));

        Seed[5] memory seeds = [
            Seed(bytes32("FIRST SIGNAL"), 500, 4 hours, 24, 3),
            Seed(bytes32("DEAD RECKONING"), 1500, 3 hours, 20, 2),
            Seed(bytes32("BLACK WATER"), 2200, 3 hours, 20, 2),
            Seed(bytes32("THE ABYSS"), 4000, 2 hours, 14, 1),
            Seed(bytes32("ZERO BEARING"), 8000, 6 hours, 14, 1)
        ];

        vm.startBroadcast(deployerKey);

        AzimuthGame game = new AzimuthGame{value: feeFloat}();
        console.log("AzimuthGame deployed to:", address(game));

        for (uint256 i = 0; i < seeds.length; i++) {
            uint256 vaultId = game.openVault(
                seeds[i].name, seeds[i].bounty, seeds[i].lifetime, seeds[i].maxProbes, seeds[i].maxScans
            );
            console.log("  vault", vaultId, "opened with bounty", seeds[i].bounty);
        }

        address handover = vm.envOr("OWNER_ADDRESS", address(0));
        if (handover != address(0) && handover != vm.addr(deployerKey)) {
            game.transferOwnership(handover);
            console.log("  ownership transferred to:", handover);
        } else {
            console.log("  WARNING: OWNER_ADDRESS unset - deployer key remains owner");
        }

        vm.stopBroadcast();

        console.log("Seeded", seeds.length, "protocol vaults");
        console.log("Fee float held by contract (wei):", feeFloat);
    }
}
