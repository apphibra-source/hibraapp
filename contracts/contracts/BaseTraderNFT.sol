// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BaseTraderNFT
 * @dev Shared base for all 4 BaseAgg trader NFTs.
 *      - 1 mint per address (soulbound-style, but transferable)
 *      - Free mint, no payment required
 *      - On-chain SVG metadata
 */
abstract contract BaseTraderNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    // address → has minted
    mapping(address => bool) public hasMinted;
    // tokenId → minter address
    mapping(uint256 => address) public tokenMinter;

    // Tier metadata — set by child contracts
    string internal _tierName;
    string internal _tierColor;
    string internal _tierEmoji;
    string internal _tierDescription;

    event Minted(address indexed minter, uint256 indexed tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC721(name_, symbol_) Ownable(initialOwner) {}

    /**
     * @notice Mint one NFT. Each address can only mint once.
     */
    function mint() external {
        require(!hasMinted[msg.sender], "Already minted");

        uint256 tokenId = _nextTokenId++;
        hasMinted[msg.sender] = true;
        tokenMinter[tokenId] = msg.sender;

        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    /**
     * @notice Total supply minted so far.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice On-chain SVG metadata.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory svg = _buildSVG(tokenId);
        string memory json = string(abi.encodePacked(
            '{"name":"', _tierName, ' #', tokenId.toString(), '",',
            '"description":"', _tierDescription, '",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
                '{"trait_type":"Tier","value":"', _tierName, '"},',
                '{"trait_type":"Token ID","value":', tokenId.toString(), '}',
            ']}'
        ));

        return string(abi.encodePacked(
            'data:application/json;base64,',
            Base64.encode(bytes(json))
        ));
    }

    function _buildSVG(uint256 tokenId) internal view returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs>',
                '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                    '<stop offset="0%" style="stop-color:#0d0d1a"/>',
                    '<stop offset="100%" style="stop-color:#1a1a35"/>',
                '</linearGradient>',
                '<linearGradient id="tier" x1="0%" y1="0%" x2="100%" y2="100%">',
                    '<stop offset="0%" style="stop-color:', _tierColor, '"/>',
                    '<stop offset="100%" style="stop-color:#7c5cfc"/>',
                '</linearGradient>',
            '</defs>',
            '<rect width="400" height="400" fill="url(#bg)" rx="24"/>',
            '<rect x="20" y="20" width="360" height="360" fill="none" stroke="url(#tier)" stroke-width="2" rx="16" opacity="0.6"/>',
            '<text x="200" y="160" font-size="80" text-anchor="middle" dominant-baseline="middle">', _tierEmoji, '</text>',
            '<text x="200" y="230" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">', _tierName, '</text>',
            '<text x="200" y="262" font-family="Arial,sans-serif" font-size="13" fill="#8888aa" text-anchor="middle">BaseAgg Trader</text>',
            '<text x="200" y="340" font-family="monospace" font-size="11" fill="#', _tierColor, '" text-anchor="middle" opacity="0.7">#', tokenId.toString(), '</text>',
            '</svg>'
        ));
    }
}
