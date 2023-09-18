const DailyCheckInContract = artifacts.require("DailyCheckIn");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  // const mytTokenAddr = process.env.MYT_TOKEN_ADDRESS;

  await deployProxy(
    DailyCheckInContract,
    [process.env.DATETIME_UTILS_ADDRESS],
    {
      deployer,
    }
  );
};
