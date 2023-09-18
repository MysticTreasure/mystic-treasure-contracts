// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IDateTime} from "./interfaces/IDateTime.sol";

contract DateTimeUtils is AccessControlEnumerableUpgradeable {
    IDateTime dateTime;

    function initialize(address _dateTime) public initializer {
        __AccessControlEnumerable_init();
        dateTime = IDateTime(_dateTime);
    }

    function getTodayHash() public view returns (bytes32) {
        uint256 year = dateTime.getYear(block.timestamp);
        uint256 month = dateTime.getMonth(block.timestamp);
        uint256 day = dateTime.getDay(block.timestamp);

        return keccak256(abi.encodePacked([year, month, day]));
    }
}
