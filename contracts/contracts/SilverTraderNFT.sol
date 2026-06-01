// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTraderNFT.sol";

/**
 * @title SilverTraderNFT
 * @dev Silver tier — requires 1000+ pts on BaseAgg
 */
contract SilverTraderNFT is BaseTraderNFT {
    constructor(address initialOwner)
        BaseTraderNFT("BaseAgg Silver Trader", "BAGG-SILVER", initialOwner)
    {
        _tierName        = "Silver Trader";
        _tierColor       = "c0c0c0";
        _tierEmoji       = unicode"🥈";
        _tierDescription = "Awarded to BaseAgg traders who reached 1000 points. Impressive!";
    }
}
