const { BigNumber } = require("bignumber.js");

const Migrations = artifacts.require("Migrations");
const MYTToken = artifacts.require("MYTToken");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(
    MYTToken,
    new BigNumber(500000000).multipliedBy(new BigNumber(10).pow(18)),
    "MysticTreasureToken",
    "MYT"
  );
};
