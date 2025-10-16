// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BookingNft is ERC721 {
    address private immutable bookingEscrow;
    uint256 private s_tokenCounter;
    mapping(uint256 => string) private s_tokenIdToUri;

    constructor(address _bookingEscrow) ERC721("BookingNft", "BNFT") {
        s_tokenCounter = 1;
        bookingEscrow = _bookingEscrow;
    }

    // Mint NFT on hotel booking
    function mintNft(
        address to,
        string memory tokenUri
    ) external onlyEscrow returns (uint256) {
        uint256 tokenId = s_tokenCounter++;
        s_tokenIdToUri[tokenId] = tokenUri;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        return s_tokenIdToUri[tokenId];
    }

    // Burn NFT on hotel check-in
    function burnNft(uint256 tokenId) external onlyEscrow {
        _burn(tokenId);
    }

    modifier onlyEscrow() {
        require(msg.sender == bookingEscrow, "Only Escrow can mint");
        _;
    }
}
