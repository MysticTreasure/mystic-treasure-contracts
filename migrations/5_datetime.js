const DateTimeContract = artifacts.require("DateTime");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  // const mytTokenAddr = process.env.MYT_TOKEN_ADDRESS;

  await deployProxy(DateTimeContract, [], {
    deployer,
  });
};
