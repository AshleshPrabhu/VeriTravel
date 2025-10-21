// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {BookingNft} from "../src/BookingNft.sol";
import {HotelRegistry} from "../src/HotelRegistry.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract BookingEscrow {
    uint256 private s_bookingCounter;
    BookingNft private s_bookingNft;
    HotelRegistry private s_hotelRegistry;

    mapping(uint256 => Booking) private s_bookingIdToBooking;
    mapping(address => uint256[]) private s_userToBookingIds;
    mapping(uint256 => uint256[]) private s_hotelIdToBookingIds;

    enum BookingStatus {
        Booked,
        CheckedIn,
        Cancelled
    }

    struct Booking {
        uint256 bookingId;
        address user;
        uint256 hotelId;
        uint256 amount;
        uint256 nftId;
        uint256 checkInDate;
        uint256 checkOutDate;
        BookingStatus bookingStatus;
    }

    // Events
    event CheckedIn(
        address indexed user,
        uint256 indexed hotelId,
        uint256 indexed bookingId,
        uint256 nftId
    );
    event BookingCreated(
        address indexed user,
        uint256 indexed hotelId,
        uint256 indexed bookingId,
        uint256 nftId,
        uint256 checkInDate,
        uint256 checkOutDate
    );
    event BookingCancelled(
        address indexed user,
        uint256 indexed hotelId,
        uint256 indexed bookingId,
        uint256 nftId
    );
    constructor(address hotelRegistry) {
        s_bookingCounter = 0;
        s_bookingNft = new BookingNft(address(this));
        s_hotelRegistry = HotelRegistry(hotelRegistry);
    }

    // User deposits funds & books
    function bookHotel(
        uint256 hotelId,
        uint256 checkInDate,
        uint256 checkOutDate
    ) external payable returns (uint256) {
        require(hotelId < s_hotelRegistry.hotelCount(), "Invalid Hotel Id");
        require(checkOutDate > checkInDate, "Check-out must be after Check-in");
        require(
            checkInDate >= block.timestamp,
            "Check-in cannot be in the past"
        );

        uint256 roomPrice = s_hotelRegistry.getHotel(hotelId).pricepernight;
        uint256 duration = (checkOutDate - checkInDate) / 1 days;
        uint256 totalPrice = roomPrice * duration;
        require(msg.value == totalPrice, "Incorrect payment amount");

        // NFT metadata
        string memory json = string(
            abi.encodePacked(
                '{"name": "Confirmed booking at ',
                s_hotelRegistry.getHotel(hotelId).name,
                '", "check_in": "',
                Strings.toString(checkInDate),
                '", "check_out": "',
                Strings.toString(checkOutDate),
                '", "hotel_id": "',
                Strings.toString(hotelId),
                '", "booking_id": "',
                Strings.toString(s_bookingCounter + 1),
                '", "status": "Booked"}'
            )
        );

        // Base64 encode and prefix for NFT
        string memory tokenUri = string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );

        // Mint NFT -> Booking
        uint256 nftId = s_bookingNft.mintNft(msg.sender, tokenUri);

        s_bookingCounter++;
        Booking memory newBooking = Booking({
            bookingId: s_bookingCounter,
            user: msg.sender,
            hotelId: hotelId,
            amount: roomPrice * duration,
            nftId: nftId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            bookingStatus: BookingStatus.Booked
        });

        s_bookingIdToBooking[s_bookingCounter] = newBooking;
        s_userToBookingIds[msg.sender].push(s_bookingCounter);
        s_hotelIdToBookingIds[hotelId].push(s_bookingCounter);

        emit BookingCreated(
            newBooking.user,
            newBooking.hotelId,
            newBooking.bookingId,
            newBooking.nftId,
            newBooking.checkInDate,
            newBooking.checkOutDate
        );
        return s_bookingCounter;
    }

    // Release funds on Check-In to hotel
    function checkInHotel(uint256 bookingId) external {
        require(
            bookingId <= s_bookingCounter && bookingId != 0,
            "Invalid Booking Id"
        );
        Booking storage currentBooking = s_bookingIdToBooking[bookingId];

        require(
            currentBooking.bookingStatus == BookingStatus.Booked,
            "User has already checked-in or cancelled"
        );
        require(
            currentBooking.user == msg.sender,
            "Only the person who booked can check-in"
        );

        currentBooking.bookingStatus = BookingStatus.CheckedIn;

        // Burn Nft -> Check-In Complete
        s_bookingNft.burnNft(currentBooking.nftId);

        address hotelWallet = s_hotelRegistry
            .getHotel(currentBooking.hotelId)
            .owner;

        // Release funds to Hotel
        (bool callSuccess, ) = payable(hotelWallet).call{
            value: currentBooking.amount
        }("");
        require(callSuccess, "Call failed");

        emit CheckedIn(
            currentBooking.user,
            currentBooking.hotelId,
            currentBooking.bookingId,
            currentBooking.nftId
        );
    }

    // Releases funds on Cancellation
    function cancelBooking(uint256 bookingId) external {
        require(
            bookingId <= s_bookingCounter && bookingId != 0,
            "Invalid Booking Id"
        );
        Booking storage currentBooking = s_bookingIdToBooking[bookingId];

        require(
            currentBooking.bookingStatus == BookingStatus.Booked,
            "User has already checked-in or cancelled"
        );
        require(
            currentBooking.user == msg.sender,
            "Only the person who booked can cancel"
        );

        currentBooking.bookingStatus = BookingStatus.Cancelled;

        // Burn Nft -> Check-In Complete
        s_bookingNft.burnNft(currentBooking.nftId);

        // Release funds to User
        (bool callSuccess, ) = payable(currentBooking.user).call{
            value: currentBooking.amount
        }("");
        require(callSuccess, "Call failed");

        emit BookingCancelled(
            currentBooking.user,
            currentBooking.hotelId,
            currentBooking.bookingId,
            currentBooking.nftId
        );
    }

    // Getters
    function getUserBookings(
        address user
    ) external view returns (Booking[] memory) {
        uint256[] memory bookingIds = s_userToBookingIds[user];

        require(bookingIds.length > 0, "User has no bookings");
        Booking[] memory userBookings = new Booking[](bookingIds.length);

        for (uint256 i = 0; i < bookingIds.length; i++) {
            userBookings[i] = s_bookingIdToBooking[bookingIds[i]];
        }

        return userBookings;
    }

    function getBooking(
        uint256 bookingId
    ) public view returns (Booking memory) {
        require(
            bookingId <= s_bookingCounter && bookingId != 0,
            "Invalid Booking Id"
        );
        return s_bookingIdToBooking[bookingId];
    }

    function getHotelBookings(
        uint256 hotelId
    ) public view returns (Booking[] memory) {
        require(hotelId < s_hotelRegistry.hotelCount(), "Invalid Hotel Id");

        uint256[] memory bookingIds = s_hotelIdToBookingIds[hotelId];
        Booking[] memory hotelBookings = new Booking[](bookingIds.length);

        for (uint256 i = 0; i < bookingIds.length; i++) {
            hotelBookings[i] = s_bookingIdToBooking[bookingIds[i]];
        }

        return hotelBookings;
    }

    // Testing purposes only
    function getBookingNft() external view returns (address) {
        return address(s_bookingNft);
    }
}
