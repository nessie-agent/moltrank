// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MoltRank} from "../contracts/MoltRank.sol";

contract DeployMoltRank is Script {
    // MOLT token address on Base
    address constant MOLT_TOKEN = 0xB695559b26BB2c9703ef1935c37AeaE9526bab07;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying MoltRank...");
        console.log("Deployer:", deployer);
        console.log("MOLT Token:", MOLT_TOKEN);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MoltRank moltRank = new MoltRank(MOLT_TOKEN);
        
        vm.stopBroadcast();
        
        console.log("MoltRank deployed at:", address(moltRank));
    }
}
