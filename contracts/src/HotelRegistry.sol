// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./StayProofNFT.sol";

contract HotelRegistry {
    address public owner;
    uint256 public hotelCount;
    StayProofNFT public staynft;

    // enum Status {
    //     PENDING,
    //     VERIFIED,
    //     REJECTED
    // }

    struct Hotel {
        // string ipfshash;
        // Status status;
        uint256 id;
        string name;
        address owner;
        string location;
        string description;
        uint256 pricepernight;
        uint256 ratings;
        uint256 totalbookings;
        uint256 totalRatingValue;
        uint256 totalRatingCount;
        string[] images;
        string[] tags;
        //
        uint8 stars;
        uint16 totalRooms;
        string phone;
        string email;
    }

    mapping(uint256 => Hotel) public hotels;
    // mapping(address => bool) public authorizedCallers;
    mapping(address => mapping(uint256 => bool)) public userStayed;
    mapping(address => mapping(uint256 => bool)) public hasRated;
    mapping(address => mapping(uint256 => uint256)) public stayNftId;

    // string ipfshash,
    event HotelRegistered(
        uint256 indexed hotelId,
        address indexed owner,
        string name,
        string location,
        uint256 pricePerNight,
        uint256 timestamp,
        uint8 stars,
        string[] tags
    );

    // event HotelVerified(
    //     uint256 indexed hotelId,
    //     address indexed admin,
    //     uint256 timestamp
    // );
    // event HotelRejected(
    //     uint256 indexed hotelId,
    //     address indexed admin,
    //     uint256 timestamp
    // );

    //  string ipfshash,
    // event HotelUpdated(
    //     uint256 indexed hotelId,
    //     uint256 pricePerNight,
    //     uint256 timestamp
    // );

    event HotelUpdated(
        uint256 indexed hotelId,
        address indexed owner,
        string name,
        string location,
        uint256 pricePerNight,
        uint256 timestamp,
        uint8 stars,
        string[] tags
    );
    event HotelOwnerChanged(
        uint256 indexed hotelId,
        address indexed oldOwner,
        address indexed newOwner,
        uint256 timestamp
    );
    event HotelRated(
        uint256 indexed hotelId,
        address indexed user,
        uint8 rating,
        uint256 averageRating,
        uint256 totalRatings,
        uint256 timestamp
    );
    event UserStayedMarked(
        uint256 indexed hotelId,
        address indexed user,
        uint256 timestamp
    );
    // event AuthorizedCallerSet(
    //     address indexed caller,
    //     bool allowed,
    //     uint256 timestamp
    // );

    // event HotelSuspended(
    //     uint256 indexed hotelId,
    //     address indexed admin,
    //     uint256 timestamp
    // );

    // modifier onlyAdmin() {
    //     require(msg.sender == owner, "You are not the admin");
    //     _;
    // }

    modifier onlyHotelOwner(uint256 hotelId) {
        require(hotelId < hotelCount, "invalid hotel id");
        require(
            hotels[hotelId].owner == msg.sender,
            "You are not the owner of this hotel"
        );
        _;
    }

    // modifier onlyAuthorizedCaller() {
    //     require(
    //         authorizedCallers[msg.sender] || msg.sender == owner,
    //         "Not authorized caller"
    //     );
    //     _;
    // }

    constructor() {
        owner = msg.sender;
        hotelCount = 0;
        staynft = new StayProofNFT(address(this));
    }

    // function setAuthorizedCaller(
    //     address caller,
    //     bool allowed
    // ) external onlyAdmin {
    //     require(caller != address(0), "zero-address");
    //     authorizedCallers[caller] = allowed;
    //     emit AuthorizedCallerSet(caller, allowed, block.timestamp);
    // }

    function registerHotel(
        string memory _name,
        string memory _description,
        string memory _location,
        // string memory _ipfshash,
        uint256 _pricepernight,
        string[] memory _tags,
        string[] memory _images,
        //
        uint8 _stars,
        uint16 _totalRooms,
        string memory _phone,
        string memory _email
    ) public {
        require(bytes(_name).length > 0, "Hotel name cannot be empty");
        require(
            bytes(_description).length > 0,
            "Hotel description cannot be empty"
        );
        require(bytes(_location).length > 0, "Hotel location cannot be empty");
        // require(bytes(_ipfshash).length > 0, "ipfshash cannot be empty");
        require(
            _pricepernight > 0,
            "Price per night must be greater than zero"
        );
        require(_stars > 0 && _stars <= 5, "Hotel can only be of 1-5 stars");

        Hotel memory currhotel = Hotel({
            id: hotelCount,
            name: _name,
            owner: msg.sender,
            location: _location,
            // ipfshash: _ipfshash,
            description: _description,
            pricepernight: _pricepernight,
            // status: Status.PENDING,
            ratings: 0,
            totalbookings: 0,
            totalRatingValue: 0,
            totalRatingCount: 0,
            images: _images,
            tags: _tags,
            stars: _stars,
            totalRooms: _totalRooms,
            phone: _phone,
            email: _email
        });
        hotels[hotelCount] = currhotel;
        emit HotelRegistered(
            hotelCount,
            msg.sender,
            _name,
            _location,
            _pricepernight,
            block.timestamp,
            _stars,
            // _ipfshash,
            _tags
        );
        hotelCount++;
    }

    function updateHotel(
        uint256 _hotelid,
        // string memory _newIpfsHash,
        string memory _newDescription,
        string memory _newLocation,
        uint256 _newPricePerNight,
        string[] memory _tags,
        string[] memory _images,
        //
        uint8 _newStars,
        uint16 _newTotalRooms,
        string memory _newPhone,
        string memory _newEmail
    ) public onlyHotelOwner(_hotelid) {
        require(_hotelid < hotelCount, "hotelid is not valid");
        // hotels[_hotelid].ipfshash = _newIpfsHash;
        hotels[_hotelid].description = _newDescription;
        hotels[_hotelid].location = _newLocation;
        hotels[_hotelid].pricepernight = _newPricePerNight;
        hotels[_hotelid].tags = _tags;
        hotels[_hotelid].images = _images;
        //
        hotels[_hotelid].stars = _newStars;
        hotels[_hotelid].totalRooms = _newTotalRooms;
        hotels[_hotelid].phone = _newPhone;
        hotels[_hotelid].email = _newEmail;

        emit HotelUpdated(
            _hotelid,
            hotels[_hotelid].owner,
            hotels[_hotelid].name,
            _newLocation,
            // _newIpfsHash,
            _newPricePerNight,
            block.timestamp,
            //
            _newStars,
            _tags
        );
    }

    function changeOwner(
        address _newowner,
        uint256 _hotelid
    ) public onlyHotelOwner(_hotelid) {
        require(_newowner != address(0), "New owner address cannot be zero");
        address old = hotels[_hotelid].owner;
        hotels[_hotelid].owner = _newowner;
        emit HotelOwnerChanged(_hotelid, old, _newowner, block.timestamp);
    }

    // Check Out from Hotel
    function ConfirmStay(
        uint256 _hotelid,
        address _user,
        string memory tokenUri
    ) public onlyHotelOwner(_hotelid) {
        userStayed[_user][_hotelid] = true;
        hotels[_hotelid].totalbookings++;
        uint256 nftId = staynft.mintNft(_user, tokenUri);
        stayNftId[_user][_hotelid] = nftId;
        emit UserStayedMarked(_hotelid, _user, block.timestamp);
    }

    function rateHotel(uint256 _hotelid, uint8 _rating) public {
        require(_hotelid < hotelCount, "invalid hotel id");
        require(_rating >= 1 && _rating <= 5, "rating must be 1-5");
        require(
            userStayed[msg.sender][_hotelid],
            "user didn't stay at this hotel"
        );
        require(
            !hasRated[msg.sender][_hotelid],
            "user already rated this hotel"
        );

        hasRated[msg.sender][_hotelid] = true;
        hotels[_hotelid].totalRatingValue += _rating;
        hotels[_hotelid].totalRatingCount += 1;

        uint256 avg = hotels[_hotelid].totalRatingValue /
            hotels[_hotelid].totalRatingCount;
        hotels[_hotelid].ratings = avg;

        emit HotelRated(
            _hotelid,
            msg.sender,
            _rating,
            avg,
            hotels[_hotelid].totalRatingCount,
            block.timestamp
        );
    }

    function getHotels() public view returns (Hotel[] memory) {
        Hotel[] memory allHotels = new Hotel[](hotelCount);
        for (uint256 i = 0; i < hotelCount; i++) {
            allHotels[i] = hotels[i];
        }
        return allHotels;
    }

    function getHotelsByOwner(
        address _owner
    ) public view returns (Hotel memory) {
        for (uint256 i = 0; i < hotelCount; i++) {
            if (hotels[i].owner == _owner) {
                return hotels[i];
            }
        }
        string[] memory emptyArray = new string[](0);
        return
            Hotel(
                0,
                "",
                address(0),
                "",
                "",
                // "",
                0,
                // Status.PENDING,
                0,
                0,
                0,
                0,
                emptyArray,
                emptyArray,
                0,
                0,
                "",
                ""
            );
    }

    function getHotel(uint256 _hotelid) public view returns (Hotel memory) {
        require(_hotelid < hotelCount, "invalid hotel id");
        return hotels[_hotelid];
    }
}
