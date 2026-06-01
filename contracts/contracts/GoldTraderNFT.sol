// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTraderNFT.sol";

/**
 * @title GoldTraderNFT
 * @dev Gold tier — requires 1500+ pts on BaseAgg
 */
contract GoldTraderNFT is BaseTraderNFT {
    constructor(address initialOwner)
        BaseTraderNFT("BaseAgg Gold Trader", "BAGG-GOLD", initialOwner)
    {
        _tierName        = "Gold Trader";
        _tierColor       = "ffd700";
        _tierEmoji       = unicode"🥇";
        _tierDescription = "Awarded to BaseAgg traders who reached 1500 points. Elite trader!";
    }
}
