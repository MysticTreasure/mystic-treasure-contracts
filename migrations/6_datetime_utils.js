const DateTimeUtilsContract = artifacts.require("DateTimeUtils");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  // const mytTokenAddr = process.env.MYT_TOKEN_ADDRESS;
  await deployProxy(DateTimeUtilsContract, [process.env.DATETIME_ADDRESS], {
    deployer,
  });
};
