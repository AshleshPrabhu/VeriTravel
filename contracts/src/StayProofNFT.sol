// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract StayProofNFT is ERC721 {
    address private immutable HotelRegistry;
    uint256 private s_tokenCounter;
    mapping(uint256 => string) private s_tokenIdToUri;

    // BNFT -> SNFT
    constructor(address _hotelRegistry) ERC721("StayNft", "SNFT") {
        s_tokenCounter = 1;
        HotelRegistry = _hotelRegistry;
    }

    function mintNft(
        address to,
        string memory tokenUri
    ) external onlyHotel returns (uint256) {
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

    // Is burn needed for Stay?
    function burnNft(uint256 tokenId) external onlyHotel {
        _burn(tokenId);
    }

    modifier onlyHotel() {
        require(msg.sender == HotelRegistry, "Only Hotel can mint");
        _;
    }
}
