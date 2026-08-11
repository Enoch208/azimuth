// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {AzimuthDaily} from "../src/AzimuthDaily.sol";

contract DeployDaily is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 feeFloat = vm.envOr("FEE_FLOAT_WEI", uint256(2_000_000_000_000_000));

        vm.startBroadcast(deployerKey);

        AzimuthDaily game = new AzimuthDaily();
        console.log("AzimuthDaily deployed to:", address(game));

        (bool funded,) = payable(address(game)).call{value: feeFloat}("");
        require(funded, "fee float transfer failed");
        console.log("  fee float:", feeFloat);

        uint256 day = game.openHunt();
        console.log("  opened hunt for day:", day);

        vm.stopBroadcast();
    }
}
