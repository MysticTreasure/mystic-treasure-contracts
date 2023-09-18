const Item = artifacts.require("Item");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");
require("dotenv").config({ path: "../.env" });

module.exports = async function (deployer) {
  await deployProxy(
    Item,
    [
      process.env.ITEM_BASE_URI,
      process.env.CONTRACT_OWNER,
      process.env.CONTRACT_OPERATOR,
    ],
    { deployer }
  );
};
