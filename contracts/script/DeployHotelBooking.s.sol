// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Script} from "../lib/forge-std/src/Script.sol";
import {HotelRegistry} from "../src/HotelRegistry.sol";
import {BookingEscrow} from "../src/BookingEscrow.sol";

contract DeployHotelBooking is Script {
    function run() external returns (HotelRegistry, BookingEscrow) {
        vm.startBroadcast();
        HotelRegistry hotelRegistry = new HotelRegistry();
        BookingEscrow bookingEscrow = new BookingEscrow(address(hotelRegistry));
        vm.stopBroadcast();

        return (hotelRegistry, bookingEscrow);
    }
}
