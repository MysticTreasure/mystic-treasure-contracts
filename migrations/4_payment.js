const Payment = artifacts.require("Payment");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  const mytTokenAddr = process.env.MYT_TOKEN_ADDRESS;

  await deployProxy(Payment, [mytTokenAddr], { deployer });
};
