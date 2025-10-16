// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../src/BookingNft.sol";

contract BookingEscrow {
    uint256 private s_bookingCounter;
    BookingNft private s_bookingNft;

    mapping(uint256 => Booking) private s_bookingIdToBooking;
    mapping(address => uint256[]) private s_userToBookingIds;
    mapping(address => uint256[]) private s_hotelToBookingIds;

    enum BookingStatus {
        Booked,
        CheckedIn,
        Cancelled
    }

    struct Booking {
        address user;
        address hotel;
        uint256 amount;
        uint256 nftId;
        BookingStatus bookingStatus;
    }

    // Events
    event CheckedIn(Booking booking);
    event BookingCreated(Booking booking);
    event BookingCancelled(Booking booking);

    constructor() {
        s_bookingCounter = 0;
        s_bookingNft = new BookingNft(address(this));
    }

    // User deposits funds & books
    function bookHotel(
        address hotelWallet,
        uint256 roomPrice,
        string memory tokenUri
    ) external payable returns (uint256) {
        require(msg.value == roomPrice, "Incorrect payment amount");

        // Mint NFT -> Booking
        uint256 nftId = s_bookingNft.mintNft(msg.sender, tokenUri);

        s_bookingCounter++;
        Booking memory newBooking = Booking({
            user: msg.sender,
            hotel: hotelWallet,
            amount: roomPrice,
            nftId: nftId,
            bookingStatus: BookingStatus.Booked
        });
        s_bookingIdToBooking[s_bookingCounter] = newBooking;
        s_userToBookingIds[msg.sender].push(s_bookingCounter);
        s_hotelToBookingIds[hotelWallet].push(s_bookingCounter);

        emit BookingCreated(newBooking);
        return s_bookingCounter;
    }

    // Release funds on Check-In to hotel
    function checkInHotel(uint256 bookingId) external {
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

        // Release funds to Hotel
        (bool callSuccess, ) = payable(currentBooking.hotel).call{
            value: currentBooking.amount
        }("");
        require(callSuccess, "Call failed");

        emit CheckedIn(currentBooking);
    }

    // Releases funds on Cancellation
    function cancelBooking(uint256 bookingId) external {
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

        emit BookingCancelled(currentBooking);
    }

    // Getters
    function getUserBookings(
        address user
    ) external view returns (Booking[] memory) {
        uint256[] memory bookingIds = s_userToBookingIds[user];
        Booking[] memory userBookings = new Booking[](bookingIds.length);

        for (uint256 i = 0; i < bookingIds.length; i++) {
            userBookings[i] = s_bookingIdToBooking[bookingIds[i]];
        }

        return userBookings;
    }

    function getBooking(
        uint256 bookingId
    ) external view returns (Booking memory) {
        return s_bookingIdToBooking[bookingId];
    }

    function getHotelBookings(
        address hotel
    ) external view returns (Booking[] memory) {
        uint256[] memory bookingIds = s_hotelToBookingIds[hotel];
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
