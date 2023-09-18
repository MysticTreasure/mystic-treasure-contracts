const Item = artifacts.require("Item");
const truffleAssert = require("truffle-assertions");
require("dotenv").config({ path: "../.env" });
const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const { default: BigNumber } = require("bignumber.js");

contract("Item", (accounts) => {
  let itemInstance, operator;
  let marketplaceAddr = accounts[9];
  let minter, owner;
  beforeEach(async () => {
    minter = accounts[0];
    operator = accounts[8];
    owner = accounts[8];
    itemInstance = await deployProxy(Item, [
      process.env.ITEM_BASE_URI,
      operator,
      minter,
    ]);
  });
  describe("Mint item", async () => {
    const itemId = 1;
    it("should success mint item", async () => {
      const result = await itemInstance.mintItem(accounts[0], itemId, {
        from: minter,
      });
      assert.equal(result.receipt.status, true);
    });
    it("should failure mint item when caller is not operator", async () => {
      await truffleAssert.reverts(
        itemInstance.mintItem(accounts[0], itemId, { from: accounts[1] }),
        "missing role"
      );
    });
  });

  describe("Claim item", async () => {
    let itemId = 1;
    it("should success claim item", async () => {
      const hash = await itemInstance.msgHashMintItem(accounts[1], itemId);
      const signature = await web3.eth.sign(hash, minter);
      const result = await itemInstance.claimMintItem(itemId, signature, {
        from: accounts[1],
      });
      assert.equal(result.receipt.status, true);
    });
    it("should failure when signer not operator", async () => {
      const hash = await itemInstance.msgHashMintItem(accounts[1], itemId);
      const signature = await web3.eth.sign(hash, accounts[2]);
      await truffleAssert.reverts(
        itemInstance.claimMintItem(itemId, signature, { from: accounts[1] }),
        "Item: failure verify item"
      );
    });
  });

  describe("Set URI", async () => {
    let itemId = 1;
    beforeEach(async () => {
      const result = await itemInstance.mintItem(accounts[0], itemId, {
        from: minter,
      });
      assert.equal(result.receipt.status, true);
    });
    it("Should return URI", async () => {
      const itemURI = await itemInstance.tokenURI.call(itemId);
      const tokenURI = process.env.ITEM_BASE_URI + itemId;
      assert.equal(tokenURI, itemURI);
    });
    it("should success setURI when caller is operator", async () => {
      const newTempUri = "http://new_uri.com/";
      const result = await itemInstance.setURI(newTempUri, { from: operator });
      assert.equal(result.receipt.status, true);
      const tokenUri = await itemInstance.tokenURI(1);
      assert.equal(tokenUri, newTempUri + itemId);
    });
    it("should failure setURI when caller is not operator", async () => {
      const newTempUri = "http://new_uri.com/";
      await truffleAssert.reverts(
        itemInstance.setURI(newTempUri, { from: accounts[1] }),
        "missing role"
      );
    });
  });

  describe("Deposit", async () => {
    let itemId = 1;
    beforeEach(async () => {
      const result = await itemInstance.mintItem(accounts[0], itemId, {
        from: minter,
      });
      assert.equal(result.receipt.status, true);
    });
    it("should success when call deposit", async () => {
      await itemInstance.deposit(itemId, { from: accounts[0] });
      const isTradable = await itemInstance.isTradable.call(itemId);
      assert.equal(
        isTradable,
        false,
        "Item should cannot tradable after deposit"
      );
      await truffleAssert.reverts(
        itemInstance.transferFrom(accounts[0], accounts[2], itemId),
        "Token has been locked"
      );
    });
    it("should failure deposit when caller is not owner of token", async () => {
      await truffleAssert.reverts(
        itemInstance.deposit(itemId, { from: accounts[3] }),
        "ERC721: transfer caller is not owner nor approved"
      );
    });
    it("should failure deposit when token already deposited to game", async () => {
      const resultDeposit = await itemInstance.deposit(itemId, {
        from: accounts[0],
      });
      assert.equal(resultDeposit.receipt.status, true);
      await truffleAssert.reverts(
        itemInstance.deposit(itemId, { from: accounts[0] }),
        "Token already deposited to game"
      );
    });
  });

  describe("Withdraw item", async () => {
    let itemId = 1;
    beforeEach(async () => {
      const result = await itemInstance.mintItem(accounts[1], itemId, {
        from: minter,
      });
      assert.equal(result.receipt.status, true);
    });
    it("should success withdraw item", async () => {
      await itemInstance.deposit(itemId, { from: accounts[1] });
      const nonce = await itemInstance.nonceMapping(itemId);
      const hash = await itemInstance.msgHashWithdrawItem(itemId, nonce);
      const signature = await web3.eth.sign(hash, minter);
      const result = await itemInstance.withdraw(itemId, nonce, signature, {
        from: accounts[1],
      });
      assert.equal(result.receipt.status, true);
      const resultTransfer = await itemInstance.transferFrom(
        accounts[1],
        accounts[2],
        itemId,
        { from: accounts[1] }
      );
      assert.equal(resultTransfer.receipt.status, true);
    });
    it("should failure withdraw when caller is not owner of token", async () => {
      await itemInstance.deposit(itemId, { from: accounts[1] });
      const nonce = await itemInstance.nonceMapping(itemId);
      const hash = await itemInstance.msgHashWithdrawItem(itemId, nonce);
      const signature = await web3.eth.sign(hash, minter);
      await truffleAssert.reverts(
        itemInstance.withdraw(itemId, nonce, signature, { from: accounts[3] }),
        "ERC721: transfer caller is not owner nor approved"
      );
    });
    it("should failure withdraw item when token already unlock", async () => {
      const nonce = await itemInstance.nonceMapping(itemId);
      const hash = await itemInstance.msgHashWithdrawItem(itemId, nonce);
      const signature = await web3.eth.sign(hash, minter);
      await truffleAssert.reverts(
        itemInstance.withdraw(itemId, nonce, signature, { from: accounts[1] }),
        "Item: already unlock token"
      );
    });
    it("should failure when input invalid nonce", async () => {
      await itemInstance.deposit(itemId, { from: accounts[1] });
      const nonce = await itemInstance.nonceMapping(itemId);
      const invalidNonce = BigNumber(nonce).plus(1).toFixed();
      const hash = await itemInstance.msgHashWithdrawItem(itemId, invalidNonce);
      const signature = await web3.eth.sign(hash, minter);
      await truffleAssert.reverts(
        itemInstance.withdraw(itemId, invalidNonce, signature, {
          from: accounts[1],
        }),
        "Item: Invalid nonce"
      );
    });
    it("should failure when signer not operator", async () => {
      await itemInstance.deposit(itemId, { from: accounts[1] });
      const nonce = await itemInstance.nonceMapping(itemId);
      const hash = await itemInstance.msgHashWithdrawItem(itemId, nonce);
      const signature = await web3.eth.sign(hash, accounts[2]);
      await truffleAssert.reverts(
        itemInstance.withdraw(itemId, nonce, signature, { from: accounts[1] }),
        "Item: failure verify signature."
      );
    });
  });
  describe("Item exists", async () => {
    const itemId = 1;
    it("item exists", async () => {
      const itemExistsBefore = await itemInstance.itemExists(itemId);
      assert.equal(itemExistsBefore, false);
      await itemInstance.mintItem(accounts[1], itemId, { from: minter });
      const itemExistsAfter = await itemInstance.itemExists(itemId);
      assert.equal(itemExistsAfter, true);
    });
  });

  describe("Transfer Restriction", async () => {
    let itemId = 1;
    it("should success setting transfer restriction", async () => {
      const result = await itemInstance.setTransferRestrictionFlag(true, {
        from: operator,
      });
      assert.equal(result.receipt.status, true);
    });
    it("should failure setting transfer restriction when caller is not owner", async () => {
      await truffleAssert.reverts(
        itemInstance.setTransferRestrictionFlag(true, { from: accounts[1] }),
        "missing role"
      );
    });
    it("should success setting marketplace", async () => {
      const result = await itemInstance.setMarketplace(marketplaceAddr, true, {
        from: operator,
      });
      assert.equal(result.receipt.status, true);
    });
    it("should failure setting marketplace when caller is not owner", async () => {
      await truffleAssert.reverts(
        itemInstance.setMarketplace(marketplaceAddr, true, {
          from: accounts[1],
        }),
        "missing role"
      );
    });
    it("should failure transfer when setting restriction on", async () => {
      await itemInstance.setTransferRestrictionFlag(true, { from: operator });
      const result = await itemInstance.mintItem(accounts[0], itemId, {
        from: minter,
      });
      assert.equal(result.receipt.status, true);
      await truffleAssert.reverts(
        itemInstance.transferFrom(accounts[0], accounts[2], itemId),
        "Item: only allow mint transaction or trade on marketplace"
      );
    });
    it("should success transfer when setting restriction on and caller is marketplace", async () => {
      await itemInstance.setTransferRestrictionFlag(true, { from: operator });
      const resultMint = await itemInstance.mintItem(marketplaceAddr, itemId, {
        from: minter,
      });
      assert.equal(resultMint.receipt.status, true);
      await itemInstance.setMarketplace(marketplaceAddr, true, {
        from: operator,
      });
      const resultTransfer = await itemInstance.transferFrom(
        marketplaceAddr,
        accounts[2],
        itemId,
        { from: marketplaceAddr }
      );
      assert.equal(resultTransfer.receipt.status, true);
    });

    it("should success transfer when setting restriction off", async () => {
      await itemInstance.setTransferRestrictionFlag(true, { from: operator });
      await itemInstance.mintItem(accounts[0], itemId, { from: minter });
      await truffleAssert.reverts(
        itemInstance.transferFrom(accounts[0], accounts[2], itemId),
        "Item: only allow mint transaction or trade on marketplace"
      );
      await itemInstance.setTransferRestrictionFlag(false, { from: operator });
      const resultTransfer = await itemInstance.transferFrom(
        accounts[0],
        accounts[2],
        itemId
      );
      assert.equal(resultTransfer.receipt.status, true);
    });
  });

  describe("Check Role", async () => {
    let itemId = 1;
    it("should grant new minter", async () => {
      const MINTER_ROLE = await itemInstance.MINTER_ROLE();
      const newMinter = accounts[2];
      const result = await itemInstance.grantRole(MINTER_ROLE, newMinter, {
        from: owner,
      });
      assert.equal(result.receipt.status, true);
      const resultMint = await itemInstance.mintItem(marketplaceAddr, itemId, {
        from: newMinter,
      });
      assert.equal(resultMint.receipt.status, true);
    });
    it("should revoke minter role", async () => {
      const MINTER_ROLE = await itemInstance.MINTER_ROLE();
      const result = await itemInstance.revokeRole(MINTER_ROLE, minter, {
        from: owner,
      });
      assert.equal(result.receipt.status, true);
      await truffleAssert.reverts(
        itemInstance.mintItem(marketplaceAddr, itemId, { from: minter }),
        "missing role"
      );
    });
    it("should grant new admin", async () => {
      const ADMIN_ROLE = await itemInstance.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await itemInstance.MINTER_ROLE();
      const newAdmin = accounts[3];
      const result = await itemInstance.grantRole(ADMIN_ROLE, newAdmin, {
        from: owner,
      });
      assert.equal(result.receipt.status, true);
      const result2 = await itemInstance.revokeRole(ADMIN_ROLE, owner, {
        from: newAdmin,
      });
      assert.equal(result2.receipt.status, true);
      await truffleAssert.reverts(
        itemInstance.grantRole(MINTER_ROLE, accounts[4], { from: owner }),
        "missing role"
      );
    });
  });
});
