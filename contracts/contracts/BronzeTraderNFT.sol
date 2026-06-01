// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTraderNFT.sol";

/**
 * @title BronzeTraderNFT
 * @dev Bronze tier — requires 500+ pts on BaseAgg (enforced off-chain / frontend)
 */
contract BronzeTraderNFT is BaseTraderNFT {
    constructor(address initialOwner)
        BaseTraderNFT("BaseAgg Bronze Trader", "BAGG-BRONZE", initialOwner)
    {
        _tierName        = "Bronze Trader";
        _tierColor       = "cd7f32";
        _tierEmoji       = unicode"🥉";
        _tierDescription = "Awarded to BaseAgg traders who reached 500 points. Keep swapping!";
    }
}
