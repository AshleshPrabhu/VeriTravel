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

    // Access control
    modifier onlyEscrow() {
        require(msg.sender == bookingEscrow, "Only Escrow can mint");
        _;
    }

    // Non-transferable
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        // Allow only mint (from 0) or burn (to 0)
        if (to != address(0) && auth != address(0)) {
            revert("This NFT is non-transferable");
        }

        return super._update(to, tokenId, auth);
    }
}
