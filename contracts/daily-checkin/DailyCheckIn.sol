// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../utils/VerifySign.sol";

import {IDateTimeUtils} from "./interfaces/IDateTimeUtils.sol";

contract DailyCheckIn is
    VerifySign,
    PausableUpgradeable,
    AccessControlEnumerableUpgradeable
{
    mapping(bytes32 => mapping(address => bool)) public dailyAccountCheckIns;

    address public dateTime;

    event CheckIn(address indexed from, bytes32 dateTime);

    function initialize(address _dateTime) public initializer {
        __AccessControlEnumerable_init();
        dateTime = _dateTime;
    }

    function checkIn() external {
        bytes32 todayHash = IDateTimeUtils(dateTime).getTodayHash();
        require(
            !dailyAccountCheckIns[todayHash][msg.sender],
            "Already checked in for today"
        );

        dailyAccountCheckIns[todayHash][msg.sender] = true;

        emit CheckIn(msg.sender, todayHash);
    }

    function getTodayCheckIn(address _address) public view returns (bool) {
        bytes32 todayHash = IDateTimeUtils(dateTime).getTodayHash();
        return dailyAccountCheckIns[todayHash][_address];
    }

    function getTodayHash() public view returns (bytes32) {
        return IDateTimeUtils(dateTime).getTodayHash();
    }
}
