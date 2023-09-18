const { ethers } = require("hardhat");
const chai = require("chai");

const DateTime = artifacts.require("DateTime");
const DateTimeUtils = artifacts.require("DateTimeUtils");
const DailyCheckIn = artifacts.require("DailyCheckIn");

const { expect } = chai;
const { expectRevert } = require("@openzeppelin/test-helpers");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

describe("DailyCheckIn", () => {
  let ownerSigner;

  let owner;
  let player1 = "0xfC867cbdc72f6690343aC1a32eD0a3fe5EaC9ce5"; // replace with ganache rpc's server address

  let dailyCheckIn;

  before(async () => {
    [ownerSigner] = await ethers.getSigners();
    owner = ownerSigner.address;

    const dateTime = await deployProxy(DateTime, []);
    const dateTimeUtils = await deployProxy(DateTimeUtils, [dateTime.address]);
    dailyCheckIn = await deployProxy(DailyCheckIn, [dateTimeUtils.address]);
  });

  describe("checkIn()", async () => {
    it("should check in succesfully ", async () => {
      expect(await dailyCheckIn.getTodayCheckIn(player1)).to.be.eq(false);

      await dailyCheckIn.checkIn({
        from: player1,
      });

      expect(await dailyCheckIn.getTodayCheckIn(player1)).to.be.eq(true);
    });

    it("should revert if already checkedIn for today", async () => {
      expect(await dailyCheckIn.getTodayCheckIn(player1)).to.be.eq(true);
      await expectRevert(
        dailyCheckIn.checkIn({ from: player1 }),
        "Already checked in for today"
      );
    });
  });
});
