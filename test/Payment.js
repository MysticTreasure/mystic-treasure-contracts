const MYTToken = artifacts.require("MYTToken");
const Payment = artifacts.require("Payment");
const truffleAssert = require("truffle-assertions");
require("dotenv").config({ path: "../.env" });
const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const { default: BigNumber } = require("bignumber.js");
const { time } = require("@openzeppelin/test-helpers");

contract("Payment", (accounts) => {
  let MYTTokenInstance;
  let paymentInstance;
  const contractOwner = accounts[0];
  const contractOperator = accounts[0];
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  console.log(accounts);
  before(async () => {
    MYTTokenInstance = await MYTToken.deployed();
    paymentInstance = await deployProxy(Payment, [MYTTokenInstance.address]);
  });
  describe("Deposit", async () => {
    it("should success deposit mystic treasure token", async () => {
      const balanceContractBefore = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      const depositAmount = "1000000000000000000";
      await MYTTokenInstance.approve(paymentInstance.address, depositAmount);
      const allowance = await MYTTokenInstance.allowance(
        accounts[0],
        paymentInstance.address
      );
      console.log({ allowance: allowance.toString() });
      const result = await paymentInstance.deposit(depositAmount, {
        from: accounts[0],
      });
      const balanceContractAfter = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      console.log({
        balanceContractBefore: balanceContractBefore.toString(),
        balanceContractAfter: balanceContractAfter.toString(),
      });
      assert(
        BigNumber(balanceContractAfter).eq(
          BigNumber(balanceContractBefore).plus(depositAmount)
        ),
        "Balance contract after deposit is not valid"
      );
      assert.equal(result.receipt.status, true);
    });
    it("should failure deposit myt when amount equal 0", async () => {
      const depositAmount = "0";
      await truffleAssert.reverts(
        paymentInstance.deposit(depositAmount, { from: accounts[0] }),
        "Payment: Amount invalid"
      );
    });
    it("should failure deposit myt when deposit amount greater than allowance", async () => {
      const depositAmount = "1000000000000000000";
      await truffleAssert.reverts(
        paymentInstance.deposit(depositAmount, { from: accounts[0] }),
        "Payment: Allowance amount lower than amount"
      );
    });
    it("should failure deposit myt when deposit amount greater than account have", async () => {
      const depositAmount = "1000000000000000000";
      await MYTTokenInstance.approve(paymentInstance.address, depositAmount, {
        from: accounts[1],
      });
      await truffleAssert.reverts(
        paymentInstance.deposit(depositAmount, { from: accounts[1] }),
        "ERC20: transfer amount exceeds balance"
      );
    });
  });

  describe("Claim Withdraw", async () => {
    let now;
    const amount = "1000000000000000000";
    beforeEach(async () => {
      now = await time.latest();
    });
    it("should success claim withdraw myt token", async () => {
      const result = await MYTTokenInstance.transfer(
        paymentInstance.address,
        amount,
        { from: accounts[0] }
      );
      assert.equal(result.receipt.status, true);
      const timeExpires = new BigNumber(now).plus(5 * 60).toFixed();
      const nonce = await paymentInstance.nonceMapping(accounts[1]);
      const hash = await paymentInstance.msgHashClaimWithdraw(
        accounts[1],
        amount,
        nonce,
        timeExpires
      );

      const balanceContractBefore = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      const balanceWithdrawerBefor = await MYTTokenInstance.balanceOf(
        accounts[1]
      );

      const signature = await web3.eth.sign(hash, contractOperator);
      const resultClaim = await paymentInstance.claimWithdraw(
        amount,
        nonce,
        timeExpires,
        signature,
        { from: accounts[1] }
      );
      const balanceContractAfter = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      const balanceWithdrawerAfter = await MYTTokenInstance.balanceOf(
        accounts[1]
      );
      assert.equal(resultClaim.receipt.status, true);
      assert(
        BigNumber(balanceContractAfter).eq(
          BigNumber(balanceContractBefore).minus(amount)
        ),
        "Balance contract after claim is not valid"
      );
      assert(
        BigNumber(balanceWithdrawerAfter).eq(
          BigNumber(balanceWithdrawerBefor).plus(amount)
        ),
        "Balance withdrawer after claim is not valid"
      );
    });
    it("should failure when signature expired", async () => {
      const receiver = accounts[1];
      const timeExpires = new BigNumber(now).plus(5 * 60).toFixed();
      const nonce = await paymentInstance.nonceMapping(receiver);
      const hash = await paymentInstance.msgHashClaimWithdraw(
        receiver,
        amount,
        nonce,
        timeExpires
      );
      await time.increase(5 * 60);
      const signature = await web3.eth.sign(hash, contractOperator);
      await truffleAssert.reverts(
        paymentInstance.claimWithdraw(amount, nonce, timeExpires, signature, {
          from: receiver,
        }),
        "Payment: Signature expired"
      );
    });

    it("should failure when signer not operator", async () => {
      const receiver = accounts[1];
      const timeExpires = new BigNumber(now).plus(5 * 60).toFixed();
      const nonce = await paymentInstance.nonceMapping(receiver);
      const hash = await paymentInstance.msgHashClaimWithdraw(
        receiver,
        amount,
        nonce,
        timeExpires
      );
      const signature = await web3.eth.sign(hash, accounts[1]);
      await truffleAssert.reverts(
        paymentInstance.claimWithdraw(amount, nonce, timeExpires, signature, {
          from: receiver,
        }),
        "Payment: failure verify withdraw"
      );
    });
    it("should failure when nonce is invalid", async () => {
      const receiver = accounts[1];
      const timeExpires = new BigNumber(now).plus(5 * 60).toFixed();
      const nonce = await paymentInstance.nonceMapping(receiver);
      const invalidNonce = BigNumber(nonce).plus(1).toFixed();
      const hash = await paymentInstance.msgHashClaimWithdraw(
        receiver,
        amount,
        invalidNonce,
        timeExpires
      );
      const signature = await web3.eth.sign(hash, contractOperator);
      await truffleAssert.reverts(
        paymentInstance.claimWithdraw(
          amount,
          invalidNonce,
          timeExpires,
          signature,
          { from: receiver }
        ),
        "Payment: Nonce is invalid"
      );
    });
  });
  describe("Withdraw", async () => {
    amount = "1000000000000000000";
    beforeEach(async () => {
      await MYTTokenInstance.transfer(paymentInstance.address, amount, {
        from: accounts[0],
      });
    });
    it("should success withdraw", async () => {
      const receiver = accounts[2];

      const balanceContractBefore = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      const balanceWithdrawerBefor = await MYTTokenInstance.balanceOf(receiver);

      const result = await paymentInstance.withdraw(receiver, amount, {
        from: contractOperator,
      });
      assert.equal(result.receipt.status, true);

      const balanceContractAfter = await MYTTokenInstance.balanceOf(
        paymentInstance.address
      );
      const balanceWithdrawerAfter = await MYTTokenInstance.balanceOf(receiver);
      assert(
        BigNumber(balanceContractAfter).eq(
          BigNumber(balanceContractBefore).minus(amount)
        ),
        "Balance contract after claim is not valid"
      );
      assert(
        BigNumber(balanceWithdrawerAfter).eq(
          BigNumber(balanceWithdrawerBefor).plus(amount)
        ),
        "Balance withdrawer after claim is not valid"
      );
    });

    it("should failure withdraw when not operator call", async () => {
      const receiver = accounts[2];

      await truffleAssert.reverts(
        paymentInstance.withdraw(receiver, amount, { from: receiver }),
        "is missing role"
      );
    });
  });

  describe("Check Role", async () => {
    amount = "1000000000000000000";
    beforeEach(async () => {
      await MYTTokenInstance.transfer(paymentInstance.address, amount, {
        from: accounts[0],
      });
    });
    it("should grant new operator", async () => {
      const OPERATOR_ROLE = await paymentInstance.OPERATOR_ROLE();
      const newOperator = accounts[2];
      const result = await paymentInstance.grantRole(
        OPERATOR_ROLE,
        newOperator,
        { from: contractOperator }
      );
      assert.equal(result.receipt.status, true);
      const resultWithdraw = await paymentInstance.withdraw(
        accounts[4],
        amount,
        { from: newOperator }
      );
      assert.equal(resultWithdraw.receipt.status, true);
    });
    it("should revoke operator role", async () => {
      const OPERATOR_ROLE = await paymentInstance.OPERATOR_ROLE();
      const result = await paymentInstance.revokeRole(
        OPERATOR_ROLE,
        contractOperator,
        { from: contractOperator }
      );
      assert.equal(result.receipt.status, true);
      await truffleAssert.reverts(
        paymentInstance.withdraw(accounts[4], amount, {
          from: contractOperator,
        }),
        "missing role"
      );
    });
    it("should grant new admin", async () => {
      const ADMIN_ROLE = await paymentInstance.DEFAULT_ADMIN_ROLE();
      const OPERATOR_ROLE = await paymentInstance.OPERATOR_ROLE();
      const newAdmin = accounts[3];
      const result = await paymentInstance.grantRole(ADMIN_ROLE, newAdmin, {
        from: contractOperator,
      });
      assert.equal(result.receipt.status, true);
      const result2 = await paymentInstance.revokeRole(
        ADMIN_ROLE,
        contractOperator,
        { from: newAdmin }
      );
      assert.equal(result2.receipt.status, true);
      await truffleAssert.reverts(
        paymentInstance.grantRole(OPERATOR_ROLE, accounts[4], {
          from: contractOperator,
        }),
        "missing role"
      );
    });
  });
});
