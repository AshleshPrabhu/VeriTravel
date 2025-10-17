// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "../lib/forge-std/src/Test.sol";
import {HotelRegistry} from "../src/HotelRegistry.sol";
import {StayProofNFT} from "../src/StayProofNFT.sol";
import {DeployHotelBooking} from "../script/DeployHotelBooking.s.sol";

contract HotelIntegrationTest is Test {
    HotelRegistry hotelRegistry;

    address HOTEL_OWNER = makeAddr("hotelOwner");
    address USER = makeAddr("user");

    uint256 constant STARTING_OWNER_BALANCE = 10 ether;
    uint256 constant STARTING_USER_BALANCE = 10 ether;

    string constant NAME = "Sunset Resort";
    string constant DESCRIPTION = "Beautiful seaside resort";
    string constant LOCATION = "Goa, India";
    uint256 constant PRICE_PER_NIGHT = 2 ether;
    string[] TAGS = ["Beach", "Luxury"];
    string[] IMAGES = [
        "ipfs://QmaKg2LbPVmujAYLfyPaf9xsqqdVLoG19wg3fNn8hopcFP",
        "ipfs://QmVVBmckNRCUtQWapoKmBAS7EUurugLm4aUSa5JcAoZcTp"
    ];
    uint8 constant STARS = 5;
    uint16 constant TOTAL_ROOMS = 20;
    string constant PHONE = "9999999999";
    string constant EMAIL = "sunset@resort.com";
    string constant TOKEN_URI =
        "ipfs://QmRcwdDDcXK3ZYgifq91kMjik64yzESB24mBNcbACuirzp";

    function setUp() external {
        DeployHotelBooking deployHotelBooking = new DeployHotelBooking();
        (hotelRegistry, ) = deployHotelBooking.run();
        vm.deal(HOTEL_OWNER, STARTING_OWNER_BALANCE);
        vm.deal(USER, STARTING_USER_BALANCE);
    }

    /*
        Register & Basic Getter Tests
    */

    function testHotelOwnerCanRegisterHotel() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        // Check hotel count
        assertEq(hotelRegistry.hotelCount(), 1);

        // Check stored hotel data
        HotelRegistry.Hotel memory hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.id, 0);
        assertEq(hotel.name, NAME);
        assertEq(hotel.owner, HOTEL_OWNER);
        assertEq(hotel.location, LOCATION);
        assertEq(hotel.description, DESCRIPTION);
        assertEq(hotel.pricepernight, PRICE_PER_NIGHT);
        assertEq(hotel.ratings, 0);
        assertEq(hotel.totalbookings, 0);
        assertEq(hotel.stars, STARS);
        assertEq(hotel.totalRooms, TOTAL_ROOMS);
        assertEq(hotel.phone, PHONE);
        assertEq(hotel.email, EMAIL);
    }

    /*
        Update Function Tests
    */

    function testHotelOwnerCanUpdateHotel() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        string[] memory newTags = TAGS;
        string[] memory newImgs = IMAGES;
        newTags[0] = "UpdatedTag";
        newImgs[0] = "ipfs://newImage";

        vm.prank(HOTEL_OWNER);
        hotelRegistry.updateHotel(
            0,
            "Updated Desc",
            "New Location",
            3 ether,
            newTags,
            newImgs,
            4,
            25,
            "1234567890",
            "new@email.com"
        );

        HotelRegistry.Hotel memory hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.description, "Updated Desc");
        assertEq(hotel.location, "New Location");
        assertEq(hotel.pricepernight, 3 ether);
        assertEq(hotel.stars, 4);
        assertEq(hotel.totalRooms, 25);
        assertEq(hotel.phone, "1234567890");
        assertEq(hotel.email, "new@email.com");
    }

    /*
        Ownership Transfer
    */

    function testHotelOwnerCanChangeOwnership() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        // Verify initial owner
        HotelRegistry.Hotel memory hotelBefore = hotelRegistry.getHotel(0);
        assertEq(hotelBefore.owner, HOTEL_OWNER);

        // Change owner
        address newOwner = makeAddr("newOwner");
        vm.prank(HOTEL_OWNER);
        hotelRegistry.changeOwner(newOwner, 0);

        // Verify updated owner
        HotelRegistry.Hotel memory hotelAfter = hotelRegistry.getHotel(0);
        assertEq(hotelAfter.owner, newOwner);
    }

    /*
        Confirm Stay + NFT Integration
    */

    function testOwnerCanConfirmStayAndMintProofNFT() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        StayProofNFT stayNFT = hotelRegistry.staynft();

        vm.prank(HOTEL_OWNER);
        hotelRegistry.ConfirmStay(0, USER, TOKEN_URI);

        // userStayed should be true
        assertTrue(hotelRegistry.userStayed(USER, 0));

        // totalBookings incremented
        HotelRegistry.Hotel memory hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.totalbookings, 1);

        // NFT minted to USER
        uint256 nftId = hotelRegistry.stayNftId(USER, 0);
        assertEq(stayNFT.ownerOf(nftId), USER);
        assertEq(stayNFT.balanceOf(USER), 1);
    }

    /*
        Rating
    */

    function testUserCanRateHotelAfterStay() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        vm.prank(HOTEL_OWNER);
        hotelRegistry.ConfirmStay(0, USER, TOKEN_URI);

        vm.prank(USER);
        hotelRegistry.rateHotel(0, 5);

        HotelRegistry.Hotel memory hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.ratings, 5);
        assertEq(hotel.totalRatingValue, 5);
        assertEq(hotel.totalRatingCount, 1);
        assertTrue(hotelRegistry.hasRated(USER, 0));
    }

    /*
        Negative Tests
    */

    function testNonOwnerCannotUpdateHotel() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        vm.prank(USER);
        vm.expectRevert("You are not the owner of this hotel");
        hotelRegistry.updateHotel(
            0,
            "New Desc",
            "Loc",
            1 ether,
            TAGS,
            IMAGES,
            3,
            10,
            PHONE,
            EMAIL
        );
    }

    function testUserCannotRateWithoutStay() public {
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            NAME,
            DESCRIPTION,
            LOCATION,
            PRICE_PER_NIGHT,
            TAGS,
            IMAGES,
            STARS,
            TOTAL_ROOMS,
            PHONE,
            EMAIL
        );

        vm.prank(USER);
        vm.expectRevert("user didn't stay at this hotel");
        hotelRegistry.rateHotel(0, 4);
    }
}
