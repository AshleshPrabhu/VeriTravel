// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {BookingEscrow} from "../src/BookingEscrow.sol";
import {BookingNft} from "../src/BookingNft.sol";

contract DeployBooking is Script {
    function run() external returns (BookingEscrow) {
        vm.startBroadcast();
        BookingEscrow bookingEscrow = new BookingEscrow();
        vm.stopBroadcast();

        return bookingEscrow;
    }
}
