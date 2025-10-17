// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "../lib/forge-std/src/Test.sol";
import {BookingNft} from "../src/BookingNft.sol";
import {BookingEscrow} from "../src/BookingEscrow.sol";
import {StayProofNFT} from "../src/StayProofNFT.sol";
import {HotelRegistry} from "../src/HotelRegistry.sol";
import {DeployHotelBooking} from "../script/DeployHotelBooking.s.sol";

contract HotelBookingFullFlowTest is Test {
    HotelRegistry hotelRegistry;
    BookingEscrow bookingEscrow;

    address HOTEL_OWNER = makeAddr("hotelOwner");
    address USER = makeAddr("user");

    uint256 constant STARTING_OWNER_BALANCE = 10 ether;
    uint256 constant STARTING_USER_BALANCE = 10 ether;

    string constant HOTEL_NAME = "Sunset Resort";
    string constant HOTEL_DESC = "Beautiful seaside resort";
    string constant HOTEL_LOCATION = "Goa, India";
    uint256 constant HOTEL_PRICE = 2 ether;
    string[] HOTEL_TAGS = ["Beach", "Luxury"];
    string[] HOTEL_IMAGES = [
        "ipfs://QmaKg2LbPVmujAYLfyPaf9xsqqdVLoG19wg3fNn8hopcFP",
        "ipfs://QmVVBmckNRCUtQWapoKmBAS7EUurugLm4aUSa5JcAoZcTp"
    ];
    uint8 constant HOTEL_STARS = 5;
    uint16 constant HOTEL_TOTAL_ROOMS = 20;
    string constant HOTEL_PHONE = "9999999999";
    string constant HOTEL_EMAIL = "sunset@resort.com";

    string constant BOOKING_TOKEN_URI =
        "ipfs://QmTpCSa2RKXZDvtFZLmqEkXhzBPh5kH1nep9KbySFAjcS8";
    string constant STAY_TOKEN_URI =
        "ipfs://QmRcwdDDcXK3ZYgifq91kMjik64yzESB24mBNcbACuirzp";

    function setUp() external {
        DeployHotelBooking deployHotelBooking = new DeployHotelBooking();
        (hotelRegistry, bookingEscrow) = deployHotelBooking.run();
        vm.deal(HOTEL_OWNER, STARTING_OWNER_BALANCE);
        vm.deal(USER, STARTING_USER_BALANCE);
    }

    function testFullBookingFlow() public {
        /*
            Register Hotel
        */
        vm.prank(HOTEL_OWNER);
        hotelRegistry.registerHotel(
            HOTEL_NAME,
            HOTEL_DESC,
            HOTEL_LOCATION,
            HOTEL_PRICE,
            HOTEL_TAGS,
            HOTEL_IMAGES,
            HOTEL_STARS,
            HOTEL_TOTAL_ROOMS,
            HOTEL_PHONE,
            HOTEL_EMAIL
        );

        HotelRegistry.Hotel memory hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.owner, HOTEL_OWNER);
        assertEq(hotel.totalbookings, 0);

        /*
            User Books Hotel via BookingEscrow
        */
        BookingNft bookingNft = BookingNft(bookingEscrow.getBookingNft());

        vm.prank(USER);
        uint256 bookingId = bookingEscrow.bookHotel{value: HOTEL_PRICE}(
            0,
            HOTEL_PRICE,
            BOOKING_TOKEN_URI
        );

        // BookingNFT minted
        uint256 bookingNftId = bookingEscrow.getBooking(bookingId).nftId;
        assertEq(bookingNft.ownerOf(bookingNftId), USER);
        assertEq(bookingNft.balanceOf(USER), 1);

        // User balance reduced, escrow holds funds
        assertEq(USER.balance, STARTING_USER_BALANCE - HOTEL_PRICE);
        assertEq(address(bookingEscrow).balance, HOTEL_PRICE);

        /*
            User Checks In via BookingEscrow
        */
        vm.prank(USER);
        bookingEscrow.checkInHotel(bookingId);

        // Funds transferred to hotel
        assertEq(HOTEL_OWNER.balance, STARTING_OWNER_BALANCE + HOTEL_PRICE);
        assertEq(address(bookingEscrow).balance, 0);

        // Booking NFT burned
        vm.expectRevert();
        bookingNft.ownerOf(bookingNftId);
        assertEq(bookingNft.balanceOf(USER), 0);

        /*
            Hotel Confirms Stay → Mint Proof NFT
        */
        StayProofNFT stayNFT = hotelRegistry.staynft();
        vm.prank(HOTEL_OWNER);
        hotelRegistry.ConfirmStay(0, USER, STAY_TOKEN_URI);

        // userStayed should be true
        assertTrue(hotelRegistry.userStayed(USER, 0));

        // totalBookings incremented
        hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.totalbookings, 1);

        // Proof-of-Stay NFT minted
        uint256 stayNftId = hotelRegistry.stayNftId(USER, 0);
        assertEq(stayNFT.ownerOf(stayNftId), USER);
        assertEq(stayNFT.balanceOf(USER), 1);

        /*
            User Rates Hotel
        */
        vm.prank(USER);
        hotelRegistry.rateHotel(0, 5);

        hotel = hotelRegistry.getHotel(0);
        assertEq(hotel.ratings, 5);
        assertEq(hotel.totalRatingValue, 5);
        assertEq(hotel.totalRatingCount, 1);
        assertTrue(hotelRegistry.hasRated(USER, 0));
    }
}
