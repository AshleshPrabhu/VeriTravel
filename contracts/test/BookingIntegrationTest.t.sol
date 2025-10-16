// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {DeployBooking} from "../script/DeployBooking.s.sol";
import {BookingNft} from "../src/BookingNft.sol";
import {BookingEscrow} from "../src/BookingEscrow.sol";

contract BookingIntegrationTest is Test {
    BookingEscrow bookingEscrow;

    address USER = makeAddr("user");
    address HOTEL = makeAddr("hotel");

    uint256 constant STARTING_USER_BALANCE = 10 ether;
    string constant tokenUri =
        "ipfs://QmTpCSa2RKXZDvtFZLmqEkXhzBPh5kH1nep9KbySFAjcS8";
    uint256 constant STARTING_HOTEL_BALANCE = 10 ether;
    uint256 constant ROOM_PRICE = 2 ether;

    function setUp() external {
        DeployBooking deployBooking = new DeployBooking();
        bookingEscrow = deployBooking.run();
        vm.deal(USER, STARTING_USER_BALANCE);
        vm.deal(HOTEL, STARTING_HOTEL_BALANCE);
    }

    function testUserCanBookAndCancel() public {
        address nftAddress = bookingEscrow.getBookingNft();
        BookingNft bookingNft = BookingNft(nftAddress);

        vm.prank(USER);
        uint256 bookingId = bookingEscrow.bookHotel{value: ROOM_PRICE}(
            HOTEL,
            ROOM_PRICE,
            tokenUri
        );

        // Booking created + Funds transferred to escrow
        assert(USER.balance == (STARTING_USER_BALANCE - ROOM_PRICE));
        assert(address(bookingEscrow).balance == ROOM_PRICE);
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
        address nftAddress = bookingEscrow.getBookingNft();
        BookingNft bookingNft = BookingNft(nftAddress);

        vm.prank(USER);
        uint256 bookingId = bookingEscrow.bookHotel{value: ROOM_PRICE}(
            HOTEL,
            ROOM_PRICE,
            tokenUri
        );

        assert(USER.balance == (STARTING_USER_BALANCE - ROOM_PRICE));
        assert(address(bookingEscrow).balance == ROOM_PRICE);
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

        assert(HOTEL.balance == (STARTING_HOTEL_BALANCE) + ROOM_PRICE);
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
