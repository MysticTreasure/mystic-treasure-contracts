const Marketplace = artifacts.require("Marketplace");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  const mytTokenAddr = process.env.MYT_TOKEN_ADDRESS;
  const contractOwner = process.env.CONTRACT_OWNER;
  const feeHolder = process.env.CONTRACT_OWNER;
  const feeRate = process.env.FEE_RATE;
  await deployProxy(
    Marketplace,
    [mytTokenAddr, contractOwner, feeHolder, feeRate],
    { deployer }
  );
};
