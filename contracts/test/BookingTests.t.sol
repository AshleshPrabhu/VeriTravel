// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "../lib/forge-std/src/Test.sol";
import {DeployHotelBooking} from "../script/DeployHotelBooking.s.sol";
import {HotelRegistry} from "../src/HotelRegistry.sol";
import {BookingNft} from "../src/BookingNft.sol";
import {BookingEscrow} from "../src/BookingEscrow.sol";

contract BookingIntegrationTest is Test {
    HotelRegistry hotelRegistry;
    BookingEscrow bookingEscrow;

    address HOTEL = makeAddr("hotelOwner");
    address USER = makeAddr("user");

    uint256 constant STARTING_HOTEL_BALANCE = 10 ether;
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

    function setUp() external {
        DeployHotelBooking deployHotelBooking = new DeployHotelBooking();
        (hotelRegistry, bookingEscrow) = deployHotelBooking.run();
        vm.deal(USER, STARTING_USER_BALANCE);
        vm.deal(HOTEL, STARTING_HOTEL_BALANCE);
    }

    function testUserCanBookAndCancel() public {
        // Register Hotel
        vm.prank(HOTEL);
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

        /* 
            Booking Test
        */
        address nftAddress = bookingEscrow.getBookingNft();
        BookingNft bookingNft = BookingNft(nftAddress);

        vm.prank(USER);
        uint256 bookingId = bookingEscrow.bookHotel{value: HOTEL_PRICE}(
            0,
            HOTEL_PRICE,
            BOOKING_TOKEN_URI
        );

        // Booking created + Funds transferred to escrow
        assert(USER.balance == (STARTING_USER_BALANCE - HOTEL_PRICE));
        assert(address(bookingEscrow).balance == HOTEL_PRICE);
        assert(
            bookingEscrow.getBooking(bookingId).bookingStatus ==
                BookingEscrow.BookingStatus.Booked
        );

        // Booking NFT is minted
        uint256 nftId = bookingEscrow.getBooking(bookingId).nftId;
        assertEq(bookingNft.ownerOf(nftId), USER);
        assertEq(bookingNft.balanceOf(USER), 1);

        // Cancel Booking
        vm.prank(USER);
        bookingEscrow.cancelBooking(bookingId);

        assert(USER.balance == STARTING_USER_BALANCE);
        assert(address(bookingEscrow).balance == 0);
        assert(
            bookingEscrow.getBooking(bookingId).bookingStatus ==
                BookingEscrow.BookingStatus.Cancelled
        );

        // Booking NFT is burned
        vm.expectRevert();
        bookingNft.ownerOf(nftId);
        assertEq(bookingNft.balanceOf(USER), 0);
    }

    function testUserCanBookAndCheckIn() public {
        // Register Hotel
        vm.prank(HOTEL);
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

        /*
            Booking Test
        */
        address nftAddress = bookingEscrow.getBookingNft();
        BookingNft bookingNft = BookingNft(nftAddress);

        vm.prank(USER);
        uint256 bookingId = bookingEscrow.bookHotel{value: HOTEL_PRICE}(
            0,
            HOTEL_PRICE,
            BOOKING_TOKEN_URI
        );

        assert(USER.balance == (STARTING_USER_BALANCE - HOTEL_PRICE));
        assert(address(bookingEscrow).balance == HOTEL_PRICE);
        assert(
            bookingEscrow.getBooking(bookingId).bookingStatus ==
                BookingEscrow.BookingStatus.Booked
        );

        // Booking NFT is minted
        uint256 nftId = bookingEscrow.getBooking(bookingId).nftId;
        assertEq(bookingNft.ownerOf(nftId), USER);
        assertEq(bookingNft.balanceOf(USER), 1);

        // Check-In Hotel
        vm.prank(USER);
        bookingEscrow.checkInHotel(bookingId);

        assert(HOTEL.balance == (STARTING_HOTEL_BALANCE) + HOTEL_PRICE);
        assert(address(bookingEscrow).balance == 0);
        assert(
            bookingEscrow.getBooking(bookingId).bookingStatus ==
                BookingEscrow.BookingStatus.CheckedIn
        );

        // Booking NFT is burned
        vm.expectRevert();
        bookingNft.ownerOf(nftId);
        assertEq(bookingNft.balanceOf(USER), 0);
    }
}
