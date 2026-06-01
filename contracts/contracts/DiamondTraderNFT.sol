// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTraderNFT.sol";

/**
 * @title DiamondTraderNFT
 * @dev Diamond tier — requires 2000+ pts on BaseAgg
 */
contract DiamondTraderNFT is BaseTraderNFT {
    constructor(address initialOwner)
        BaseTraderNFT("BaseAgg Diamond Trader", "BAGG-DIAMOND", initialOwner)
    {
        _tierName        = "Diamond Trader";
        _tierColor       = "b9f2ff";
        _tierEmoji       = unicode"💎";
        _tierDescription = "Awarded to BaseAgg traders who reached 2000 points. Legendary!";
    }
}
